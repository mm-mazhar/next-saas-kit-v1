// app/(dashboard)/_components/nav-user.tsx

'use client'

import {
    Bell,
    Building2,
    ChevronsUpDown,
    CreditCard,
    Settings,
    Sparkles
} from 'lucide-react'

import { LogoutButton } from '@/app/(dashboard)/_components/LogoutButton'
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/app/(dashboard)/_components/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { CREDIT_REMINDER_THRESHOLD, PLAN_IDS, type PlanId } from '@/lib/constants'
import Link from 'next/link'
import * as React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function NavUser({
  user,
  currentPlanId,
  creditsUsed,
  creditsTotal,
  exhausted,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  currentPlanId?: PlanId | null
  creditsUsed?: number
  creditsTotal?: number
  exhausted?: boolean
}) {
  const { isMobile } = useSidebar()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Avatar className='h-8 w-8 rounded-lg'>
              <AvatarFallback className='rounded-lg'>ME</AvatarFallback>
            </Avatar>
            <div className='grid flex-1 text-left text-sm leading-tight'>
              <span className='truncate font-medium'>User</span>
              <span className='truncate text-xs'>Loading...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='relative data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'
            >
              <Avatar className='h-8 w-8 rounded-lg'>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className='rounded-lg'>ME</AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{user.name}</span>
                <span className='truncate text-xs'>{user.email}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
              {(() => {
                const used = creditsUsed ?? 0
                const total = creditsTotal ?? 0
                const remaining = Math.max(total - used, 0)
                const hasNotification = !!(exhausted || remaining <= CREDIT_REMINDER_THRESHOLD)
                return hasNotification ? (
                  <span className='absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive' />
                ) : null
              })()}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className='rounded-lg'>ME</AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>{user.name}</span>
                  <span className='truncate text-xs'>{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link
                  href='/#pricing'
                  className='flex items-center text-sm gap-2'
                >
                  <Sparkles />
                  {currentPlanId === PLAN_IDS.payg ? (
                    <>
                      PAYG, Upgrade to <span className="text-primary font-semibold">Pro</span>
                    </>
                  ) : currentPlanId === PLAN_IDS.pro ? (
                    <span className="text-primary font-semibold">Pro</span>
                  ) : (
                    <>
                      Free, Upgrade to <span className="text-primary font-semibold">Pro</span>
                    </>
                  )}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className='gap-2'>
                  <Settings />
                  Settings
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem asChild>
                    <Link href='/dashboard/settings' className='flex items-center gap-2'>
                      <Settings />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href='/dashboard/settings/organization' className='flex items-center gap-2'>
                      <Building2 />
                      Organization
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem asChild>
                <Link
                  href='/dashboard/billing'
                  className='flex items-center gap-2'
                >
                  <CreditCard />
                  Billing
                </Link>
              </DropdownMenuItem>
              {(() => {
                const remaining = creditsUsed ?? 0
                const hasNotification = !!(exhausted || remaining <= CREDIT_REMINDER_THRESHOLD)
                const tooltipText = exhausted || remaining === 0 ? 'Purchase Credits' : 'Low Credits'
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem className='gap-2'>
                        <span className='relative inline-flex h-5 w-5 items-center justify-center'>
                          <Bell className='size-4' />
                          {hasNotification ? (
                            <span className='absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive' />
                          ) : null}
                        </span>
                        <span>Notifications</span>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>{tooltipText}</TooltipContent>
                  </Tooltip>
                )
              })()}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <LogoutButton />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
