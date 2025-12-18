// app/actions/project.ts

'use server'

import prisma from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { requireOrgRole } from '@/lib/auth/guards'
import { ProjectService } from '@/lib/services/project-service'
import { slugify } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

function buildProjectSlug(name: string, userId: string) {
  const base = slugify(name)
  const userPrefix = userId.substring(0, 8)
  const timestamp = Date.now()
  return `${base}-${userPrefix}-${timestamp}`
}

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const slug = buildProjectSlug(name, user.id)
  const orgId = formData.get('orgId') as string

  if (!name || !orgId) {
    return { success: false, error: 'All fields are required' }
  }
  if (name.length > 20) {
    return { success: false, error: 'Name must be 20 characters or fewer' }
  }

  try {
    // Service checks membership
    const project = await ProjectService.createProject(user.id, orgId, name, slug)
    revalidatePath('/dashboard')
    return { success: true, projectId: project.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

export async function updateProjectName(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const slug = buildProjectSlug(name, user.id)

  if (!name) {
    return { success: false, error: 'Name is required' }
  }
  if (name.length > 20) {
    return { success: false, error: 'Name must be 20 characters or fewer' }
  }

  try {
    await ProjectService.updateProject(user.id, projectId, { name, slug })
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  try {
    // 1. Fetch OrgId for RBAC
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { organizationId: true } })
    if (!project) return { success: false, error: 'Project not found' }

    // 2. Enforce Role (Admin/Owner only for delete)
    await requireOrgRole(project.organizationId, user.id, 'ADMIN')

    // 3. Delete
    await ProjectService.deleteProject(user.id, projectId)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}
