import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser, createTestSchedule } from '../utils/helpers'
import { MongoClient } from 'mongodb'
import { resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'

jest.mock('@clerk/nextjs/server')

const mockProcessBatchScrape = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/processing/batch', () => ({
  processBatchScrape: (...args: any[]) => mockProcessBatchScrape(...args),
}))

jest.mock('@/lib/email/send-batch-completion', () => ({
  sendBatchCompletionEmail: jest.fn().mockResolvedValue({ sent: true, paperCount: 1 }),
}))

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (body: any, init?: any) => new Response(JSON.stringify(body), {
      status: init?.status || 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  },
  after: (fn: () => Promise<void>) => fn(),
}))

import { GET } from '@/app/api/cron/process-schedules/route'

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
    mockProcessBatchScrape.mockClear()
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
      expect(mockProcessBatchScrape).not.toHaveBeenCalled()
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

      expect(mockProcessBatchScrape).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: ['cs.AI'],
          papersPerCategory: 3,
          notificationEmail: 'test@example.com',
          scheduleName: 'Test Schedule',
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
      expect(job?.scheduleId).toEqual(schedule._id)
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

      expect(mockProcessBatchScrape).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: ['transformer', 'attention'],
          keywordMatchMode: 'all',
        })
      )
    })

    it('should process schedule without AI when user has no API key', async () => {
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
      expect(data.results[0].status).toBe('success')
      expect(mockProcessBatchScrape).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptedApiKey: null,
        })
      )

      const db = getTestDb()
      const updatedSchedule = await db.collection('recurring_schedules').findOne({ _id: schedule._id })
      expect(updatedSchedule?.status).toBe('active')
      expect(updatedSchedule?.nextRunAt.getTime()).toBeGreaterThan(Date.now())
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
      expect(mockProcessBatchScrape).toHaveBeenCalledTimes(2)
    })

    it('should calculate next run date correctly based on intervalDays', async () => {
      const user = await createTestUser(client)
      const pastDate = new Date(Date.now() - 3600000)
      const schedule = await createTestSchedule(client, user._id!.toString(), {
        status: 'active',
        nextRunAt: pastDate,
        intervalDays: 14,
        preferredHour: 6,
        timezone: 'UTC',
      })

      const beforeRun = new Date()

      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response = await GET(request)

      const db = getTestDb()
      const updatedSchedule = await db.collection('recurring_schedules').findOne({ _id: schedule._id })

      const nextRun = updatedSchedule?.nextRunAt as Date
      expect(nextRun).toBeDefined()
      expect(nextRun.getUTCHours()).toBe(6)

      const dayDiff = Math.round((nextRun.getTime() - beforeRun.getTime()) / (24 * 60 * 60 * 1000))
      expect(dayDiff).toBeGreaterThanOrEqual(13)
      expect(dayDiff).toBeLessThanOrEqual(15)
    })

    it('should calculate next run for weekly schedule', async () => {
      const user = await createTestUser(client)
      const pastDate = new Date(Date.now() - 3600000)
      const schedule = await createTestSchedule(client, user._id!.toString(), {
        status: 'active',
        nextRunAt: pastDate,
        scheduleType: 'weekly',
        weekDays: [1, 3, 5],
        intervalDays: 7,
        preferredHour: 9,
        timezone: 'UTC',
      })

      const request = new Request('http://localhost/api/cron/process-schedules', {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response = await GET(request)

      const db = getTestDb()
      const updatedSchedule = await db.collection('recurring_schedules').findOne({ _id: schedule._id })

      const nextRun = updatedSchedule?.nextRunAt as Date
      expect(nextRun).toBeDefined()
      expect(nextRun.getUTCHours()).toBe(9)
      expect([1, 3, 5]).toContain(nextRun.getUTCDay())
      expect(nextRun.getTime()).toBeGreaterThan(Date.now())
    })
  })
})
