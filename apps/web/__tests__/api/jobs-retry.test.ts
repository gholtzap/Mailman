import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser, createTestPaper, createTestProcessedPaper, createTestProcessingJob } from '../utils/helpers'
import { MongoClient, ObjectId } from 'mongodb'

const mockAuth = jest.fn()
jest.mock('@clerk/nextjs/server', () => ({
  auth: (...args: any[]) => mockAuth(...args),
}))

function setMockUserId(userId: string | null) {
  mockAuth.mockResolvedValue({ userId })
}

function resetAuthMocks() {
  mockAuth.mockReset()
}

const mockProcessSinglePaper = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/processing/single', () => ({
  processSinglePaper: (...args: any[]) => mockProcessSinglePaper(...args),
}))

const mockProcessBatchScrape = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/processing/batch', () => ({
  processBatchScrape: (...args: any[]) => mockProcessBatchScrape(...args),
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

import { POST } from '@/app/api/jobs/[id]/retry/route'

describe('POST /api/jobs/[id]/retry', () => {
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
    mockProcessSinglePaper.mockClear()
    mockProcessBatchScrape.mockClear()
  })

  function makeRequest(id: string) {
    return {
      request: new Request(`http://localhost/api/jobs/${id}/retry`, { method: 'POST' }),
      params: Promise.resolve({ id }),
    }
  }

  it('should return 401 if not authenticated', async () => {
    setMockUserId(null)

    const jobId = new ObjectId().toString()
    const { request, params } = makeRequest(jobId)
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 if user not found', async () => {
    setMockUserId('nonexistent_user')

    const jobId = new ObjectId().toString()
    const { request, params } = makeRequest(jobId)
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })

  it('should return 404 if job not found', async () => {
    const user = await createTestUser(client)
    setMockUserId(user.clerkId)

    const jobId = new ObjectId().toString()
    const { request, params } = makeRequest(jobId)
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Job not found')
  })

  it('should return 403 if job belongs to another user', async () => {
    const user1 = await createTestUser(client, { clerkId: 'user_1' })
    const user2 = await createTestUser(client, { clerkId: 'user_2', email: 'user2@test.com' })

    const job = await createTestProcessingJob(client, user2._id!.toString(), {
      status: 'completed',
    })

    setMockUserId('user_1')
    const { request, params } = makeRequest(job._id!.toString())
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 if job cannot be retried (running state)', async () => {
    const user = await createTestUser(client)
    setMockUserId(user.clerkId)

    const job = await createTestProcessingJob(client, user._id!.toString(), {
      status: 'running',
    })

    const { request, params } = makeRequest(job._id!.toString())
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Job cannot be retried in its current state')
  })

  it('should retry failed single_paper job', async () => {
    const user = await createTestUser(client)
    setMockUserId(user.clerkId)

    const paper = await createTestPaper(client, { arxivId: '2501.99999' })
    const processedPaper = await createTestProcessedPaper(
      client,
      user._id!.toString(),
      paper._id!.toString(),
      { status: 'failed', arxivId: '2501.99999' }
    )

    const job = await createTestProcessingJob(client, user._id!.toString(), {
      status: 'failed',
      type: 'single_paper',
      input: { arxivUrl: 'https://arxiv.org/abs/2501.99999' },
    })

    const { request, params } = makeRequest(job._id!.toString())
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockProcessSinglePaper).toHaveBeenCalledWith(
      expect.objectContaining({
        processedPaperId: processedPaper._id!.toString(),
        jobId: job._id!.toString(),
        arxivId: '2501.99999',
      })
    )

    const db = getTestDb()
    const updatedJob = await db.collection('processing_jobs').findOne({ _id: job._id })
    expect(updatedJob?.status).toBe('queued')
  })

  it('should retry failed batch_scrape job', async () => {
    const user = await createTestUser(client)
    setMockUserId(user.clerkId)

    const job = await createTestProcessingJob(client, user._id!.toString(), {
      status: 'failed',
      type: 'batch_scrape',
      input: {
        categories: ['cs.AI', 'cs.LG'],
        papersPerCategory: 3,
      },
    })

    const { request, params } = makeRequest(job._id!.toString())
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockProcessBatchScrape).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: job._id!.toString(),
        categories: ['cs.AI', 'cs.LG'],
        papersPerCategory: 3,
      })
    )
  })

  it('should return 400 if batch job missing required input', async () => {
    const user = await createTestUser(client)
    setMockUserId(user.clerkId)

    const job = await createTestProcessingJob(client, user._id!.toString(), {
      status: 'failed',
      type: 'batch_scrape',
      input: {},
    })

    const { request, params } = makeRequest(job._id!.toString())
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Job is missing required batch input')
  })

  it('should return 400 if single_paper job is missing arxivUrl', async () => {
    const user = await createTestUser(client)
    setMockUserId(user.clerkId)

    const job = await createTestProcessingJob(client, user._id!.toString(), {
      status: 'failed',
      type: 'single_paper',
      input: {},
    })

    const { request, params } = makeRequest(job._id!.toString())
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Job is missing paper identifier')
  })
})
