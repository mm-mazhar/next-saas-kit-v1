// app/(dashboard)/layout.tsx

import { ClientAppSidebar } from '@/app/(dashboard)/_components/ClientAppSidebar'
import { SidebarProvider } from '@/app/(dashboard)/_components/sidebar'
import { ToastProvider } from '@/components/ToastProvider'
import { TopBar } from '@/app/(dashboard)/_components/topbar'
import { getData } from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { PLAN_IDS, PRICING_PLANS, type PlanId, type PricingPlan } from '@/lib/constants'
import { ProjectService } from '@/lib/services/project-service'
import { slugify } from '@/lib/utils'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
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

  const cookieStore = await cookies()
  const initialOpen = cookieStore.get('sidebar_state')?.value === 'true'
  // Multi-tenancy: Fetch organizations
  const { OrganizationService } = await import('@/lib/services/organization-service')
  let organizations = await OrganizationService.getUserOrganizations(user.id)
  
  // Only attempt to create default organization if the user exists in DB (has createdAt)
  if (organizations.length === 0 && userRow?.createdAt) {
    const defaultOrgName = 'Default Organization'
    try {
      const newOrg = await OrganizationService.createOrganization(
        user.id,
        defaultOrgName,
        slugify(`${defaultOrgName}-${user.id.substring(0, 8)}`)
      )
      const defaultProjectName = 'Default Project'
      await ProjectService.createProject(
        user.id,
        newOrg.id,
        defaultProjectName,
        `${slugify(defaultProjectName)}-${user.id.substring(0, 8)}-${Date.now()}`
      )
      organizations = [newOrg]
    } catch (e) {
      console.error('[Dashboard Layout] Failed to create default organization:', e)
    }
  }
  
  const currentOrgId = cookieStore.get('current-org-id')?.value
  let currentOrganization = organizations.find(org => org.id === currentOrgId)
  
  if (!currentOrganization && organizations.length > 0) {
    currentOrganization = organizations[0]
    try {
      const id = currentOrganization.id
      if (id) {
        cookieStore.set('current-org-id', id)
      }
    } catch {}
  }

  const effectiveOrgId = currentOrganization?.id

  // Fetch full billing details for current org
  const { default: prisma } = await import('@/app/lib/db')
  let orgBilling = null
  if (effectiveOrgId) {
      orgBilling = await prisma.organization.findUnique({
          where: { id: effectiveOrgId },
          include: { subscription: true }
      })
  }

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

  const currentPlan = await resolvePlanId(orgBilling?.subscription?.planId)
  const subStatus = orgBilling?.subscription?.status
  const creditsRemaining = (orgBilling?.credits as number | undefined) ?? 0
  
  // Logic fix: 
  // 'credits' in DB = Remaining Credits (Balance).
  // 'exhausted' should be true only if balance <= 0.
  // The old logic (creditsUsed >= creditsTotal) was treating 'credits' as 'consumed', which was wrong.
  
  // paygEligible: user bought PAYG and still has some credits? 
  // Old logic: creditsUsed < paygCredits. If creditsUsed is balance, this means "Balance < 50".
  // Maybe they meant "If I bought PAYG, I am eligible".
  // Let's just assume if lastPaygPurchaseAt exists, they are PAYG eligible unless overridden by Sub.
  const paygEligible = !!orgBilling?.lastPaygPurchaseAt
  
  const effectivePlan: PlanId = subStatus === 'active' ? (currentPlan ?? PLAN_IDS.free) : paygEligible ? PLAN_IDS.payg : PLAN_IDS.free
  const creditsTotal = PRICING_PLANS.find((p) => p.id === effectivePlan)?.credits ?? 0
  
  const exhausted = creditsRemaining <= 0
  const renewalDate =
    orgBilling?.subscription?.currentPeriodEnd ??
    (orgBilling?.createdAt
      ? Math.floor(orgBilling.createdAt.getTime() / 1000) + 30 * 24 * 60 * 60
      : null)

  const mappedOrgs = organizations.map(org => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    role: org.members[0]?.role || 'MEMBER'
  }))

  const mappedCurrentOrg = currentOrganization ? {
    id: currentOrganization.id,
    name: currentOrganization.name,
    slug: currentOrganization.slug,
    role: currentOrganization.members[0]?.role || 'MEMBER'
  } : null

  return (
    <ToastProvider>
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
          organizations={mappedOrgs}
          currentOrganization={mappedCurrentOrg}
          creditsUsed={creditsRemaining}
          creditsTotal={creditsTotal}
          exhausted={exhausted}
        />
        <main className='w-full'>
          <TopBar
            usageInfo={{
              creditsUsed: creditsRemaining,
              creditsTotal,
              renewalDate,
              currentPlanId: effectivePlan,
              exhausted,
            }}
            subscriptionStatus={subStatus ?? null}
          />
          <div className='px-4 md:px-8 pt-2 md:pt-4 pb-4 md:pb-8'>
            {children}
          </div>
        </main>
      </SidebarProvider>
    </ToastProvider>
  )
}

export default DashboardGroupLayout
