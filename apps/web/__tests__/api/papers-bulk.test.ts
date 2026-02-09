import { POST } from '@/app/api/papers/bulk/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser, createTestPaper, createTestProcessedPaper, createTestFolder } from '../utils/helpers'
import { MongoClient, ObjectId } from 'mongodb'
import { setMockUserId, resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'

jest.mock('@clerk/nextjs/server')
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status || 200,
        headers: { 'Content-Type': 'application/json' },
      })
      return response
    },
  },
  after: (fn: () => void) => fn(),
}))
jest.mock('@/lib/processing/single', () => ({
  processSinglePaper: jest.fn().mockResolvedValue(undefined),
}))

describe('POST /api/papers/bulk', () => {
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

  it('should return 401 if not authenticated', async () => {
    setMockUserId(null)

    const request = new Request('http://localhost/api/papers/bulk', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', paperIds: ['abc'] }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 for missing action or paperIds', async () => {
    const user = await createTestUser(client)
    setMockUserId(user.clerkId)

    const request = new Request('http://localhost/api/papers/bulk', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request body')
  })

  it('should return 400 for invalid action', async () => {
    const user = await createTestUser(client)
    setMockUserId(user.clerkId)

    const request = new Request('http://localhost/api/papers/bulk', {
      method: 'POST',
      body: JSON.stringify({ action: 'invalid', paperIds: [new ObjectId().toString()] }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid action')
  })

  describe('delete action', () => {
    it('should delete multiple papers', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const paper1 = await createTestPaper(client, { arxivId: '2501.11111' })
      const paper2 = await createTestPaper(client, { arxivId: '2501.22222' })
      const pp1 = await createTestProcessedPaper(client, user._id!.toString(), paper1._id!.toString())
      const pp2 = await createTestProcessedPaper(client, user._id!.toString(), paper2._id!.toString())

      const request = new Request('http://localhost/api/papers/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          paperIds: [pp1._id!.toString(), pp2._id!.toString()],
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.deleted).toBe(2)
    })

    it('should not delete another user papers', async () => {
      const user1 = await createTestUser(client, { clerkId: 'user_1' })
      await createTestUser(client, { clerkId: 'user_2', email: 'user2@test.com' })

      const paper = await createTestPaper(client)
      const pp = await createTestProcessedPaper(client, user1._id!.toString(), paper._id!.toString())

      setMockUserId('user_2')
      const request = new Request('http://localhost/api/papers/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          paperIds: [pp._id!.toString()],
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.deleted).toBe(0)
    })
  })

  describe('move action', () => {
    it('should move papers to a folder', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const paper1 = await createTestPaper(client, { arxivId: '2501.11111' })
      const paper2 = await createTestPaper(client, { arxivId: '2501.22222' })
      const pp1 = await createTestProcessedPaper(client, user._id!.toString(), paper1._id!.toString())
      const pp2 = await createTestProcessedPaper(client, user._id!.toString(), paper2._id!.toString())
      const folder = await createTestFolder(client, user._id!, { name: 'Target Folder' })

      const request = new Request('http://localhost/api/papers/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'move',
          paperIds: [pp1._id!.toString(), pp2._id!.toString()],
          folderId: folder._id!.toString(),
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.modified).toBe(2)
    })

    it('should unfile papers when folderId is null', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folder = await createTestFolder(client, user._id!, { name: 'Source Folder' })
      const paper = await createTestPaper(client)
      const pp = await createTestProcessedPaper(
        client,
        user._id!.toString(),
        paper._id!.toString(),
        { folderId: folder._id }
      )

      const request = new Request('http://localhost/api/papers/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'move',
          paperIds: [pp._id!.toString()],
          folderId: null,
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.modified).toBe(1)
    })

    it('should return 404 if target folder not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const paper = await createTestPaper(client)
      const pp = await createTestProcessedPaper(client, user._id!.toString(), paper._id!.toString())

      const request = new Request('http://localhost/api/papers/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'move',
          paperIds: [pp._id!.toString()],
          folderId: new ObjectId().toString(),
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Folder not found')
    })
  })

  describe('retry action', () => {
    it('should retry failed papers', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const paper = await createTestPaper(client)
      const pp = await createTestProcessedPaper(
        client,
        user._id!.toString(),
        paper._id!.toString(),
        { status: 'failed', error: 'Some error' }
      )

      const request = new Request('http://localhost/api/papers/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'retry',
          paperIds: [pp._id!.toString()],
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.retried).toBe(1)
    })

    it('should not retry completed papers', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const paper = await createTestPaper(client)
      const pp = await createTestProcessedPaper(
        client,
        user._id!.toString(),
        paper._id!.toString(),
        { status: 'completed' }
      )

      const request = new Request('http://localhost/api/papers/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'retry',
          paperIds: [pp._id!.toString()],
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.retried).toBe(0)
    })
  })
})
