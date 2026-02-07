import { GET, PUT } from '@/app/api/settings/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser } from '../utils/helpers'
import { MongoClient } from 'mongodb'
import { setMockUserId, setMockUser, resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'

jest.mock('@clerk/nextjs/server')

describe('/api/settings', () => {
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

  describe('GET /api/settings', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return user settings and email if user exists', async () => {
      const user = await createTestUser(client, {
        clerkId: 'test_user_123',
        email: 'test@example.com',
        settings: {
          defaultCategories: ['cs.AI', 'cs.LG'],
          keywords: ['transformer', 'attention'],
          keywordMatchMode: 'any',
          maxPagesPerPaper: 50,
          papersPerCategory: 5,
        },
      })

      setMockUserId('test_user_123')

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.email).toBe('test@example.com')
      expect(data.settings).toEqual({
        defaultCategories: ['cs.AI', 'cs.LG'],
        keywords: ['transformer', 'attention'],
        keywordMatchMode: 'any',
        maxPagesPerPaper: 50,
        papersPerCategory: 5,
      })
      expect(data.hasApiKey).toBe(true)
      expect(data.apiKeyValid).toBe(true)
      expect(data.usage).toBeDefined()
    })

    it('should create user if not exists and return default settings with email', async () => {
      setMockUserId('new_user_456')
      setMockUser({
        id: 'new_user_456',
        emailAddresses: [{ emailAddress: 'newuser@example.com' }],
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.email).toBe('newuser@example.com')
      expect(data.settings).toEqual({
        defaultCategories: ['cs.AI', 'cs.LG'],
        keywords: [],
        keywordMatchMode: 'any',
        maxPagesPerPaper: 50,
        papersPerCategory: 5,
      })
      expect(data.hasApiKey).toBe(false)
      expect(data.apiKeyValid).toBe(false)

      const db = getTestDb()
      const createdUser = await db.collection('users').findOne({ clerkId: 'new_user_456' })
      expect(createdUser).toBeDefined()
      expect(createdUser?.email).toBe('newuser@example.com')
    })

    it('should return empty string for email when user has no email', async () => {
      await createTestUser(client, {
        clerkId: 'test_no_email',
        email: '',
      })

      setMockUserId('test_no_email')

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.email).toBe('')
    })

    it('should handle user without keywords field', async () => {
      await createTestUser(client, {
        clerkId: 'test_user_789',
        settings: {
          defaultCategories: ['cs.AI'],
          maxPagesPerPaper: 50,
          papersPerCategory: 5,
        },
      })

      setMockUserId('test_user_789')

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.settings.keywords).toEqual([])
      expect(data.settings.keywordMatchMode).toBe('any')
    })
  })

  describe('PUT /api/settings', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          defaultCategories: ['cs.AI'],
          maxPagesPerPaper: 30,
          papersPerCategory: 3,
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should update user settings', async () => {
      await createTestUser(client, {
        clerkId: 'test_user_123',
      })

      setMockUserId('test_user_123')

      const request = new Request('http://localhost/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          defaultCategories: ['cs.CV', 'cs.RO'],
          maxPagesPerPaper: 30,
          papersPerCategory: 10,
          keywords: ['vision', 'robotics'],
          keywordMatchMode: 'all',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      const db = getTestDb()
      const updatedUser = await db.collection('users').findOne({ clerkId: 'test_user_123' })
      expect(updatedUser?.settings.defaultCategories).toEqual(['cs.CV', 'cs.RO'])
      expect(updatedUser?.settings.maxPagesPerPaper).toBe(30)
      expect(updatedUser?.settings.papersPerCategory).toBe(10)
      expect(updatedUser?.settings.keywords).toEqual(['vision', 'robotics'])
      expect(updatedUser?.settings.keywordMatchMode).toBe('all')
    })

    it('should reject invalid keywordMatchMode', async () => {
      await createTestUser(client, {
        clerkId: 'test_user_123',
      })

      setMockUserId('test_user_123')

      const request = new Request('http://localhost/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          defaultCategories: ['cs.AI'],
          maxPagesPerPaper: 50,
          papersPerCategory: 5,
          keywordMatchMode: 'invalid',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("keywordMatchMode must be 'any' or 'all'")
    })

    it('should update email on user record', async () => {
      await createTestUser(client, {
        clerkId: 'test_user_123',
        email: 'old@example.com',
      })

      setMockUserId('test_user_123')

      const request = new Request('http://localhost/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          defaultCategories: ['cs.AI'],
          maxPagesPerPaper: 50,
          papersPerCategory: 5,
          email: 'new@example.com',
        }),
      })

      const response = await PUT(request)
      expect(response.status).toBe(200)

      const db = getTestDb()
      const updatedUser = await db.collection('users').findOne({ clerkId: 'test_user_123' })
      expect(updatedUser?.email).toBe('new@example.com')
    })

    it('should reject invalid email', async () => {
      await createTestUser(client, {
        clerkId: 'test_user_123',
      })

      setMockUserId('test_user_123')

      const request = new Request('http://localhost/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          defaultCategories: ['cs.AI'],
          maxPagesPerPaper: 50,
          papersPerCategory: 5,
          email: 'not-an-email',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email address')
    })

    it('should update keywords without keywordMatchMode', async () => {
      await createTestUser(client, {
        clerkId: 'test_user_123',
        settings: {
          defaultCategories: ['cs.AI'],
          keywords: [],
          keywordMatchMode: 'any',
          maxPagesPerPaper: 50,
          papersPerCategory: 5,
        },
      })

      setMockUserId('test_user_123')

      const request = new Request('http://localhost/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          defaultCategories: ['cs.AI'],
          maxPagesPerPaper: 50,
          papersPerCategory: 5,
          keywords: ['neural', 'network'],
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const db = getTestDb()
      const updatedUser = await db.collection('users').findOne({ clerkId: 'test_user_123' })
      expect(updatedUser?.settings.keywords).toEqual(['neural', 'network'])
      expect(updatedUser?.settings.keywordMatchMode).toBe('any')
    })
  })
})
