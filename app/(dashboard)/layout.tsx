// app/(dashboard)/layout.tsx

import { getData } from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

async function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/get-started')
  }

  const userName =
    user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const [firstName, ...lastNameParts] = userName.split(' ')
  const lastName = lastNameParts.join(' ')

  await getData({
    email: user.email as string,
    firstName: firstName,
    id: user.id,
    lastName: lastName,
    profileImage: user.user_metadata?.avatar_url,
  })

  return (
    <div className='min-h-screen w-full bg-background'>
      {children}
    </div>
  )
}

export default DashboardGroupLayout

