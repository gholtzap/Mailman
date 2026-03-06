import { POST, DELETE } from '@/app/api/settings/api-key/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser } from '../utils/helpers'
import { MongoClient } from 'mongodb'
import { setMockUserId, resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'
import { setMockValidation, setMockEncryption, resetEncryptionMocks } from '../../__mocks__/lib/encryption/index'

jest.mock('@clerk/nextjs/server')
jest.mock('@/lib/encryption', () => import('../../__mocks__/lib/encryption/index'))

describe('/api/settings/api-key', () => {
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
    resetEncryptionMocks()
  })

  describe('POST /api/settings/api-key', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/settings/api-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'sk-ant-test123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for missing API key', async () => {
      await createTestUser(client)
      setMockUserId('test_user_123')

      const request = new Request('http://localhost/api/settings/api-key', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid API key format')
    })

    it('should return 400 for invalid API key format', async () => {
      await createTestUser(client)
      setMockUserId('test_user_123')

      const request = new Request('http://localhost/api/settings/api-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'invalid-key-format' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid API key format')
    })

    it('should return 400 if API key validation fails', async () => {
      await createTestUser(client)
      setMockUserId('test_user_123')
      setMockValidation(false, 'Invalid API key')

      const request = new Request('http://localhost/api/settings/api-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'sk-ant-invalid123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid API key')
    })

    it('should successfully store encrypted API key', async () => {
      await createTestUser(client)
      setMockUserId('test_user_123')
      setMockValidation(true)
      setMockEncryption({
        encryptedValue: 'encrypted_test_value',
        iv: 'test_iv_value',
        authTag: 'test_auth_tag',
      })

      const request = new Request('http://localhost/api/settings/api-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'sk-ant-valid123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      const db = getTestDb()
      const user = await db.collection('users').findOne({ clerkId: 'test_user_123' })
      expect(user?.apiKey).toBeDefined()
      expect(user?.apiKey.encryptedValue).toBe('encrypted_test_value')
      expect(user?.apiKey.iv).toBe('test_iv_value')
      expect(user?.apiKey.isValid).toBe(true)
    })

    it('should update existing API key', async () => {
      await createTestUser(client, {
        apiKey: {
          encryptedValue: 'old_encrypted_value',
          iv: 'old_iv',
          authTag: 'old_auth_tag',
          isValid: true,
        },
      })

      setMockUserId('test_user_123')
      setMockValidation(true)
      setMockEncryption({
        encryptedValue: 'new_encrypted_value',
        iv: 'new_iv',
        authTag: 'new_auth_tag',
      })

      const request = new Request('http://localhost/api/settings/api-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'sk-ant-newkey123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      const db = getTestDb()
      const user = await db.collection('users').findOne({ clerkId: 'test_user_123' })
      expect(user?.apiKey.encryptedValue).toBe('new_encrypted_value')
      expect(user?.apiKey.iv).toBe('new_iv')
    })
  })

  describe('DELETE /api/settings/api-key', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should successfully remove API key', async () => {
      await createTestUser(client, {
        apiKey: {
          encryptedValue: 'encrypted_value',
          iv: 'test_iv',
          authTag: 'test_auth_tag',
          isValid: true,
        },
      })

      setMockUserId('test_user_123')

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      const db = getTestDb()
      const user = await db.collection('users').findOne({ clerkId: 'test_user_123' })
      expect(user?.apiKey).toBeUndefined()
    })

    it('should succeed even if no API key exists', async () => {
      await createTestUser(client, {
        apiKey: undefined,
      })

      setMockUserId('test_user_123')

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
