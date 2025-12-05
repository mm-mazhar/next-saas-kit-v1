// app/(dashboard)/_components/create-org-dialog.tsx

'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/(dashboard)/_components/ui/dialog'
import { createOrganization } from '@/app/actions/organization'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [name, setName] = React.useState('')
  const router = useRouter()

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    // Slug auto-generated server-side

    const res = await createOrganization(formData)

    if (res.success) {
      onOpenChange(false)
      setName('')
      router.refresh()
    } else {
      setError(res.error || 'Failed to create organization')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to collaborate with your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='name' className='text-right'>
                Name
              </Label>
              <Input
                id='name'
                name='name'
                placeholder='Acme Inc.'
                className='col-span-3 focus-visible:ring-0 focus-visible:ring-offset-0'
                required
                value={name}
                onChange={handleNameChange}
              />
            </div>
            
            {error && <p className='text-red-500 text-sm'>{error}</p>}
          </div>
          <DialogFooter>
            <Button type='submit' disabled={loading} className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'>
              {loading ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
