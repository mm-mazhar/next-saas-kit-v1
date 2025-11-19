// app/(dashboard)/layout.tsx

import { ClientAppSidebar } from '@/app/(dashboard)/_components/ClientAppSidebar'
import { TopBar } from '@/app/(dashboard)/_components/topbar'
import { getData } from '@/app/lib/db'
import { stripe } from '@/app/lib/stripe'
import { createClient } from '@/app/lib/supabase/server'
import { SidebarProvider } from '@/components/ui/sidebar'
import { PRICING_PLANS, type PricingPlan } from '@/lib/constants'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

async function DashboardGroupLayout({ children }: { children: ReactNode }) {
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
  ): Promise<'free' | 'pro' | 'pro_plus' | null> => {
    if (!planIdFromDb) return null
    if (planIdFromDb === 'free') return 'free'
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
        if (productName.includes('pro plus')) return 'pro_plus'
        if (productName.includes('pro')) return 'pro'
      } catch {}
    }
    return null
  }

  const currentPlan = await resolvePlanId(userRow?.Subscription?.planId)
  const effectivePlan: 'free' | 'pro' | 'pro_plus' =
    currentPlan === null ? 'free' : currentPlan
  const creditsTotal = PRICING_PLANS.find((p) => p.id === effectivePlan)?.credits ?? 0
  const creditsUsed = (userRow?.credits as number | undefined) ?? 0
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
        currentPlanId={currentPlan}
      />
      <main className='w-full'>
        <TopBar
          usageInfo={{
            creditsUsed,
            creditsTotal,
            renewalDate,
            currentPlanId: effectivePlan,
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
