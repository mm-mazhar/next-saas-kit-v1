// app/actions.ts

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/app/lib/supabase/server'
import prisma from '@/app/lib/db'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { stripe } from '@/app/lib/stripe'
import { PRODUCTION_URL, LOCAL_SITE_URL } from '@/lib/constants'
import { redirect } from 'next/navigation'

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

export async function createCustomerPortal() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return
  }

  
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: 'asc' }
  })
  const customerId = membership?.organization?.stripeCustomerId
  
  if (!customerId) {
    return
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url:
      process.env.NODE_ENV === 'production'
        ? PRODUCTION_URL
        : `${LOCAL_SITE_URL}/dashboard`,
  })
  return redirect(session.url)
}

export async function revalidateDashboard() {
  revalidatePath('/dashboard', 'layout')
}

// Removed auto-renew logic
