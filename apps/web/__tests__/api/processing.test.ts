import { POST as PostSingle } from '@/app/api/processing/single/route'
import { POST as PostBatch } from '@/app/api/processing/batch/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser, createTestPaper } from '../utils/helpers'
import { MongoClient } from 'mongodb'
import { setMockUserId, resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'
import { __setMockClient, __resetMockClient } from '../../__mocks__/lib/db/mongodb'

jest.mock('@clerk/nextjs/server')
jest.mock('@/lib/db/mongodb', () => import('../../__mocks__/lib/db/mongodb'))

const mockProcessSinglePaper = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/processing/single', () => ({
  processSinglePaper: (...args: any[]) => mockProcessSinglePaper(...args),
}))

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

describe('/api/processing', () => {
  let client: MongoClient

  beforeAll(async () => {
    const result = await setupTestDatabase()
    client = result.client
    __setMockClient(result.client, result.db)
  }, 60000)

  afterAll(async () => {
    __resetMockClient()
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearDatabase()
    resetAuthMocks()
    mockProcessSinglePaper.mockClear()
    mockProcessBatchScrape.mockClear()
  })

  describe('POST /api/processing/single', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/processing/single', {
        method: 'POST',
        body: JSON.stringify({ paperId: 'some_id' }),
      })

      const response = await PostSingle(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user not found', async () => {
      setMockUserId('nonexistent_user')

      const request = new Request('http://localhost/api/processing/single', {
        method: 'POST',
        body: JSON.stringify({ paperId: 'some_id' }),
      })

      const response = await PostSingle(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should process paper without AI when user has no API key', async () => {
      const user = await createTestUser(client, {
        apiKey: undefined,
      })

      setMockUserId(user.clerkId)

      const paper = await createTestPaper(client)
      const request = new Request('http://localhost/api/processing/single', {
        method: 'POST',
        body: JSON.stringify({ paperId: paper._id!.toString() }),
      })

      const response = await PostSingle(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockProcessSinglePaper).toHaveBeenCalledWith(
        expect.objectContaining({
          arxivId: paper.arxivId,
          encryptedApiKey: null,
        })
      )
    })

    it('should return 404 if paper not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/processing/single', {
        method: 'POST',
        body: JSON.stringify({ paperId: '507f1f77bcf86cd799439011' }),
      })

      const response = await PostSingle(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Paper not found')
    })

    it('should return existing processed paper if already completed', async () => {
      const user = await createTestUser(client)
      const paper = await createTestPaper(client)

      const db = getTestDb()
      await db.collection('processed_papers').insertOne({
        userId: user._id!,
        paperId: paper._id!,
        arxivId: paper.arxivId,
        status: 'completed',
        generatedContent: 'Test content',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/processing/single', {
        method: 'POST',
        body: JSON.stringify({ paperId: paper._id!.toString() }),
      })

      const response = await PostSingle(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processedPaper).toBeDefined()
      expect(data.processedPaper.status).toBe('completed')
      expect(mockProcessSinglePaper).not.toHaveBeenCalled()
    })

    it('should return existing processed paper if currently processing', async () => {
      const user = await createTestUser(client)
      const paper = await createTestPaper(client)

      const db = getTestDb()
      await db.collection('processed_papers').insertOne({
        userId: user._id!,
        paperId: paper._id!,
        arxivId: paper.arxivId,
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/processing/single', {
        method: 'POST',
        body: JSON.stringify({ paperId: paper._id!.toString() }),
      })

      const response = await PostSingle(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processedPaper).toBeDefined()
      expect(data.processedPaper.status).toBe('processing')
      expect(mockProcessSinglePaper).not.toHaveBeenCalled()
    })

    it('should create new processing job and queue paper', async () => {
      const user = await createTestUser(client)
      const paper = await createTestPaper(client)

      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/processing/single', {
        method: 'POST',
        body: JSON.stringify({ paperId: paper._id!.toString() }),
      })

      const response = await PostSingle(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobId).toBeDefined()

      expect(mockProcessSinglePaper).toHaveBeenCalledWith(
        expect.objectContaining({
          arxivId: paper.arxivId,
          encryptedApiKey: user.apiKey,
        })
      )

      const db = getTestDb()
      const processedPaper = await db.collection('processed_papers').findOne({
        userId: user._id,
        paperId: paper._id,
      })
      expect(processedPaper).toBeDefined()
      expect(processedPaper?.status).toBe('pending')

      const job = await db.collection('processing_jobs').findOne({
        userId: user._id,
        type: 'single_paper',
      })
      expect(job).toBeDefined()
      expect(job?.status).toBe('queued')
    })

    it('should reprocess failed paper', async () => {
      const user = await createTestUser(client)
      const paper = await createTestPaper(client)

      const db = getTestDb()
      const failedProcessed = await db.collection('processed_papers').insertOne({
        userId: user._id!,
        paperId: paper._id!,
        arxivId: paper.arxivId,
        status: 'failed',
        error: 'Previous error',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/processing/single', {
        method: 'POST',
        body: JSON.stringify({ paperId: paper._id!.toString() }),
      })

      const response = await PostSingle(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockProcessSinglePaper).toHaveBeenCalled()

      const updatedProcessed = await db.collection('processed_papers').findOne({
        _id: failedProcessed.insertedId,
      })
      expect(updatedProcessed?.status).toBe('pending')
      expect(updatedProcessed?.error).toBeUndefined()
    })
  })

  describe('POST /api/processing/batch', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/processing/batch', {
        method: 'POST',
        body: JSON.stringify({
          categories: ['cs.AI'],
          papersPerCategory: 5,
        }),
      })

      const response = await PostBatch(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user not found', async () => {
      setMockUserId('nonexistent_user')

      const request = new Request('http://localhost/api/processing/batch', {
        method: 'POST',
        body: JSON.stringify({
          categories: ['cs.AI'],
          papersPerCategory: 5,
        }),
      })

      const response = await PostBatch(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should create batch processing job', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/processing/batch', {
        method: 'POST',
        body: JSON.stringify({
          categories: ['cs.AI', 'cs.LG'],
          papersPerCategory: 3,
          keywords: ['transformer'],
          keywordMatchMode: 'any',
        }),
      })

      const response = await PostBatch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobId).toBeDefined()

      expect(mockProcessBatchScrape).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: ['cs.AI', 'cs.LG'],
          papersPerCategory: 3,
          keywords: ['transformer'],
          keywordMatchMode: 'any',
          encryptedApiKey: user.apiKey,
          notificationEmail: user.email,
        })
      )

      const db = getTestDb()
      const job = await db.collection('processing_jobs').findOne({
        userId: user._id,
        type: 'batch_scrape',
      })
      expect(job).toBeDefined()
      expect(job?.status).toBe('queued')
      expect(job?.input.categories).toEqual(['cs.AI', 'cs.LG'])
      expect(job?.input.papersPerCategory).toBe(3)
      expect(job?.input.keywords).toEqual(['transformer'])
    })

    it('should use default values if not provided', async () => {
      const user = await createTestUser(client, {
        settings: {
          defaultCategories: ['cs.AI'],
          maxPagesPerPaper: 50,
          papersPerCategory: 5,
          keywords: [],
          keywordMatchMode: 'any',
        },
      })
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/processing/batch', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await PostBatch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockProcessBatchScrape).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: ['cs.AI'],
          papersPerCategory: 5,
        })
      )
    })
  })
})
