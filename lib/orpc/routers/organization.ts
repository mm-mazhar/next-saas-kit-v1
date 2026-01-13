// lib/orpc/routers/organization.ts

import * as z from 'zod'
import { OrganizationService } from '@/lib/services/organization-service'
import { InvitationService } from '@/lib/services/invitation-service'
import { protectedProcedure, adminProcedure, ownerProcedure } from '../procedures'
import { ORPCError } from '../server'
import { ROLES } from '@/lib/constants'

// Rate limiting state (in-memory for simplicity - in production use Redis)
const inviteRateLimits = new Map<string, number>()
const RATE_LIMIT_MS = 60 * 1000 // 1 minute

/**
 * Organization name validation schema
 * Name must be non-empty and 20 characters or fewer
 */
const nameSchema = z.string().min(1, 'Name is required').max(20, 'Name must be 20 characters or fewer')

/**
 * Generate a unique slug from organization name and user ID
 */
function generateSlug(name: string, userId: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const userPrefix = userId.substring(0, 8)
  const timestamp = Date.now()
  return `${baseSlug}-${userPrefix}-${timestamp}`
}

export const organizationRouter = {
  /**
   * Create a new organization
   * Validates name (max 20 chars), generates slug, creates org with user as OWNER
   */
  create: protectedProcedure
    .input(z.object({ name: nameSchema }))
    .handler(async ({ input, context }) => {
      const slug = generateSlug(input.name, context.user.id)
      
      try {
        return await OrganizationService.createOrganization(
          context.user.id,
          input.name,
          slug
        )
      } catch (error) {
        if (error instanceof Error && error.message.includes('Limit reached')) {
          throw new ORPCError('PRECONDITION_FAILED', { message: error.message })
        }
        throw error
      }
    }),

  /**
   * List all organizations for the current user
   */
  list: protectedProcedure
    .handler(async ({ context }) => {
      return await OrganizationService.getUserOrganizations(context.user.id)
    }),

  /**
   * Get organization by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const org = await OrganizationService.getOrganizationById(input.id)
      if (!org) {
        throw new ORPCError('NOT_FOUND', { message: 'Organization not found' })
      }
      return org
    }),

  /**
   * Update organization name
   */
  updateName: adminProcedure
    .input(z.object({ name: nameSchema }))
    .handler(async ({ input, context }) => {
      return await OrganizationService.updateOrganization(context.orgId, { name: input.name })
    }),

  /**
   * Update a member's role
   * Prevents modifying OWNER's role and promoting to OWNER
   */
  updateMemberRole: adminProcedure
    .input(z.object({
      targetUserId: z.string(),
      newRole: z.enum([ROLES.ADMIN, ROLES.MEMBER]),
    }))
    .handler(async ({ input, context }) => {
      // Check if target is an OWNER
      const targetMember = await context.db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: context.orgId,
            userId: input.targetUserId,
          },
        },
      })

      if (!targetMember) {
        throw new ORPCError('NOT_FOUND', { message: 'Member not found' })
      }

      if (targetMember.role === ROLES.OWNER) {
        throw new ORPCError('FORBIDDEN', { 
          message: 'Cannot modify owner role. Use ownership transfer instead.' 
        })
      }

      return await OrganizationService.updateMemberRole(
        context.orgId,
        input.targetUserId,
        input.newRole
      )
    }),

  /**
   * Invite a member to the organization
   * Enforces rate limit (1 minute) and pending invite limit
   */
  inviteMember: adminProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum([ROLES.ADMIN, ROLES.MEMBER]).default(ROLES.MEMBER),
    }))
    .handler(async ({ input, context }) => {
      // Rate limit check
      const rateLimitKey = `${context.orgId}:${context.user.id}`
      const lastInviteTime = inviteRateLimits.get(rateLimitKey)
      
      if (lastInviteTime && Date.now() - lastInviteTime < RATE_LIMIT_MS) {
        const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastInviteTime)) / 1000)
        throw new ORPCError('PRECONDITION_FAILED', { 
          message: `Please wait ${remainingSeconds} seconds before sending another invite.` 
        })
      }

      try {
        const invite = await InvitationService.createInvite(
          context.user.id,
          context.orgId,
          input.email,
          input.role
        )

        // Update rate limit
        inviteRateLimits.set(rateLimitKey, Date.now())

        return {
          invite,
          inviteLink: InvitationService.getInviteLink(invite.token),
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Limit reached')) {
          throw new ORPCError('PRECONDITION_FAILED', { message: error.message })
        }
        if (error instanceof Error && error.message.includes('already a member')) {
          throw new ORPCError('CONFLICT', { message: error.message })
        }
        throw error
      }
    }),

  /**
   * Get all invites for the organization
   */
  getInvites: adminProcedure
    .handler(async ({ context }) => {
      return await InvitationService.getOrganizationInvites(context.orgId)
    }),

  /**
   * Revoke an invite
   */
  revokeInvite: adminProcedure
    .input(z.object({ inviteId: z.string() }))
    .handler(async ({ input }) => {
      return await InvitationService.revokeInvite(input.inviteId)
    }),

  /**
   * Remove a member from the organization
   */
  removeMember: adminProcedure
    .input(z.object({ targetUserId: z.string() }))
    .handler(async ({ input, context }) => {
      try {
        return await OrganizationService.removeMember(context.orgId, input.targetUserId)
      } catch (error) {
        if (error instanceof Error && error.message.includes('last owner')) {
          throw new ORPCError('FORBIDDEN', { message: error.message })
        }
        throw error
      }
    }),

  /**
   * Delete an organization (soft delete)
   * Optionally transfers credits to another organization
   * Cancels Stripe subscription if active
   */
  delete: ownerProcedure
    .input(z.object({ 
      transferToOrgId: z.string().optional() 
    }))
    .handler(async ({ input, context }) => {
      const org = await OrganizationService.getOrganizationById(context.orgId)
      
      if (!org) {
        throw new ORPCError('NOT_FOUND', { message: 'Organization not found' })
      }

      // Handle credit transfer if target org specified
      if (input.transferToOrgId && org.credits > 0) {
        // Verify user owns the target org
        const targetMembership = await context.db.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: input.transferToOrgId,
              userId: context.user.id,
            },
          },
        })

        if (!targetMembership || targetMembership.role !== ROLES.OWNER) {
          throw new ORPCError('FORBIDDEN', { 
            message: 'You must be the owner of the target organization to transfer credits.' 
          })
        }

        // Transfer credits
        await context.db.organization.update({
          where: { id: input.transferToOrgId },
          data: { credits: { increment: org.credits } },
        })
      }

      // Cancel Stripe subscription if exists
      if (org.stripeCustomerId) {
        const subscription = await context.db.subscription.findUnique({
          where: { organizationId: context.orgId },
        })

        if (subscription && subscription.status === 'active') {
          // Import Stripe dynamically to avoid issues if not configured
          try {
            const { stripe } = await import('@/app/lib/stripe')
            await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
          } catch (error) {
            console.error('Failed to cancel Stripe subscription:', error)
            // Continue with deletion even if Stripe cancellation fails
          }
        }
      }

      // Soft delete the organization
      return await OrganizationService.deleteOrganization(context.orgId)
    }),
}
