// lib/orpc/routers/user.ts

import * as z from 'zod'
import { protectedProcedure } from '../procedures'

/**
 * Valid theme values
 */
export const THEME_VALUES = ['light', 'dark', 'system'] as const
export type ThemeValue = typeof THEME_VALUES[number]

/**
 * Theme validation schema
 */
const themeSchema = z.enum(THEME_VALUES)

export const userRouter = {
  /**
   * Update user's theme preference
   * Accepts 'light', 'dark', or 'system'
   */
  updateTheme: protectedProcedure
    .input(z.object({ theme: themeSchema }))
    .handler(async ({ input, context }) => {
      const updatedUser = await context.db.user.update({
        where: { id: context.user.id },
        data: { themePreference: input.theme },
        select: {
          id: true,
          email: true,
          name: true,
          themePreference: true,
          colorScheme: true,
        },
      })
      
      return updatedUser
    }),

  /**
   * Get current user's settings
   */
  getSettings: protectedProcedure
    .handler(async ({ context }) => {
      const user = await context.db.user.findUnique({
        where: { id: context.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          themePreference: true,
          colorScheme: true,
          createdAt: true,
        },
      })
      
      return user
    }),

  /**
   * Update user's color scheme
   */
  updateColorScheme: protectedProcedure
    .input(z.object({ colorScheme: z.string() }))
    .handler(async ({ input, context }) => {
      const updatedUser = await context.db.user.update({
        where: { id: context.user.id },
        data: { colorScheme: input.colorScheme },
        select: {
          id: true,
          email: true,
          name: true,
          themePreference: true,
          colorScheme: true,
        },
      })
      
      return updatedUser
    }),

  /**
   * Update user's profile (name and/or color scheme)
   */
  updateProfile: protectedProcedure
    .input(z.object({ 
      name: z.string().optional(),
      colorScheme: z.string().optional(),
    }))
    .handler(async ({ input, context }) => {
      const updatedUser = await context.db.user.update({
        where: { id: context.user.id },
        data: { 
          ...(input.name !== undefined && { name: input.name }),
          ...(input.colorScheme !== undefined && { colorScheme: input.colorScheme }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          themePreference: true,
          colorScheme: true,
        },
      })
      
      return updatedUser
    }),
}
