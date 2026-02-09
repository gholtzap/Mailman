import { GET, DELETE } from '@/app/api/papers/[id]/route'
import { PUT } from '@/app/api/papers/[id]/folder/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser, createTestPaper, createTestProcessedPaper, createTestFolder } from '../utils/helpers'
import { MongoClient, ObjectId } from 'mongodb'
import { setMockUserId, resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'

jest.mock('@clerk/nextjs/server')

describe('/api/papers/[id]', () => {
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

  describe('GET /api/papers/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const ppId = new ObjectId().toString()
      const params = Promise.resolve({ id: ppId })
      const request = new Request(`http://localhost/api/papers/${ppId}`)
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user not found', async () => {
      setMockUserId('nonexistent_user')

      const ppId = new ObjectId().toString()
      const params = Promise.resolve({ id: ppId })
      const request = new Request(`http://localhost/api/papers/${ppId}`)
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 404 if paper not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const ppId = new ObjectId().toString()
      const params = Promise.resolve({ id: ppId })
      const request = new Request(`http://localhost/api/papers/${ppId}`)
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Paper not found')
    })

    it('should return processedPaper and paper', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const paper = await createTestPaper(client)
      const processedPaper = await createTestProcessedPaper(
        client,
        user._id!.toString(),
        paper._id!.toString()
      )

      const params = Promise.resolve({ id: processedPaper._id!.toString() })
      const request = new Request(`http://localhost/api/papers/${processedPaper._id}`)
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processedPaper).toBeDefined()
      expect(data.processedPaper.status).toBe('completed')
      expect(data.paper).toBeDefined()
      expect(data.paper.arxivId).toBe('2501.12345')
    })

    it('should not return another user paper', async () => {
      const user1 = await createTestUser(client, { clerkId: 'user_1' })
      await createTestUser(client, { clerkId: 'user_2', email: 'user2@test.com' })

      const paper = await createTestPaper(client)
      const processedPaper = await createTestProcessedPaper(
        client,
        user1._id!.toString(),
        paper._id!.toString()
      )

      setMockUserId('user_2')
      const params = Promise.resolve({ id: processedPaper._id!.toString() })
      const request = new Request(`http://localhost/api/papers/${processedPaper._id}`)
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Paper not found')
    })
  })

  describe('DELETE /api/papers/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const ppId = new ObjectId().toString()
      const params = Promise.resolve({ id: ppId })
      const request = new Request(`http://localhost/api/papers/${ppId}`, { method: 'DELETE' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user not found', async () => {
      setMockUserId('nonexistent_user')

      const ppId = new ObjectId().toString()
      const params = Promise.resolve({ id: ppId })
      const request = new Request(`http://localhost/api/papers/${ppId}`, { method: 'DELETE' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 404 if paper not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const ppId = new ObjectId().toString()
      const params = Promise.resolve({ id: ppId })
      const request = new Request(`http://localhost/api/papers/${ppId}`, { method: 'DELETE' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Paper not found')
    })

    it('should delete the processed paper', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const paper = await createTestPaper(client)
      const processedPaper = await createTestProcessedPaper(
        client,
        user._id!.toString(),
        paper._id!.toString()
      )

      const params = Promise.resolve({ id: processedPaper._id!.toString() })
      const request = new Request(`http://localhost/api/papers/${processedPaper._id}`, { method: 'DELETE' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      const getParams = Promise.resolve({ id: processedPaper._id!.toString() })
      const getRequest = new Request(`http://localhost/api/papers/${processedPaper._id}`)
      const getResponse = await GET(getRequest, { params: getParams })
      expect(getResponse.status).toBe(404)
    })

    it('should not delete another user paper', async () => {
      const user1 = await createTestUser(client, { clerkId: 'user_1' })
      await createTestUser(client, { clerkId: 'user_2', email: 'user2@test.com' })

      const paper = await createTestPaper(client)
      const processedPaper = await createTestProcessedPaper(
        client,
        user1._id!.toString(),
        paper._id!.toString()
      )

      setMockUserId('user_2')
      const params = Promise.resolve({ id: processedPaper._id!.toString() })
      const request = new Request(`http://localhost/api/papers/${processedPaper._id}`, { method: 'DELETE' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Paper not found')
    })
  })

  describe('PUT /api/papers/[id]/folder', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const ppId = new ObjectId().toString()
      const params = Promise.resolve({ id: ppId })
      const request = new Request(`http://localhost/api/papers/${ppId}/folder`, {
        method: 'PUT',
        body: JSON.stringify({ folderId: new ObjectId().toString() }),
      })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user not found', async () => {
      setMockUserId('nonexistent_user')

      const ppId = new ObjectId().toString()
      const params = Promise.resolve({ id: ppId })
      const request = new Request(`http://localhost/api/papers/${ppId}/folder`, {
        method: 'PUT',
        body: JSON.stringify({ folderId: null }),
      })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should assign folder to paper', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const paper = await createTestPaper(client)
      const processedPaper = await createTestProcessedPaper(
        client,
        user._id!.toString(),
        paper._id!.toString()
      )
      const folder = await createTestFolder(client, user._id!, { name: 'My Folder' })

      const params = Promise.resolve({ id: processedPaper._id!.toString() })
      const request = new Request(`http://localhost/api/papers/${processedPaper._id}/folder`, {
        method: 'PUT',
        body: JSON.stringify({ folderId: folder._id!.toString() }),
      })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paper.folderId.toString()).toBe(folder._id!.toString())
    })

    it('should remove folder from paper when folderId is null', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folder = await createTestFolder(client, user._id!, { name: 'My Folder' })
      const paper = await createTestPaper(client)
      const processedPaper = await createTestProcessedPaper(
        client,
        user._id!.toString(),
        paper._id!.toString(),
        { folderId: folder._id }
      )

      const params = Promise.resolve({ id: processedPaper._id!.toString() })
      const request = new Request(`http://localhost/api/papers/${processedPaper._id}/folder`, {
        method: 'PUT',
        body: JSON.stringify({ folderId: null }),
      })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paper.folderId).toBeUndefined()
    })

    it('should return 404 if folder not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const paper = await createTestPaper(client)
      const processedPaper = await createTestProcessedPaper(
        client,
        user._id!.toString(),
        paper._id!.toString()
      )

      const fakeFolderId = new ObjectId().toString()
      const params = Promise.resolve({ id: processedPaper._id!.toString() })
      const request = new Request(`http://localhost/api/papers/${processedPaper._id}/folder`, {
        method: 'PUT',
        body: JSON.stringify({ folderId: fakeFolderId }),
      })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Folder not found')
    })

    it('should return 404 if paper not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const ppId = new ObjectId().toString()
      const params = Promise.resolve({ id: ppId })
      const request = new Request(`http://localhost/api/papers/${ppId}/folder`, {
        method: 'PUT',
        body: JSON.stringify({ folderId: null }),
      })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Paper not found')
    })
  })
})
