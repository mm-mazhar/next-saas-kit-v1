// app/components/Navbar.tsx

import { Button } from '@/components/ui/button'
import {
  LoginLink,
  RegisterLink,
} from '@kinde-oss/kinde-auth-nextjs/components'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import Textlogo from './Textlogo'
// import Imagelogo from './ImageLogo'

import { Themetoggle } from './Themetoggle'
import { UserNav } from './UserNav'

export async function Navbar() {
  const { getUser } = getKindeServerSession()
  const user = await getUser()

  return (
    <nav className='border-b bg-background h-[10vh] flex items-center'>
      <div className='w-full flex items-center justify-between px-4 sm:px-6 lg:px-8'>
        {/* ---- LEFT SIDE (Child 1) ---- */}
        <Textlogo />
        {/* <Imagelogo /> */}

        {/* ---- RIGHT SIDE WRAPPER (Child 2) ---- */}
        {/* This new div groups everything on the right */}
        <div className='flex items-center gap-x-2'>
          {/* Conditional auth buttons */}
          {user ? (
            <UserNav
              email={user?.email as string}
              image={user?.picture as string}
              name={user?.given_name as string}
            />
          ) : (
            <div className='flex items-center gap-x-2'>
              <LoginLink>
                <Button>Sign In</Button>
              </LoginLink>
              <RegisterLink>
                <Button variant='secondary'>Sign Up</Button>
              </RegisterLink>
            </div>
          )}

          {/* Theme toggle is now inside the right-side group */}
          <Themetoggle />
        </div>
      </div>
    </nav>
  )
}
