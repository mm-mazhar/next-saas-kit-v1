// app/(dashboard)/_components/AutoRenewSwitch.tsx

'use client'

import { useToast } from '@/components/ToastProvider'
import { Label } from '@/components/ui/label'
import React from 'react'

export function AutoRenewSwitch({
  initialOn,
  onToggleAction,
  className,
}: {
  initialOn?: boolean
  onToggleAction: (formData: FormData) => Promise<void>
  className?: string
}) {
  const { show, update } = useToast()
  const [on, setOn] = React.useState(!!initialOn)
  const [loading, setLoading] = React.useState(false)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
      }}
      className={`flex items-center gap-2 rounded-md border border-border h-9 px-1 ${className ?? ''}`}
    >
      <Label className='text-xs text-secondary-foreground'>Credits only Auto Renewal</Label>
      <button
        type='button'
        role='switch'
        aria-checked={on ? 'true' : 'false'}
        className={`relative inline-flex h-5 w-10 items-center rounded-full border transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${on ? 'bg-neutral-400 dark:bg-neutral-600 border-border' : 'bg-neutral-300 dark:bg-neutral-700 border-border'}`}
        aria-label='Credits only Auto Renewal'
        onClick={async () => {
          if (loading) return
          setLoading(true)
          const id = show({ title: 'Saving…', variant: 'info', duration: 4000 })
          const next = !on
          const fd = new FormData()
          fd.set('autoRenew', next ? 'on' : 'off')
          try {
            await onToggleAction(fd)
            setOn(next)
            update(id, { title: 'Settings saved', variant: 'success', duration: 2000 })
          } catch {
            update(id, { title: 'Failed to save', variant: 'error', duration: 2500 })
          } finally {
            setLoading(false)
          }
        }}
      >
        <span className='sr-only'>Credits only Auto Renewal</span>
        <span
          className={`absolute top-[1px] left-[2px] h-4 w-4 rounded-full transition-transform border ${on ? 'translate-x-4 bg-primary border-primary' : 'translate-x-0 bg-white dark:bg-neutral-200 border-border'}`}
        />
      </button>
    </form>
  )
}
