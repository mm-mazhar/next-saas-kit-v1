'use client'

import { Zap } from 'lucide-react'
import Link from 'next/link'

const Textlogo = () => {
  return (
    <Link href='/'>
      {/* <div className='flex items-center space-x-2 px-4 py-2'> */}
      <div className='flex items-center'>
        <Zap className='w-6 h-6 text-primary' />

        {/* Consolidate both text parts into a single h1 element */}
        <h1 className='font-bold text-xl'>
          {/* <span>Automation</span> */}
          <span>SaaS</span>
          <span className='text-2xl italic text-primary'>Kit</span>
          {/* <span className='text-2xl italic text-primary-300'>Gryd</span> */}
          {/* <span className='text-2xl italic text-[oklch(0.795_0.184_86.047)]'>
            Gryd
          </span> */}
        </h1>
      </div>
    </Link>
  )
}

export default Textlogo
