// app/(dashboard)/dashboard/billing/actions.ts

'use server'

import prisma from '@/app/lib/db'
import { getStripeSession, stripe } from '@/app/lib/stripe'
import { createClient } from '@/app/lib/supabase/server'
import { requireOrgRole } from '@/lib/auth/guards'
import { LOCAL_SITE_URL, PLAN_IDS, PRICING_PLANS, PRODUCTION_URL, SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD, type PlanId } from '@/lib/constants'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function createSubscriptionAction(formData: FormData) {
  const planId = formData.get('planId') as PlanId
  const priceId = PRICING_PLANS.find((p) => p.id === planId)?.stripePriceId
  if (!priceId) return

  const cStore = await cookies()
  const orgId = cStore.get('current-org-id')?.value
  const sb = await createClient()
  const { data: { user: u } } = await sb.auth.getUser()
  
  if (!u || !orgId) return

  await requireOrgRole(orgId, u.id, 'ADMIN')

  const currentOrg = await prisma.organization.findUnique({ where: { id: orgId } })

  const origin = process.env.NODE_ENV === 'production' ? PRODUCTION_URL : LOCAL_SITE_URL
  const mode = 'subscription'
  const url = await getStripeSession({
    priceId,
    domainUrl: origin,
    customerId: currentOrg?.stripeCustomerId as string | undefined,
    organizationId: orgId,
    userId: u.id,
    mode,
  })
  return redirect(url)
}

export async function handleFreePlanSubscription() {
  const cStore = await cookies()
  const orgId = cStore.get('current-org-id')?.value
  const sb = await createClient()
  const { data: { user: u } } = await sb.auth.getUser()
  
  if (!u || !orgId) return redirect('/dashboard')
  
  await requireOrgRole(orgId, u.id, 'ADMIN')

  const existing = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  })
  if (existing) {
    await prisma.subscription.update({
      where: { organizationId: orgId },
      data: { planId: PLAN_IDS.free, status: 'active' },
    })
  }
  return redirect('/dashboard')
}

export async function createCustomerPortal() {
  const cStore = await cookies()
  const orgId = cStore.get('current-org-id')?.value
  const sb = await createClient()
  const { data: { user: u } } = await sb.auth.getUser()
  if (!u || !orgId) return

  await requireOrgRole(orgId, u.id, 'ADMIN')
  const currentOrg = await prisma.organization.findUnique({ where: { id: orgId } })

  if (!currentOrg?.stripeCustomerId) return

  const session = await stripe.billingPortal.sessions.create({
    customer: currentOrg.stripeCustomerId,
    return_url: process.env.NODE_ENV === 'production' ? PRODUCTION_URL : `${LOCAL_SITE_URL}/dashboard`,
  })
  return redirect(session.url)
}

export async function renewSubscription(): Promise<{ success: boolean; message?: string; url?: string }> {
  try {
    const cStore = await cookies()
    const orgId = cStore.get('current-org-id')?.value
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()

    if (!u || !orgId) return { success: false, message: 'Unauthorized' }

    // 1. Verify Role
    try {
      await requireOrgRole(orgId, u.id, 'ADMIN')
    } catch {
      return { success: false, message: 'Insufficient permissions' }
    }

    console.log('[renewSubscription] Starting renewal for org:', orgId)

    // 2. Fetch Subscription & Credits
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true }
    })

    if (!org || !org.subscription?.planId) {
      console.error('[renewSubscription] No active subscription/plan found for org:', orgId)
      return { success: false, message: 'No active subscription found' }
    }

    // 3. Verify Credits < SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD
    if (org.credits >= SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD) {
      console.warn('[renewSubscription] High credits detected during action:', org.credits)
      return { success: false, message: `Credits must be below ${SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD} to renew early` }
    }

    // 4. Create New Subscription Checkout Session
    // We create a new subscription for the SAME plan.
    // The webhook will handle cancelling the old one automatically.
    const currentPlanId = org.subscription.planId
    const priceId = PRICING_PLANS.find((p) => p.stripePriceId === currentPlanId || p.id === currentPlanId)?.stripePriceId
    
    if (!priceId) {
       return { success: false, message: 'Could not resolve price ID for renewal' }
    }

    console.log('[renewSubscription] Creating Checkout Session for new subscription. Price:', priceId)
    
    const origin = process.env.NODE_ENV === 'production' ? PRODUCTION_URL : LOCAL_SITE_URL
    const url = await getStripeSession({
      priceId,
      domainUrl: origin,
      customerId: org.stripeCustomerId as string | undefined, // Reuse customer to keep cards
      organizationId: orgId,
      userId: u.id,
      mode: 'subscription',
    })

    return { success: true, url }

  } catch (error: any) {
    console.error('[renewSubscription] Unexpected error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}
