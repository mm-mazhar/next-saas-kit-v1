// app/(dashboard)/_components/topbar.tsx

'use client'

import { Themetoggle } from '@/components/Themetoggle'
import { ToastProvider } from '@/components/ToastProvider'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/app/(dashboard)/_components/sidebar'
import { PLAN_IDS, type PlanId } from '@/lib/constants'
import {
  ChartNoAxesCombined,
  CreditCard,
  Database,
  FileText,
  Home,
  Settings,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import * as React from 'react'

export function TopBar({
  usageInfo,
}: {
  usageInfo?: {
    creditsUsed: number
    creditsTotal: number
    renewalDate?: number | null
    currentPlanId?: PlanId | null
    exhausted?: boolean
  }
}) {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  const startIndex = Math.max(parts.indexOf('dashboard'), 0)
  const trail = parts.slice(startIndex)
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    data: 'Data',
    documents: 'Documents',
    settings: 'Settings',
    billing: 'Billing',
  }
  const icons: Record<string, React.ElementType> = {
    dashboard: ChartNoAxesCombined,
    data: Database,
    documents: FileText,
    settings: Settings,
    billing: CreditCard,
  }

  let acc = ''
  const crumbElements: React.ReactNode[] = []
  trail.forEach((seg, idx) => {
    acc += `/${seg}`
    const isLast = idx === trail.length - 1
    const label = labels[seg] ?? seg
    const Icon = icons[seg]
    if (idx > 0) {
      crumbElements.push(<BreadcrumbSeparator key={`sep-${idx}`} />)
    }
    crumbElements.push(
      <BreadcrumbItem key={`item-${acc}`}>
        {isLast ? (
          <BreadcrumbPage className='flex items-center gap-1.5'>
            {Icon && <Icon className='size-3.5' />}
            {label}
          </BreadcrumbPage>
        ) : (
          <BreadcrumbLink href={acc} className='flex items-center gap-1.5'>
            {Icon && <Icon className='size-3.5' />}
            {label}
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    )
  })

  return (
    <header className='flex h-16 shrink-0 items-center justify-between px-4 border-b'>
      <div className='flex items-center gap-2'>
        <SidebarTrigger className='-ml-1' />
        <Separator
          orientation='vertical'
          className='mr-2 data-[orientation=vertical]:h-4'
        />
        <Breadcrumb>
          <BreadcrumbList className='text-sm h-10 items-center'>
            <BreadcrumbItem>
              <BreadcrumbLink href='/' className='flex items-center gap-1.5'>
                <Home className='size-3.5' />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            {trail.length > 0 && <BreadcrumbSeparator />}
            {crumbElements}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className='flex items-center gap-2'>
        {usageInfo && (
          <span className='inline-flex items-center h-9 px-1 rounded-md bg-muted text-primary font-medium text-sm border leading-none'>
            Credits: {usageInfo.creditsUsed ?? 0}
          </span>
        )}
        {usageInfo?.creditsUsed === 0 ? (
          <span className='inline-flex items-center h-9 px-3 rounded-md bg-primary text-primary-foreground font-medium text-sm border border-primary leading-none'>
            Renewal required
          </span>
        ) : null}
        {usageInfo?.currentPlanId === PLAN_IDS.free ? (
          <a
            href='/dashboard/billing'
            className='inline-flex items-center h-9 px-3 rounded-md bg-primary text-primary-foreground font-medium text-sm border border-primary leading-none'
          >
            Purchase Credits
          </a>
        ) : usageInfo?.currentPlanId ? (
          <span className='inline-flex items-center h-9 px-2 rounded-md bg-muted text-primary font-medium text-sm border leading-none'>
            {usageInfo.currentPlanId === PLAN_IDS.pro
              ? 'Pro'
              : usageInfo.currentPlanId === PLAN_IDS.payg
              ? 'Pay As You Go'
              : 'Free'}
          </span>
        ) : null}
        <ToastProvider>
          <Themetoggle />
        </ToastProvider>
      </div>
    </header>
  )
}
