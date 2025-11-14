// app/components/Navbar.tsx

import { LogoutButton } from '@/app/components/LogoutButton'
import { createClient } from '@/app/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Textlogo from '../(marketing)/_components/Sitelogo'
// import { Themetoggle } from './Themetoggle'
// import { UserNav } from './UserNav'
// import { Imagelogo } from './ImageLogo'

export default async function HeaderSubComponent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <nav className='border-b bg-background h-[10vh] flex items-center'>
      <div className='w-full flex items-center justify-between px-4 sm:px-6 lg:px-8'>
        {/* ---- LEFT SIDE (Child 1) ---- */}
        <Textlogo />
        {/* <Imagelogo /> */}
        {/* ---- RIGHT SIDE WRAPPER (Child 2) ---- */}
        <div className='flex items-center gap-x-2'>
          {/* Conditional auth buttons */}
          {user ? (
            <>
              {/* <Themetoggle /> */}
              <Link href='/dashboard'>
                <Button size='default'>Dashboard</Button>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              {/* <Themetoggle /> */}
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
