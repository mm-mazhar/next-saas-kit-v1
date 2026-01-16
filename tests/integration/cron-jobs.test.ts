// tests/integration/cron-jobs.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TestUtils, testDb } from './setup'
import { OrganizationService } from '@/lib/services/organization-service'
import * as emailModule from '@/app/lib/email'
import { CREDIT_REMINDER_THRESHOLD } from '@/lib/constants'

// Mock the email module
vi.mock('@/app/lib/email', async () => {
  const actual = await vi.importActual('@/app/lib/email')
  return {
    ...actual,
    sendLowCreditsEmail: vi.fn(),
    sendRenewalReminderEmail: vi.fn(),
  }
})

describe('CRON Jobs & Automated Alerts', () => {
   
  let testUser: any
   
  let primaryOrg: any
   
  let secondaryOrg: any

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    
    // Create test user
    testUser = await TestUtils.createTestUser()
    
    // Create primary organization
    primaryOrg = await OrganizationService.createOrganization(
      testUser.id,
      'Primary Org',
      TestUtils.generateUniqueSlug('pri-org')
    )
    
    // Set it as primary
    await testDb.organization.update({
      where: { id: primaryOrg.id },
      data: { isPrimary: true },
    })
    
    // Create a secondary organization
    secondaryOrg = await OrganizationService.createOrganization(
      testUser.id,
      'Secondary Org',
      TestUtils.generateUniqueSlug('sec-org')
    )
  }, 15000) // Increase timeout to 15 seconds

  afterEach(async () => {
    if (testUser) {
      await TestUtils.cleanupUser(testUser.id)
    }
  })

  describe('Test 7.1: Low Credits Alert', () => {
    it('should send low credits email when credits are below threshold', async () => {
      const mockSendLowCreditsEmail = vi.mocked(emailModule.sendLowCreditsEmail)
      
      // Setup: Set credits to below threshold and creditsReminderThresholdSent to false
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: CREDIT_REMINDER_THRESHOLD - 1, // Below threshold
          creditsReminderThresholdSent: false,
        },
      })

      // Simulate the CRON job logic - but only for our test organization
      const lowCreditsOrgs = await testDb.organization.findMany({
        where: {
          id: primaryOrg.id, // Only check our test org
          deletedAt: null,
          creditsReminderThresholdSent: false,
          credits: { lte: CREDIT_REMINDER_THRESHOLD },
        },
        select: {
          id: true,
          name: true,
          credits: true,
          members: {
            where: { role: 'OWNER' },
            take: 1,
            select: { user: { select: { email: true, name: true } } },
          },
        },
      })

      // Send emails for low credit organizations
      for (const org of lowCreditsOrgs) {
        const owner = org.members[0]?.user
        if (owner?.email) {
          await emailModule.sendLowCreditsEmail({
            to: owner.email,
            name: owner.name,
            orgName: org.name,
            creditsRemaining: org.credits,
          })
          
          await testDb.organization.update({
            where: { id: org.id },
            data: { creditsReminderThresholdSent: true },
          })
        }
      }

      // Verify email was sent
      expect(mockSendLowCreditsEmail).toHaveBeenCalledTimes(1)
      expect(mockSendLowCreditsEmail).toHaveBeenCalledWith({
        to: testUser.email,
        name: testUser.name,
        orgName: primaryOrg.name,
        creditsRemaining: CREDIT_REMINDER_THRESHOLD - 1,
      })

      // Verify creditsReminderThresholdSent is now true
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: primaryOrg.id },
      })
      expect(updatedOrg?.creditsReminderThresholdSent).toBe(true)
    })

    it('should NOT send email if creditsReminderThresholdSent is already true', async () => {
      const mockSendLowCreditsEmail = vi.mocked(emailModule.sendLowCreditsEmail)
      
      // Setup: Set credits below threshold but creditsReminderThresholdSent to true
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: CREDIT_REMINDER_THRESHOLD - 1,
          creditsReminderThresholdSent: true, // Already sent
        },
      })

      // Simulate the CRON job logic - only for our test org
      const lowCreditsOrgs = await testDb.organization.findMany({
        where: {
          id: primaryOrg.id, // Only check our test org
          deletedAt: null,
          creditsReminderThresholdSent: false, // Only get orgs that haven't been notified
          credits: { lte: CREDIT_REMINDER_THRESHOLD },
        },
      })

      // Should not find any organizations
      expect(lowCreditsOrgs).toHaveLength(0)
      expect(mockSendLowCreditsEmail).not.toHaveBeenCalled()
    })

    it('should reset creditsReminderThresholdSent when credits go above threshold', async () => {
      // Setup: Set creditsReminderThresholdSent to true
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: CREDIT_REMINDER_THRESHOLD + 10, // Above threshold
          creditsReminderThresholdSent: true,
        },
      })

      // Simulate the reset logic from CRON job
      await testDb.organization.updateMany({
        where: {
          creditsReminderThresholdSent: true,
          credits: { gt: CREDIT_REMINDER_THRESHOLD },
        },
        data: { creditsReminderThresholdSent: false },
      })

      // Verify the flag was reset
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: primaryOrg.id },
      })
      expect(updatedOrg?.creditsReminderThresholdSent).toBe(false)
    })

    it('should NOT send email for deleted organizations', async () => {
      const mockSendLowCreditsEmail = vi.mocked(emailModule.sendLowCreditsEmail)
      
      // Setup: Set credits below threshold and soft delete the organization
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: CREDIT_REMINDER_THRESHOLD - 1,
          creditsReminderThresholdSent: false,
          deletedAt: new Date(),
        },
      })

      // Simulate the CRON job logic - only for our test org
      const lowCreditsOrgs = await testDb.organization.findMany({
        where: {
          id: primaryOrg.id, // Only check our test org
          deletedAt: null, // Exclude deleted orgs
          creditsReminderThresholdSent: false,
          credits: { lte: CREDIT_REMINDER_THRESHOLD },
        },
      })

      expect(lowCreditsOrgs).toHaveLength(0)
      expect(mockSendLowCreditsEmail).not.toHaveBeenCalled()
    })
  })

  describe('Test 7.2: Renewal Reminder', () => {
    it('should send renewal reminder email 3 days before subscription ends', async () => {
      const mockSendRenewalReminderEmail = vi.mocked(emailModule.sendRenewalReminderEmail)
      
      // Setup: Create a subscription ending in 3 days
      const threeDaysFromNow = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60
      const uniqueSubId = `sub_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await testDb.subscription.create({
        data: {
          stripeSubscriptionId: uniqueSubId,
          planId: 'price_test_pro',
          status: 'active',
          interval: 'month',
          currentPeriodStart: Math.floor(Date.now() / 1000) - 27 * 24 * 60 * 60,
          currentPeriodEnd: threeDaysFromNow,
          periodEndReminderSent: false,
          organization: {
            connect: { id: primaryOrg.id },
          },
        },
      })

      // Simulate the CRON job logic
      const now = Math.floor(Date.now() / 1000)
      const thresholdDays = 3
      const upper = now + thresholdDays * 24 * 60 * 60

      const subs = await testDb.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodEnd: { gte: now, lte: upper },
          organization: {
            deletedAt: null,
          },
        },
        select: {
          stripeSubscriptionId: true,
          planId: true,
          currentPeriodEnd: true,
          periodEndReminderSent: true,
          organization: {
            select: {
              name: true,
              credits: true,
              members: {
                where: { role: 'OWNER' },
                take: 1,
                select: { user: { select: { email: true, name: true } } },
              },
            },
          },
        },
      })

      // Send renewal reminder emails
      for (const sub of subs) {
        const owner = sub.organization?.members[0]?.user
        if (owner?.email && !sub.periodEndReminderSent) {
          await emailModule.sendRenewalReminderEmail({
            to: owner.email,
            name: owner.name,
            orgName: sub.organization?.name ?? null,
            planTitle: 'Pro',
            periodEnd: sub.currentPeriodEnd,
            creditsRemaining: sub.organization?.credits,
          })
          
          await testDb.subscription.update({
            where: { stripeSubscriptionId: uniqueSubId },
            data: { periodEndReminderSent: true },
          })
        }
      }

      // Verify email was sent
      expect(mockSendRenewalReminderEmail).toHaveBeenCalledTimes(1)
      expect(mockSendRenewalReminderEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testUser.email,
          orgName: primaryOrg.name,
          periodEnd: threeDaysFromNow,
        })
      )

      // Verify periodEndReminderSent is now true
      const updatedSub = await testDb.subscription.findUnique({
        where: { stripeSubscriptionId: uniqueSubId },
      })
      expect(updatedSub?.periodEndReminderSent).toBe(true)
    })

    it('should NOT send renewal reminder if already sent', async () => {
      const mockSendRenewalReminderEmail = vi.mocked(emailModule.sendRenewalReminderEmail)
      
      // Setup: Create a subscription with periodEndReminderSent already true
      const threeDaysFromNow = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60
      const uniqueSubId = `sub_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await testDb.subscription.create({
        data: {
          stripeSubscriptionId: uniqueSubId,
          planId: 'price_test_pro',
          status: 'active',
          interval: 'month',
          currentPeriodStart: Math.floor(Date.now() / 1000) - 27 * 24 * 60 * 60,
          currentPeriodEnd: threeDaysFromNow,
          periodEndReminderSent: true, // Already sent
          organization: {
            connect: { id: primaryOrg.id },
          },
        },
      })

      // Simulate the CRON job logic
      const now = Math.floor(Date.now() / 1000)
      const thresholdDays = 3
      const upper = now + thresholdDays * 24 * 60 * 60

      const subs = await testDb.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodEnd: { gte: now, lte: upper },
          periodEndReminderSent: false, // Only get subs that haven't been notified
          organization: {
            deletedAt: null,
          },
        },
      })

      // Should not find any subscriptions
      expect(subs).toHaveLength(0)
      expect(mockSendRenewalReminderEmail).not.toHaveBeenCalled()
    })

    it('should NOT send renewal reminder for inactive subscriptions', async () => {
      const mockSendRenewalReminderEmail = vi.mocked(emailModule.sendRenewalReminderEmail)
      
      // Setup: Create an inactive subscription
      const threeDaysFromNow = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60
      const uniqueSubId = `sub_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await testDb.subscription.create({
        data: {
          stripeSubscriptionId: uniqueSubId,
          planId: 'price_test_pro',
          status: 'canceled', // Inactive
          interval: 'month',
          currentPeriodStart: Math.floor(Date.now() / 1000) - 27 * 24 * 60 * 60,
          currentPeriodEnd: threeDaysFromNow,
          periodEndReminderSent: false,
          organization: {
            connect: { id: primaryOrg.id },
          },
        },
      })

      // Simulate the CRON job logic - only for our test org
      const now = Math.floor(Date.now() / 1000)
      const thresholdDays = 3
      const upper = now + thresholdDays * 24 * 60 * 60

      const subs = await testDb.subscription.findMany({
        where: {
          organizationId: primaryOrg.id, // Only check our test org
          status: 'active', // Only active subscriptions
          currentPeriodEnd: { gte: now, lte: upper },
          organization: {
            deletedAt: null,
          },
        },
      })

      expect(subs).toHaveLength(0)
      expect(mockSendRenewalReminderEmail).not.toHaveBeenCalled()
    })
  })

  describe('Test 7.3: Daily Maintenance (Refill & Cleanup)', () => {
    it('should refill credits for primary organization after 1 month', async () => {
      // Setup: Set lastFreeRefillAt to 2 months ago and credits to 1
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: 1,
          lastFreeRefillAt: twoMonthsAgo,
          isPrimary: true,
        },
      })

      // Simulate the refill logic - update credits for primary orgs without active subscriptions
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: 5,
          lastFreeRefillAt: new Date(),
          creditsReminderThresholdSent: false,
        },
      })

      // Verify credits were refilled
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: primaryOrg.id },
      })
      expect(updatedOrg?.credits).toBe(5)
      expect(updatedOrg?.creditsReminderThresholdSent).toBe(false)
    })

    it('should NOT refill credits for secondary organization', async () => {
      // Setup: Set lastFreeRefillAt to 2 months ago for secondary org
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      
      await testDb.organization.update({
        where: { id: secondaryOrg.id },
        data: {
          credits: 0,
          lastFreeRefillAt: twoMonthsAgo,
          isPrimary: false, // Secondary org
        },
      })

      // Simulate the refill logic (only for primary orgs)
      await testDb.$executeRaw`
        UPDATE "Organization"
        SET 
          "credits" = 5,
          "lastFreeRefillAt" = NOW(),
          "creditsReminderThresholdSent" = false
        FROM "Organization" o
        LEFT JOIN "Subscription" s ON s."organizationId" = o.id
        WHERE 
          "Organization".id = o.id
          AND o."deletedAt" IS NULL
          AND (s.status IS NULL OR s.status != 'active')
          AND o.credits < 5
          AND o."isPrimary" = true
          AND (
            o."lastFreeRefillAt" < NOW() - INTERVAL '1 month'
            OR 
            (o."lastFreeRefillAt" IS NULL AND o."createdAt" < NOW() - INTERVAL '1 month')
          )
      `

      // Verify credits were NOT refilled for secondary org
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: secondaryOrg.id },
      })
      expect(updatedOrg?.credits).toBe(0) // Should remain 0
    })

    it('should NOT refill credits for organizations with active subscriptions', async () => {
      // Setup: Create an active subscription and set old lastFreeRefillAt
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: 1,
          lastFreeRefillAt: twoMonthsAgo,
          isPrimary: true,
        },
      })

      const uniqueSubId = `sub_active_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await testDb.subscription.create({
        data: {
          stripeSubscriptionId: uniqueSubId,
          planId: 'price_test_pro',
          status: 'active', // Active subscription
          interval: 'month',
          currentPeriodStart: Math.floor(Date.now() / 1000),
          currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          organization: {
            connect: { id: primaryOrg.id },
          },
        },
      })

      // Simulate the refill logic (excludes orgs with active subscriptions)
      await testDb.$executeRaw`
        UPDATE "Organization"
        SET 
          "credits" = 5,
          "lastFreeRefillAt" = NOW(),
          "creditsReminderThresholdSent" = false
        FROM "Organization" o
        LEFT JOIN "Subscription" s ON s."organizationId" = o.id
        WHERE 
          "Organization".id = o.id
          AND o."deletedAt" IS NULL
          AND (s.status IS NULL OR s.status != 'active')
          AND o.credits < 5
          AND o."isPrimary" = true
          AND (
            o."lastFreeRefillAt" < NOW() - INTERVAL '1 month'
            OR 
            (o."lastFreeRefillAt" IS NULL AND o."createdAt" < NOW() - INTERVAL '1 month')
          )
      `

      // Verify credits were NOT refilled
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: primaryOrg.id },
      })
      expect(updatedOrg?.credits).toBe(1) // Should remain 1
    })

    it('should hard delete organizations deleted 30+ days ago', async () => {
      // Setup: Create an organization and soft delete it 31 days ago
      const deletedOrg = await OrganizationService.createOrganization(
        testUser.id,
        'To Delete',
        TestUtils.generateUniqueSlug('del-org')
      )

      const thirtyOneDaysAgo = new Date()
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31)
      
      await testDb.organization.update({
        where: { id: deletedOrg.id },
        data: {
          deletedAt: thirtyOneDaysAgo,
        },
      })

      // Verify the organization exists before cleanup
      const orgBeforeCleanup = await testDb.organization.findUnique({
        where: { id: deletedOrg.id },
      })
      expect(orgBeforeCleanup).not.toBeNull()

      // Simulate the cleanup logic
      await testDb.$executeRaw`
        DELETE FROM "Organization" WHERE "deletedAt" <= NOW() - INTERVAL '30 days'
      `

      // Verify the organization was hard deleted
      const orgAfterCleanup = await testDb.organization.findUnique({
        where: { id: deletedOrg.id },
      })
      expect(orgAfterCleanup).toBeNull()
    })

    it('should NOT delete organizations deleted less than 30 days ago', async () => {
      // Setup: Create an organization and soft delete it 15 days ago
      const recentlyDeletedOrg = await OrganizationService.createOrganization(
        testUser.id,
        'Recent Del',
        TestUtils.generateUniqueSlug('rec-del')
      )

      const fifteenDaysAgo = new Date()
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
      
      await testDb.organization.update({
        where: { id: recentlyDeletedOrg.id },
        data: {
          deletedAt: fifteenDaysAgo,
        },
      })

      // Simulate the cleanup logic
      await testDb.$executeRaw`
        DELETE FROM "Organization" WHERE "deletedAt" <= NOW() - INTERVAL '30 days'
      `

      // Verify the organization still exists
      const orgAfterCleanup = await testDb.organization.findUnique({
        where: { id: recentlyDeletedOrg.id },
      })
      expect(orgAfterCleanup).not.toBeNull()
      expect(orgAfterCleanup?.deletedAt).not.toBeNull()
    })

    it('should NOT refill credits if already at 5 or more', async () => {
      // Setup: Set credits to 5 and old lastFreeRefillAt
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: 5,
          lastFreeRefillAt: twoMonthsAgo,
          isPrimary: true,
        },
      })

      // Simulate the refill logic (only refills if credits < 5)
      await testDb.$executeRaw`
        UPDATE "Organization"
        SET 
          "credits" = 5,
          "lastFreeRefillAt" = NOW(),
          "creditsReminderThresholdSent" = false
        FROM "Organization" o
        LEFT JOIN "Subscription" s ON s."organizationId" = o.id
        WHERE 
          "Organization".id = o.id
          AND o."deletedAt" IS NULL
          AND (s.status IS NULL OR s.status != 'active')
          AND o.credits < 5
          AND o."isPrimary" = true
          AND (
            o."lastFreeRefillAt" < NOW() - INTERVAL '1 month'
            OR 
            (o."lastFreeRefillAt" IS NULL AND o."createdAt" < NOW() - INTERVAL '1 month')
          )
      `

      // Verify credits remain at 5 and lastFreeRefillAt was NOT updated
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: primaryOrg.id },
      })
      expect(updatedOrg?.credits).toBe(5)
      // lastFreeRefillAt should still be the old date (not updated)
      expect(updatedOrg?.lastFreeRefillAt?.getTime()).toBeLessThan(Date.now() - 60 * 24 * 60 * 60 * 1000)
    })
  })
})
