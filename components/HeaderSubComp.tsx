// components/HeaderSubComp.tsx

import { LogoutButton } from '@/app/(dashboard)/_components/LogoutButton'
import { createClient } from '@/app/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import SiteLogo from '@/app/(marketing)/_components/Sitelogo'

export default async function HeaderSubComponent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <nav className='border-b bg-background h-[10vh] flex items-center'>
      <div className='w-full flex items-center justify-between px-4 sm:px-6 lg:px-8'>
        <SiteLogo />
        <div className='flex items-center gap-x-2'>
          {user ? (
            <>
              <Link href='/dashboard'>
                <Button size='default'>Dashboard</Button>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href='/get-started'>
                <Button size='default'>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
