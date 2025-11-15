// app/(dashboard)/_components/SideNav.tsx

'use client'
import { useMediaQuery } from '@/app/hooks/use-media-query'
import { createClient } from '@/app/lib/supabase/client'
import { useEffect, useState } from 'react'
import { DashboardNav } from './DashboardNav'
import { UserNav } from './SideUserNav'

export const SideNav = () => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isFrozen, setIsFrozen] = useState(false)

  const handleToggle = () => {
    if (isFrozen) return
    if (isMobile) {
      setIsCollapsed(!isCollapsed)
    }
  }

  const handleMouseEnter = () => {
    if (isFrozen) return
    if (!isMobile) {
      setIsCollapsed(false)
    }
  }

  const handleMouseLeave = () => {
    if (isFrozen) return
    if (!isMobile) {
      setIsCollapsed(true)
    }
  }

  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true)
    }
  }, [isMobile])

  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [image, setImage] = useState<string | undefined>(undefined)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const userName =
          (user.user_metadata?.full_name as string) ||
          (user.email?.split('@')[0] as string) ||
          'User'
        setName(userName)
        setEmail(user.email ?? '')
        setImage((user.user_metadata?.avatar_url as string) || undefined)
      }
    }
    loadUser()
  }, [])

  return (
    <div
      className={`relative border-r transition-all duration-300 overflow-hidden
      ${isCollapsed ? 'w-14 sm:w-20' : 'w-fit max-w-[18rem]'}
      ${
        isCollapsed
          ? isMobile
            ? 'min-w-[56px] px-1'
            : 'min-w-[80px] px-2'
          : isMobile
          ? 'min-w-[12rem] px-1'
          : 'min-w-[14rem] px-2'
      }
          sticky top-[10vh] h-[calc(100vh-10vh)] py-4
        `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleToggle}
    >
      <div className='flex h-full flex-col justify-between'>
        <DashboardNav isCollapsed={isCollapsed} />

        <div className='border-t mt-2 pt-2 flex items-center justify-center'>
          <UserNav
            name={name}
            email={email}
            image={image}
            onMenuOpenChange={(open) => setIsFrozen(open)}
          />
        </div>
      </div>
    </div>
  )
}
