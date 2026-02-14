import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser, mockArxivResponse } from '../utils/helpers'
import { MongoClient, ObjectId } from 'mongodb'

const mockAuth = jest.fn()
jest.mock('@clerk/nextjs/server', () => ({
  auth: (...args: any[]) => mockAuth(...args),
}))

const mockProcessSinglePaper = jest.fn()
jest.mock('@/lib/processing/single', () => ({
  processSinglePaper: (...args: any[]) => mockProcessSinglePaper(...args),
}))

const mockResendSend = jest.fn().mockResolvedValue({ data: { id: 'test_email_id' }, error: null })
jest.mock('@/lib/email/client', () => ({
  getResendClient: () => ({ emails: { send: (...args: any[]) => mockResendSend(...args) } }),
  FROM_EMAIL: 'test@example.com',
}))

jest.mock('@react-email/render', () => ({
  render: jest.fn().mockResolvedValue('<html><body>test email</body></html>'),
}))

let afterPromise: Promise<void> | undefined
jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (body: any, init?: any) => new Response(JSON.stringify(body), {
      status: init?.status || 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  },
  after: (fn: () => Promise<void>) => { afterPromise = fn() },
}))

import { POST as createSchedule } from '@/app/api/schedules/route'
import { DELETE as deleteSchedule } from '@/app/api/schedules/[id]/route'
import { GET as triggerCron } from '@/app/api/cron/process-schedules/route'

describe('Schedule pipeline integration', () => {
  let client: MongoClient
  const CRON_SECRET = 'test_cron_secret'
  const originalFetch = global.fetch

  beforeAll(async () => {
    const result = await setupTestDatabase()
    client = result.client
    global.fetch = jest.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      if (typeof input === 'string' && input.includes('export.arxiv.org')) {
        return Promise.resolve(new Response(mockArxivResponse(), { status: 200 }))
      }
      return originalFetch(input, init)
    }) as typeof global.fetch
  })

  afterAll(async () => {
    global.fetch = originalFetch
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearDatabase()
    mockAuth.mockReset()
    mockProcessSinglePaper.mockReset()
    mockResendSend.mockClear()
    afterPromise = undefined
    mockProcessSinglePaper.mockImplementation(async ({ processedPaperId }: { processedPaperId: string }) => {
      const db = getTestDb()
      await db.collection('processed_papers').updateOne(
        { _id: new ObjectId(processedPaperId) },
        {
          $set: {
            status: 'completed',
            generatedContent: 'Test generated content',
            humanizedContent: 'Test humanized content',
            updatedAt: new Date(),
          },
        }
      )
    })
  })

  it('creates a schedule, processes papers via cron, sends email, and deletes the schedule', async () => {
    const user = await createTestUser(client)
    mockAuth.mockResolvedValue({ userId: user.clerkId })

    const createResponse = await createSchedule(
      new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Pipeline Test Schedule',
          categories: ['cs.AI'],
          papersPerCategory: 5,
          intervalDays: 7,
          email: 'pipeline-test@example.com',
        }),
      })
    )
    const createData = await createResponse.json()
    expect(createResponse.status).toBe(200)
    expect(createData.success).toBe(true)
    const scheduleId = createData.schedule._id

    const cronResponse = await triggerCron(
      new Request('http://localhost/api/cron/process-schedules', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      })
    )
    const cronData = await cronResponse.json()
    expect(cronResponse.status).toBe(200)
    expect(cronData.processed).toBe(1)
    expect(cronData.results[0].status).toBe('success')

    expect(afterPromise).toBeDefined()
    await afterPromise

    const db = getTestDb()

    const job = await db.collection('processing_jobs').findOne({
      userId: user._id,
      type: 'batch_scrape',
    })
    expect(job).toBeDefined()
    expect(job!.status).toBe('completed')

    expect(mockProcessSinglePaper).toHaveBeenCalledWith(
      expect.objectContaining({
        arxivId: '2501.12345v1',
        jobId: job!._id!.toString(),
      })
    )

    const processedPaper = await db.collection('processed_papers').findOne({
      userId: user._id,
      status: 'completed',
    })
    expect(processedPaper).toBeDefined()
    expect(processedPaper!.humanizedContent).toBe('Test humanized content')

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'test@example.com',
        to: 'pipeline-test@example.com',
        subject: expect.stringContaining('Paper Summaries Ready'),
      })
    )

    const updatedJob = await db.collection('processing_jobs').findOne({ _id: job!._id })
    expect(updatedJob!.emailResult).toBeDefined()
    expect(updatedJob!.emailResult.sent).toBe(true)
    expect(updatedJob!.emailResult.notificationEmail).toBe('pipeline-test@example.com')

    const deleteResponse = await deleteSchedule(
      new Request(`http://localhost/api/schedules/${scheduleId}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: scheduleId }) }
    )
    const deleteData = await deleteResponse.json()
    expect(deleteResponse.status).toBe(200)
    expect(deleteData.success).toBe(true)

    const deletedSchedule = await db.collection('recurring_schedules').findOne({
      _id: new ObjectId(scheduleId),
    })
    expect(deletedSchedule).toBeNull()
  })
})
