// app/actions/organization.ts

'use server'

import prisma from '@/app/lib/db'
import { stripe } from '@/app/lib/stripe'
import { createClient } from '@/app/lib/supabase/server'
import { requireOrgRole } from '@/lib/auth/guards'
import { LIMITS } from '@/lib/constants'
import { OrganizationService } from '@/lib/services/organization-service'
import { slugify } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Note: LIMITS imports might need verification if LIMITS is not exported or different name.
// Assuming LIMITS exists as per Service usage.

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Limit Check
  const orgCount = await prisma.organizationMember.count({
      where: { userId: user.id, role: 'OWNER' }
  })
  if (orgCount >= (LIMITS?.MAX_ORGANIZATIONS_PER_USER ?? 5)) {
      return { success: false, error: 'Maximum organizations limit reached' }
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

  // Security
  await requireOrgRole(orgId, user.id, 'ADMIN')

  // Abuse Prevention: Rate Limit
  const lastInvite = await prisma.organizationInvite.findFirst({
      where: { inviterId: user.id },
      orderBy: { createdAt: 'desc' }
  })
  if (lastInvite && (Date.now() - lastInvite.createdAt.getTime() < 60000)) {
      return { success: false, error: 'Please wait 1 minute before sending another invite.' }
  }

  // Abuse Prevention: Max Pending
  const pendingCount = await prisma.organizationInvite.count({
      where: { organizationId: orgId, status: 'PENDING' }
  })
  if (pendingCount >= (LIMITS?.MAX_PENDING_INVITES_PER_ORG ?? 5)) {
      return { success: false, error: 'Too many pending invites.' }
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

export async function deleteInvite(inviteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  try {
    const invite = await prisma.organizationInvite.findUnique({
      where: { id: inviteId },
      select: { organizationId: true },
    })
    if (!invite) {
      return { success: false, error: 'Invite not found' }
    }

    // Security
    await requireOrgRole(invite.organizationId, user.id, 'ADMIN')

    const { InvitationService } = await import('@/lib/services/invitation-service')
    await InvitationService.deleteInvite(inviteId)
    
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
    const invite = await prisma.organizationInvite.findUnique({
      where: { id: inviteId },
      select: { status: true, email: true, organizationId: true },
    })
    if (!invite) {
      return { success: false, error: 'Invite not found' }
    }

    // Security
    await requireOrgRole(invite.organizationId, user.id, 'ADMIN')

    if (invite.status === 'ACCEPTED') {
      const userByEmail = await prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } })
      if (userByEmail?.id) {
        const { OrganizationService } = await import('@/lib/services/organization-service')
        try {
          await OrganizationService.removeMember(invite.organizationId, userByEmail.id)
          await prisma.organizationInvite.update({ where: { id: inviteId }, data: { status: 'REVOKED' } })
          revalidatePath('/dashboard/settings/organization')
          return { success: true }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('Cannot remove the last owner')) {
            return { success: false, error: msg }
          }
        }
      } else {
        return { success: false, error: 'Member not found for accepted invite' }
      }
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
    const invite = await prisma.organizationInvite.findUnique({
      where: { id: inviteId },
      include: { inviter: true, organization: true },
    })
    if (!invite) {
      return { success: false, error: 'Invite not found' }
    }
    
    // Security
    await requireOrgRole(invite.organizationId, user.id, 'ADMIN')

    const { InvitationService } = await import('@/lib/services/invitation-service')
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

  // Security
  await requireOrgRole(orgId, user.id, 'ADMIN')

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

  // Security
  await requireOrgRole(orgId, user.id, 'OWNER')

  try {
    // 1. Fetch Org with Subscription details (Replace Service call with direct Prisma check for Subscription)
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true }
    })

    if (!org || org.deletedAt) {
      return { success: false, error: 'Organization not found' }
    }
    if (org.slug?.startsWith('default-organization')) {
      return { success: false, error: 'Default Organization cannot be deleted' }
    }

    // 2. Stripe Cancellation Check
    if (org.subscription?.stripeSubscriptionId) {
      // Check if subscription is active or implying active (not canceled)
      // The requirement says "If a stripeSubscriptionId exists... immediately cancel"
      // We'll wrap in try/catch to handle errors gracefully
      try {
        await stripe.subscriptions.cancel(org.subscription.stripeSubscriptionId)
      } catch (err) {
        // If it's already canceled, Stripe might throw. We can check error code or just log and proceed if critical?
        // Requirement says: "if Stripe fails, do not delete the Org, return an error to the user"
        console.error('Stripe cancellation failed:', err)
        const msg = err instanceof Error ? err.message : 'Stripe cancellation failed'
        return { success: false, error: `Failed to cancel subscription: ${msg}` }
      }
    }
    
    // Soft Delete (via Service)
    await OrganizationService.deleteOrganization(orgId)

    const cookieStore = await cookies()
    const userOrgs = await OrganizationService.getUserOrganizations(user.id)
    // Filter out deleted? Service might still return them if not filtered.
    // We should assume Service filters deletedAt: null.
    // If not, we filter here just in case for nextOrg.
    const activeOrgs = userOrgs.filter((o) => !o.deletedAt)
    const nextOrg = activeOrgs[0]?.id
    
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
  
  // Security
  await requireOrgRole(orgId, user.id, 'ADMIN')

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

  // Security
  try {
      await requireOrgRole(orgId, user.id, 'ADMIN')
  } catch {
      return { success: false, error: 'Unauthorized' }
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
