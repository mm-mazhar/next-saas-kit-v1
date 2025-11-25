// app/(dashboard)/dashboard/billing/page.tsx

import { AutoRenewSwitch } from '@/app/(dashboard)/_components/AutoRenewSwitch'
import { StripePortal } from '@/app/(dashboard)/_components/Submitbuttons'
import prisma from '@/app/lib/db'
import { getStripeSession, stripe } from '@/app/lib/stripe'
import { createClient } from '@/app/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

import { unstable_noStore as noStore, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import PricingComponent from '@/components/PricingComponent'
import {
  LOCAL_SITE_URL,
  PLAN_IDS,
  PRICING_PLANS,
  PRODUCTION_URL,
  type PlanId,
  type PricingPlan,
} from '@/lib/constants'

// const PLAN_MAP = {
//   free: 'free',
//   pro: 'pro',
//   pro_plus: 'pro_plus',
// } as const

async function getData(userId: string) {
  noStore()
  try {
    const data = await prisma.subscription.findUnique({
      where: {
        userId: userId,
      },
      select: {
        status: true,
        planId: true,
        stripeSubscriptionId: true,
        currentPeriodEnd: true,
        user: {
          select: {
            stripeCustomerId: true,
            credits: true,
            autoRenewOnCreditExhaust: true,
          },
        },
      },
    })
    return data
  } catch {
    return null
  }
}

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/get-started')
  }

  const data = await getData(user.id)

  let latestInvoiceUrl = ''
  if (data?.user?.stripeCustomerId) {
    try {
      const invs = await stripe.invoices.list({
        customer: data.user.stripeCustomerId as string,
        limit: 5,
      })
      const candidate =
        invs.data.find((i) => i.status === 'paid' && !!i.hosted_invoice_url) ||
        invs.data.find((i) => !!i.hosted_invoice_url) ||
        null
      latestInvoiceUrl = candidate?.hosted_invoice_url || ''
    } catch {}
  }

  const resolvePlanId = async (
    planIdFromDb?: string | null
  ): Promise<PlanId | null> => {
    if (!planIdFromDb) return null
    if (planIdFromDb === PLAN_IDS.free) return PLAN_IDS.free
    const matched = PRICING_PLANS.find(
      (p: PricingPlan) => p.stripePriceId === planIdFromDb
    )
    if (matched?.id) return matched.id
    if (planIdFromDb.startsWith('price_')) {
      try {
        const price = await stripe.prices.retrieve(planIdFromDb)
        let productName = ''
        if (typeof price.product === 'string') {
          const prod = await stripe.products.retrieve(price.product)
          productName = (prod.name || '').toLowerCase()
        } else {
          productName = ((price.product as { name?: string }).name || '').toLowerCase()
        }
        if (productName.includes('pro plus')) return PLAN_IDS.pro_plus
        if (productName.includes('pro')) return PLAN_IDS.pro
      } catch {}
    }
    return null
  }

  async function createSubscriptionAction(formData: FormData) {
    'use server'

    const dbUser = await prisma.user.findUnique({
      where: { id: user?.id },
      select: { stripeCustomerId: true, email: true, name: true },
    })

    let stripeCustomerId = dbUser?.stripeCustomerId

    if (stripeCustomerId && stripeCustomerId.startsWith('cus_')) {
      try {
        await stripe.customers.retrieve(stripeCustomerId)
      } catch {
        stripeCustomerId = undefined
      }
    }

    if (!stripeCustomerId || !stripeCustomerId.startsWith('cus_')) {
      if (!dbUser?.email) {
        throw new Error('User email not found')
      }

      const stripeCustomer = await stripe.customers.create({
        email: dbUser.email,
        name: dbUser.name || undefined,
      })

      await prisma.user.update({
        where: { id: user?.id },
        data: { stripeCustomerId: stripeCustomer.id },
      })

      stripeCustomerId = stripeCustomer.id
    }

    const planId = formData.get('planId') as string
    const plan = PRICING_PLANS.find((p) => p.id === planId)
    const priceId = plan?.stripePriceId ?? ''
    if (!priceId || !priceId.startsWith('price_')) {
      throw new Error('Invalid or missing Stripe price ID')
    }

    // Enforce single subscription at Stripe: prefer updating existing over creating new
    if (stripeCustomerId) {
      const subsResp = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        limit: 20,
      })
      const candidates = subsResp.data.filter((s) => s.status !== 'canceled')
      console.log('Stripe subs found:', candidates.map((s) => ({ id: s.id, status: s.status })))
      if (candidates.length > 0) {
        const sorted = candidates.sort((a, b) => (a.created || 0) - (b.created || 0))
        const canonical = sorted.at(-1)!
        console.log('Using canonical subscription:', { id: canonical.id, status: canonical.status })

        if (sorted.length > 1) {
          const toCancel = sorted.slice(0, -1)
          for (const s of toCancel) {
            try {
              await stripe.subscriptions.cancel(s.id)
              console.log('Canceled duplicate subscription:', s.id)
            } catch (e) {
              console.error('Failed to cancel duplicate subscription:', s.id, e)
            }
          }
        }

        const currentItem = canonical.items.data[0]
        const currentPriceId = currentItem.price.id
        if (currentPriceId === priceId) {
          return redirect('/dashboard')
        }

        try {
          console.log('Updating subscription price', { subscriptionId: canonical.id, from: currentPriceId, to: priceId })
          const updateResp = await stripe.subscriptions.update(canonical.id, {
            items: [{ id: currentItem.id, price: priceId }],
            proration_behavior: 'create_prorations',
            payment_behavior: 'pending_if_incomplete',
          })
          console.log('Subscription updated successfully:', updateResp.id)
          if (!updateResp || !updateResp.id) {
            throw new Error('Update response invalid')
          }
        } catch (e) {
          console.error('Subscription update failed:', e)
          throw new Error('Failed to update existing subscription')
        }
        return redirect('/payment/success')
      }
    }
    if (stripeCustomerId) {
      const secondCheck = await stripe.subscriptions.list({ customer: stripeCustomerId, limit: 20 })
      const stillHasSubs = secondCheck.data.some((s) => s.status !== 'canceled')
      console.log('Second check for existing subs:', stillHasSubs)
      if (stillHasSubs) {
        return redirect('/dashboard/billing')
      }
    }

    const subscriptionUrl = await getStripeSession({
      domainUrl:
        process.env.NODE_ENV === 'production' ? PRODUCTION_URL : LOCAL_SITE_URL,
      priceId,
      customerId: stripeCustomerId && stripeCustomerId.startsWith('cus_') ? stripeCustomerId : undefined,
    })
    console.log('Creating new checkout session for subscription')

    return redirect(subscriptionUrl)
  }

  async function renewNowAction() {
    'use server'
    const dbUser = await prisma.user.findUnique({
      where: { id: user?.id },
      select: { stripeCustomerId: true, credits: true, Subscription: { select: { stripeSubscriptionId: true, status: true } } },
    })
    const subId = dbUser?.Subscription?.stripeSubscriptionId
    if (!subId) throw new Error('No active subscription to renew')
    await stripe.subscriptions.update(subId, {
      billing_cycle_anchor: 'now',
      proration_behavior: 'create_prorations',
      payment_behavior: 'pending_if_incomplete',
    })
    try {
      await prisma.subscription.update({ where: { stripeSubscriptionId: subId }, data: { periodEndReminderSent: false } })
    } catch {}
    await prisma.user.update({ where: { id: user?.id }, data: { credits: 0 } })
    return redirect('/payment/success')
  }

  async function updateAutoRenewAction(formData: FormData) {
    'use server'
    const autoRenew = (formData.get('autoRenew') as string) ?? undefined
    await prisma.user.update({
      where: { id: user?.id },
      data: {
        autoRenewOnCreditExhaust:
          autoRenew === undefined
            ? undefined
            : autoRenew === 'on'
            ? true
            : autoRenew === 'off'
            ? false
            : undefined,
      },
    })
    revalidatePath('/dashboard', 'layout')
  }
  async function createCustomerPortal() {
    'use server'
    const session = await stripe.billingPortal.sessions.create({
      customer: data?.user.stripeCustomerId as string,
      return_url:
        process.env.NODE_ENV === 'production'
          ? PRODUCTION_URL
          : `${LOCAL_SITE_URL}/dashboard`,
    })

    return redirect(session.url)
  }

  async function handleFreePlanSubscription() {
    'use server'
    // const start = Math.floor(Date.now() / 1000)

    const existing = await prisma.subscription.findUnique({
      where: { userId: user!.id },
      select: { userId: true },
    })

    if (existing) {
      await prisma.subscription.update({
        where: { userId: user!.id },
        data: {
          planId: PLAN_IDS.free,
          status: 'active',
        },
      })
    } else {
      // No Stripe subscription exists yet; do not create a local subscription id.
      // Treat as no paid subscription and redirect the user to dashboard.
    }

    return redirect('/dashboard')
  }

  const resolvedCurrent = await resolvePlanId(data?.planId)
  if (data?.status === 'active' && resolvedCurrent === PLAN_IDS.pro_plus) {
    const planCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro_plus)?.credits ?? 0
    const used = data?.user?.credits ?? 0
    const exhaustedPlus = used >= planCredits
    return (
      <div className='min-h-[calc(100vh-8rem)] flex items-center'>
        <div className='max-w-3xl mx-auto w-full space-y-2'>
          <div className='px-2 text-center'>
            <h1 className='text-3xl md:text-4xl'>Subscription</h1>
            <p className='text-lg text-muted-foreground'>
              Settings regarding your subscription
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
            <Card className='w-full py-3 gap-3'>
              <CardHeader className='py-0.5 px-4'>
                <CardTitle>Usage</CardTitle>
              </CardHeader>
              <CardContent className='py-0.5 px-4 min-h-[48px] grid place-items-center text-center'>
                <div className='flex items-center justifiy-item-center gap-3'>
                  <span className='text-4xl md:text-3xl font-bold text-primary'>
                    {data?.user?.credits ?? 0}
                  </span>
                  <span className='text-xs text-muted-foreground'>Used Credits</span>
                </div>
                <div className='mt-2 text-xs text-primary'>
                  Total Credits:{' '}
                  {PRICING_PLANS.find((p) => p.id === resolvedCurrent)
                    ?.credits ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card className='w-full py-3 gap-3'>
              <CardHeader className='py-0.5 px-4'>
                <CardTitle>Plan Renewal</CardTitle>
              </CardHeader>
              <CardContent className='py-0.5 px-4 min-h-[48px] flex items-center justify-center'>
                <div className='text-base md:text-lg font-semibold text-primary text-center'>
                  {data?.currentPeriodEnd
                    ? `${new Date(
                        data.currentPeriodEnd * 1000
                      ).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}`
                    : 'Renewal date unavailable'}
                </div>
              </CardContent>
            </Card>
          </div>
          {exhaustedPlus ? (
            <div className='rounded-lg border p-4 bg-muted/30'>
              <div className='flex items-center justify-between'>
                <p className='text-sm'>Credits exhausted. Renew now to reset your cycle or upgrade.</p>
                {/* <form action={renewNowAction}>
                  <Button type='submit' className='h-9 px-3'>Renew</Button>
                </form> */}
              </div>
            </div>
          ) : null}
          <Card className='w-full'>
            <CardHeader className='px-4 py-1'>
              <CardTitle>Edit Subscription</CardTitle>
              <CardDescription>
                Click on the button below, this will give you the opportunity to
                <span className='font-bold text-secondary-foreground'>
                  {' '}
                  change your payment details,
                </span>
                <span className='font-bold text-secondary-foreground'>
                  {' '}
                  view your statement
                </span>{' '}
                and
                <span className='font-bold text-secondary-foreground'>
                  {' '}
                  Cancel Subscription{' '}
                </span>
                at the same time.
              </CardDescription>
            </CardHeader>
            <CardContent className='px-4 py-1'>
              <div className='flex items-center gap-2 flex-wrap'>
                <form action={createCustomerPortal}>
                  <StripePortal />
                </form>
                {latestInvoiceUrl ? (
                  <Button asChild className='w-fit focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'>
                    <a href={latestInvoiceUrl} target='_blank' rel='noopener noreferrer'>View latest invoice</a>
                  </Button>
                ) : null}
                <form action={renewNowAction}>
                  <Button type='submit' className='h-9 px-3'>Renew</Button>
                </form>
                <AutoRenewSwitch
                  initialOn={!!data?.user?.autoRenewOnCreditExhaust}
                  onToggleAction={updateAutoRenewAction}
                />
              </div>
            </CardContent>
          </Card>
          
        </div>
      </div>
    )
  }

  const current = resolvedCurrent

  // const isFreeActive = data?.status === 'active' && data?.planId === 'free'

  if (data?.status === 'active' && resolvedCurrent === PLAN_IDS.pro) {
    const planCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro)?.credits ?? 0
    const used = data?.user?.credits ?? 0
    const exhaustedPro = used >= planCredits
    return (
      <div className='min-h-[calc(100vh-8rem)] flex items-center'>
        <div className='max-w-4xl mx-auto w-full px-2 md:px-0 space-y-2'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
            <Card className='w-full py-3 gap-3'>
              <CardHeader className='py-0.5 px-4'>
                <CardTitle>Usage</CardTitle>
              </CardHeader>
              <CardContent className='py-0.5 px-4 min-h-[48px] grid place-items-center text-center'>
                <div className='flex items-center justify-center gap-3'>
                  <span className='text-4xl md:text-3xl font-bold text-primary'>
                    {data?.user?.credits ?? 0}
                  </span>
                  <span className='text-xs text-muted-foreground'>Used Credits</span>
                </div>
                <div className='mt-2 text-xs text-primary'>
                  Total Credits:{' '}
                  {PRICING_PLANS.find((p) => p.id === resolvedCurrent)
                    ?.credits ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card className='w-full py-3 gap-3'>
              <CardHeader className='py-0.5 px-4'>
                <CardTitle>Plan Renewal</CardTitle>
              </CardHeader>
              <CardContent className='py-0.5 px-4 min-h-[48px] flex items-center justify-center'>
                <div className='text-base md:text-lg font-semibold text-primary text-center'>
                  {data?.currentPeriodEnd
                    ? `${new Date(
                        data.currentPeriodEnd * 1000
                      ).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}`
                    : 'Renewal date unavailable'}
                </div>
              </CardContent>
            </Card>
          </div>
          {exhaustedPro ? (
            <div className='rounded-lg border p-4 bg-muted/30'>
              <div className='flex items-center justify-between'>
                <p className='text-sm'>Credits exhausted. Renew now to reset your cycle or upgrade.</p>
                {/* <form action={renewNowAction}>
                  <Button type='submit' className='h-9 px-3'>Renew</Button>
                </form> */}
              </div>
            </div>
          ) : null}
          <Card className='w-full py-3 gap-3'>
            <CardHeader className='px-4 py-1'>
              <CardTitle>Edit Subscription</CardTitle>
              <CardDescription>
                Click on the button below, this will give you the opportunity to
                <span className='font-bold text-secondary-foreground'>
                  {' '}
                  change your payment details,
                </span>
                <span className='font-bold text-secondary-foreground'>
                  {' '}
                  view your statement
                </span>{' '}
                and
                <span className='font-bold text-secondary-foreground'>
                  {' '}
                  Cancel Subscription{' '}
                </span>
                at the same time.
              </CardDescription>
            </CardHeader>
            <CardContent className='px-4 py-1'>
              <div className='flex items-center gap-2 flex-wrap'>
                <form action={createCustomerPortal}>
                  <StripePortal />
                </form>
                {latestInvoiceUrl ? (
                  <Button asChild className='w-fit focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'>
                    <a href={latestInvoiceUrl} target='_blank' rel='noopener noreferrer'>View latest invoice</a>
                  </Button>
                ) : null}
                <form action={renewNowAction}>
                  <Button type='submit' className='h-9 px-3'>Renew</Button>
                </form>
                <AutoRenewSwitch
                  initialOn={!!data?.user?.autoRenewOnCreditExhaust}
                  onToggleAction={updateAutoRenewAction}
                />
              </div>
            </CardContent>
          </Card>
          

          <PricingComponent
            currentPlanId={PLAN_IDS.pro}
            onSubscribeAction={createSubscriptionAction}
            onFreeAction={handleFreePlanSubscription}
          />
        </div>
      </div>
    )
  }


  const containerWidthClass =
    (data?.status !== 'active') || resolvedCurrent === null || resolvedCurrent === PLAN_IDS.free
      ? 'max-w-6xl'
      : 'max-w-4xl'

  return (
    <div className='min-h-[calc(100vh-8rem)] flex items-center'>
      <div className={`${containerWidthClass} mx-auto w-full space-y-2`}>
        {(() => {
          const planCredits = PRICING_PLANS.find((p) => p.id === (data?.planId === PLAN_IDS.free ? PLAN_IDS.free : resolvedCurrent || PLAN_IDS.free))?.credits ?? 0
          const used = data?.user?.credits ?? 0
          const exhausted = data?.status === 'active' && used >= planCredits
          return exhausted ? (
            <div className='rounded-lg border p-4 bg-muted/30'>
              <div className='flex items-center justify-between'>
                <p className='text-sm'>Credits exhausted. Renew now to reset your cycle or upgrade.</p>
                <form action={renewNowAction}>
                  <Button type='submit' className='h-9 px-3'>Renew</Button>
                </form>
              </div>
            </div>
          ) : null
        })()}
        {data?.status === 'active' && !!data?.stripeSubscriptionId ? (
          <div className='flex items-center justify-end'>
            <form action={renewNowAction}>
              <Button type='submit' className='h-9 px-3'>Renew</Button>
            </form>
          </div>
        ) : null}
        <PricingComponent
          currentPlanId={data?.status === 'active' ? current : null}
          onSubscribeAction={createSubscriptionAction}
          onFreeAction={handleFreePlanSubscription}
        />
      </div>
    </div>
  )
}
