import { DELETE } from '@/app/api/jobs/[id]/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser, createTestProcessingJob } from '../utils/helpers'
import { MongoClient } from 'mongodb'
import { setMockUserId, resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'

jest.mock('@clerk/nextjs/server')

describe('/api/jobs/[id]', () => {
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

  describe('DELETE /api/jobs/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/jobs/123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: '123' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user not found', async () => {
      setMockUserId('nonexistent_user')

      const request = new Request('http://localhost/api/jobs/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: '507f1f77bcf86cd799439011' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 404 if job not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/jobs/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: '507f1f77bcf86cd799439011' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Job not found')
    })

    it('should return 403 if job belongs to different user', async () => {
      const user1 = await createTestUser(client, { clerkId: 'user_1' })
      const user2 = await createTestUser(client, { clerkId: 'user_2', email: 'user2@test.com' })

      const job = await createTestProcessingJob(client, user2._id!.toString(), {
        status: 'queued',
      })

      setMockUserId('user_1')

      const request = new Request(`http://localhost/api/jobs/${job._id}`, {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: job._id!.toString() })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if trying to cancel running job', async () => {
      const user = await createTestUser(client)
      const job = await createTestProcessingJob(client, user._id!.toString(), {
        status: 'running',
      })

      setMockUserId(user.clerkId)

      const request = new Request(`http://localhost/api/jobs/${job._id}`, {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: job._id!.toString() })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot cancel a running job')
    })

    it('should successfully delete queued job', async () => {
      const user = await createTestUser(client)
      const job = await createTestProcessingJob(client, user._id!.toString(), {
        status: 'queued',
      })

      setMockUserId(user.clerkId)

      const request = new Request(`http://localhost/api/jobs/${job._id}`, {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: job._id!.toString() })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      const db = getTestDb()
      const deletedJob = await db.collection('processing_jobs').findOne({ _id: job._id })
      expect(deletedJob).toBeNull()
    })

    it('should successfully delete completed job', async () => {
      const user = await createTestUser(client)
      const job = await createTestProcessingJob(client, user._id!.toString(), {
        status: 'completed',
      })

      setMockUserId(user.clerkId)

      const request = new Request(`http://localhost/api/jobs/${job._id}`, {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: job._id!.toString() })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
