// app/(dashboard)/_components/pending-invites-list.tsx

'use client'

import { resendInvite, revokeInvite, deleteInvite } from '@/app/actions/organization'
import { useToast } from '@/components/ToastProvider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

type InviteRow = {
  id: string
  email: string
  name?: string | null
  role: string
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | string
  expiresAt: string
  link: string
}

export function PendingInvitesList({ invites }: { invites: InviteRow[] }) {
  const router = useRouter()
  const { show } = useToast()
  const [loading, setLoading] = React.useState<{ id: string | null; action: 'revoke' | 'resend' | 'delete' | null }>({ id: null, action: null })

  function statusVariant(status: string): React.ComponentProps<typeof Badge>['variant'] {
    switch (status) {
      case 'PENDING':
        return 'secondary'
      case 'REVOKED':
        return 'outline'
      case 'ACCEPTED':
        return 'default'
      default:
        return 'outline'
    }
  }

  function displayStatus(status: string): string {
    return status
  }

  return (
    <div className='space-y-4'>
      {invites.map((invite) => (
        <div key={invite.id} className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <Avatar>
              <AvatarFallback>IN</AvatarFallback>
            </Avatar>
            <div>
              <p className='text-sm font-medium leading-none'>{invite.name || invite.email}</p>
              {invite.name && <p className='text-xs text-muted-foreground'>{invite.email}</p>}
              <p className='text-sm text-muted-foreground'>{invite.role}</p>
              <p className='text-xs text-muted-foreground flex items-center gap-2'>
                <span>Link: {invite.link}</span>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-label='Copy link'
                  className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0'
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(invite.link)
                      show({ title: 'Link copied', description: invite.email, duration: 2000 })
                    } catch {
                      show({ title: 'Copy failed', description: 'Unable to copy link', duration: 2500 })
                    }
                  }}
                >
                  <Copy className='size-4' />
                </Button>
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant={statusVariant(invite.status)} className='h-6 px-3 leading-none'>
              <span className='relative top-[1px]'>{displayStatus(invite.status)}</span>
            </Badge>
            <Button
              variant='outline'
              size='sm'
              className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0'
              disabled={
                loading.id === invite.id || (invite.status !== 'PENDING' && invite.status !== 'ACCEPTED')
              }
              onClick={async () => {
                setLoading({ id: invite.id, action: 'revoke' })
                try {
                  const res = await revokeInvite(invite.id)
                  if (res?.success) {
                    show({ title: 'Invite revoked', description: invite.email, duration: 2500 })
                    router.refresh()
                  } else {
                    show({ title: 'Error', description: res?.error || 'Failed to revoke invite', duration: 3000 })
                  }
                } finally {
                  setLoading({ id: null, action: null })
                }
              }}
            >
              {loading.id === invite.id && loading.action === 'revoke' ? 'Revoking...' : 'Revoke'}
            </Button>
            {invite.status === 'REVOKED' && (
              <Button
                variant='outline'
                size='sm'
                className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-red-500 hover:text-red-600'
                disabled={loading.id === invite.id}
                onClick={async () => {
                  setLoading({ id: invite.id, action: 'delete' })
                  try {
                    const res = await deleteInvite(invite.id)
                    if (res?.success) {
                      show({ title: 'Invite removed', description: 'Invite removed from list', duration: 2500 })
                      router.refresh()
                    } else {
                      show({ title: 'Error', description: res?.error || 'Failed to remove invite', duration: 3000 })
                    }
                  } finally {
                    setLoading({ id: null, action: null })
                  }
                }}
              >
                {loading.id === invite.id && loading.action === 'delete' ? 'Removing...' : 'Remove from list'}
              </Button>
            )}
            <Button
              variant='secondary'
              size='sm'
              className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0'
              disabled={loading.id === invite.id || invite.status === 'ACCEPTED'}
              onClick={async () => {
                setLoading({ id: invite.id, action: 'resend' })
                try {
                  const res = await resendInvite(invite.id)
                  if (res?.success) {
                    show({ title: 'Invite re-sent', description: `Email sent to ${invite.email}`, duration: 2500 })
                    router.refresh()
                  } else {
                    show({ title: 'Error', description: res?.error || 'Failed to resend email', duration: 3000 })
                  }
                } finally {
                  setLoading({ id: null, action: null })
                }
              }}
            >
              {loading.id === invite.id && loading.action === 'resend' ? 'Re-Inviting...' : 'Re-Invite'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

