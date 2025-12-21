// middleware.ts

import { updateSession } from '@/app/lib/supabase/middleware'
import { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Only run middleware on protected areas. Other paths will 404 naturally.
  matcher: ['/dashboard/:path*',
    '/admin/:path'
  ],
}
