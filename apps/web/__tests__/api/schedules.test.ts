import { GET as GetList, POST } from '@/app/api/schedules/route'
import { GET, PUT, DELETE } from '@/app/api/schedules/[id]/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser, createTestSchedule } from '../utils/helpers'
import { MongoClient, ObjectId } from 'mongodb'
import { setMockUserId, resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'

jest.mock('@clerk/nextjs/server')

describe('/api/schedules', () => {
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

  describe('GET /api/schedules', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/schedules')
      const response = await GetList(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user not found', async () => {
      setMockUserId('nonexistent_user')

      const request = new Request('http://localhost/api/schedules')
      const response = await GetList(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return empty array if no schedules', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules')
      const response = await GetList(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schedules).toEqual([])
      expect(data.total).toBe(0)
    })

    it('should return user schedules', async () => {
      const user = await createTestUser(client)
      await createTestSchedule(client, user._id!.toString(), {
        name: 'Schedule 1',
      })
      await createTestSchedule(client, user._id!.toString(), {
        name: 'Schedule 2',
      })

      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules')
      const response = await GetList(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schedules).toHaveLength(2)
      expect(data.total).toBe(2)
    })

    it('should paginate schedules', async () => {
      const user = await createTestUser(client)
      for (let i = 1; i <= 5; i++) {
        await createTestSchedule(client, user._id!.toString(), {
          name: `Schedule ${i}`,
        })
      }

      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules?limit=2&offset=1')
      const response = await GetList(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schedules).toHaveLength(2)
      expect(data.total).toBe(5)
    })

    it('should only return schedules for authenticated user', async () => {
      const user1 = await createTestUser(client, { clerkId: 'user_1' })
      const user2 = await createTestUser(client, { clerkId: 'user_2', email: 'user2@test.com' })

      await createTestSchedule(client, user1._id!.toString(), { name: 'User 1 Schedule' })
      await createTestSchedule(client, user2._id!.toString(), { name: 'User 2 Schedule' })

      setMockUserId('user_1')

      const request = new Request('http://localhost/api/schedules')
      const response = await GetList(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schedules).toHaveLength(1)
      expect(data.schedules[0].name).toBe('User 1 Schedule')
    })
  })

  describe('POST /api/schedules', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Schedule',
          categories: ['cs.AI'],
          papersPerCategory: 5,
          intervalDays: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if missing required fields', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Schedule',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should return 400 for invalid email', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Schedule',
          categories: ['cs.AI'],
          papersPerCategory: 5,
          intervalDays: 1,
          email: 'invalid-email',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should return 400 for invalid intervalDays', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Schedule',
          categories: ['cs.AI'],
          papersPerCategory: 5,
          intervalDays: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('intervalDays must be an integer between 1 and 90')
    })

    it('should accept any intervalDays between 1 and 90', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Schedule 5 days',
          categories: ['cs.AI'],
          papersPerCategory: 5,
          intervalDays: 5,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schedule.intervalDays).toBe(5)
    })

    it('should create a weekly schedule', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Weekly Monday Wednesday',
          categories: ['cs.AI'],
          papersPerCategory: 3,
          scheduleType: 'weekly',
          weekDays: [1, 3],
          preferredHour: 9,
          timezone: 'America/New_York',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schedule.scheduleType).toBe('weekly')
      expect(data.schedule.weekDays).toEqual([1, 3])
      expect(data.schedule.preferredHour).toBe(9)
      expect(data.schedule.timezone).toBe('America/New_York')
      expect(data.schedule.intervalDays).toBe(7)
    })

    it('should return 400 for weekly schedule without weekDays', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Bad Weekly',
          categories: ['cs.AI'],
          papersPerCategory: 3,
          scheduleType: 'weekly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('weekDays')
    })

    it('should return 400 for invalid timezone', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Bad Timezone',
          categories: ['cs.AI'],
          papersPerCategory: 3,
          intervalDays: 1,
          timezone: 'Invalid/Timezone',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid timezone')
    })

    it('should return 400 for invalid preferredHour', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Bad Hour',
          categories: ['cs.AI'],
          papersPerCategory: 3,
          intervalDays: 1,
          preferredHour: 25,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('preferredHour')
    })

    it('should create a new schedule', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Schedule',
          categories: ['cs.AI', 'cs.LG'],
          papersPerCategory: 3,
          intervalDays: 7,
          email: 'test@example.com',
          keywords: ['neural', 'network'],
          keywordMatchMode: 'all',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.schedule).toBeDefined()
      expect(data.schedule.name).toBe('Test Schedule')
      expect(data.schedule.categories).toEqual(['cs.AI', 'cs.LG'])
      expect(data.schedule.papersPerCategory).toBe(3)
      expect(data.schedule.intervalDays).toBe(7)
      expect(data.schedule.status).toBe('active')
      expect(data.schedule.runCount).toBe(0)
      expect(data.schedule.keywords).toEqual(['neural', 'network'])
      expect(data.schedule.keywordMatchMode).toBe('all')
    })

    it('should return 400 if duplicate schedule name', async () => {
      const user = await createTestUser(client)
      await createTestSchedule(client, user._id!.toString(), {
        name: 'Duplicate Name',
      })

      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Duplicate Name',
          categories: ['cs.AI'],
          papersPerCategory: 5,
          intervalDays: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('A schedule with this name already exists')
    })
  })

  describe('GET /api/schedules/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/schedules/123')
      const params = Promise.resolve({ id: '123' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid schedule ID', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules/invalid_id')
      const params = Promise.resolve({ id: 'invalid_id' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid schedule ID')
    })

    it('should return 404 if schedule not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules/507f1f77bcf86cd799439011')
      const params = Promise.resolve({ id: '507f1f77bcf86cd799439011' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Schedule not found')
    })

    it('should return schedule by ID', async () => {
      const user = await createTestUser(client)
      const schedule = await createTestSchedule(client, user._id!.toString(), {
        name: 'Test Schedule',
      })

      setMockUserId(user.clerkId)

      const request = new Request(`http://localhost/api/schedules/${schedule._id}`)
      const params = Promise.resolve({ id: schedule._id!.toString() })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schedule).toBeDefined()
      expect(data.schedule.name).toBe('Test Schedule')
    })

    it('should not return schedule of different user', async () => {
      const user1 = await createTestUser(client, { clerkId: 'user_1' })
      const user2 = await createTestUser(client, { clerkId: 'user_2', email: 'user2@test.com' })

      const schedule = await createTestSchedule(client, user2._id!.toString(), {
        name: 'User 2 Schedule',
      })

      setMockUserId('user_1')

      const request = new Request(`http://localhost/api/schedules/${schedule._id}`)
      const params = Promise.resolve({ id: schedule._id!.toString() })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Schedule not found')
    })
  })

  describe('PUT /api/schedules/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/schedules/123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      })
      const params = Promise.resolve({ id: '123' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should update schedule', async () => {
      const user = await createTestUser(client)
      const schedule = await createTestSchedule(client, user._id!.toString(), {
        name: 'Original Name',
        categories: ['cs.AI'],
        papersPerCategory: 3,
      })

      setMockUserId(user.clerkId)

      const request = new Request(`http://localhost/api/schedules/${schedule._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Name',
          categories: ['cs.CV'],
          papersPerCategory: 5,
        }),
      })
      const params = Promise.resolve({ id: schedule._id!.toString() })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.schedule.name).toBe('Updated Name')
      expect(data.schedule.categories).toEqual(['cs.CV'])
      expect(data.schedule.papersPerCategory).toBe(5)
    })

    it('should update schedule status to paused', async () => {
      const user = await createTestUser(client)
      const schedule = await createTestSchedule(client, user._id!.toString(), {
        status: 'active',
      })

      setMockUserId(user.clerkId)

      const request = new Request(`http://localhost/api/schedules/${schedule._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'paused' }),
      })
      const params = Promise.resolve({ id: schedule._id!.toString() })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schedule.status).toBe('paused')
    })

    it('should return 400 for invalid status', async () => {
      const user = await createTestUser(client)
      const schedule = await createTestSchedule(client, user._id!.toString())

      setMockUserId(user.clerkId)

      const request = new Request(`http://localhost/api/schedules/${schedule._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'invalid' }),
      })
      const params = Promise.resolve({ id: schedule._id!.toString() })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("status must be either 'active' or 'paused'")
    })
  })

  describe('DELETE /api/schedules/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/schedules/123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: '123' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should delete schedule', async () => {
      const user = await createTestUser(client)
      const schedule = await createTestSchedule(client, user._id!.toString())

      setMockUserId(user.clerkId)

      const request = new Request(`http://localhost/api/schedules/${schedule._id}`, {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: schedule._id!.toString() })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      const db = getTestDb()
      const deletedSchedule = await db.collection('recurring_schedules').findOne({
        _id: schedule._id,
      })
      expect(deletedSchedule).toBeNull()
    })

    it('should return 404 if schedule not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/schedules/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: '507f1f77bcf86cd799439011' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Schedule not found')
    })
  })
})
