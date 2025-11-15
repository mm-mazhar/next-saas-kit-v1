// app/(dashboard)/_components/SideUserNav.tsx
'use client'

import { LogoutButton } from './LogoutButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreditCard, Home, Settings } from 'lucide-react'
import Link from 'next/link'

export const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
]

export function UserNav({
  name,
  email,
  image,
  onMenuOpenChange,
}: {
  name: string
  email: string
  image?: string
  onMenuOpenChange?: (open: boolean) => void
}) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        onMenuOpenChange?.(o)
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='relative h-10 w-10 rounded-full focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:border-transparent transition-colors'
        >
          <Avatar className='h-10 w-10 rounded-full'>
            <AvatarImage
              src={image || 'https://github.com/shadcn.png'}
              alt='User profile picture'
            />
            <AvatarFallback>{name ? getInitials(name) : 'User'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='w-fit min-w-[14rem] max-w-[22rem]'
        align='end'
        collisionPadding={16}
        forceMount
        onMouseLeave={() => {
          setOpen(false)
          onMenuOpenChange?.(false)
        }}
        onPointerLeave={() => {
          setOpen(false)
          onMenuOpenChange?.(false)
        }}
        onEscapeKeyDown={() => {
          setOpen(false)
          onMenuOpenChange?.(false)
        }}
        onInteractOutside={() => {
          setOpen(false)
          onMenuOpenChange?.(false)
        }}
      >
        <DropdownMenuLabel>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium leading-none'>{name}</p>
            <p className='text-xs leading-none text-muted-foreground truncate max-w-[22rem] whitespace-nowrap'>
              {email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {navItems.map((item, index) => (
            <DropdownMenuItem asChild key={index}>
              <Link
                href={item.href}
                className='w-full flex justify-between items-center'
              >
                {item.name}
                <span>
                  <item.icon className='w-4 h-4' />
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          className='w-full flex justify-between items-center'
          asChild
        >
          <LogoutButton />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
