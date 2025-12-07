// app/lib/db.ts

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

// 1. Setup the connection pool and adapter
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  keepAlive: true,
})
const adapter = new PrismaPg(pool)

const prismaClientSingleton = () => {
  // 2. Pass the adapter to the PrismaClient constructor
  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

// --- Your existing helper functions remain unchanged below ---

// Helper function for getting/creating user data
interface UserData {
  email: string
  firstName: string
  id: string
  lastName: string
  profileImage?: string
}

export type DbUser = {
  id: string
  email: string
  name: string | null
  createdAt?: Date
  colorScheme?: string
  themePreference?: string
  credits: number
  stripeCustomerId?: string | null
  creditsReminderThresholdSent?: boolean
  lastPaygPurchaseAt?: Date | null
  Subscription?: {
    status: string
    interval: string
    planId: string
    stripeSubscriptionId?: string
    currentPeriodEnd: number
  } | null
}

export async function getData(userData?: UserData | string): Promise<DbUser | null> {
  // If string is passed, it's just the user ID for fetching
  if (typeof userData === 'string') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userData },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          colorScheme: true,
          themePreference: true,
          credits: true,
          creditsReminderThresholdSent: true,
          lastPaygPurchaseAt: true,
          stripeCustomerId: true,
          Subscription: {
            select: {
              status: true,
              interval: true,
              planId: true,
              stripeSubscriptionId: true,
              currentPeriodEnd: true,
            },
          },
        },
      })
      return user
    } catch {
      return null
    }
  }

  // If UserData object is passed, ensure user exists or create
  if (userData) {
      const selection = {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        colorScheme: true,
        themePreference: true,
        credits: true,
        creditsReminderThresholdSent: true,
        lastPaygPurchaseAt: true,
        Subscription: true,
      } as const

    // 1. Try to find by ID first (Best match)
    try {
      const foundById = await prisma.user.findUnique({
        where: { id: userData.id },
        select: selection,
      })
      if (foundById) return foundById
    } catch {}

    // 2. If not found by ID, try finding by Email
    try {
      const found = await prisma.user.findUnique({
        where: { email: userData.email },
        select: selection,
      })
      
      if (found) {
        // Zombie Record Check: Email matches, but ID might not match.
        // If the IDs don't match, we need to sync the DB ID to match the current Supabase ID (userData.id)
        // to avoid Foreign Key violations when creating related records (like OrganizationMember).
        if (found.id !== userData.id) {
            console.log(`[DB] Syncing user ID for ${userData.email}: ${found.id} -> ${userData.id}`)
            try {
                const fullName = `${userData.firstName} ${userData.lastName}`.trim()
                const updated = await prisma.user.update({
                    where: { email: userData.email },
                    data: { 
                        id: userData.id, 
                        name: fullName || found.name // Update name if provided
                    },
                    select: selection
                })
                return updated
            } catch (updateError) {
                 console.error('[DB] Failed to update user ID (Zombie Record):', updateError)
                 // If update fails (e.g. strict FK constraints), we return the found user.
                 // The caller might fail later, but we've done our best.
                 return found
            }
        }
        return found
      }
    } catch {
      // swallow and attempt create path below (may also fail)
    }

    {
      const fullName = `${userData.firstName} ${userData.lastName}`.trim()
      try {
        const created = await prisma.user.create({
          data: {
            id: userData.id,
            email: userData.email,
            name: fullName || null,
            // Create default Personal Organization and Project
            memberships: {
              create: {
                role: 'OWNER',
                organization: {
                  create: {
                    name: 'Default Organization',
                    slug: `default-organization-${userData.id.substring(0, 8)}`,
                    projects: {
                      create: {
                        name: 'Default Project',
                        slug: 'default-project',
                      },
                    },
                  },
                },
              },
            },
          },
          select: selection,
        })
        return created
      } catch (error) {
        console.error('[DB] Failed to create user:', error)
        // if create fails (db down), return minimal object for UI
        return {
          id: userData.id,
          email: userData.email,
          name: fullName || null,
          createdAt: undefined,
          colorScheme: undefined,
          themePreference: undefined,
          credits: 5,
          Subscription: undefined,
        }
      }
    }
    return null
  }

  return null
}
