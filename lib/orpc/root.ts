/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/orpc/root.ts

import { os } from './server'
import { organizationRouter } from './routers/organization'
import { projectRouter } from './routers/project'
import { userRouter } from './routers/user'
import { adminRouter } from './routers/admin'
import { billingRouter } from './routers/billing'

/**
 * Root application router
 * Combines all domain routers into a single router object
 */
export const appRouter = os.router({
  org: organizationRouter,
  project: projectRouter,
  user: userRouter,
  admin: adminRouter,
  billing: billingRouter,
} as any)

/**
 * Type definition for the app router
 * Used for type inference in clients
 */
export type AppRouter = typeof appRouter
