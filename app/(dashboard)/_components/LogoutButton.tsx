// app/(dashboard)/_components/LogoutButton.tsx

'use client'

import { createClient } from '@/app/lib/supabase/client'
import { DoorClosed } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className='w-full flex justify-between items-center cursor-pointer'
    >
      <span className='ml-2'>Logout</span>
      <span>
        <DoorClosed className='mr-2 w-4 h-4' />
      </span>
    </button>
  )
}
