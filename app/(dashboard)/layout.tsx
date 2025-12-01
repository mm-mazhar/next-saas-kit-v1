// app/(dashboard)/layout.tsx

import { ClientAppSidebar } from '@/app/(dashboard)/_components/ClientAppSidebar'
import { TopBar } from '@/app/(dashboard)/_components/topbar'
import { getData } from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { SidebarProvider } from '@/app/(dashboard)/_components/sidebar'
import { cookies } from 'next/headers'
import { PLAN_IDS, PRICING_PLANS, type PlanId, type PricingPlan } from '@/lib/constants'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

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
    return matched?.id ?? null
  }

  const currentPlan = await resolvePlanId(userRow?.Subscription?.planId)
  const subStatus = userRow?.Subscription?.status
  const creditsUsed = (userRow?.credits as number | undefined) ?? 0
  const paygCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.payg)?.credits ?? 0
  const paygEligible = !!userRow?.lastPaygPurchaseAt && creditsUsed < paygCredits
  const effectivePlan: PlanId = subStatus === 'active' ? (currentPlan ?? PLAN_IDS.free) : paygEligible ? PLAN_IDS.payg : PLAN_IDS.free
  const creditsTotal = PRICING_PLANS.find((p) => p.id === effectivePlan)?.credits ?? 0
  const exhausted = (effectivePlan !== PLAN_IDS.free) && (creditsUsed >= creditsTotal)
  const renewalDate =
    userRow?.Subscription?.currentPeriodEnd ??
    (userRow?.createdAt
      ? Math.floor(userRow.createdAt.getTime() / 1000) + 30 * 24 * 60 * 60
      : null)

  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get('sidebar_state')?.value
  const normalized = sidebarCookie?.toLowerCase()
  const initialOpen = normalized === undefined ? true : (normalized === 'true' || normalized === 'expanded')

  return (
    <SidebarProvider defaultOpen={initialOpen}>
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
        currentPlanId={subStatus === 'active' ? currentPlan : (paygEligible ? PLAN_IDS.payg : null)}
      />
      <main className='w-full'>
        <TopBar
          usageInfo={{
            creditsUsed,
            creditsTotal,
            renewalDate,
            currentPlanId: effectivePlan,
            exhausted,
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
