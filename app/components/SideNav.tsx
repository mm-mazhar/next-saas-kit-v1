'use client'
import { useMediaQuery } from '@/app/hooks/use-media-query' // Import our new hook
import { useEffect, useState } from 'react'
import { DashboardNav } from './DashboardNav'

export const SideNav = () => {
  const isMobile = useMediaQuery('(max-width: 768px)') // Use 768px as the mobile breakpoint

  // Start collapsed, especially on mobile
  const [isCollapsed, setIsCollapsed] = useState(true)

  // On mobile, clicking the sidebar toggles its state. It does nothing on desktop.
  const handleToggle = () => {
    if (isMobile) {
      setIsCollapsed(!isCollapsed)
    }
  }

  // On desktop, hovering expands the sidebar. It does nothing on mobile.
  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsCollapsed(false)
    }
  }

  // On desktop, the mouse leaving collapses the sidebar. It does nothing on mobile.
  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsCollapsed(true)
    }
  }

  // A safety effect to ensure the sidebar is collapsed when switching to mobile view
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true)
    }
  }, [isMobile])

  return (
    <div
      className={`relative border-r pb-10 pt-10 transition-all duration-300 overflow-hidden 
        ${isCollapsed ? 'w-14 sm:w-20' : 'w-60'}
        ${isMobile ? 'min-w-[56px] px-1' : 'min-w-[80px] px-2'}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleToggle} // Add the onClick handler for mobile toggling
    >
      <DashboardNav isCollapsed={isCollapsed} />
    </div>
  )
}
