// app/(super-admin)/layout.tsx

import { SidebarProvider } from '@/app/(dashboard)/_components/sidebar'; // Reuse existing provider
import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from './_components/admin-sidebar'

// Define Super Admins in your .env
// SUPER_ADMIN_EMAILS=mazhar@example.com,admin@example.com
const SUPER_ADMINS = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Auth Check
  if (!user) {
    return redirect('/get-started')
  }

  // 👇 ADD THESE LOGS TEMPORARILY
  console.log(" Current User Email:", user.email)
  console.log(" Allowed Admins:", SUPER_ADMINS)
  console.log(" Is Match?:", SUPER_ADMINS.includes(user.email || ''))
  // 👆

  // 2. Super Admin Check
  // If the user's email is NOT in the list, kick them back to the user dashboard
  if (!user.email || !SUPER_ADMINS.includes(user.email)) {
    return redirect('/dashboard') 
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* This is the dedicated Super Admin Sidebar */}
        <AdminSidebar /> 
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}