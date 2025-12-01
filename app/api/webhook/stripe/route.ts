// app/api/webhook/stripe/route.ts

import prisma from '@/app/lib/db'
import { sendCancellationEmail, sendPaymentConfirmationEmail } from '@/app/lib/email'
import { stripe } from '@/app/lib/stripe'
import { PLAN_IDS, PRICING_PLANS } from '@/lib/constants'
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
    if (session.mode === 'payment') {
      const customerId = String(session.customer || '')
      const refId = (session.client_reference_id as string | null) || (typeof session.metadata?.userId === 'string' ? session.metadata.userId : null)
      let user = refId ? await prisma.user.findUnique({ where: { id: refId }, select: { id: true, stripeCustomerId: true } }) : null
      if (!user && customerId) {
        user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true, stripeCustomerId: true } })
      }
      if (!user) {
        const candidateEmail = (session.customer_details?.email as string | undefined) || (session.customer_email as string | undefined)
        if (candidateEmail) {
          user = await prisma.user.findUnique({ where: { email: candidateEmail }, select: { id: true, stripeCustomerId: true } })
        }
      }
      if (user) {
        try {
          const paygCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.payg)?.credits ?? 50
          await prisma.user.update({
            where: { id: user.id },
            data: {
              credits: { increment: paygCredits },
              creditsReminderThresholdSent: false,
              lastPaygPurchaseAt: new Date((session.created || Math.floor(Date.now()/1000)) * 1000),
              stripeCustomerId: user.stripeCustomerId ? user.stripeCustomerId : (customerId || undefined),
            },
          })
        } catch {}
      }
      const to = (session.customer_details?.email as string | undefined) || (session.customer_email as string | undefined)
      const amountTotal = typeof session.amount_total === 'number' ? session.amount_total : 0
      const currency = (session.currency as string | undefined) || 'usd'
      let invoiceUrl = ''
      let invoiceNumber: string | null = null
      if (session.invoice) {
        if (typeof session.invoice === 'string') {
          const inv = await stripe.invoices.retrieve(session.invoice)
          invoiceUrl = inv.hosted_invoice_url || ''
          invoiceNumber = (inv.number as string | null) || null
        } else {
          const invObj = session.invoice as Stripe.Invoice
          invoiceUrl = invObj.hosted_invoice_url || ''
          invoiceNumber = (invObj.number as string | null) || null
        }
      }
      let finalCredits: number | null = null
      if (user && user.id) {
        try {
          const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } })
          finalCredits = typeof fresh?.credits === 'number' ? fresh.credits : null
        } catch {}
      }
      if (to) {
        try {
          await sendPaymentConfirmationEmail({
            to,
            amountPaid: amountTotal,
            currency,
            invoiceUrl: invoiceUrl || (process.env.NEXT_PUBLIC_SITE_URL || ''),
            invoiceNumber,
            planTitle: 'Pay As You Go',
            portalUrl: null,
            finalCredits,
          })
        } catch {}
      }
      return new Response(null, { status: 200 })
    }
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
      const proCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro)?.credits ?? 100
      await prisma.user.update({ where: { id: user.id }, data: { credits: { increment: proCredits }, creditsReminderThresholdSent: false } })
    } catch {}
    const to2 = (session.customer_details?.email as string | undefined) || (session.customer_email as string | undefined)
    const amount2 = typeof session.amount_total === 'number' ? session.amount_total : 0
    const currency2 = (session.currency as string | undefined) || 'usd'
    let invUrl2 = ''
    let invNum2: string | null = null
    if (session.invoice) {
      if (typeof session.invoice === 'string') {
        const inv = await stripe.invoices.retrieve(session.invoice)
        invUrl2 = inv.hosted_invoice_url || ''
        invNum2 = (inv.number as string | null) || null
      } else {
        const invObj = session.invoice as Stripe.Invoice
        invUrl2 = invObj.hosted_invoice_url || ''
        invNum2 = (invObj.number as string | null) || null
      }
    }
    let finalCredits2: number | null = null
    try {
      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } })
      finalCredits2 = typeof freshUser?.credits === 'number' ? freshUser.credits : null
    } catch {}
    if (to2) {
      try {
        await sendPaymentConfirmationEmail({
          to: to2,
          amountPaid: amount2,
          currency: currency2,
          invoiceUrl: invUrl2 || (process.env.NEXT_PUBLIC_SITE_URL || ''),
          invoiceNumber: invNum2,
          planTitle: 'Pro',
          periodEnd: currentEnd,
          portalUrl: null,
          finalCredits: finalCredits2,
        })
      } catch {}
    }
  }

  // ============================================================
  // 2. INVOICE PAYMENT SUCCEEDED (Recurring Renewals)
  // ============================================================
  if (event.type === 'invoice.payment_succeeded') {
    const inv = event.data.object as Stripe.Invoice
    // console.log('🔹 Invoice Payment Succeeded (Recurring Renewals):', event.data.object)
    // console.log(`🔹 Invoice Succeeded: ${inv.id} | Amount: ${inv.amount_paid}`)
    console.log(`🔹 Invoice Payment Succeeded: ${inv.id} for Customer ${inv.customer}`)
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
        console.error('⚠️ Could not update subscription (User might have deleted account)')
      }

      // 1b. Add credits on successful renewal
      try {
        const custId = String(subscription.customer || '')
        if (custId) {
          const proCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro)?.credits ?? 100
          await prisma.user.update({
            where: { stripeCustomerId: custId },
            data: { credits: { increment: proCredits }, creditsReminderThresholdSent: false },
          })
        }
      } catch {}

      // Email sending disabled
    }
  }

  // Email sending disabled

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
    if (scheduled && !immediateCanceled) {
      try {
        const customerId = String(fresh.customer || '')
        const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { email: true, name: true, credits: true } })
        if (user?.email) {
          await sendCancellationEmail({
            to: user.email,
            name: user.name ?? null,
            planTitle: 'Pro',
            effectiveDate: typeof fresh.cancel_at === 'number' ? fresh.cancel_at : ((fresh as unknown as PeriodFields).current_period_end as number | undefined),
            final: false,
            creditsRemaining: typeof user.credits === 'number' ? user.credits : null,
          })
        }
      } catch {}
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    console.log('🔹 Subscription Deleted:', { id: sub.id })
    const customerId = String(sub.customer || '')
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { email: true, name: true, credits: true },
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
    if (user?.email) {
      try {
        await sendCancellationEmail({
          to: user.email,
          name: user.name ?? null,
          planTitle: 'Pro',
          effectiveDate: (sub as unknown as PeriodFields).current_period_end ?? undefined,
          final: true,
          creditsRemaining: typeof user.credits === 'number' ? user.credits : null,
        })
      } catch {}
    }
  }

  return new Response(null, { status: 200 })
}

