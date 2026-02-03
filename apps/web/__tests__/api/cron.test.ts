import { GET } from '@/app/api/cron/process-schedules/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser, createTestSchedule } from '../utils/helpers'
import { MongoClient } from 'mongodb'
import { resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'
import { mockPaperProcessingQueue, resetQueueMocks } from '../../__mocks__/lib/queue/index'

jest.mock('@clerk/nextjs/server')
jest.mock('@/lib/queue', () => require('../../__mocks__/lib/queue/index'))

describe('/api/cron/process-schedules', () => {
  let client: MongoClient
  const CRON_SECRET = 'test_cron_secret'

  beforeAll(async () => {
    const result = await setupTestDatabase()
    client = result.client
    process.env.CRON_SECRET = CRON_SECRET
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearDatabase()
    resetAuthMocks()
    resetQueueMocks()
  })

  describe('GET /api/cron/process-schedules', () => {
    it('should return 401 if no authorization header', async () => {
      const request = new Request('http://localhost/api/cron/process-schedules')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 if invalid cron secret', async () => {
      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: 'Bearer wrong_secret',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return success with no schedules to process', async () => {
      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(0)
      expect(data.results).toEqual([])
    })

    it('should not process schedules not yet due', async () => {
      const user = await createTestUser(client)
      const futureDate = new Date(Date.now() + 86400000)
      await createTestSchedule(client, user._id!.toString(), {
        status: 'active',
        nextRunAt: futureDate,
      })

      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(0)
      expect(mockPaperProcessingQueue.add).not.toHaveBeenCalled()
    })

    it('should not process paused schedules', async () => {
      const user = await createTestUser(client)
      const pastDate = new Date(Date.now() - 3600000)
      await createTestSchedule(client, user._id!.toString(), {
        status: 'paused',
        nextRunAt: pastDate,
      })

      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(0)
    })

    it('should process due schedule and create job', async () => {
      const user = await createTestUser(client)
      const pastDate = new Date(Date.now() - 3600000)
      const schedule = await createTestSchedule(client, user._id!.toString(), {
        name: 'Test Schedule',
        status: 'active',
        nextRunAt: pastDate,
        categories: ['cs.AI'],
        papersPerCategory: 3,
        intervalDays: 7,
      })

      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(1)
      expect(data.results[0].status).toBe('success')
      expect(data.results[0].scheduleId).toBeDefined()

      expect(mockPaperProcessingQueue.add).toHaveBeenCalledWith(
        'batch-scrape',
        expect.objectContaining({
          userId: user.clerkId,
          categories: ['cs.AI'],
          papersPerCategory: 3,
          scheduleId: schedule._id!.toString(),
        })
      )

      const db = getTestDb()
      const updatedSchedule = await db.collection('recurring_schedules').findOne({ _id: schedule._id })
      expect(updatedSchedule?.lastRunAt).toBeDefined()
      expect(updatedSchedule?.lastRunJobId).toBeDefined()
      expect(updatedSchedule?.runCount).toBe(6)
      expect(updatedSchedule?.nextRunAt.getTime()).toBeGreaterThan(Date.now())

      const job = await db.collection('processing_jobs').findOne({ userId: user._id, type: 'batch_scrape' })
      expect(job).toBeDefined()
      expect(job?.status).toBe('queued')
    })

    it('should process schedule with keywords', async () => {
      const user = await createTestUser(client)
      const pastDate = new Date(Date.now() - 3600000)
      await createTestSchedule(client, user._id!.toString(), {
        status: 'active',
        nextRunAt: pastDate,
        keywords: ['transformer', 'attention'],
        keywordMatchMode: 'all',
      })

      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(1)

      expect(mockPaperProcessingQueue.add).toHaveBeenCalledWith(
        'batch-scrape',
        expect.objectContaining({
          keywords: ['transformer', 'attention'],
          keywordMatchMode: 'all',
        })
      )
    })

    it('should pause schedule if user has no API key', async () => {
      const user = await createTestUser(client, {
        apiKey: undefined,
      })
      const pastDate = new Date(Date.now() - 3600000)
      const schedule = await createTestSchedule(client, user._id!.toString(), {
        status: 'active',
        nextRunAt: pastDate,
      })

      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(1)
      expect(data.results[0].status).toBe('paused')
      expect(data.results[0].reason).toBe('No API key configured')
      expect(mockPaperProcessingQueue.add).not.toHaveBeenCalled()

      const db = getTestDb()
      const updatedSchedule = await db.collection('recurring_schedules').findOne({ _id: schedule._id })
      expect(updatedSchedule?.status).toBe('paused')
    })

    it('should include email in queue data if schedule has email', async () => {
      const user = await createTestUser(client)
      const pastDate = new Date(Date.now() - 3600000)
      await createTestSchedule(client, user._id!.toString(), {
        status: 'active',
        nextRunAt: pastDate,
        email: 'notify@example.com',
      })

      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPaperProcessingQueue.add).toHaveBeenCalledWith(
        'batch-scrape',
        expect.objectContaining({
          notificationEmail: 'notify@example.com',
        })
      )
    })

    it('should process multiple due schedules', async () => {
      const user = await createTestUser(client)
      const pastDate = new Date(Date.now() - 3600000)

      await createTestSchedule(client, user._id!.toString(), {
        name: 'Schedule 1',
        status: 'active',
        nextRunAt: pastDate,
      })

      await createTestSchedule(client, user._id!.toString(), {
        name: 'Schedule 2',
        status: 'active',
        nextRunAt: pastDate,
      })

      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(2)
      expect(mockPaperProcessingQueue.add).toHaveBeenCalledTimes(2)
    })

    it('should calculate next run date correctly based on intervalDays', async () => {
      const user = await createTestUser(client)
      const pastDate = new Date(Date.now() - 3600000)
      const schedule = await createTestSchedule(client, user._id!.toString(), {
        status: 'active',
        nextRunAt: pastDate,
        intervalDays: 14,
      })

      const beforeRun = Date.now()

      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response = await GET(request)

      const db = getTestDb()
      const updatedSchedule = await db.collection('recurring_schedules').findOne({ _id: schedule._id })

      const expectedNextRun = beforeRun + (14 * 24 * 60 * 60 * 1000)
      const nextRunTime = updatedSchedule?.nextRunAt.getTime() || 0

      expect(Math.abs(nextRunTime - expectedNextRun)).toBeLessThan(5000)
    })
  })
})
