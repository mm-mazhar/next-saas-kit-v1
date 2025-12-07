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

    // 2. Create Org and Membership
    return await prisma.organization.create({
      data: {
        name,
        slug,
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
    return await prisma.organization.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  static async getOrganizationById(id: string) {
    return await prisma.organization.findUnique({
      where: { id },
      include: {
        members: true,
      },
    })
  }

  static async updateOrganization(orgId: string, data: { name?: string; slug?: string }) {
    return await prisma.organization.update({
      where: { id: orgId },
      data,
    })
  }

  static async deleteOrganization(orgId: string) {
    // Cascade delete is handled by Prisma schema, but we might want extra checks here
    return await prisma.organization.delete({
      where: { id: orgId },
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

      // 2. Delete associated invites (cleanup)
      if (member?.user?.email) {
        await tx.organizationInvite.deleteMany({
          where: {
            organizationId: orgId,
            email: member.user.email,
          },
        })
      }

      return deletedMember
    })
  }
}
