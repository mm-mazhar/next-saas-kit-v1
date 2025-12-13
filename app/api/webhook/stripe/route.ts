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

// Helper to find organization owner email if session email is missing
async function getOrgOwnerEmail(orgId: string): Promise<string | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          where: { role: 'OWNER' },
          include: { user: true },
          take: 1
        }
      }
    })
    return org?.members[0]?.user.email || null
  } catch {
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
  //    - PAYG: Handle Payment + Credits (with Transaction lock)
  //    - Subscription: Only Sync DB (Credits handled in Invoice event)
  // ============================================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Attempt to identify the Organization
    const customerId = String(session.customer || '')
    const refId = (session.client_reference_id as string | null) || (typeof session.metadata?.organizationId === 'string' ? session.metadata.organizationId : null)

    let orgId = refId
    
    // If we don't have a refId, try to find org by Stripe Customer ID
    if (!orgId && customerId) {
       const found = await prisma.organization.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } })
       orgId = found?.id || null
    }

    if (!orgId) {
        console.error('❌ Could not find Organization for session:', session.id)
        return new Response(null, { status: 200 })
    }

    // A. PAY AS YOU GO (One-time payment)
    if (session.mode === 'payment') {
      const sessionCreatedDate = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000)
      
      // Use Transaction to prevent Race Conditions on double-webhooks
      await prisma.$transaction(async (tx) => {
        const currentOrg = await tx.organization.findUnique({ where: { id: orgId! } })
        
        // Idempotency Check inside Transaction
        if (currentOrg?.lastPaygPurchaseAt && currentOrg.lastPaygPurchaseAt.getTime() === sessionCreatedDate.getTime()) {
           console.log(`🔹 Skipping duplicate PAYG event for session ${session.id}`)
           return 
        }

        const paygCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.payg)?.credits ?? 50
        
        await tx.organization.update({
          where: { id: orgId! },
          data: {
            credits: { increment: paygCredits },
            creditsReminderThresholdSent: false,
            lastPaygPurchaseAt: sessionCreatedDate,
            // Ensure stripe ID is linked if missing
            stripeCustomerId: currentOrg?.stripeCustomerId ? undefined : (customerId || undefined),
          },
        })

        console.log(`✅ PAYG Credits added for Org: ${orgId}`)
      })
      
      // Send Email (outside transaction)
      const to = (session.customer_details?.email as string | undefined) || (session.customer_email as string | undefined) || await getOrgOwnerEmail(orgId) || ''
      const amountTotal = typeof session.amount_total === 'number' ? session.amount_total : 0
      const currency = (session.currency as string | undefined) || 'usd'
      
      // ... Email logic ...
      let invoiceUrl = ''
      let invoiceNumber: string | null = null
      if (session.invoice) {
        // ... existing invoice fetch logic ...
        if (typeof session.invoice === 'string') {
            const inv = await stripe.invoices.retrieve(session.invoice)
            invoiceUrl = inv.hosted_invoice_url || ''
            invoiceNumber = (inv.number as string | null) || null
        }
      }

      let finalCredits: number | null = null
      try {
          const fresh = await prisma.organization.findUnique({ where: { id: orgId }, select: { credits: true } })
          finalCredits = fresh?.credits ?? null
      } catch {}

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

    // B. SUBSCRIPTION (Pro Plan, etc.) - SETUP ONLY
    const subscriptionId = session.subscription as string
    
    // Sync Stripe Customer ID if missing
    const currentOrg = await prisma.organization.findUnique({ where: { id: orgId }})
    if (!currentOrg?.stripeCustomerId && customerId) {
        await prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customerId } })
    }

    const subscription = (await stripe.subscriptions.retrieve(
      subscriptionId
    )) as Stripe.Subscription

    const p = subscription as unknown as PeriodFields
    const currentStart = p.current_period_start ?? Math.floor(Date.now() / 1000)
    const currentEnd =
      p.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

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
    console.log('✅ Organization Subscription synced to DB (Credits will be added via Invoice event)')

    // NOTE: We do NOT add credits here anymore. We rely on invoice.payment_succeeded.
    // This prevents double-crediting on initial signup.
  }

  // ============================================================
  // 2. INVOICE PAYMENT SUCCEEDED (Initial + Recurring)
  //    - Handles ALL subscription credit additions
  // ============================================================
  if (event.type === 'invoice.payment_succeeded') {
    const inv = event.data.object as Stripe.Invoice
    
    const invoice = event.data.object as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null
    }

    // We process ALL subscription invoices here (Initial Create AND Renewals)
    if (invoice.subscription) {
      const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : (invoice.subscription as Stripe.Subscription).id;

      const subscription = (await stripe.subscriptions.retrieve(
        subscriptionId
      )) as Stripe.Subscription

      // 1. Sync Subscription Dates
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
        console.error('⚠️ Could not update subscription (Organization might have deleted account)')
      }

      // 2. ADD CREDITS (The Single Source of Truth)
      try {
        const custId = String(subscription.customer || '')
        if (custId) {
          // Identify plan based on price ID from subscription
          const priceId = subscription.items.data[0].price.id
          // Default to Pro if match found, else fallback to 0 or logic
          const plan = PRICING_PLANS.find((p) => p.stripePriceId === priceId)
          const creditsToAdd = plan?.credits ?? 0

          if (creditsToAdd > 0) {
             await prisma.organization.update({
                where: { stripeCustomerId: custId },
                data: { credits: { increment: creditsToAdd }, creditsReminderThresholdSent: false },
             })
             console.log(`✅ Subscription Credits Added: ${creditsToAdd} for Customer ${custId}`)
          }
        }
      } catch (e) {
          console.error('Error adding subscription credits:', e)
      }

      // Send Email
      const custId = String(subscription.customer || '')
      const org = await prisma.organization.findUnique({ where: { stripeCustomerId: custId } })
      if (org) {
           const to = (inv.customer_email) || await getOrgOwnerEmail(org.id) || ''
           if (to) {
               // ... Send Payment Confirmation Email ...
               // Use helper sendPaymentConfirmationEmail
           }
      }
    }
  }

  // ============================================================
  // 3. SUBSCRIPTION UPDATED / DELETED
  // ============================================================
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    // ... Existing logic for syncing status ...
    // Note: Don't add credits here, handled by invoice
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

    // Check cancellation...
    const scheduled = !!fresh.cancel_at_period_end || !!fresh.cancel_at
    const immediateCanceled = fresh.status === 'canceled'
    
    if (scheduled && !immediateCanceled) {
       // ... Existing email logic ...
       try {
        const subRecord = await prisma.subscription.findUnique({ 
            where: { stripeSubscriptionId: fresh.id },
            include: { organization: true } 
        })
        if (subRecord?.organization) {
             const ownerEmail = await getOrgOwnerEmail(subRecord.organization.id)
             if (ownerEmail) {
                await sendCancellationEmail({
                    to: ownerEmail,
                    name: subRecord.organization.name,
                    planTitle: 'Pro',
                    effectiveDate: typeof fresh.cancel_at === 'number' ? fresh.cancel_at : ((fresh as unknown as PeriodFields).current_period_end as number | undefined),
                    final: false,
                    creditsRemaining: subRecord.organization.credits,
                })
             }
        }
      } catch {}
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    // ... Existing deletion logic ...
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
    } catch {}

    try {
        const org = await prisma.organization.findUnique({
            where: { stripeCustomerId: customerId },
            select: { id: true, name: true, credits: true }
        })
        if (org) {
            const ownerEmail = await getOrgOwnerEmail(org.id)
            if (ownerEmail) {
                 await sendCancellationEmail({
                    to: ownerEmail,
                    name: org.name,
                    planTitle: 'Pro',
                    effectiveDate: (sub as unknown as PeriodFields).current_period_end ?? undefined,
                    final: true,
                    creditsRemaining: org.credits,
                 })
            }
        }
    } catch {}
  }

  return new Response(null, { status: 200 })
}