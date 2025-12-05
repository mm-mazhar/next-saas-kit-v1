// lib/services/project-service.ts

import prisma from '../../app/lib/db'
import { LIMITS } from '../constants'

export class ProjectService {
  static async createProject(organizationId: string, name: string, slug: string) {
    // 1. Check Limits
    const projectCount = await prisma.project.count({
      where: { organizationId },
    })

    if (projectCount >= LIMITS.MAX_PROJECTS_PER_ORGANIZATION) {
      throw new Error(`Limit reached: Organization can only have up to ${LIMITS.MAX_PROJECTS_PER_ORGANIZATION} projects.`)
    }

    // 2. Create Project
    return await prisma.project.create({
      data: {
        name,
        slug,
        organizationId,
      },
    })
  }

  static async getOrganizationProjects(organizationId: string) {
    return await prisma.project.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  static async getProjectBySlug(organizationId: string, slug: string) {
    return await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
    })
  }

  static async updateProject(projectId: string, data: { name?: string; slug?: string }) {
    return await prisma.project.update({
      where: { id: projectId },
      data,
    })
  }

  static async deleteProject(projectId: string) {
    return await prisma.project.delete({
      where: { id: projectId },
    })
  }
}
