// lib/services/organization-service.ts

import prisma from '../../app/lib/db'
import { LIMITS, OrganizationRole, ROLES } from '../constants'

export class OrganizationService {
  static async createOrganization(userId: string, name: string, slug: string) {
    // 1. Check Limits
    const userOrgCount = await prisma.organizationMember.count({
      where: { userId, role: ROLES.OWNER },
    })

    if (userOrgCount >= LIMITS.MAX_ORGANIZATIONS_PER_USER) {
      throw new Error(`Limit reached: You can only create up to ${LIMITS.MAX_ORGANIZATIONS_PER_USER} organizations.`)
    }

    // 2. Prevent Infinite Credit Loophole
    // Check if user is already an OWNER of any other active organization
    const existingOwnedOrgs = await prisma.organizationMember.count({
      where: { 
        userId, 
        role: ROLES.OWNER,
        organization: { deletedAt: null }
      }
    })

    const initialCredits = existingOwnedOrgs === 0 ? 5 : 0

    // 3. Create Org and Membership
    return await prisma.organization.create({
      data: {
        name,
        slug,
        credits: initialCredits,
        members: {
          create: {
            userId,
            role: ROLES.OWNER,
          },
        },
      },
      include: {
        members: true,
      },
    })
  }

  static async getUserOrganizations(userId: string) {
    return await prisma.organization.findMany({
      where: {
        deletedAt: null, // Filter out soft-deleted orgs
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: {
            userId,
          },
        },
      },
    })
  }

  static async getOrganizationBySlug(slug: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })
    // Filter out if soft-deleted
    if (org?.deletedAt) return null
    return org
  }

  static async getOrganizationById(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })
    if (org?.deletedAt) return null
    return org
  }

  static async updateOrganization(orgId: string, data: { name?: string; slug?: string }) {
    return await prisma.organization.update({
      where: { id: orgId },
      data,
    })
  }

  static async deleteOrganization(orgId: string) {
    // Soft Delete: Set deletedAt
    return await prisma.organization.update({
      where: { id: orgId },
      data: { deletedAt: new Date() }
    })
  }

  static async addMember(orgId: string, userId: string, role: OrganizationRole = ROLES.MEMBER) {
    // Check member limit
    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: orgId },
    })

    if (memberCount >= LIMITS.MAX_MEMBERS_PER_ORGANIZATION) {
      throw new Error(`Limit reached: Organization can have max ${LIMITS.MAX_MEMBERS_PER_ORGANIZATION} members.`)
    }

    return await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId,
        role,
      },
    })
  }

  static async removeMember(orgId: string, userId: string) {
    // Prevent removing the last OWNER
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      include: {
        user: true,
      },
    })

    if (member?.role === ROLES.OWNER) {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: ROLES.OWNER,
        },
      })

      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last owner of the organization.')
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Delete the member
      const deletedMember = await tx.organizationMember.delete({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId,
          },
        },
      })

      // 2. Update associated invites to REVOKED instead of deleting
      if (member?.user?.email) {
        await tx.organizationInvite.updateMany({
          where: {
            organizationId: orgId,
            email: member.user.email,
          },
          data: {
            status: 'REVOKED'
          }
        })
      }

      return deletedMember
    })
  }
}
