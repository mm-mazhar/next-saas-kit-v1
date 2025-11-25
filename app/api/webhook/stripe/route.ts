// app/api/webhook/stripe/route.ts

import prisma from '@/app/lib/db'
import { sendCancellationEmail, sendPaymentConfirmationEmail } from '@/app/lib/email'
import { stripe } from '@/app/lib/stripe'
import { PRICING_PLANS } from '@/lib/constants'
import { headers } from 'next/headers'
import Stripe from 'stripe'

type PeriodFields = {
  current_period_start?: number
  current_period_end?: number
}

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
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  // ============================================================
  // 1. CHECKOUT SESSION COMPLETED (First Payment / Sign up)
  // ============================================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const subscriptionId = session.subscription as string
    const customerId = String(session.customer)

    // A. Sync Database (robust linking)
    let user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
    if (!user) {
      let candidateEmail = (session.customer_details?.email as string | undefined) || (session.customer_email as string | undefined)
      if (!candidateEmail) {
        try {
          const cust = await stripe.customers.retrieve(customerId)
          if (!('deleted' in cust)) {
            const c = cust as Stripe.Customer
            candidateEmail = (typeof c.email === 'string' ? c.email : undefined)
          }
        } catch {}
      }
      if (candidateEmail) {
        const byEmail = await prisma.user.findUnique({ where: { email: candidateEmail } })
        if (byEmail) {
          await prisma.user.update({ where: { id: byEmail.id }, data: { stripeCustomerId: customerId } })
          user = byEmail
        }
      }
      if (!user) {
        return new Response(null, { status: 200 })
      }
    }

    const subscription = (await stripe.subscriptions.retrieve(
      subscriptionId
    )) as Stripe.Subscription

    const p = subscription as unknown as PeriodFields
    const currentStart = p.current_period_start ?? Math.floor(Date.now() / 1000)
    const currentEnd =
      p.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        status: subscription.status,
        planId: subscription.items.data[0].price.id,
        interval: String(
          subscription.items.data[0].price.recurring?.interval || 'month'
        ),
        periodEndReminderSent: false,
      },
      create: {
        stripeSubscriptionId: subscription.id,
        userId: user.id,
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        status: subscription.status,
        planId: subscription.items.data[0].price.id,
        interval: String(
          subscription.items.data[0].price.recurring?.interval || 'month'
        ),
        periodEndReminderSent: false,
      },
    })
    console.log('✅ Subscription synced to DB')

    try {
      await prisma.user.update({ where: { id: user.id }, data: { credits: 0, creditsReminderThresholdSent: false } })
    } catch {}

    // B. Send Welcome / First Payment Email
    // We fetch the invoice details specifically to get the hosted_invoice_url
    if (session.invoice) {
      try {
        const invoice = await stripe.invoices.retrieve(session.invoice as string)
        const priceId = subscription.items.data[0].price.id
        const plan = PRICING_PLANS.find((p) => p.stripePriceId === priceId)
        const sp = subscription as unknown as PeriodFields

        await sendPaymentConfirmationEmail({
          to: user.email!,
          name: user.name,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          invoiceUrl: invoice.hosted_invoice_url || '',
          invoiceNumber: invoice.number,
          planTitle: plan?.title,
          periodEnd: sp.current_period_end,
          from: process.env.RESEND_FROM,
        })
        console.log('✅ First Payment Email Sent')
      } catch (e) {
        console.error('❌ Failed to send first payment email:', e)
      }
    }
  }

  // ============================================================
  // 2. INVOICE PAYMENT SUCCEEDED (Recurring Renewals)
  // ============================================================
  if (event.type === 'invoice.payment_succeeded') {
    console.log('🔹 Invoice Payment Succeeded (Recurring Renewals):', event.data.object)
    const invoice = event.data.object as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null
      customer_email?: string | null
      hosted_invoice_url?: string | null
      number?: string | null
    }
    
    // CRITICAL FIX: Ignore 'subscription_create' events here because 
    // we already handled them in checkout.session.completed above.
    if (invoice.billing_reason === 'subscription_create') {
       console.log('🔹 Skipping invoice event (handled by checkout session)')
       return new Response(null, { status: 200 })
    }

    if (invoice.subscription) {
       // This logic now only runs for Month 2, Month 3, etc.
       // where subscription ID is guaranteed to exist.
      const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : (invoice.subscription as Stripe.Subscription).id;

      const subscription = (await stripe.subscriptions.retrieve(
        subscriptionId
      )) as Stripe.Subscription

      try {
        const sp = subscription as unknown as PeriodFields
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            currentPeriodStart: sp.current_period_start ?? undefined,
            currentPeriodEnd: sp.current_period_end ?? undefined,
            status: subscription.status,
            planId: subscription.items.data[0].price.id,
            interval: String(subscription.items.data[0].price.recurring?.interval || 'month'),
            periodEndReminderSent: false,
          },
        })
      } catch {
        console.log('⚠️ Could not update subscription (User might have deleted account)')
      }

      // 1b. Reset credits on successful renewal
      try {
        const custId = String(subscription.customer || '')
        if (custId) {
          await prisma.user.update({
            where: { stripeCustomerId: custId },
            data: { credits: 0, creditsReminderThresholdSent: false },
          })
        }
      } catch {}

      // 2. Send Renewal Email
      const recipientEmail = invoice.customer_email || null
      if (recipientEmail) {
        try {
           const priceId = subscription.items.data[0].price.id
           const plan = PRICING_PLANS.find((p) => p.stripePriceId === priceId)
           const sp = subscription as unknown as PeriodFields
           await sendPaymentConfirmationEmail({
            to: recipientEmail,
            name: undefined,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
            invoiceUrl: invoice.hosted_invoice_url || '',
            invoiceNumber: invoice.number,
            planTitle: plan?.title,
            periodEnd: sp.current_period_end,
            from: process.env.RESEND_FROM,
           })
           console.log('✅ Renewal Email Sent')
        } catch (e) {
           console.error('❌ Failed to send renewal email', e)
        }
      }
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    console.log('🔹 Subscription Updated:', { id: sub.id, cancel_at_period_end: sub.cancel_at_period_end })
    const fresh = (await stripe.subscriptions.retrieve(sub.id)) as Stripe.Subscription
    try {
      const sp = fresh as unknown as PeriodFields
      await prisma.subscription.update({
        where: { stripeSubscriptionId: fresh.id },
        data: {
          planId: fresh.items.data[0].price.id,
          interval: String(fresh.items.data[0].price.recurring?.interval || 'month'),
          status: fresh.status,
          currentPeriodStart: sp.current_period_start ?? undefined,
          currentPeriodEnd: sp.current_period_end ?? undefined,
          periodEndReminderSent: false,
        },
      })
    } catch {}
    const scheduled = !!fresh.cancel_at_period_end || !!fresh.cancel_at
    const immediateCanceled = fresh.status === 'canceled'
    if (scheduled || immediateCanceled) {
      const customerId = String(sub.customer || '')
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId },
        select: { email: true, name: true },
      })
      const priceId = fresh.items.data[0].price.id
      const plan = PRICING_PLANS.find((p) => p.stripePriceId === priceId)
      const customer = user?.email ? null : await stripe.customers.retrieve(customerId)
      const toEmail = user?.email || (
        customer && !('deleted' in customer)
          ? (customer as Stripe.Customer).email || null
          : null
      )
      if (toEmail) {
        try {
          const effective = (fresh as unknown as PeriodFields).current_period_end ?? null
          await sendCancellationEmail({
            to: toEmail,
            name: user?.name,
            planTitle: plan?.title || 'Subscription',
            effectiveDate: effective ?? null,
            final: immediateCanceled,
            from: process.env.RESEND_FROM,
          })
        } catch {}
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    console.log('🔹 Subscription Deleted:', { id: sub.id })
    const customerId = String(sub.customer || '')
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { email: true, name: true },
    })
    try {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: sub.status,
          currentPeriodEnd: (sub as unknown as PeriodFields).current_period_end ?? undefined,
        },
      })
    } catch {}
    const priceId = sub.items.data[0].price.id
    const plan = PRICING_PLANS.find((p) => p.stripePriceId === priceId)
    const customer = user?.email ? null : await stripe.customers.retrieve(customerId)
    const toEmail = user?.email || (
      customer && !('deleted' in customer)
        ? (customer as Stripe.Customer).email || null
        : null
    )
    if (toEmail) {
      try {
        const effective = (sub as unknown as PeriodFields).current_period_end ?? null
        await sendCancellationEmail({
          to: toEmail,
          name: user?.name,
          planTitle: plan?.title || 'Subscription',
          effectiveDate: effective ?? null,
          final: true,
          from: process.env.RESEND_FROM,
        })
      } catch {}
    }
  }

  return new Response(null, { status: 200 })
}

