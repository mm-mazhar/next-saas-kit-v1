// app/(dashboard)/layout.tsx

import { ClientAppSidebar } from '@/app/(dashboard)/_components/ClientAppSidebar'
import { TopBar } from '@/app/(dashboard)/_components/topbar'
import prisma, { getData } from '@/app/lib/db'
import { stripe } from '@/app/lib/stripe'
import { createClient } from '@/app/lib/supabase/server'
import { SidebarProvider } from '@/components/ui/sidebar'
import { PRICING_PLANS, type PricingPlan, PLAN_IDS, type PlanId } from '@/lib/constants'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function DashboardGroupLayout({ children }: { children: ReactNode }) {
  noStore()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/get-started')
  }

  const userName =
    user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const [firstName, ...lastNameParts] = userName.split(' ')
  const lastName = lastNameParts.join(' ')

  const userRow = await getData({
    email: user.email as string,
    firstName: firstName,
    id: user.id,
    lastName: lastName,
    profileImage: user.user_metadata?.avatar_url,
  })

  const resolvePlanId = async (
    planIdFromDb?: string | null
  ): Promise<PlanId | null> => {
    if (!planIdFromDb) return null
    if (planIdFromDb === PLAN_IDS.free) return PLAN_IDS.free
    const matched = PRICING_PLANS.find(
      (p: PricingPlan) => p.stripePriceId === planIdFromDb
    )
    if (matched?.id) return matched.id
    if (planIdFromDb.startsWith('price_')) {
      try {
        const price = await stripe.prices.retrieve(planIdFromDb)
        let productName = ''
        if (typeof price.product === 'string') {
          const prod = await stripe.products.retrieve(price.product)
          productName = (prod.name || '').toLowerCase()
        } else {
          productName = ((price.product as { name?: string }).name || '').toLowerCase()
        }
        if (productName.includes('pro plus')) return PLAN_IDS.pro_plus
        if (productName.includes('pro')) return PLAN_IDS.pro
      } catch {}
    }
    return null
  }

  const currentPlan = await resolvePlanId(userRow?.Subscription?.planId)
  const now = Math.floor(Date.now() / 1000)
  const isFreeLike = !userRow?.Subscription || userRow?.Subscription?.status !== 'active' || userRow?.Subscription?.planId === PLAN_IDS.free
  const freeCycleEndFallback = userRow?.createdAt ? Math.floor(userRow.createdAt.getTime() / 1000) + 30 * 24 * 60 * 60 : null
  const freeCycleEnd = userRow?.Subscription?.currentPeriodEnd ?? freeCycleEndFallback
  if (isFreeLike && freeCycleEnd && freeCycleEnd <= now) {
    try {
      await prisma.user.update({ where: { id: user.id }, data: { credits: 0 } })
      if (userRow?.Subscription) {
        await prisma.subscription.update({ where: { userId: user.id }, data: { currentPeriodStart: now, currentPeriodEnd: now + 30 * 24 * 60 * 60 } })
      }
    } catch {}
  }
  const subStatus = userRow?.Subscription?.status
  const effectivePlan: PlanId =
    subStatus === 'active' ? (currentPlan ?? PLAN_IDS.free) : PLAN_IDS.free
  const creditsTotal = PRICING_PLANS.find((p) => p.id === effectivePlan)?.credits ?? 0
  const creditsUsed = (userRow?.credits as number | undefined) ?? 0
  const exhausted = (userRow?.Subscription?.status === 'active') && (effectivePlan !== PLAN_IDS.free) && (creditsUsed >= creditsTotal)
  const renewalDate =
    userRow?.Subscription?.currentPeriodEnd ??
    (userRow?.createdAt
      ? Math.floor(userRow.createdAt.getTime() / 1000) + 30 * 24 * 60 * 60
      : null)

  return (
    <SidebarProvider>
      <ClientAppSidebar
        user={{
          name:
            (userRow?.name as string) ||
            (user.user_metadata?.full_name as string) ||
            (user.email as string) ||
            'User',
          email: (userRow?.email as string) || (user.email as string),
          avatar:
            (user.user_metadata?.avatar_url as string) ||
            'https://github.com/shadcn.png',
        }}
        currentPlanId={subStatus === 'active' ? currentPlan : null}
      />
      <main className='w-full'>
        <TopBar
          usageInfo={{
            creditsUsed,
            creditsTotal,
            renewalDate,
            currentPlanId: effectivePlan,
            exhausted,
            autoRenewOnCreditExhaust: !!userRow?.autoRenewOnCreditExhaust,
          }}
        />
        <div className='px-4 md:px-8 pt-2 md:pt-4 pb-4 md:pb-8'>
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}

export default DashboardGroupLayout
