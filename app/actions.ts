// app/actions.ts
'use server'

import { createClient } from '@/app/lib/supabase/server'
import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateThemePreference(
  theme: 'light' | 'dark' | 'system'
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Or handle the error as you see fit
    return
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      themePreference: theme,
    },
  })

  // Revalidate the root layout to ensure the new theme is fetched on next navigation
  revalidatePath('/', 'layout')
}
