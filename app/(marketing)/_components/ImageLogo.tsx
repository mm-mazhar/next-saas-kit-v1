// app/components/ImageLogo.tsx

'use client'

import Image from 'next/image'
import Link from 'next/link'

const Imagelogo = () => {
  return (
    <Link href='/'>
      <div className='flex items-center'>
        <Image
          src='/logo.png'
          alt='Next SAAS Kit Logo'
          width={70}
          height={70}
          priority
          className='rounded-full' // <-- This is the magic line!
        />
      </div>
    </Link>
  )
}

export default Imagelogo
