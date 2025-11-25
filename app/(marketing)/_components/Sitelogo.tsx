// app/components/Sitelogo.tsx

'use client'

import { NEXT_PUBLIC_SITE_NAME } from '@/lib/constants'
import Logo from '@/public/logo-01.png'
export const SITE_LOGO_PATH = '/logo-01.png'
import Image from 'next/image'
import Link from 'next/link'

const SiteLogo = () => {
  return (
    <Link
      href='/'
      aria-label='home'
      className='flex items-center justify-center space-x-2'
    >
      <Image src={Logo} alt='Logo' width={32} height={32} />
      <h1 className='text-2xl font-bold'>
        {/* Next <span className='text-primary'>SaaS</span> */}
        {NEXT_PUBLIC_SITE_NAME}
      </h1>
    </Link>
  )
}

export default SiteLogo
