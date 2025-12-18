// app/api/cron/daily-maintenance/route.ts

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
    // 1. Organization is NOT on a Pro subscription (Subscription is null or not active).
    // 2. Organization has < 5 credits.
    // 3. One month has passed since last refill (or since creation if never refilled).
    
    // Postgres specific update with join logic
    // We target Organization table.
    const result = await prisma.$executeRaw`
      UPDATE "Organization"
      SET 
        "credits" = 5,
        "lastFreeRefillAt" = NOW()
      FROM "Organization" o
      LEFT JOIN "Subscription" s ON s."organizationId" = o.id
      WHERE 
        "Organization".id = o.id
        AND o."deletedAt" IS NULL
        AND (s.status IS NULL OR s.status != 'active')
        AND o.credits < 5
        AND o."isPrimary" = true
        AND (
          o."lastFreeRefillAt" < NOW() - INTERVAL '1 month'
          OR 
          (o."lastFreeRefillAt" IS NULL AND o."createdAt" < NOW() - INTERVAL '1 month')
        )
    `



    // Action B (Cleanup): Run a new SQL query to Hard Delete any organizations where deletedAt is 30+ days old.
    const cleanupResult = await prisma.$executeRaw`
      DELETE FROM "Organization" WHERE "deletedAt" <= NOW() - INTERVAL '30 days'
    `

    // Use JSON.stringify for safety with BigInts (if any return from raw queries)
    return new Response(JSON.stringify({ 
      success: true, 
      orgsRefilled: Number(result),
      orgsCleanedUp: Number(cleanupResult)
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
