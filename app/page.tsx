import { Button } from '@/components/ui/button'
import {
  APP_DESCRIPTION,
  APP_DESCRIPTION_LONG,
  APP_SLOGAN,
} from '@/lib/constants'
import { RegisterLink } from '@kinde-oss/kinde-auth-nextjs/components'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import Link from 'next/link' // Import Link for the dashboard button

export default async function Home() {
  const { getUser } = getKindeServerSession()
  const user = await getUser()

  // Conditionally render content instead of redirecting
  return (
    <section className='flex items-center justify-center bg-background h-[90vh]'>
      <div className='relative items-center w-full px-5 py-12 mx-auto lg:px-16 max-w-7xl md:px-12'>
        <div className='max-w-3xl mx-auto text-center'>
          {user ? (
            // --- CONTENT FOR AUTHENTICATED USERS ---
            <div>
              <h1 className='mt-8 text-3xl font-extrabold tracking-tight lg:text-6xl'>
                Welcome Back!
              </h1>
              <p className='max-w-xl mx-auto mt-8 text-base lg:text-xl text-secondary-foreground'>
                You are logged in. You can now access your dashboard.
              </p>
              <div className='flex justify-center max-w-sm mx-auto mt-10'>
                <Link href='/dashboard'>
                  <Button size='lg' className='w-full'>
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            // --- CONTENT FOR UNAUTHENTICATED USERS ---
            <div>
              <span className='w-auto px-6 py-3 rounded-full bg-secondary'>
                <span className='text-sm font-medium text-primary'>
                  {APP_SLOGAN}
                </span>
              </span>
              <h1 className='mt-8 text-3xl font-extrabold tracking-tight lg:text-6xl'>
                {APP_DESCRIPTION}
              </h1>
              <p className='max-w-xl mx-auto mt-8 text-base lg:text-xl text-secondary-foreground'>
                {APP_DESCRIPTION_LONG}
              </p>
              <div className='flex justify-center max-w-sm mx-auto mt-10'>
                <RegisterLink>
                  <Button size='lg' className='w-full'>
                    Sign Up for free
                  </Button>
                </RegisterLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
