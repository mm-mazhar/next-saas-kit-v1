// app/lib/db.ts

import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

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
  autoRenewOnCreditExhaust?: boolean
  creditsReminderThresholdSent?: boolean
  Subscription?: {
    status: string
    interval: string
    planId: string
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
          autoRenewOnCreditExhaust: true,
          creditsReminderThresholdSent: true,
          stripeCustomerId: true,
          Subscription: {
            select: {
              status: true,
              interval: true,
              planId: true,
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
      autoRenewOnCreditExhaust: true,
      creditsReminderThresholdSent: true,
      Subscription: true,
    } as const
    try {
      const found = await prisma.user.findUnique({
        where: { email: userData.email },
        select: selection,
      })
      if (found) return found
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
          },
          select: selection,
        })
        return created
      } catch {
        // if create fails (db down), return minimal object for UI
        return {
          id: userData.id,
          email: userData.email,
          name: fullName || null,
          createdAt: undefined,
          colorScheme: undefined,
          themePreference: undefined,
          credits: 0,
          autoRenewOnCreditExhaust: undefined,
          Subscription: undefined,
        }
      }
    }
    return null
  }

  return null
}
