import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import {
  createTestUser,
  createTestPaper,
  createTestProcessedPaper,
  createTestProcessingJob,
  createTestSchedule,
} from '../utils/helpers'
import { MongoClient } from 'mongodb'

const mockSend = jest.fn().mockResolvedValue({ id: 'email_123' })
jest.mock('@/lib/email/client', () => ({
  getResendClient: () => ({ emails: { send: mockSend } }),
  FROM_EMAIL: 'test@example.com',
}))

jest.mock('@/lib/email/templates', () => ({
  generateBatchCompletionEmail: jest.fn().mockReturnValue('<html>email</html>'),
  generateBatchCompletionTextEmail: jest.fn().mockReturnValue('text email'),
}))

import { POST } from '@/app/api/email/batch-completion/route'

describe('POST /api/email/batch-completion', () => {
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
    mockSend.mockClear()
  })

  function makeRequest(body: any) {
    return new Request('http://localhost/api/email/batch-completion', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  it('should return 400 if jobId is missing', async () => {
    const response = await POST(makeRequest({}))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('jobId is required')
  })

  it('should return 404 if job not found', async () => {
    const response = await POST(makeRequest({ jobId: '507f1f77bcf86cd799439011' }))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Job not found')
  })

  it('should return 400 if job is not completed', async () => {
    const user = await createTestUser(client)
    const job = await createTestProcessingJob(client, user._id!.toString(), {
      status: 'running',
    })

    const response = await POST(makeRequest({ jobId: job._id!.toString() }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Job is not completed yet')
  })

  it('should return 400 if no notification email', async () => {
    const user = await createTestUser(client)
    const job = await createTestProcessingJob(client, user._id!.toString(), {
      status: 'completed',
    })

    const response = await POST(makeRequest({ jobId: job._id!.toString() }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No notification email configured for this schedule')
  })

  it('should return 404 if no papers found', async () => {
    const user = await createTestUser(client)
    const schedule = await createTestSchedule(client, user._id!.toString(), {
      email: 'notify@example.com',
    })
    const job = await createTestProcessingJob(client, user._id!.toString(), {
      status: 'completed',
      type: 'batch_scrape',
      input: {
        categories: ['cs.AI'],
        papersPerCategory: 5,
      },
    })

    const response = await POST(
      makeRequest({ jobId: job._id!.toString(), scheduleId: schedule._id!.toString() })
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('No papers found for this job')
  })

  it('should send email with paper summaries', async () => {
    const user = await createTestUser(client)
    const schedule = await createTestSchedule(client, user._id!.toString(), {
      email: 'notify@example.com',
      name: 'AI Papers',
    })

    const jobCreatedAt = new Date()
    const job = await createTestProcessingJob(client, user._id!.toString(), {
      status: 'completed',
      type: 'batch_scrape',
      input: {
        categories: ['cs.AI'],
        papersPerCategory: 5,
      },
      createdAt: jobCreatedAt,
    })

    const paper = await createTestPaper(client, { arxivId: '2501.55555' })
    await createTestProcessedPaper(client, user._id!.toString(), paper._id!.toString(), {
      status: 'completed',
      createdAt: new Date(jobCreatedAt.getTime() + 1000),
    })

    const response = await POST(
      makeRequest({ jobId: job._id!.toString(), scheduleId: schedule._id!.toString() })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.emailSent).toBe(true)
    expect(data.recipientEmail).toBe('notify@example.com')
    expect(data.paperCount).toBe(1)
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'notify@example.com',
        from: 'test@example.com',
      })
    )
  })
})
