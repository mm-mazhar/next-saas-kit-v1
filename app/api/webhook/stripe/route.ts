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
  // 1. CHECKOUT SESSION COMPLETED (First Payment / Sign up)
  // ============================================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    
    // Attempt to identify the Organization
    const customerId = String(session.customer || '')
    const refId = (session.client_reference_id as string | null) || (typeof session.metadata?.organizationId === 'string' ? session.metadata.organizationId : null)

    let org = refId ? await prisma.organization.findUnique({ where: { id: refId }, select: { id: true, stripeCustomerId: true } }) : null
    
    if (!org && customerId) {
       org = await prisma.organization.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true, stripeCustomerId: true } })
    }

    if (!org) {
        // Fallback: If we can't find the Org, we can't credit it.
        // This might happen if someone pays without an Org context? Should be rare with our enforcement.
        console.error('❌ Could not find Organization for session:', session.id)
        return new Response(null, { status: 200 })
    }

    // A. PAY AS YOU GO (One-time payment)
    if (session.mode === 'payment') {
      try {
          const paygCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.payg)?.credits ?? 50
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              credits: { increment: paygCredits },
              creditsReminderThresholdSent: false,
              lastPaygPurchaseAt: new Date((session.created || Math.floor(Date.now()/1000)) * 1000),
              // Ensure stripe ID is linked
              stripeCustomerId: org.stripeCustomerId ? org.stripeCustomerId : (customerId || undefined),
            },
          })
      } catch (e) {
          console.error('Error updating PAYG credits:', e)
      }
      
      const to = (session.customer_details?.email as string | undefined) || (session.customer_email as string | undefined) || await getOrgOwnerEmail(org.id) || ''
      
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
      try {
          const fresh = await prisma.organization.findUnique({ where: { id: org.id }, select: { credits: true } })
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

    // B. SUBSCRIPTION (Pro Plan, etc.)
    const subscriptionId = session.subscription as string

    // Sync Database
    if (!org.stripeCustomerId && customerId) {
        await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } })
    }

    const subscription = (await stripe.subscriptions.retrieve(
      subscriptionId
    )) as Stripe.Subscription

    const p = subscription as unknown as PeriodFields
    const currentStart = p.current_period_start ?? Math.floor(Date.now() / 1000)
    const currentEnd =
      p.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

    await prisma.subscription.upsert({
      where: { organizationId: org.id }, // Use organizationId unique logic
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
        organizationId: org.id,
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
    console.log('✅ Organization Subscription synced to DB')

    try {
      const proCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro)?.credits ?? 100
      await prisma.organization.update({ 
          where: { id: org.id }, 
          data: { 
              credits: { increment: proCredits }, 
              creditsReminderThresholdSent: false 
          } 
      })
    } catch {}

    const to2 = (session.customer_details?.email as string | undefined) || (session.customer_email as string | undefined) || await getOrgOwnerEmail(org.id) || ''
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
      const freshOrg = await prisma.organization.findUnique({ where: { id: org.id }, select: { credits: true } })
      finalCredits2 = freshOrg?.credits ?? null
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
    console.log(`🔹 Invoice Payment Succeeded: ${inv.id} for Customer ${inv.customer}`)
    
    const invoice = event.data.object as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null
    }
    
    if (invoice.billing_reason === 'subscription_create') {
       console.log('🔹 Skipping invoice event (handled by checkout session)')
       return new Response(null, { status: 200 })
    }

    if (invoice.subscription) {
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
        console.error('⚠️ Could not update subscription (Organization might have deleted account)')
      }

      // 1b. Add credits on successful renewal -> TO ORGANIZATION
      try {
        const custId = String(subscription.customer || '')
        if (custId) {
          const proCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro)?.credits ?? 100
          await prisma.organization.update({
            where: { stripeCustomerId: custId },
            data: { credits: { increment: proCredits }, creditsReminderThresholdSent: false },
          })
        }
      } catch {}
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
    } catch {}
    
    const scheduled = !!fresh.cancel_at_period_end || !!fresh.cancel_at
    const immediateCanceled = fresh.status === 'canceled'
    
    if (scheduled && !immediateCanceled) {
      try {
        // Fetch Org Owner to notify
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

    // Notify
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
