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

export async function getData(userData?: UserData | string) {
  // If string is passed, it's just the user ID for fetching
  if (typeof userData === 'string') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userData },
        select: {
          id: true,
          email: true,
          name: true,
          colorScheme: true,
          themePreference: true,
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
    let user = null as any
    try {
      user = await prisma.user.findUnique({
        where: { email: userData.email },
        select: {
          id: true,
          email: true,
          name: true,
          colorScheme: true,
          themePreference: true,
          Subscription: true,
        },
      })
    } catch {
      // swallow and attempt create path below (may also fail)
    }

    if (!user) {
      const fullName = `${userData.firstName} ${userData.lastName}`.trim()
      try {
        user = await prisma.user.create({
          data: {
            id: userData.id,
            email: userData.email,
            name: fullName || null,
          },
          select: {
            id: true,
            email: true,
            name: true,
            colorScheme: true,
            themePreference: true,
            Subscription: true,
          },
        })
      } catch {
        // if create fails (db down), return minimal object for UI
        return {
          id: userData.id,
          email: userData.email,
          name: fullName || null,
          colorScheme: undefined,
          themePreference: undefined,
          stripeCustomerId: undefined,
          Subscription: undefined,
        } as any
      }
    }

    return user
  }

  return null
}
