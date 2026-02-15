import { GET } from '@/app/api/schedules/[id]/runs/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase } from '../utils/test-db'
import { createTestUser, createTestSchedule, createTestProcessingJob } from '../utils/helpers'
import { MongoClient, ObjectId } from 'mongodb'
import { setMockUserId, resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'

jest.mock('@clerk/nextjs/server')

describe('/api/schedules/[id]/runs', () => {
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

    const request = new Request('http://localhost/api/schedules/000000000000000000000000/runs')
    const response = await GET(request, { params: Promise.resolve({ id: '000000000000000000000000' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 for nonexistent schedule', async () => {
    const user = await createTestUser(client)
    setMockUserId(user.clerkId)

    const fakeId = new ObjectId().toString()
    const request = new Request(`http://localhost/api/schedules/${fakeId}/runs`)
    const response = await GET(request, { params: Promise.resolve({ id: fakeId }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Schedule not found')
  })

  it('should return 404 for schedule owned by different user', async () => {
    const user1 = await createTestUser(client, { clerkId: 'user_1', email: 'user1@test.com' })
    const user2 = await createTestUser(client, { clerkId: 'user_2', email: 'user2@test.com' })
    const schedule = await createTestSchedule(client, user1._id!.toString())

    setMockUserId(user2.clerkId)

    const request = new Request(`http://localhost/api/schedules/${schedule._id!.toString()}/runs`)
    const response = await GET(request, { params: Promise.resolve({ id: schedule._id!.toString() }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Schedule not found')
  })

  it('should return empty runs for schedule with no jobs', async () => {
    const user = await createTestUser(client)
    const schedule = await createTestSchedule(client, user._id!.toString())

    setMockUserId(user.clerkId)

    const request = new Request(`http://localhost/api/schedules/${schedule._id!.toString()}/runs`)
    const response = await GET(request, { params: Promise.resolve({ id: schedule._id!.toString() }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.runs).toEqual([])
    expect(data.pagination.total).toBe(0)
  })

  it('should return runs sorted by createdAt descending', async () => {
    const user = await createTestUser(client)
    const schedule = await createTestSchedule(client, user._id!.toString())

    const olderDate = new Date('2025-01-01T00:00:00Z')
    const newerDate = new Date('2025-01-02T00:00:00Z')

    await createTestProcessingJob(client, user._id!.toString(), {
      type: 'batch_scrape',
      scheduleId: schedule._id,
      status: 'completed',
      createdAt: olderDate,
      result: { totalFetched: 5, totalPapersQueued: 3, alreadyProcessedCount: 2, filteredCount: 0, categoriesSucceeded: 1, categoriesFailed: 0 },
    })

    await createTestProcessingJob(client, user._id!.toString(), {
      type: 'batch_scrape',
      scheduleId: schedule._id,
      status: 'completed',
      createdAt: newerDate,
      result: { totalFetched: 10, totalPapersQueued: 0, alreadyProcessedCount: 10, filteredCount: 0, categoriesSucceeded: 1, categoriesFailed: 0 },
    })

    setMockUserId(user.clerkId)

    const request = new Request(`http://localhost/api/schedules/${schedule._id!.toString()}/runs`)
    const response = await GET(request, { params: Promise.resolve({ id: schedule._id!.toString() }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.runs).toHaveLength(2)
    expect(new Date(data.runs[0].createdAt).getTime()).toBeGreaterThan(new Date(data.runs[1].createdAt).getTime())
    expect(data.runs[0].result.totalPapersQueued).toBe(0)
    expect(data.runs[1].result.totalPapersQueued).toBe(3)
    expect(data.pagination.total).toBe(2)
  })

  it('should respect pagination limit', async () => {
    const user = await createTestUser(client)
    const schedule = await createTestSchedule(client, user._id!.toString())

    for (let i = 0; i < 5; i++) {
      await createTestProcessingJob(client, user._id!.toString(), {
        type: 'batch_scrape',
        scheduleId: schedule._id,
        status: 'completed',
        createdAt: new Date(Date.now() - i * 86400000),
      })
    }

    setMockUserId(user.clerkId)

    const request = new Request(`http://localhost/api/schedules/${schedule._id!.toString()}/runs?limit=2&page=1`)
    const response = await GET(request, { params: Promise.resolve({ id: schedule._id!.toString() }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.runs).toHaveLength(2)
    expect(data.pagination.total).toBe(5)
    expect(data.pagination.totalPages).toBe(3)
    expect(data.pagination.page).toBe(1)
  })

  it('should not include jobs from other schedules', async () => {
    const user = await createTestUser(client)
    const schedule1 = await createTestSchedule(client, user._id!.toString(), { name: 'Schedule A' })
    const schedule2 = await createTestSchedule(client, user._id!.toString(), { name: 'Schedule B' })

    await createTestProcessingJob(client, user._id!.toString(), {
      type: 'batch_scrape',
      scheduleId: schedule1._id,
      status: 'completed',
    })

    await createTestProcessingJob(client, user._id!.toString(), {
      type: 'batch_scrape',
      scheduleId: schedule2._id,
      status: 'completed',
    })

    setMockUserId(user.clerkId)

    const request = new Request(`http://localhost/api/schedules/${schedule1._id!.toString()}/runs`)
    const response = await GET(request, { params: Promise.resolve({ id: schedule1._id!.toString() }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.runs).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })

  it('should return 400 for invalid schedule ID', async () => {
    const user = await createTestUser(client)
    setMockUserId(user.clerkId)

    const request = new Request('http://localhost/api/schedules/invalid-id/runs')
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid-id' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID')
  })
})
