// app/(dashboard)/layout.tsx

import { ClientAppSidebar } from '@/app/(dashboard)/_components/ClientAppSidebar'
import { TopBar } from '@/app/(dashboard)/_components/topbar'
import { getData } from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { SidebarProvider } from '@/components/ui/sidebar'
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

  const userRow = await getData({
    email: user.email as string,
    firstName: firstName,
    id: user.id,
    lastName: lastName,
    profileImage: user.user_metadata?.avatar_url,
  })

  return (
    <SidebarProvider>
      <ClientAppSidebar
        user={{
          name:
            (userRow?.name as string) ||
            (user.user_metadata?.full_name as string) ||
            (user.email as string) ||
            'User',
          email: (userRow?.email as string) || (user.email as string),
          avatar:
            (user.user_metadata?.avatar_url as string) ||
            'https://github.com/shadcn.png',
        }}
      />
      <main className='w-full'>
        <TopBar />
        <div className='px-4 md:px-8 pt-2 md:pt-4 pb-4 md:pb-8'>
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}

export default DashboardGroupLayout
