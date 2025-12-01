// app/api/cron/free-refill/route.ts

// ⬇️ FIXED IMPORT PATH: matches your project structure
import prisma from '@/app/lib/db' 
import { headers } from 'next/headers'

export async function GET() {
  const h = await headers()
  const auth = h.get('authorization') || ''
  
  const secret = process.env.CRON_SECRET || ''
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Logic: 
    // 1. User is NOT on a Pro subscription (Subscription is null or not active).
    // 2. User has < 5 credits.
    // 3. One month has passed since last refill (or since creation if never refilled).
    
    const result = await prisma.$executeRaw`
      UPDATE "User"
      SET 
        "credits" = 5,
        "lastFreeRefillAt" = NOW()
      FROM "User" u
      LEFT JOIN "Subscription" s ON s."userId" = u.id
      WHERE 
        "User".id = u.id
        AND (s.status IS NULL OR s.status != 'active')
        AND u.credits < 5
        AND (
          u."lastFreeRefillAt" < NOW() - INTERVAL '1 month'
          OR 
          (u."lastFreeRefillAt" IS NULL AND u."createdAt" < NOW() - INTERVAL '1 month')
        )
    `

    // Use JSON.stringify for safety with BigInts (if any return from raw queries)
    return new Response(JSON.stringify({ 
      success: true, 
      usersRefilled: Number(result) 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Cron job failed:', error)
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
