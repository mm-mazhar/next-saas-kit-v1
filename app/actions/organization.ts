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
    await InvitationService.createInvite(user.id, orgId, email, role)
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
    const { InvitationService } = await import('@/lib/services/invitation-service')
    await InvitationService.revokeInvite(inviteId)
    revalidatePath('/dashboard/settings/organization')
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
