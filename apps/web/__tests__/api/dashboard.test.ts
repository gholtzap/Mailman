import { GET } from '@/app/api/dashboard/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase } from '../utils/test-db'
import { createTestUser, createTestPaper, createTestProcessedPaper, createTestProcessingJob } from '../utils/helpers'
import { MongoClient } from 'mongodb'
import { setMockUserId, setMockUser, resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'

jest.mock('@clerk/nextjs/server')

describe('/api/dashboard', () => {
  let client: MongoClient

  beforeAll(async () => {
    const result = await setupTestDatabase()
    client = result.client
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearDatabase()
    resetAuthMocks()
  })

  describe('GET /api/dashboard', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should create user if not exists and return default dashboard', async () => {
      setMockUserId('new_user_123')
      setMockUser({
        id: 'new_user_123',
        emailAddresses: [{ emailAddress: 'newuser@example.com' }],
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.recentPapers).toEqual([])
      expect(data.activeJobs).toEqual([])
      expect(data.recentJobs).toEqual([])
      expect(data.stats).toEqual({
        completedPapers: 0,
        monthlyUsage: 0,
        totalCost: 0,
        hasApiKey: false,
      })
    })

    it('should return dashboard data with recent papers', async () => {
      const user = await createTestUser(client)
      const paper1 = await createTestPaper(client, { arxivId: '2501.11111' })
      const paper2 = await createTestPaper(client, { arxivId: '2501.22222' })

      await createTestProcessedPaper(client, user._id!.toString(), paper1._id!.toString(), {
        status: 'completed',
        costs: {
          opusInputTokens: 10000,
          opusOutputTokens: 5000,
          sonnetInputTokens: 5000,
          sonnetOutputTokens: 3000,
          estimatedCostUsd: 0.5,
        },
      })

      await createTestProcessedPaper(client, user._id!.toString(), paper2._id!.toString(), {
        status: 'completed',
        costs: {
          opusInputTokens: 8000,
          opusOutputTokens: 4000,
          sonnetInputTokens: 4000,
          sonnetOutputTokens: 2000,
          estimatedCostUsd: 0.3,
        },
      })

      setMockUserId(user.clerkId)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.recentPapers).toHaveLength(2)
      expect(data.stats.completedPapers).toBe(2)
      expect(data.stats.totalCost).toBeCloseTo(0.8, 2)
      expect(data.stats.hasApiKey).toBe(true)
    })

    it('should return active jobs', async () => {
      const user = await createTestUser(client)

      await createTestProcessingJob(client, user._id!.toString(), {
        status: 'queued',
        type: 'single_paper',
      })

      await createTestProcessingJob(client, user._id!.toString(), {
        status: 'running',
        type: 'batch_scrape',
      })

      await createTestProcessingJob(client, user._id!.toString(), {
        status: 'completed',
        type: 'single_paper',
      })

      setMockUserId(user.clerkId)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.activeJobs).toHaveLength(2)
      expect(data.activeJobs.every((job: any) => ['queued', 'running'].includes(job.status))).toBe(true)
    })

    it('should return recently completed batch jobs', async () => {
      const user = await createTestUser(client)

      await createTestProcessingJob(client, user._id!.toString(), {
        status: 'completed',
        type: 'batch_scrape',
      })

      await createTestProcessingJob(client, user._id!.toString(), {
        status: 'failed',
        type: 'batch_scrape',
      })

      await createTestProcessingJob(client, user._id!.toString(), {
        status: 'completed',
        type: 'single_paper',
      })

      await createTestProcessingJob(client, user._id!.toString(), {
        status: 'running',
        type: 'batch_scrape',
      })

      setMockUserId(user.clerkId)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.recentJobs).toHaveLength(2)
      expect(data.recentJobs.every((job: any) => job.type === 'batch_scrape')).toBe(true)
      expect(data.recentJobs.every((job: any) => ['completed', 'failed'].includes(job.status))).toBe(true)
    })

    it('should limit recent papers to 5', async () => {
      const user = await createTestUser(client)

      for (let i = 1; i <= 7; i++) {
        const paper = await createTestPaper(client, { arxivId: `2501.${10000 + i}` })
        await createTestProcessedPaper(client, user._id!.toString(), paper._id!.toString(), {
          status: 'completed',
        })
      }

      setMockUserId(user.clerkId)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.recentPapers).toHaveLength(5)
      expect(data.stats.completedPapers).toBe(7)
    })

    it('should calculate total cost correctly', async () => {
      const user = await createTestUser(client)

      const paper1 = await createTestPaper(client, { arxivId: '2501.11111' })
      const paper2 = await createTestPaper(client, { arxivId: '2501.22222' })
      const paper3 = await createTestPaper(client, { arxivId: '2501.33333' })

      await createTestProcessedPaper(client, user._id!.toString(), paper1._id!.toString(), {
        status: 'completed',
        costs: { estimatedCostUsd: 0.25 },
      })

      await createTestProcessedPaper(client, user._id!.toString(), paper2._id!.toString(), {
        status: 'completed',
        costs: { estimatedCostUsd: 0.35 },
      })

      await createTestProcessedPaper(client, user._id!.toString(), paper3._id!.toString(), {
        status: 'pending',
        costs: { estimatedCostUsd: 0.5 },
      })

      setMockUserId(user.clerkId)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.stats.totalCost).toBeCloseTo(0.6, 2)
    })

    it('should show monthly usage from user settings', async () => {
      const user = await createTestUser(client, {
        usage: {
          currentMonthPapersProcessed: 15,
          lastResetDate: new Date(),
        },
      })

      setMockUserId(user.clerkId)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.stats.monthlyUsage).toBe(15)
    })
  })
})
