import { GET } from '@/app/api/papers/route'
import { POST } from '@/app/api/papers/fetch/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase } from '../utils/test-db'
import { createTestUser, createTestPaper, createTestProcessedPaper, mockArxivResponse } from '../utils/helpers'
import { MongoClient } from 'mongodb'
import { setMockUserId, resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'

jest.mock('@clerk/nextjs/server')

global.fetch = jest.fn()

describe('/api/papers', () => {
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
    ;(global.fetch as jest.Mock).mockReset()
  })

  describe('GET /api/papers', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/papers')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user not found', async () => {
      setMockUserId('nonexistent_user')

      const request = new Request('http://localhost/api/papers')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return empty array if no papers', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/papers')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.papers).toEqual([])
    })

    it('should return user papers with metadata', async () => {
      const user = await createTestUser(client)
      const paper1 = await createTestPaper(client, {
        arxivId: '2501.11111',
        title: 'First Paper',
        categories: ['cs.AI'],
      })
      const paper2 = await createTestPaper(client, {
        arxivId: '2501.22222',
        title: 'Second Paper',
        categories: ['cs.LG'],
      })

      await createTestProcessedPaper(client, user._id!.toString(), paper1._id!.toString(), {
        status: 'completed',
        arxivId: '2501.11111',
      })
      await createTestProcessedPaper(client, user._id!.toString(), paper2._id!.toString(), {
        status: 'pending',
        arxivId: '2501.22222',
      })

      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/papers')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.papers).toHaveLength(2)
      expect(data.papers[0].paper).toBeDefined()
      expect(data.papers[1].paper).toBeDefined()
    })

    it('should filter papers by status', async () => {
      const user = await createTestUser(client)
      const paper1 = await createTestPaper(client, {
        arxivId: '2501.11111',
      })
      const paper2 = await createTestPaper(client, {
        arxivId: '2501.22222',
      })

      await createTestProcessedPaper(client, user._id!.toString(), paper1._id!.toString(), {
        status: 'completed',
      })
      await createTestProcessedPaper(client, user._id!.toString(), paper2._id!.toString(), {
        status: 'pending',
      })

      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/papers?status=completed')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.papers).toHaveLength(1)
      expect(data.papers[0].status).toBe('completed')
    })

    it('should filter papers by category', async () => {
      const user = await createTestUser(client)
      const paper1 = await createTestPaper(client, {
        arxivId: '2501.11111',
        categories: ['cs.AI'],
      })
      const paper2 = await createTestPaper(client, {
        arxivId: '2501.22222',
        categories: ['cs.LG'],
      })

      await createTestProcessedPaper(client, user._id!.toString(), paper1._id!.toString())
      await createTestProcessedPaper(client, user._id!.toString(), paper2._id!.toString())

      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/papers?category=cs.AI')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.papers).toHaveLength(1)
      expect(data.papers[0].paper.categories).toContain('cs.AI')
    })
  })

  describe('POST /api/papers/fetch', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/papers/fetch', {
        method: 'POST',
        body: JSON.stringify({ arxivUrl: 'https://arxiv.org/abs/2501.12345' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid arXiv URL', async () => {
      await createTestUser(client)
      setMockUserId('test_user_123')

      const request = new Request('http://localhost/api/papers/fetch', {
        method: 'POST',
        body: JSON.stringify({ arxivUrl: 'https://invalid.com/paper' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid arXiv or medrxiv URL')
    })

    it('should return existing paper if already in database', async () => {
      await createTestUser(client)
      const existingPaper = await createTestPaper(client, {
        arxivId: '2501.12345',
      })

      setMockUserId('test_user_123')

      const request = new Request('http://localhost/api/papers/fetch', {
        method: 'POST',
        body: JSON.stringify({ arxivUrl: 'https://arxiv.org/abs/2501.12345' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paper.arxivId).toBe('2501.12345')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should fetch and store new paper from arXiv', async () => {
      await createTestUser(client)
      setMockUserId('test_user_123')

      ;(global.fetch as jest.Mock).mockResolvedValue({
        text: jest.fn().mockResolvedValue(mockArxivResponse()),
        status: 200,
      })

      const request = new Request('http://localhost/api/papers/fetch', {
        method: 'POST',
        body: JSON.stringify({ arxivUrl: 'https://arxiv.org/abs/2501.12345' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paper.arxivId).toBe('2501.12345')
      expect(data.paper.title).toBe('Test Paper: Novel Approach to AI')
      expect(data.paper.authors).toEqual(['John Doe', 'Jane Smith'])
      expect(data.paper.categories).toContain('cs.AI')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('export.arxiv.org/api/query?id_list=2501.12345')
      )
    })

    it('should extract arXiv ID from pdf URL', async () => {
      await createTestUser(client)
      setMockUserId('test_user_123')

      ;(global.fetch as jest.Mock).mockResolvedValue({
        text: jest.fn().mockResolvedValue(mockArxivResponse()),
        status: 200,
      })

      const request = new Request('http://localhost/api/papers/fetch', {
        method: 'POST',
        body: JSON.stringify({ arxivUrl: 'https://arxiv.org/pdf/2501.12345.pdf' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paper.arxivId).toBe('2501.12345')
    })

    it('should extract arXiv ID from plain ID', async () => {
      await createTestUser(client)
      setMockUserId('test_user_123')

      ;(global.fetch as jest.Mock).mockResolvedValue({
        text: jest.fn().mockResolvedValue(mockArxivResponse()),
        status: 200,
      })

      const request = new Request('http://localhost/api/papers/fetch', {
        method: 'POST',
        body: JSON.stringify({ arxivUrl: '2501.12345' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paper.arxivId).toBe('2501.12345')
    })
  })
})
