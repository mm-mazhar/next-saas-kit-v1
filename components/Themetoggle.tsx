// components/Themetoggle.tsx

'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

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
  const [saved, setSaved] = React.useState(false)

  // This function now calls the server action directly
  const persistTheme = async (value: 'light' | 'dark' | 'system') => {
    try {
      await updateThemePreference(value)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      setSaved(false)
    }
  }

  return (
    <div className='flex items-center'>
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
        {/* ✅ 2. The onClick handlers now correctly call the new persistTheme function */}
        <DropdownMenuItem
          onClick={() => {
            setTheme('light')
            persistTheme('light')
          }}
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setTheme('dark')
            persistTheme('dark')
          }}
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setTheme('system')
            persistTheme('system')
          }}
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {saved && (
      <span aria-live='polite' className='ml-2 text-xs text-muted-foreground'>Saved</span>
    )}
    </div>
  )
}
