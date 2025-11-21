// components/Themetoggle.tsx

'use client'

import { useToast } from '@/components/ToastProvider'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ✅ 1. Import your server action
import { updateThemePreference } from '@/app/actions'

export function Themetoggle() {
  const { setTheme } = useTheme()
  const { show, update } = useToast()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const applyImmediateTheme = (value: 'light' | 'dark' | 'system') => {
    const el = document.documentElement
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const target = value === 'system' ? (sysDark ? 'dark' : 'light') : value
    el.classList.remove('light', 'dark')
    el.classList.add(target)
  }

  // This function now calls the server action directly
  const persistTheme = async (value: 'light' | 'dark' | 'system') => {
    try {
      const id = show({ title: 'Saving theme…', variant: 'info', duration: 4000 })
      await updateThemePreference(value)
      update(id, {
        title: 'Theme updated',
        description: value === 'system' ? 'System theme saved' : `${value} theme saved`,
        variant: 'success',
        duration: 2000,
      })
    } catch {
      const id = show({ title: 'Saving theme…', variant: 'info', duration: 4000 })
      update(id, { title: 'Failed to save theme', variant: 'error', duration: 2500 })
    }
  }

  return (
    <div className='flex items-center' suppressHydrationWarning>
      {mounted ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='px-2 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'
            >
              <Sun className='h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
              <Moon className='absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
              <span className='sr-only'>Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align='end'
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuItem
              onClick={() => {
                setTheme('light')
                applyImmediateTheme('light')
                persistTheme('light')
              }}
            >
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setTheme('dark')
                applyImmediateTheme('dark')
                persistTheme('dark')
              }}
            >
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setTheme('system')
                applyImmediateTheme('system')
                persistTheme('system')
              }}
            >
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
