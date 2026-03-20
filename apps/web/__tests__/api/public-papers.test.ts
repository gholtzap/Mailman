import { GET } from '@/app/api/public/papers/[...arxivId]/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase } from '../utils/test-db'
import { createTestUser, createTestPaper, createTestProcessedPaper } from '../utils/helpers'
import { MongoClient } from 'mongodb'

describe('/api/public/papers/[...arxivId]', () => {
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
  })

  it('should return 400 if no arxivId segments provided', async () => {
    const params = Promise.resolve({ arxivId: [] as string[] })
    const request = new Request('http://localhost/api/public/papers/')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('arXiv ID is required')
  })

  it('should return 404 if paper does not exist', async () => {
    const params = Promise.resolve({ arxivId: ['9999.99999'] })
    const request = new Request('http://localhost/api/public/papers/9999.99999')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Paper not found')
  })

  it('should return 404 if paper exists but has no completed summary', async () => {
    const user = await createTestUser(client)
    const paper = await createTestPaper(client)
    await createTestProcessedPaper(
      client,
      user._id!.toString(),
      paper._id!.toString(),
      { status: 'processing', generatedContent: undefined }
    )

    const params = Promise.resolve({ arxivId: ['2501.12345'] })
    const request = new Request('http://localhost/api/public/papers/2501.12345')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('No summary available for this paper')
  })

  it('should return paper and summary for a completed paper', async () => {
    const user = await createTestUser(client)
    const paper = await createTestPaper(client)
    await createTestProcessedPaper(
      client,
      user._id!.toString(),
      paper._id!.toString()
    )

    const params = Promise.resolve({ arxivId: ['2501.12345'] })
    const request = new Request('http://localhost/api/public/papers/2501.12345')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.paper.title).toBe('Test Paper: Novel Approach to AI')
    expect(data.paper.authors).toEqual(['John Doe', 'Jane Smith'])
    expect(data.paper.arxivId).toBe('2501.12345')
    expect(data.paper.categories).toEqual(['cs.AI', 'cs.LG'])
    expect(data.summary).toContain('Technical Analysis')
  })

  it('should not expose userId, folderId, or costs', async () => {
    const user = await createTestUser(client)
    const paper = await createTestPaper(client)
    await createTestProcessedPaper(
      client,
      user._id!.toString(),
      paper._id!.toString()
    )

    const params = Promise.resolve({ arxivId: ['2501.12345'] })
    const request = new Request('http://localhost/api/public/papers/2501.12345')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.paper).not.toHaveProperty('userId')
    expect(data).not.toHaveProperty('costs')
    expect(data).not.toHaveProperty('folderId')
  })

  it('should work without authentication', async () => {
    const user = await createTestUser(client)
    const paper = await createTestPaper(client)
    await createTestProcessedPaper(
      client,
      user._id!.toString(),
      paper._id!.toString()
    )

    const params = Promise.resolve({ arxivId: ['2501.12345'] })
    const request = new Request('http://localhost/api/public/papers/2501.12345')
    const response = await GET(request, { params })

    expect(response.status).toBe(200)
  })

  it('should handle medRxiv DOIs with slashes', async () => {
    const user = await createTestUser(client)
    const paper = await createTestPaper(client, {
      arxivId: '10.1101/2023.01.01.23284123',
      source: 'medrxiv',
      pdfUrl: 'https://www.medrxiv.org/content/10.1101/2023.01.01.23284123v1.full.pdf',
    })
    await createTestProcessedPaper(
      client,
      user._id!.toString(),
      paper._id!.toString(),
      { arxivId: '10.1101/2023.01.01.23284123' }
    )

    const params = Promise.resolve({ arxivId: ['10.1101', '2023.01.01.23284123'] })
    const request = new Request('http://localhost/api/public/papers/10.1101/2023.01.01.23284123')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.paper.arxivId).toBe('10.1101/2023.01.01.23284123')
  })

  it('should return the most recently updated summary when multiple exist', async () => {
    const user1 = await createTestUser(client, { clerkId: 'user_1' })
    const user2 = await createTestUser(client, { clerkId: 'user_2', email: 'user2@test.com' })
    const paper = await createTestPaper(client)

    await createTestProcessedPaper(
      client,
      user1._id!.toString(),
      paper._id!.toString(),
      {
        generatedContent: 'Older summary',
        updatedAt: new Date('2025-01-01'),
      }
    )
    await createTestProcessedPaper(
      client,
      user2._id!.toString(),
      paper._id!.toString(),
      {
        generatedContent: 'Newer summary',
        updatedAt: new Date('2025-06-01'),
      }
    )

    const params = Promise.resolve({ arxivId: ['2501.12345'] })
    const request = new Request('http://localhost/api/public/papers/2501.12345')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.summary).toBe('Newer summary')
  })
})
