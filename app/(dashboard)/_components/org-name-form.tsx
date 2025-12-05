'use client'

import { SubmitButton } from '@/app/(dashboard)/_components/Submitbuttons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ToastProvider'
import * as React from 'react'
import { useActionState } from 'react'
import { updateOrganizationNameAction } from '@/app/actions/organization'

export function OrgNameForm({ orgId, defaultName }: { orgId: string; defaultName: string }) {
  const { show } = useToast()
  const [state, formAction] = useActionState(updateOrganizationNameAction, null)
  const hasDisplayedRef = React.useRef(false)

  React.useEffect(() => {
    if (!state) return
    if (hasDisplayedRef.current) return
    if (state.success) {
      show({ title: 'Saved', description: 'Organization name updated', variant: 'success' })
      hasDisplayedRef.current = true
    } else if (state.error) {
      show({ title: 'Error', description: state.error, variant: 'error', duration: 3000 })
      hasDisplayedRef.current = true
    }
  }, [state, show])

  return (
    <form action={formAction} className='space-y-4'>
      <input type='hidden' name='orgId' value={orgId} />
      <div className='grid gap-1'>
        <Label htmlFor='name'>Name</Label>
        <Input id='name' name='name' defaultValue={defaultName} className='max-w-md' maxLength={20} />
      </div>

      <SubmitButton />
    </form>
  )
}
