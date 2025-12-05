// app/(dashboard)/_components/create-project-dialog.tsx

'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/(dashboard)/_components/ui/dialog'
import { createProject } from '@/app/actions/project'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateProjectDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = React.useState(false)
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
    formData.append('orgId', orgId)
    // Slug auto-generated server-side

    const res = await createProject(formData)

    if (res.success) {
      setOpen(false)
      setName('')
      router.refresh()
    } else {
      setError(res.error || 'Failed to create project')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'>
          <Plus className='mr-2 h-4 w-4' />
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project in this organization.
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
                placeholder='My Awesome Project'
                className='col-span-3 focus-visible:ring-0 focus-visible:ring-offset-0'
                required
                maxLength={20}
                value={name}
                onChange={handleNameChange}
              />
            </div>
            <p className='col-span-4 text-xs text-muted-foreground'>Up to 20 characters</p>
            
            {error && <p className='text-red-500 text-sm'>{error}</p>}
          </div>
          <DialogFooter>
            <Button type='submit' disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
