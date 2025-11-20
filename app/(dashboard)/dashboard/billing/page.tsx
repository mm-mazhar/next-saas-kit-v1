// app/(dashboard)/dashboard/billing/page.tsx

import prisma from '@/app/lib/db'
import { getStripeSession, stripe } from '@/app/lib/stripe'
import { createClient } from '@/app/lib/supabase/server'
import { StripePortal } from '@/components/Submitbuttons'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'

import PricingComponent from '@/components/PricingComponent'
import {
  LOCAL_SITE_URL,
  PRICING_PLANS,
  PRODUCTION_URL,
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
        currentPeriodEnd: true,
        user: {
          select: {
            stripeCustomerId: true,
            credits: true,
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

  const resolvePlanId = async (
    planIdFromDb?: string | null
  ): Promise<'free' | 'pro' | 'pro_plus' | null> => {
    if (!planIdFromDb) return null
    if (planIdFromDb === 'free') return 'free'
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
        if (productName.includes('pro plus')) return 'pro_plus'
        if (productName.includes('pro')) return 'pro'
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
    const subscriptionUrl = await getStripeSession({
      customerId: stripeCustomerId,
      domainUrl:
        process.env.NODE_ENV === 'production' ? PRODUCTION_URL : LOCAL_SITE_URL,
      priceId,
    })

    return redirect(subscriptionUrl)
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
          planId: 'free',
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
  if (data?.status === 'active' && resolvedCurrent === 'pro_plus') {
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
              <form action={createCustomerPortal}>
                <StripePortal />
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const current = resolvedCurrent

  // const isFreeActive = data?.status === 'active' && data?.planId === 'free'

  if (data?.status === 'active' && resolvedCurrent === 'pro') {
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
              <form action={createCustomerPortal}>
                <StripePortal />
              </form>
            </CardContent>
          </Card>

          <PricingComponent
            currentPlanId={'pro'}
            onSubscribeAction={createSubscriptionAction}
            onFreeAction={handleFreePlanSubscription}
          />
        </div>
      </div>
    )
  }


  const containerWidthClass =
    resolvedCurrent === null || resolvedCurrent === 'free'
      ? 'max-w-6xl'
      : 'max-w-4xl'

  return (
    <div className='min-h-[calc(100vh-8rem)] flex items-center'>
      <div className={`${containerWidthClass} mx-auto w-full space-y-2`}>
        <PricingComponent
          currentPlanId={current}
          onSubscribeAction={createSubscriptionAction}
          onFreeAction={handleFreePlanSubscription}
        />
      </div>
    </div>
  )
}
