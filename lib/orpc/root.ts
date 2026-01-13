// lib/orpc/root.ts

import { organizationRouter } from './routers/organization'
import { projectRouter } from './routers/project'
import { userRouter } from './routers/user'
import { adminRouter } from './routers/admin'

/**
 * Root application router
 * Combines all domain routers into a single router object
 */
export const appRouter = {
  org: organizationRouter,
  project: projectRouter,
  user: userRouter,
  admin: adminRouter,
}

/**
 * Type definition for the app router
 * Used for type inference in clients
 */
export type AppRouter = typeof appRouter
