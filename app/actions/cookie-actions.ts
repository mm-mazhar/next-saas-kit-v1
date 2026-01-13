// app/actions/cookie-actions.ts
// Server actions that require cookie manipulation (cannot be done via oRPC)

'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Switch the current organization context
 * Sets the current-org-id cookie and redirects to dashboard
 */
export async function switchOrganization(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set('current-org-id', orgId)
  revalidatePath('/dashboard')
  redirect('/dashboard')
}
