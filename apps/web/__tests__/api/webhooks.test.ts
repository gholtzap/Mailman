import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { MongoClient } from 'mongodb'

const mockVerify = jest.fn()
jest.mock('svix', () => ({
  Webhook: jest.fn().mockImplementation(() => ({
    verify: mockVerify,
  })),
}))

const mockGet = jest.fn()
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue({
    get: (...args: any[]) => mockGet(...args),
  }),
}))

import { POST } from '@/app/api/webhooks/clerk/route'

describe('POST /api/webhooks/clerk', () => {
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
    mockVerify.mockReset()
    mockGet.mockReset()
  })

  function makeRequest(body: any) {
    return new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  it('should return 400 if svix headers are missing', async () => {
    mockGet.mockReturnValue(null)

    const response = await POST(makeRequest({ type: 'user.created' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing headers')
  })

  it('should return 400 if signature verification fails', async () => {
    mockGet.mockImplementation((name: string) => {
      const headers: Record<string, string> = {
        'svix-id': 'msg_123',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,invalid',
      }
      return headers[name] || null
    })

    mockVerify.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const response = await POST(makeRequest({ type: 'user.created' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid signature')
  })

  it('should create user on user.created event', async () => {
    mockGet.mockImplementation((name: string) => {
      const headers: Record<string, string> = {
        'svix-id': 'msg_123',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,valid',
      }
      return headers[name] || null
    })

    const payload = {
      type: 'user.created',
      data: {
        id: 'clerk_user_abc',
        email_addresses: [{ email_address: 'newuser@example.com' }],
      },
    }

    mockVerify.mockReturnValue(payload)

    const response = await POST(makeRequest(payload))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    const db = getTestDb()
    const user = await db.collection('users').findOne({ clerkId: 'clerk_user_abc' })
    expect(user).not.toBeNull()
    expect(user?.email).toBe('newuser@example.com')
  })

  it('should set default settings on created user', async () => {
    mockGet.mockImplementation((name: string) => {
      const headers: Record<string, string> = {
        'svix-id': 'msg_456',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,valid',
      }
      return headers[name] || null
    })

    const payload = {
      type: 'user.created',
      data: {
        id: 'clerk_user_def',
        email_addresses: [{ email_address: 'another@example.com' }],
      },
    }

    mockVerify.mockReturnValue(payload)

    await POST(makeRequest(payload))

    const db = getTestDb()
    const user = await db.collection('users').findOne({ clerkId: 'clerk_user_def' })
    expect(user?.settings.defaultCategories).toEqual(['cs.AI', 'cs.LG'])
    expect(user?.settings.maxPagesPerPaper).toBe(50)
    expect(user?.settings.papersPerCategory).toBe(5)
    expect(user?.usage.currentMonthPapersProcessed).toBe(0)
  })

  it('should ignore non-user.created events', async () => {
    mockGet.mockImplementation((name: string) => {
      const headers: Record<string, string> = {
        'svix-id': 'msg_789',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,valid',
      }
      return headers[name] || null
    })

    const payload = {
      type: 'user.updated',
      data: { id: 'clerk_user_xyz' },
    }

    mockVerify.mockReturnValue(payload)

    const response = await POST(makeRequest(payload))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    const db = getTestDb()
    const users = await db.collection('users').find({}).toArray()
    expect(users).toHaveLength(0)
  })
})
