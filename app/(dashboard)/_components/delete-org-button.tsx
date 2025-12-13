'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/(dashboard)/_components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteOrganization } from '@/app/actions/organization'
import { AlertTriangle } from 'lucide-react'

interface DeleteOrgButtonProps {
  orgId: string
  orgName: string
}

export function DeleteOrgButton({ orgId, orgName }: DeleteOrgButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [confirmName, setConfirmName] = React.useState('')
  const [error, setError] = React.useState('')
  const router = useRouter()

  const handleDelete = async () => {
    if (confirmName !== `delete ${orgName}`) return
    
    setLoading(true)
    setError('')
    
    try {
      const res = await deleteOrganization(orgId)
      if (res.success) {
        setOpen(false)
        router.refresh()
      } else {
        setError(res.error || 'Failed to delete organization')
      }
    } catch (e) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='destructive'>Delete Organization</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Organization
          </DialogTitle>
          <DialogDescription className="pt-2">
            This action cannot be undone. This will permanently delete the 
            organization <strong>{orgName}</strong> and remove all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium mb-1">Warning: Serious consequences</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You will lose any remaining credits immediately.</li>
              <li>All projects within this organization will be deleted.</li>
              <li>Your active subscription will be canceled immediately.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              To confirm, type <span className="font-mono font-bold select-all">delete {orgName}</span> below:
            </Label>
            <Input
              id="confirm-delete"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={`delete ${orgName}`}
              className="font-mono"
            />
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmName !== `delete ${orgName}` || loading}
          >
            {loading ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
