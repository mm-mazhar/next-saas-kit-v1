// app/(dashboard)/_components/project-actions.tsx

'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/(dashboard)/_components/ui/dialog'
import { updateProjectName } from '@/app/actions/project'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

export function ProjectActions({ projectId, defaultName }: { projectId: string; defaultName: string }) {
  const [openRename, setOpenRename] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    const formData = new FormData(event.currentTarget)
    const res = await updateProjectName(projectId, formData)
    if (res?.success) {
      setOpenRename(false)
      router.refresh()
    }
    setLoading(false)
  }
  return (
    <div className='relative'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label='Project actions'
            className='text-muted-foreground hover:text-foreground flex items-center justify-center rounded-md p-1 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'
          >
            <MoreVertical className='h-4 w-4' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-40 rounded-lg' align='end' side='bottom'>
          <DropdownMenuItem className='gap-2' onSelect={() => { setOpenRename(true) }}>
            Rename
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={openRename} onOpenChange={setOpenRename}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>Update this project’s name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit}>
            <div className='grid gap-4 py-4'>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='name' className='text-right'>Name</Label>
                <Input id='name' name='name' defaultValue={defaultName} className='col-span-3 border-input focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:border-input' />
              </div>
            </div>
            <DialogFooter>
              <Button type='submit' size='sm' disabled={loading} className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
