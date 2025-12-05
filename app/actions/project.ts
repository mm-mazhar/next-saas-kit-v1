// app/actions/project.ts

'use server'

import { createClient } from '@/app/lib/supabase/server'
import { ProjectService } from '@/lib/services/project-service'
import { slugify } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const slug = (formData.get('slug') as string) || slugify(name)
  const orgId = formData.get('orgId') as string

  if (!name || !orgId) {
    return { success: false, error: 'All fields are required' }
  }

  try {
    const project = await ProjectService.createProject(orgId, name, slug)
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
  const slug = (formData.get('slug') as string) || slugify(name)

  if (!name) {
    return { success: false, error: 'Name is required' }
  }

  try {
    await ProjectService.updateProject(projectId, { name, slug })
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}
