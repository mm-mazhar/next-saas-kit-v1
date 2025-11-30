// app/api/cron/notify/route.ts

import prisma from '@/app/lib/db'
import { sendLowCreditsEmail, sendRenewalReminderEmail } from '@/app/lib/email'
import { CREDIT_REMINDER_THRESHOLD, PRICING_PLANS, RENEWAL_REMINDER_DAYS_BEFORE } from '@/lib/constants'
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

  await prisma.user.updateMany({
    where: {
      creditsReminderThresholdSent: true,
      credits: { gt: CREDIT_REMINDER_THRESHOLD },
    },
    data: { creditsReminderThresholdSent: false },
  })

  for (const s of subs) {
    const to = s.user?.email || null
    if (!to) continue
    const daysLeft = Math.ceil((s.currentPeriodEnd - now) / (24 * 60 * 60))
    if (s.periodEndReminderSent) continue
    const remaining = typeof s.user?.credits === 'number' ? s.user.credits : undefined
    try {
      await sendRenewalReminderEmail({
        to,
        name: s.user?.name ?? null,
        planTitle: PRICING_PLANS.find((p) => p.stripePriceId === s.planId)?.title ?? null,
        periodEnd: s.currentPeriodEnd,
        creditsRemaining: remaining,
        portalUrl: null,
      })
      sent++
      await prisma.subscription.update({
        where: { stripeSubscriptionId: s.stripeSubscriptionId },
        data: { periodEndReminderSent: true },
      })
      alreadySent.add(to)
      details.push({ email: to, daysLeft, reason: 'days' })
    } catch {}
  }

  let creditCandidates = 0

  const lowCreditsUsers = await prisma.user.findMany({
    where: {
      creditsReminderThresholdSent: false,
      credits: { lte: CREDIT_REMINDER_THRESHOLD },
    },
    select: { id: true, email: true, name: true, credits: true },
  })

  for (const u of lowCreditsUsers) {
    const to = u.email || null
    if (!to || alreadySent.has(to)) continue
    const creditsRemaining = u.credits ?? 0
    creditCandidates++
    try {
      await sendLowCreditsEmail({
        to,
        name: u.name ?? null,
        creditsRemaining,
      })
      await prisma.user.update({ where: { id: u.id }, data: { creditsReminderThresholdSent: true } })
      alreadySent.add(to)
      details.push({ email: to, reason: 'credits' })
    } catch {}
  }

  return Response.json({ totalCandidates: subs.length, creditCandidates, sent, details })
}
