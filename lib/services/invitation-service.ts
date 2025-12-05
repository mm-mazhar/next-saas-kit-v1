// lib/services/invitation-service.ts

import { randomBytes } from 'crypto'
import prisma from '../../app/lib/db'
import { LIMITS, OrganizationRole, ROLES } from '../constants'

export class InvitationService {
  static async createInvite(inviterId: string, organizationId: string, email: string, role: OrganizationRole = ROLES.MEMBER) {
    // 1. Check Limits
    const pendingInvites = await prisma.organizationInvite.count({
      where: {
        organizationId,
        status: 'PENDING',
      },
    })

    if (pendingInvites >= LIMITS.MAX_PENDING_INVITES_PER_ORG) {
      throw new Error(`Limit reached: Organization can only have ${LIMITS.MAX_PENDING_INVITES_PER_ORG} pending invites.`)
    }

    // 2. Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: {
          email,
        },
      },
    })

    if (existingMember) {
      throw new Error('User is already a member of this organization.')
    }

    // 3. Create Invite
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    return await prisma.organizationInvite.create({
      data: {
        email,
        organizationId,
        inviterId,
        role,
        token,
        expiresAt,
      },
    })
  }

  static async getOrganizationInvites(organizationId: string) {
    return await prisma.organizationInvite.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })
  }

  static async acceptInvite(token: string, userId: string) {
    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
    })

    if (!invite) {
      throw new Error('Invalid invite token.')
    }

    if (invite.status !== 'PENDING') {
      throw new Error('Invite is no longer valid.')
    }

    if (invite.expiresAt < new Date()) {
      await prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      })
      throw new Error('Invite has expired.')
    }

    // Transaction to add member and update invite
    return await prisma.$transaction(async (tx) => {
      // Check member limit again inside transaction just in case
      const memberCount = await tx.organizationMember.count({
        where: { organizationId: invite.organizationId },
      })

      if (memberCount >= LIMITS.MAX_MEMBERS_PER_ORGANIZATION) {
        throw new Error('Organization member limit reached.')
      }

      const member = await tx.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role,
        },
      })

      await tx.organizationInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      })

      return member
    })
  }

  static async revokeInvite(inviteId: string) {
    return await prisma.organizationInvite.update({
      where: { id: inviteId },
      data: { status: 'DECLINED' }, // Or delete it? Better to keep record or mark as revoked/declined.
    })
  }
}
