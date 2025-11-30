// app/(dashboard)/_components/app-sidebar.tsx

'use client'

import { AudioWaveform, Command, GalleryVerticalEnd } from 'lucide-react'
import * as React from 'react'

import { NavMain } from '@/app/(dashboard)/_components/nav-main'
import { NavUser } from '@/app/(dashboard)/_components/nav-user'
import { TeamSwitcher } from '@/app/(dashboard)/_components/team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/app/(dashboard)/_components/sidebar'
import { ChartNoAxesCombined, CreditCard, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { type PlanId } from '@/lib/constants'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: ChartNoAxesCombined },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
]
const teams = [
  {
    name: 'Acme Inc',
    logo: GalleryVerticalEnd,
    plan: 'Enterprise',
  },
  {
    name: 'Acme Corp.',
    logo: AudioWaveform,
    plan: 'Startup',
  },
  {
    name: 'Evil Corp.',
    logo: Command,
    plan: 'Free',
  },
]

export function AppSidebar({
  user,
  currentPlanId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: { name: string; email: string; avatar: string }
  currentPlanId?: PlanId | null
}) {
  const pathname = usePathname()
  const mappedNavMain = navItems
    .filter((n) => n.href === '/dashboard')
    .map((n) => ({
      title: n.name,
      url: n.href,
      icon: n.icon,
      isActive: pathname.startsWith(n.href),
      items: [
        { title: 'Data', url: '/dashboard/data' },
        { title: 'Documents', url: '/dashboard/documents' },
      ],
    }))

  const finalUser = user ?? {
    name: 'User',
    email: '',
    avatar: 'https://github.com/shadcn.png',
  }

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mappedNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={finalUser} currentPlanId={currentPlanId} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
