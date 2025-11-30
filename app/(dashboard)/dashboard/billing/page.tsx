// app/(dashboard)/dashboard/billing/page.tsx

import prisma, { getData } from '@/app/lib/db'
import { getStripeSession, stripe } from '@/app/lib/stripe'
import { createClient } from '@/app/lib/supabase/server'
import PricingComponent from '@/components/PricingComponent'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LOCAL_SITE_URL, PLAN_IDS, PRICING_PLANS, PRODUCTION_URL, type PlanId, type PricingPlan } from '@/lib/constants'
import { unstable_noStore as noStore } from 'next/cache'
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

  const dbUser = await getData(user.id)

  const data = {
    status: dbUser?.Subscription?.status ?? 'inactive',
    planId: dbUser?.Subscription?.planId ?? null,
    stripeSubscriptionId: null as string | null,
    currentPeriodEnd: dbUser?.Subscription?.currentPeriodEnd ?? null,
    user: dbUser,
  }

  async function createSubscriptionAction(formData: FormData) {
    'use server'
    const planId = formData.get('planId') as PlanId
    const priceId = PRICING_PLANS.find((p) => p.id === planId)?.stripePriceId
    if (!priceId) return
    const origin = process.env.NODE_ENV === 'production' ? PRODUCTION_URL : LOCAL_SITE_URL
    const mode = planId === PLAN_IDS.payg ? 'payment' : 'subscription'
    const url = await getStripeSession({
      priceId,
      domainUrl: origin,
      customerId: dbUser?.stripeCustomerId as string | undefined,
      userId: dbUser?.id,
      mode,
    })
    return redirect(url)
  }

  async function handleFreePlanSubscription() {
    'use server'
    const supabase2 = await createClient()
    const {
      data: { user: sUser },
    } = await supabase2.auth.getUser()
    if (!sUser) {
      return redirect('/get-started')
    }
    const existing = await prisma.subscription.findUnique({
      where: { userId: sUser.id },
      select: { userId: true },
    })
    if (existing) {
      await prisma.subscription.update({
        where: { userId: sUser.id },
        data: { planId: PLAN_IDS.free, status: 'active' },
      })
    }
    return redirect('/dashboard')
  }

  async function createCustomerPortal() {
    'use server'
    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser?.stripeCustomerId as string,
      return_url: process.env.NODE_ENV === 'production' ? PRODUCTION_URL : `${LOCAL_SITE_URL}/dashboard`,
    })
    return redirect(session.url)
  }

  const resolvedCurrent = await resolvePlanId(data.planId)
  const proCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro)?.credits ?? 0
  const proExhausted = (data.status === 'active' && resolvedCurrent === PLAN_IDS.pro)
    ? ((data.user?.credits ?? 0) >= proCredits)
    : false
  const hasPayg = !!data.user?.lastPaygPurchaseAt
  const raw = data.user?.lastPaygPurchaseAt
  const d = typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : raw instanceof Date ? raw : null
  const dateText = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const isSubActive = data.status === 'active'
  const note = hasPayg
    ? isSubActive
      ? `Subscription takes precedence over Pay As You Go. Last Purchase: ${dateText}.`
      : `Using Pay As You Go until credits are exhausted. Last Purchase: ${dateText}.`
    : null

  

  return (
    <div className='min-h-[calc(100vh-8rem)] flex items-center justify-center py-2'>
      <div className='max-w-4xl mx-auto w-full space-y-5'>
        
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

        {/* EDIT SUB CARD: Reduced padding to p-2, font to text-xs, button height to h-8 */}
        {resolvedCurrent === PLAN_IDS.pro ? (
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
        ) : null}

        <PricingComponent
          currentPlanId={isSubActive ? resolvedCurrent : (hasPayg ? PLAN_IDS.payg : null)}
          lastPaygPurchaseAt={data.user?.lastPaygPurchaseAt ?? null}
          onSubscribeAction={createSubscriptionAction}
          onFreeAction={handleFreePlanSubscription}
          proExhausted={proExhausted}
          mode='billing'
        />
      </div>
    </div>
  )
}
