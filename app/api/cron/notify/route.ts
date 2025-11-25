// app/api/cron/notify/route.ts

import prisma from '@/app/lib/db'
import { sendRenewalReminderEmail } from '@/app/lib/email'
import { CREDIT_REMINDER_THRESHOLD, PLAN_IDS, PRICING_PLANS, RENEWAL_REMINDER_DAYS_BEFORE } from '@/lib/constants'
import { headers } from 'next/headers'

export async function GET() {
  const h = await headers()
  const auth = h.get('authorization') || ''
  const secret = process.env.CRON_SECRET || ''
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const now = Math.floor(Date.now() / 1000)
  const thresholdDays = Number(RENEWAL_REMINDER_DAYS_BEFORE)
  const upper = now + thresholdDays * 24 * 60 * 60

  const subs = await prisma.subscription.findMany({
    where: {
      status: 'active',
      currentPeriodEnd: { gte: now, lte: upper },
    },
    select: {
      stripeSubscriptionId: true,
      planId: true,
      currentPeriodEnd: true,
      periodEndReminderSent: true,
      user: { select: { email: true, name: true, credits: true, creditsReminderThresholdSent: true } },
    },
  })

  let sent = 0
  const details: { email: string; daysLeft?: number; reason: 'days' | 'credits' }[] = []
  const alreadySent = new Set<string>()

  for (const s of subs) {
    const to = s.user?.email || null
    if (!to) continue
    const daysLeft = Math.ceil((s.currentPeriodEnd - now) / (24 * 60 * 60))
    if (daysLeft !== RENEWAL_REMINDER_DAYS_BEFORE) continue
    if (s.periodEndReminderSent) continue
    const plan = PRICING_PLANS.find((p) => p.stripePriceId === s.planId)
    const used = s.user?.credits ?? 0
    const maxCredits = plan?.credits ?? undefined
    const remaining = typeof maxCredits === 'number' ? Math.max(0, maxCredits - used) : undefined
    try {
      await sendRenewalReminderEmail({
        to,
        name: s.user?.name,
        planTitle: plan?.title,
        periodEnd: s.currentPeriodEnd,
        creditsRemaining: remaining,
        from: process.env.RESEND_FROM,
        portalUrl: null,
      })
      await prisma.subscription.update({
        where: { stripeSubscriptionId: s.stripeSubscriptionId },
        data: { periodEndReminderSent: true },
      })
      sent++
      alreadySent.add(to)
      details.push({ email: to, daysLeft, reason: 'days' })
    } catch {}
  }

  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'active' },
    include: {
      user: {
        select: {
          email: true,
          name: true,
          credits: true,
          creditsReminderThresholdSent: true,
        },
      },
    },
  })
  let creditCandidates = 0

  for (const s of activeSubs) {
    const to = s.user?.email || null
    if (!to || alreadySent.has(to)) continue
    const plan = PRICING_PLANS.find((p) => p.stripePriceId === s.planId)
    const isProTier = plan?.id === PLAN_IDS.pro || plan?.id === PLAN_IDS.pro_plus
    if (!isProTier) continue
    const usedCredits = s.user?.credits ?? 0
    const maxCredits = plan?.credits ?? 0
    const creditsRemaining = Math.max(0, maxCredits - usedCredits)
    if (creditsRemaining > CREDIT_REMINDER_THRESHOLD) continue
    if (s.user?.creditsReminderThresholdSent) continue
    creditCandidates++
    try {
      await sendRenewalReminderEmail({
        to,
        name: s.user?.name,
        planTitle: plan?.title,
        periodEnd: s.currentPeriodEnd,
        creditsRemaining,
        from: process.env.RESEND_FROM,
        portalUrl: null,
      })
      await prisma.user.update({ where: { id: s.userId }, data: { creditsReminderThresholdSent: true } })
      sent++
      alreadySent.add(to)
      details.push({ email: to, reason: 'credits' })
    } catch {}
  }

  return Response.json({ totalCandidates: subs.length, creditCandidates, sent, details })
}
