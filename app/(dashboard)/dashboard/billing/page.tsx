// app/(dashboard)/dashboard/billing/page.tsx

import {
  StripePortal,
  StripeSubscriptionCreationButton,
} from '@/components/Submitbuttons'
import prisma from '@/app/lib/db'
import { getStripeSession, stripe } from '@/app/lib/stripe'
import { createClient } from '@/app/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { CheckCircle2 } from 'lucide-react'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  LOCAL_SITE_URL,
  PRICE_01,
  PRICE_01_DESC,
  PRICE_01_FEATUREITEMS_LST,
  PRODUCTION_URL,
  STRIPE_PRICE_ID,
} from '@/lib/constants'

const featureItems = PRICE_01_FEATUREITEMS_LST.map((feature: string) => ({
  name: feature,
}))

async function getData(userId: string) {
  noStore()
  const data = await prisma.subscription.findUnique({
    where: {
      userId: userId,
    },
    select: {
      status: true,
      user: {
        select: {
          stripeCustomerId: true,
        },
      },
    },
  })

  return data
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

  async function createSubscription() {
    'use server'

    const dbUser = await prisma.user.findUnique({
      where: { id: user?.id },
      select: { stripeCustomerId: true, email: true, name: true },
    })

    let stripeCustomerId = dbUser?.stripeCustomerId

    if (!stripeCustomerId) {
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

    const subscriptionUrl = await getStripeSession({
      customerId: stripeCustomerId,
      domainUrl:
        process.env.NODE_ENV === 'production' ? PRODUCTION_URL : LOCAL_SITE_URL,
      priceId: STRIPE_PRICE_ID,
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

  if (data?.status === 'active') {
    return (
      <div className='grid items-start gap-8'>
        <div className='flex items-center justify-between px-2'>
          <div className='grid gap-1'>
            <h1 className='text-3xl md:text-4xl '>Subscription</h1>
            <p className='text-lg text-muted-foreground'>
              Settings reagding your subscription
            </p>
          </div>
        </div>

        <Card className='w-full lg:w-2/3'>
          <CardHeader>
            <CardTitle>Edit Subscription</CardTitle>
            <CardDescription>
              Click on the button below, this will give you the opportunity to
              <span className='font-bold text-secondary-foreground'>
                {' '}change your payment details,
              </span>
              <span className='font-bold text-secondary-foreground'>
                {' '}view your statement
              </span>{' '}
              and
              <span className='font-bold text-secondary-foreground'>
                {' '}Cancel Subscription{' '}
              </span>
              at the same time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCustomerPortal}>
              <StripePortal />
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='max-w-md mx-auto space-y-4'>
      <Card className='flex flex-col'>
        <CardContent className='py-8'>
          <div>
            <h3 className='inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-primary/10 text-primary'>
              Monthly
            </h3>
          </div>

          <div className='mt-4 flex items-baseline text-6xl font-extrabold'>
            ${PRICE_01}
            <span className='ml-1 text-2xl text-muted-foreground'>/mo</span>
          </div>
          <p className='mt-5 text-lg text-muted-foreground'>{PRICE_01_DESC}</p>
        </CardContent>
        <div className='flex-1 flex flex-col justify-between px-6 pt-6 pb-8 bg-secondary rounded-lg m-1 space-y-6 sm:p-10 sm:pt-6'>
          <ul className='space-y-4'>
            {featureItems.map((item, index) => (
              <li key={index} className='flex items-center'>
                <div className='flex-shrink-0'>
                  <CheckCircle2 className='h-6 w-6 text-primary' />
                </div>
                <p className='ml-3 text-base'>{item.name}</p>
              </li>
            ))}
          </ul>

          <form className='w-full' action={createSubscription}>
            <StripeSubscriptionCreationButton />
          </form>
        </div>
      </Card>
    </div>
  )
}
