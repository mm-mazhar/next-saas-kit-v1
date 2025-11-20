// app/actions.ts
'use server'

import { createClient } from '@/app/lib/supabase/server'
import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

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

  try {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        themePreference: theme,
      },
    })
  } catch {
    try {
      const admin = createSupabaseAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.SUPABASE_SERVICE_ROLE_KEY as string
      )
      await admin
        .from('User')
        .update({ themePreference: theme })
        .eq('id', user.id)
    } catch {}
  }

  
}
