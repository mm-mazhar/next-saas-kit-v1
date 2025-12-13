// app/(dashboard)/_components/member-role-select.tsx

'use client'

import { updateMemberRoleAction } from '@/app/actions/organization'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/(dashboard)/_components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ToastProvider'
import { useState, useTransition } from 'react'

interface MemberRoleSelectProps {
  memberId: string
  initialRole: string
  currentUserId: string
  currentUserRole: string
  orgId: string
}

export function MemberRoleSelect({
  memberId,
  initialRole,
  currentUserId,
  currentUserRole,
  orgId
}: MemberRoleSelectProps) {
  const [role, setRole] = useState(initialRole)
  const [isPending, startTransition] = useTransition()
  const { show } = useToast()

  // 1. Target is OWNER -> Static Text
  if (initialRole === 'OWNER') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground cursor-default">OWNER</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Owners cannot be modified</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // 2. Self-check
  const isSelf = memberId === currentUserId
  if (isSelf) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground cursor-default">{role}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>You cannot change your own role</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // 3. Viewer Permissions
  const canEdit = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'
  
  if (!canEdit) {
     return <span className="text-xs text-muted-foreground">{role}</span>
  }

  const handleValueChange = (newRole: string) => {
    // Optimistic update
    const previousRole = role
    setRole(newRole)
    
    startTransition(async () => {
      const formData = new FormData()
      formData.append('orgId', orgId)
      formData.append('targetUserId', memberId)
      formData.append('newRole', newRole)
      
      const result = await updateMemberRoleAction(formData)
      if (result.success) {
        show({
          title: 'Role updated',
          description: `Member role updated to ${newRole}`,
          variant: 'success'
        })
      } else {
        setRole(previousRole) // Revert
        show({
          title: 'Error',
          description: result.error || 'Failed to update role',
          variant: 'error',
        })
      }
    })
  }

  return (
    <Select
      disabled={isPending}
      value={role}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="h-7 w-[100px] text-xs">
        <SelectValue placeholder="Role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem className="text-xs" value="ADMIN">ADMIN</SelectItem>
        <SelectItem className="text-xs" value="MEMBER">MEMBER</SelectItem>
      </SelectContent>
    </Select>
  )
}
