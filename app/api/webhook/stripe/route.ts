// app/api/webhook/stripe/route.ts

import prisma from '@/app/lib/db'
import { stripe } from '@/app/lib/stripe'
import { headers } from 'next/headers'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()

  const signature = (await headers()).get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch (error) {
    console.error('Stripe webhook: Error constructing event:', error)
    return new Response('Webhook signature verification failed', {
      status: 400,
    })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    )
    const customerId = String(session.customer)

    const user = await prisma.user.findUnique({
      where: {
        stripeCustomerId: customerId,
      },
    })

    if (!user) throw new Error('User not found...')

    await prisma.subscription.upsert({
      where: {
        userId: user.id,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: subscription.items.data[0].current_period_start,
        currentPeriodEnd: subscription.items.data[0].current_period_end,
        status: subscription.status,
        planId: subscription.items.data[0].plan.id,
        interval: String(subscription.items.data[0].plan.interval),
      },
      create: {
        stripeSubscriptionId: subscription.id,
        userId: user.id,
        currentPeriodStart: subscription.items.data[0].current_period_start,
        currentPeriodEnd: subscription.items.data[0].current_period_end,
        status: subscription.status,
        planId: subscription.items.data[0].plan.id,
        interval: String(subscription.items.data[0].plan.interval),
      },
    })
  }

  if (event.type === 'invoice.payment_succeeded') {
    // A local interface to extend the type and include the subscription property.
    interface InvoiceWithSubscription extends Stripe.Invoice {
      subscription?: string
    }

    const invoice = event.data.object as InvoiceWithSubscription

    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription
      )

      await prisma.subscription.update({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          planId: subscription.items.data[0].price.id,
          currentPeriodStart: subscription.items.data[0].current_period_start,
          currentPeriodEnd: subscription.items.data[0].current_period_end,
          status: subscription.status,
        },
      })
    }
  }

  return new Response(null, { status: 200 })
}
