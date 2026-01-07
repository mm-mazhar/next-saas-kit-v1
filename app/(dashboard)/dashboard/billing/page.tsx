// app/(dashboard)/dashboard/billing/page.tsx

import prisma from '@/app/lib/db'
import { getStripeSession, stripe } from '@/app/lib/stripe'
import { createClient } from '@/app/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireOrgRole } from '@/lib/auth/guards'
import { LOCAL_SITE_URL, PLAN_IDS, PRICING_PLANS, PRODUCTION_URL, type PlanId, type PricingPlan } from '@/lib/constants'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function resolvePlanId(planIdFromDb?: string | null): Promise<PlanId | null> {
  if (!planIdFromDb) return null
  if (planIdFromDb === PLAN_IDS.free) return PLAN_IDS.free
  const matched = PRICING_PLANS.find((p: PricingPlan) => p.stripePriceId === planIdFromDb)
  return matched?.id ?? null
}

export default async function BillingPage() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/get-started')

  const cookieStore = await cookies()
  const currentOrgId = cookieStore.get('current-org-id')?.value

  if (!currentOrgId) {
      return redirect('/dashboard')
  }

  // Security Check: Only ADMIN/OWNER can access billing
  try {
      await requireOrgRole(currentOrgId, user.id, 'ADMIN')
  } catch {
      return redirect('/dashboard')
  }

  const org = await prisma.organization.findUnique({
      where: { id: currentOrgId },
      include: { subscription: true }
  })

  if (!org) return redirect('/dashboard')

  const data = {
    status: org.subscription?.status ?? 'inactive',
    planId: org.subscription?.planId ?? null,
    stripeSubscriptionId: null as string | null,
    currentPeriodEnd: org.subscription?.currentPeriodEnd ?? null,
    org: org,
  }

  async function createSubscriptionAction(formData: FormData) {
    'use server'
    const planId = formData.get('planId') as PlanId
    const priceId = PRICING_PLANS.find((p) => p.id === planId)?.stripePriceId
    if (!priceId) return

    // Re-verify context in action
    const cStore = await cookies()
    const orgId = cStore.get('current-org-id')?.value
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    
    if (!u || !orgId) return

    await requireOrgRole(orgId, u.id, 'ADMIN') // Enforce Role

    const currentOrg = await prisma.organization.findUnique({ where: { id: orgId } })

    const origin = process.env.NODE_ENV === 'production' ? PRODUCTION_URL : LOCAL_SITE_URL
    const mode = 'subscription'
    const url = await getStripeSession({
      priceId,
      domainUrl: origin,
      customerId: currentOrg?.stripeCustomerId as string | undefined,
      organizationId: orgId, // Bind to Org
      userId: u.id,
      mode,
    })
    return redirect(url)
  }

  async function handleFreePlanSubscription() {
    'use server'
    const cStore = await cookies()
    const orgId = cStore.get('current-org-id')?.value
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    
    if (!u || !orgId) return redirect('/dashboard')
    
    await requireOrgRole(orgId, u.id, 'ADMIN')

    const existing = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    })
    if (existing) {
      await prisma.subscription.update({
        where: { organizationId: orgId },
        data: { planId: PLAN_IDS.free, status: 'active' },
      })
    }
    return redirect('/dashboard')
  }

  async function createCustomerPortal() {
    'use server'
    const cStore = await cookies()
    const orgId = cStore.get('current-org-id')?.value
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u || !orgId) return

    await requireOrgRole(orgId, u.id, 'ADMIN')
    const currentOrg = await prisma.organization.findUnique({ where: { id: orgId } })

    if (!currentOrg?.stripeCustomerId) return

    const session = await stripe.billingPortal.sessions.create({
      customer: currentOrg.stripeCustomerId,
      return_url: process.env.NODE_ENV === 'production' ? PRODUCTION_URL : `${LOCAL_SITE_URL}/dashboard`,
    })
    return redirect(session.url)
  }

  const resolvedCurrent = await resolvePlanId(data.planId)
  const proCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.proplus)?.credits ?? 0
  const proExhausted = (data.status === 'active' && resolvedCurrent === PLAN_IDS.proplus)
    ? ((data.org.credits ?? 0) >= proCredits)
    : false
  const hasPayg = !!data.org.lastPaygPurchaseAt
  const raw = data.org.lastPaygPurchaseAt
  const d = typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : raw instanceof Date ? raw : null
  const dateText = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const isSubActive = data.status === 'active'
  const note = hasPayg
    ? isSubActive
      ? `Subscription takes precedence over Pay As You Go. Last Purchase: ${dateText}.`
      : `Using Pay As You Go until credits are exhausted. Last Purchase: ${dateText}.`
    : null

  const currentForState: PlanId | null = isSubActive ? resolvedCurrent : (hasPayg ? PLAN_IDS.pro : null)
  const isFreeTierBilling = currentForState === null || currentForState === PLAN_IDS.free
  const proPlan = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro)
  const proPlusPlan = PRICING_PLANS.find((p) => p.id === PLAN_IDS.proplus)
  
  let invoices: {
    id: string;
    amount_paid: number;
    currency: string | null;
    status: string | null;
    hosted_invoice_url: string | null;
    number: string | null;
    created: number | null;
  }[] = []
  if (isSubActive && data.org.stripeCustomerId) {
    const list = await stripe.invoices.list({ customer: data.org.stripeCustomerId, limit: 12 })
    invoices = list.data.map((inv) => ({
      id: inv.id,
      amount_paid: typeof inv.amount_paid === 'number' ? inv.amount_paid : 0,
      currency: inv.currency || 'usd',
      status: inv.status || null,
      hosted_invoice_url: inv.hosted_invoice_url || null,
      number: (inv.number as string | null) || null,
      created: typeof inv.created === 'number' ? inv.created : null,
    }))
  }

  return (
    <div className='min-h-[calc(100vh-8rem)] flex items-center justify-center py-2'>
      <div className='max-w-6xl mx-auto w-full space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-semibold'>Billing</h1>
          <Link href='/#pricing' className='text-sm text-primary hover:underline inline-flex items-center'>
            All plans &rarr;
          </Link>
        </div>
        
        {/* NOTE CARD: Reduced padding to p-2 and font to text-xs */}
        {note ? (
          <Card className='rounded-lg border bg-muted/30'>
            <CardHeader className='p-2'>
               <CardDescription className='text-xs text-foreground'>
                 {note}
               </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {isFreeTierBilling ? (
          <Card className='rounded-lg border bg-muted/30'>
            <CardHeader className='p-2'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-sm'>Free plan</CardTitle>
                <span className='text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30'>
                  Current
                </span>
              </div>
              <CardDescription className='text-xs'>Free for all users</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {isFreeTierBilling && proPlan ? (
          <Card className='rounded-lg border'>
            <CardHeader className='p-2'>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='text-sm'>Upgrade to {proPlan.title}</CardTitle>
                  <CardDescription className='text-xs'>{proPlan.description}</CardDescription>
                </div>
                <form action={createSubscriptionAction}>
                  <input type='hidden' name='planId' value={PLAN_IDS.pro} />
                  <Button type='submit' className='h-8 text-xs px-3'>Upgrade now</Button>
                </form>
              </div>
            </CardHeader>
            <div className='border-t mx-2'></div>
            <CardContent className='px-2 pb-2'>
              <ul className='text-xs space-y-1'>
                {proPlan.features.slice(0, 4).map((f, i) => (
                  <li key={i} className='flex items-center gap-2'>
                    <span>•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
        
        {isFreeTierBilling && proPlusPlan ? (
          <Card className='rounded-lg border'>
            <CardHeader className='p-2'>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='text-sm'>Upgrade to {proPlusPlan.title}</CardTitle>
                  <CardDescription className='text-xs'>{proPlusPlan.description}</CardDescription>
                </div>
                <form action={createSubscriptionAction}>
                  <input type='hidden' name='planId' value={PLAN_IDS.proplus} />
                  <Button type='submit' className='h-8 text-xs px-3'>Upgrade now</Button>
                </form>
              </div>
            </CardHeader>
            <div className='border-t mx-2'></div>
            <CardContent className='px-2 pb-2'>
              <ul className='text-xs space-y-1'>
                {proPlusPlan.features.slice(0, 4).map((f, i) => (
                  <li key={i} className='flex items-center gap-2'>
                    <span>•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {/* TOP ROW: Edit Subscription + Upgrade (two columns) */}
        {isSubActive ? (
          <div className={`grid grid-cols-1 ${resolvedCurrent === PLAN_IDS.pro && proPlusPlan ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
            {/* Edit Subscription */}
            <Card className='rounded-lg border bg-muted/30'>
              <CardHeader className='p-2'>
                <CardTitle className="text-sm">Edit Subscription</CardTitle>
                <CardDescription className="text-xs">
                  Click below to
                  <span className='font-bold text-secondary-foreground'> change details,</span>
                  <span className='font-bold text-secondary-foreground'> view statement</span> or
                  <span className='font-bold text-secondary-foreground'> Cancel Subscription</span>.
                  <p>&nbsp;</p>
                  <p className='text-xs text-foreground'>
                    If you cancel your subscription then you still can retain your remaining credits.
                  </p>
                </CardDescription>
              </CardHeader>
              <CardContent className='px-2 pb-2'>
                <form action={createCustomerPortal}>
                  <Button type='submit' className='h-8 text-xs px-3'>View payment details</Button>
                </form>
              </CardContent>
            </Card>

            {/* Upgrade to Pro Plus (only when current is Pro) */}
            {resolvedCurrent === PLAN_IDS.pro && proPlusPlan ? (
              <Card className='rounded-lg border'>
                <CardHeader className='p-2'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-sm'>Upgrade to {proPlusPlan.title}</CardTitle>
                      <CardDescription className='text-xs'>{proPlusPlan.description}</CardDescription>
                    </div>
                    <form action={createSubscriptionAction}>
                      <input type='hidden' name='planId' value={PLAN_IDS.proplus} />
                      <Button type='submit' className='h-8 text-xs px-3'>Upgrade now</Button>
                    </form>
                  </div>
                </CardHeader>
                <div className='border-t mx-2'></div>
                <CardContent className='px-2 pb-2'>
                  <ul className='text-xs space-y-1'>
                    {proPlusPlan.features.slice(0, 4).map((f, i) => (
                      <li key={i} className='flex items-center gap-2'>
                        <span>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {/* SECOND ROW: Billing Details + Invoice History (full width) */}
        {isSubActive ? (
          <Card className='rounded-lg border'>
            <CardHeader className='p-2'>
              <CardTitle className='text-sm'>Billing Details</CardTitle>
            </CardHeader>
            <CardContent className='px-2 pb-2 space-y-3'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Stripe Customer ID</span>
                  <p className='font-mono text-xs'>{data.org.stripeCustomerId || 'N/A'}</p>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Subscription ID</span>
                  <p className='font-mono text-xs'>{data.org.subscription?.stripeSubscriptionId || 'N/A'}</p>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Status</span>
                  <p className='text-xs capitalize'>{data.status}</p>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Current Period End</span>
                  <p className='text-xs'>
                    {data.currentPeriodEnd ? new Date(data.currentPeriodEnd * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className='border-t mx-2'></div>
              <div className='pt-2'>
                <h4 className='text-sm font-medium mb-2'>Invoice History</h4>
                {invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Date</TableHead>
                        <TableHead className='text-xs'>Invoice</TableHead>
                        <TableHead className='text-xs'>Status</TableHead>
                        <TableHead className='text-xs'>Amount</TableHead>
                        <TableHead className='text-xs'>Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => {
                        const date = inv.created ? new Date(inv.created * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : ''
                        const amount = (inv.amount_paid || 0) / 100
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className='text-xs text-muted-foreground'>{date}</TableCell>
                            <TableCell className='font-mono text-xs'>{inv.number || inv.id}</TableCell>
                            <TableCell className='text-xs capitalize'>{inv.status || ''}</TableCell>
                            <TableCell className='text-xs'>
                              {amount.toLocaleString(undefined, { style: 'currency', currency: inv.currency || 'usd', maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell>
                              {inv.hosted_invoice_url ? (
                                <Link href={inv.hosted_invoice_url} target='_blank' className='text-xs text-primary underline'>
                                  View
                                </Link>
                              ) : (
                                <span className='text-xs text-muted-foreground'>N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className='text-xs text-muted-foreground'>No subscription invoices found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Upgrade card moved into top row */}

        {null}
      </div>
    </div>
  )
}
