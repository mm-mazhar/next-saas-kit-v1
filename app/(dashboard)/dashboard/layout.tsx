// app/(dashboard)/dashboard/layout.tsx

import { SideNav } from '@/app/(dashboard)/_components/SideNav'
import { getData } from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

async function DashboardLayout({ children }: { children: ReactNode }) {
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
    <div className='flex min-h-screen w-full flex-col'>
      <div className='flex flex-1'>
        <SideNav />
        <main className='p-8 w-full'>{children}</main>
      </div>
    </div>
  )
}

export default DashboardLayout
