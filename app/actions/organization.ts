// app/actions/organization.ts

'use server'

import { createClient } from '@/app/lib/supabase/server'
import { OrganizationService } from '@/lib/services/organization-service'
import { slugify } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const slug = (formData.get('slug') as string) || slugify(name)

  if (!name) {
    throw new Error('Name is required')
  }
  if (name.length > 20) {
    return { success: false, error: 'Name must be 20 characters or fewer' }
  }

  try {
    const org = await OrganizationService.createOrganization(user.id, name, slug)
    const cookieStore = await cookies()
    cookieStore.set('current-org-id', org.id)
    revalidatePath('/dashboard')
    return { success: true, orgId: org.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

export async function switchOrganization(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set('current-org-id', orgId)
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function inviteMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const email = formData.get('email') as string
  const role = formData.get('role') as import('@/lib/constants').OrganizationRole
  const orgId = formData.get('orgId') as string

  if (!email || !role || !orgId) {
    return { success: false, error: 'All fields are required' }
  }

  try {
    const { InvitationService } = await import('@/lib/services/invitation-service')
    const created = await InvitationService.createInvite(user.id, orgId, email, role)
    const link = InvitationService.getInviteLink(created.token)
    const { sendInviteEmail } = await import('@/app/lib/email')
    await sendInviteEmail({
      to: created.email,
      organizationName: created.organization?.name ?? null,
      inviteLink: link,
      role: created.role ? String(created.role) : null,
      inviterName: created.inviter?.name ?? null,
      expiresAt: created.expiresAt,
    })
    revalidatePath('/dashboard/settings/organization')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  try {
    const db = (await import('@/app/lib/db')).default
    const invite = await db.organizationInvite.findUnique({
      where: { id: inviteId },
      select: { status: true, email: true, organizationId: true },
    })
    if (!invite) {
      return { success: false, error: 'Invite not found' }
    }
    if (invite.status === 'ACCEPTED') {
      const userByEmail = await db.user.findUnique({ where: { email: invite.email }, select: { id: true } })
      if (userByEmail?.id) {
        const { OrganizationService } = await import('@/lib/services/organization-service')
        try {
          await OrganizationService.removeMember(invite.organizationId, userByEmail.id)
          // If removeMember succeeds, the invite is deleted (as part of the transaction).
          // We can return success immediately.
          revalidatePath('/dashboard/settings/organization')
          return { success: true }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          // If the error is about the last owner, we must stop and return error
          if (msg.includes('Cannot remove the last owner')) {
            return { success: false, error: msg }
          }
          // Otherwise, if the member is not found (e.g. already removed), we proceed to revoke the invite
        }
      } else {
        return { success: false, error: 'Member not found for accepted invite' }
      }
      // If member was not found, the invite might still exist. We mark it as REVOKED.
      await db.organizationInvite.update({ where: { id: inviteId }, data: { status: 'REVOKED' } })
    } else {
      const { InvitationService } = await import('@/lib/services/invitation-service')
      await InvitationService.revokeInvite(inviteId)
    }
    revalidatePath('/dashboard/settings/organization')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

export async function resendInvite(inviteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  try {
    const { InvitationService } = await import('@/lib/services/invitation-service')
    const invite = await (await import('@/app/lib/db')).default.organizationInvite.findUnique({
      where: { id: inviteId },
      include: { inviter: true, organization: true },
    })
    if (!invite) {
      return { success: false, error: 'Invite not found' }
    }
    const updated = await InvitationService.reinvite(inviteId)
    const link = InvitationService.getInviteLink(updated.token)
    const { sendInviteEmail } = await import('@/app/lib/email')
    await sendInviteEmail({
      to: updated.email,
      organizationName: updated.organization?.name ?? null,
      inviteLink: link,
      role: updated.role ? String(updated.role) : null,
      inviterName: updated.inviter?.name ?? null,
      expiresAt: updated.expiresAt,
    })
    revalidatePath('/dashboard/settings/organization')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

export async function removeMember(orgId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  try {
    const { OrganizationService } = await import('@/lib/services/organization-service')
    await OrganizationService.removeMember(orgId, userId)
    revalidatePath('/dashboard/settings/organization')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

export async function deleteOrganization(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  try {
    const { OrganizationService } = await import('@/lib/services/organization-service')
    const org = await OrganizationService.getOrganizationById(orgId)
    if (!org) {
      return { success: false, error: 'Organization not found' }
    }
    if (org.slug?.startsWith('default-organization')) {
      return { success: false, error: 'Default Organization cannot be deleted' }
    }
    await OrganizationService.deleteOrganization(orgId)
    const cookieStore = await cookies()
    const userOrgs = await OrganizationService.getUserOrganizations(user.id)
    const nextOrg = userOrgs[0]?.id
    if (nextOrg) {
      cookieStore.set('current-org-id', nextOrg)
    } else {
      cookieStore.delete('current-org-id')
    }
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

export async function updateOrganizationName(orgId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const slug = (formData.get('slug') as string) || slugify(name)

  if (!name) {
    return { success: false, error: 'Name is required' }
  }
  if (name.length > 20) {
    return { success: false, error: 'Name must be 20 characters or fewer' }
  }

  try {
    const { OrganizationService } = await import('@/lib/services/organization-service')
    await OrganizationService.updateOrganization(orgId, { name, slug })
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

export async function updateOrganizationNameAction(
  _prevState: { success?: boolean; error?: string } | null,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const orgId = (formData.get('orgId') as string) || ''
  const name = formData.get('name') as string
  const slug = (formData.get('slug') as string) || slugify(name)

  if (!name || !orgId) {
    return { success: false, error: 'Name is required' }
  }
  if (name.length > 20) {
    return { success: false, error: 'Name must be 20 characters or fewer' }
  }

  try {
    const { OrganizationService } = await import('@/lib/services/organization-service')
    await OrganizationService.updateOrganization(orgId, { name, slug })
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}
