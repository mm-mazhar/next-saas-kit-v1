// app/(dashboard)/_components/invite-member-dialog.tsx

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/(dashboard)/_components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useMutation } from '@tanstack/react-query'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function InviteMemberDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const router = useRouter()
  const { show } = useToast()

  const { mutate, isPending, error } = useMutation(
    orpc.org.inviteMember.mutationOptions({
      onSuccess: () => {
        show({ title: 'Invite sent', description: `Invitation sent to ${email}`, variant: 'success' })
        setOpen(false)
        setEmail('')
        setRole('MEMBER')
        router.refresh()
      },
      onError: (err) => {
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutate({ email, role })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0' suppressHydrationWarning>
          <Plus className='mr-2 h-4 w-4' />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Invite a new member to your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='email' className='text-right'>
                Email
              </Label>
              <Input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='colleague@example.com'
                className='col-span-3 focus-visible:ring-0 focus-visible:ring-offset-0'
                required
              />
            </div>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='role' className='text-right'>
                Role
              </Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'MEMBER')}>
                <SelectTrigger className='col-span-3 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'>
                  <SelectValue placeholder='Select a role' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ADMIN'>Admin</SelectItem>
                  <SelectItem value='MEMBER'>Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className='text-red-500 text-sm'>{error.message}</p>}
          </div>
          <DialogFooter>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Inviting...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
