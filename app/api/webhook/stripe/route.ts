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

// ✅ FIXED: Fetch both Email and Name
async function getOrgOwner(orgId: string): Promise<{ email: string; name: string | null } | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          where: { role: 'OWNER' },
          include: { user: true },
          take: 1,
        },
      },
    })
    const user = org?.members[0]?.user
    return user ? { email: user.email, name: user.name } : null
  } catch (error) {
    console.error('[Stripe Webhook] Failed to load organization owner', { orgId, error })
    return null
  }
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
  // 1. CHECKOUT SESSION COMPLETED
  // ============================================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const customerId = String(session.customer || '')
    const refId = (session.client_reference_id as string | null) || (typeof session.metadata?.organizationId === 'string' ? session.metadata.organizationId : null)

    let orgId = refId
    if (!orgId && customerId) {
       const found = await prisma.organization.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } })
       orgId = found?.id || null
    }

    if (!orgId) {
        return new Response(null, { status: 200 })
    }

    // A. PAY AS YOU GO
    if (session.mode === 'payment') {
      const sessionCreatedDate = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000)
      
      await prisma.$transaction(async (tx) => {
        const currentOrg = await tx.organization.findUnique({ where: { id: orgId! } })
        
        if (currentOrg?.lastPaygPurchaseAt && currentOrg.lastPaygPurchaseAt.getTime() === sessionCreatedDate.getTime()) {
           return 
        }

        const paygCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro)?.credits ?? 50
        
        await tx.organization.update({
          where: { id: orgId! },
          data: {
            credits: { increment: paygCredits },
            creditsReminderThresholdSent: false,
            lastPaygPurchaseAt: sessionCreatedDate,
            stripeCustomerId: currentOrg?.stripeCustomerId ? undefined : (customerId || undefined),
          },
        })
      })
      
      // ✅ FIXED: Fetch Owner details properly
      const owner = await getOrgOwner(orgId)
      const to = (session.customer_details?.email) || (session.customer_email) || owner?.email || ''
      const userName = owner?.name || 'Customer'
      
      const amountTotal = typeof session.amount_total === 'number' ? session.amount_total : 0
      const currency = (session.currency as string | undefined) || 'usd'
      
      let invoiceUrl = ''
      let invoiceNumber: string | null = null
      if (session.invoice && typeof session.invoice === 'string') {
        const inv = await stripe.invoices.retrieve(session.invoice)
        invoiceUrl = inv.hosted_invoice_url || ''
        invoiceNumber = (inv.number as string | null) || null
      }

      let finalCredits: number | null = null
      let orgName: string | null = null

      try {
          const fresh = await prisma.organization.findUnique({ where: { id: orgId }, select: { credits: true, name: true } })
          finalCredits = fresh?.credits ?? null
          orgName = fresh?.name ?? null
      } catch {}

      if (to) {
        try {
          await sendPaymentConfirmationEmail({
            to,
            name: userName, // ✅ Passing User Name
            orgName,       // ✅ Passing Org Name separately
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
    console.log(`[Stripe Webhook] Processing checkout.session.completed for session ${session.id}, subscription ${subscriptionId}, orgId ${orgId}`)

    // 1. Fetch Org
    const currentOrg = await prisma.organization.findUnique({ where: { id: orgId } })
    if (!currentOrg) {
        console.log(`[Stripe Webhook] Organization ${orgId} not found`)
        return new Response(null, { status: 200 })
    }

    // 2. Fetch Existing Subscription explicitly
    const existingSub = await prisma.subscription.findUnique({
        where: { organizationId: orgId }
    })
    
    console.log(`[Stripe Webhook] Existing DB Subscription for Org:`, existingSub)

    // 3. Robust Cancellation via Stripe API
    // We strictly enforce 1 Active Subscription per Organization (Customer)
    if (customerId) {
        try {
            console.log(`[Stripe Webhook] checking for conflicting subscriptions for customer ${customerId}`)
            const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: 'all',
                limit: 100,
            })
            
            const activeStatuses = ['active', 'trialing', 'past_due']
            
            for (const sub of subscriptions.data) {
                 if (sub.id === subscriptionId) continue
                 
                 if (activeStatuses.includes(sub.status)) {
                     console.log(`[Stripe Webhook] Found conflicting subscription ${sub.id} (${sub.status}) - Cancelling...`)
                     await stripe.subscriptions.cancel(sub.id)
                     console.log(`[Stripe Webhook] Cancelled conflicting subscription ${sub.id}`)
                 }
            }
        } catch (error) {
             console.error('[Stripe Webhook] Failed to clean up old subscriptions', error)
        }
    }

    if (!currentOrg.stripeCustomerId && customerId) {
        await prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customerId } })
    }

    const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription
    const p = subscription as unknown as PeriodFields
    const currentStart = p.current_period_start ?? Math.floor(Date.now() / 1000)
    const currentEnd = p.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    const subscribedPriceId = subscription.items.data[0].price.id
    const subscribedPlan = PRICING_PLANS.find((pl) => pl.stripePriceId === subscribedPriceId)
    const subscribedCredits = subscribedPlan?.credits ?? 0
    const subscribedTitle = subscribedPlan?.title ?? 'Subscription'

    await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: {
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        status: subscription.status,
        planId: subscription.items.data[0].price.id,
        interval: String(subscription.items.data[0].price.recurring?.interval || 'month'),
        periodEndReminderSent: false,
      },
      create: {
        stripeSubscriptionId: subscription.id,
        organizationId: orgId,
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        status: subscription.status,
        planId: subscription.items.data[0].price.id,
        interval: String(subscription.items.data[0].price.recurring?.interval || 'month'),
        periodEndReminderSent: false,
      },
    })

    try {
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          credits: { increment: subscribedCredits },
          creditsReminderThresholdSent: false,
        },
      })
    } catch (error) {
      console.error('[Stripe Webhook] Failed to apply initial Pro credits on checkout.session.completed', {
        orgId,
        subscriptionId,
        error,
      })
    }

    // ✅ FIXED: Fetch Owner details properly
    const owner = await getOrgOwner(orgId)
    const to2 = (session.customer_details?.email) || (session.customer_email) || owner?.email || ''
    const userName2 = owner?.name || 'Customer'
    
    const amount2 = typeof session.amount_total === 'number' ? session.amount_total : 0
    const currency2 = (session.currency as string | undefined) || 'usd'
    let invUrl2 = ''
    let invNum2: string | null = null
    
    if (session.invoice && typeof session.invoice === 'string') {
        const inv = await stripe.invoices.retrieve(session.invoice)
        invUrl2 = inv.hosted_invoice_url || ''
        invNum2 = (inv.number as string | null) || null
    }
    
    let finalCredits2: number | null = null
    try {
      const freshOrg = await prisma.organization.findUnique({ where: { id: orgId }, select: { credits: true } })
      finalCredits2 = freshOrg?.credits ?? null
    } catch {}
    
    if (to2) {
      try {
        await sendPaymentConfirmationEmail({
          to: to2,
          name: userName2, // ✅ User Name
          orgName: currentOrg.name, // ✅ Org Name
          amountPaid: amount2,
          currency: currency2,
          invoiceUrl: invUrl2 || (process.env.NEXT_PUBLIC_SITE_URL || ''),
          invoiceNumber: invNum2,
          planTitle: subscribedTitle,
          periodEnd: currentEnd,
          portalUrl: null,
          finalCredits: finalCredits2,
        })
      } catch {}
    }
  }

  // ============================================================
  // 2. INVOICE PAYMENT SUCCEEDED
  // ============================================================
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
    
    if (invoice.billing_reason === 'subscription_create') {
       return new Response(null, { status: 200 })
    }

    if (invoice.subscription) {
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : (invoice.subscription as Stripe.Subscription).id;
      const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription

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

        const custId = String(subscription.customer || '')
        if (custId) {
          const priceId = subscription.items.data[0].price.id
          const plan = PRICING_PLANS.find((pl) => pl.stripePriceId === priceId)
          const credits = plan?.credits ?? 0
          await prisma.organization.update({
            where: { stripeCustomerId: custId },
            data: { credits: { increment: credits }, creditsReminderThresholdSent: false },
          })
        }
      } catch (error) {
        console.error('[Stripe Webhook] Failed to process invoice.payment_succeeded credits update', {
          subscriptionId: subscription.id,
          error,
        })
      }
    }
  }

  // ============================================================
  // 3. SUBSCRIPTION UPDATED / DELETED
  // ============================================================
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
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
    } catch (error: any) {
      if (error.code === 'P2025') {
        console.log(`[Stripe Webhook] Subscription ${fresh.id} not found in DB during update. Skipping.`)
      } else {
        console.error('[Stripe Webhook] Failed to update subscription on customer.subscription.updated', {
          subscriptionId: fresh.id,
          error,
        })
      }
    }
    
    const scheduled = !!fresh.cancel_at_period_end || !!fresh.cancel_at
    const immediateCanceled = fresh.status === 'canceled'
    
    if (scheduled && !immediateCanceled) {
      try {
        const subRecord = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: fresh.id },
          include: { organization: true },
        })
        if (subRecord?.organization) {
          const owner = await getOrgOwner(subRecord.organization.id)
          if (owner?.email) {
            const priceId = fresh.items.data[0].price.id
            const plan = PRICING_PLANS.find((pl) => pl.stripePriceId === priceId)
            const planTitle = plan?.title ?? 'Subscription'
            await sendCancellationEmail({
              to: owner.email,
              name: owner.name,
              orgName: subRecord.organization.name,
              planTitle,
              effectiveDate:
                typeof fresh.cancel_at === 'number'
                  ? fresh.cancel_at
                  : ((fresh as unknown as PeriodFields).current_period_end as number | undefined),
              final: false,
              creditsRemaining: subRecord.organization.credits,
            })
          }
        }
      } catch (error) {
        console.error('[Stripe Webhook] Failed to send scheduled cancellation email', {
          subscriptionId: fresh.id,
          error,
        })
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const customerId = String(sub.customer || '')
    try {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: sub.status,
          currentPeriodEnd: (sub as unknown as PeriodFields).current_period_end ?? undefined,
        },
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        console.log(`[Stripe Webhook] Subscription ${sub.id} not found in DB during deletion. Skipping update.`)
      } else {
        console.error('[Stripe Webhook] Failed to update subscription on customer.subscription.deleted', {
          subscriptionId: sub.id,
          error,
        })
      }
    }

    try {
      const org = await prisma.organization.findUnique({
        where: { stripeCustomerId: customerId },
        select: { id: true, name: true, credits: true, deletedAt: true },
      })
      if (org && !org.deletedAt) {
        const owner = await getOrgOwner(org.id)
        if (owner?.email) {
          const priceId = sub.items.data[0].price.id
          const plan = PRICING_PLANS.find((pl) => pl.stripePriceId === priceId)
          const planTitle = plan?.title ?? 'Subscription'
          await sendCancellationEmail({
            to: owner.email,
            name: owner.name,
            orgName: org.name,
            planTitle,
            effectiveDate: (sub as unknown as PeriodFields).current_period_end ?? undefined,
            final: true,
            creditsRemaining: org.credits,
          })
        }
      }
    } catch (error) {
      console.error('[Stripe Webhook] Failed to send final cancellation email', {
        customerId,
        error,
      })
    }
  }

  return new Response(null, { status: 200 })
}
