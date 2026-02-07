import { GET, POST } from '@/app/api/folders/route'
import { GET as GET_BY_ID, PUT as PUT_BY_ID, DELETE as DELETE_BY_ID } from '@/app/api/folders/[id]/route'
import { PUT as REORDER } from '@/app/api/folders/reorder/route'
import { setupTestDatabase, teardownTestDatabase, clearDatabase, getTestDb } from '../utils/test-db'
import { createTestUser, createTestFolder, createTestPaper, createTestProcessedPaper } from '../utils/helpers'
import { MongoClient, ObjectId } from 'mongodb'
import { setMockUserId, resetAuthMocks } from '../../__mocks__/@clerk/nextjs/server'
import { FOLDER_COLORS, DEFAULT_FOLDER_COLOR } from '@/lib/constants/folder-colors'

jest.mock('@clerk/nextjs/server')

describe('/api/folders', () => {
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

  describe('GET /api/folders', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user not found', async () => {
      setMockUserId('nonexistent_user')

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return empty array if no folders', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.folders).toEqual([])
    })

    it('should return folders sorted by order', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      await createTestFolder(client, user._id!, { name: 'Second', order: 1 })
      await createTestFolder(client, user._id!, { name: 'First', order: 0 })
      await createTestFolder(client, user._id!, { name: 'Third', order: 2 })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.folders).toHaveLength(3)
      expect(data.folders[0].name).toBe('First')
      expect(data.folders[1].name).toBe('Second')
      expect(data.folders[2].name).toBe('Third')
    })

    it('should limit results to 100', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const db = getTestDb()
      const folders = Array.from({ length: 105 }, (_, i) => ({
        userId: user._id!,
        name: `Folder ${i}`,
        color: DEFAULT_FOLDER_COLOR,
        order: i,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
      await db.collection('folders').insertMany(folders)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.folders).toHaveLength(100)
    })
  })

  describe('POST /api/folders', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Folder' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user not found', async () => {
      setMockUserId('nonexistent_user')

      const request = new Request('http://localhost/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Folder' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 400 if name is missing', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/folders', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Folder name is required')
    })

    it('should return 400 if name is empty string', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Folder name is required')
    })

    it('should create folder with valid color', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: 'My Folder', color: FOLDER_COLORS[2] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.folder.name).toBe('My Folder')
      expect(data.folder.color).toBe(FOLDER_COLORS[2])
      expect(data.folder.order).toBe(0)
    })

    it('should default to DEFAULT_FOLDER_COLOR for invalid color', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: 'My Folder', color: '#invalid' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.folder.color).toBe(DEFAULT_FOLDER_COLOR)
    })

    it('should auto-increment order', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      await createTestFolder(client, user._id!, { name: 'Existing', order: 0 })

      const request = new Request('http://localhost/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Folder' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.folder.order).toBe(1)
    })

    it('should return 409 for duplicate name', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      await createTestFolder(client, user._id!, { name: 'My Folder' })

      const request = new Request('http://localhost/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: 'My Folder' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('A folder with this name already exists')
    })
  })

  describe('GET /api/folders/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const folderId = new ObjectId().toString()
      const params = Promise.resolve({ id: folderId })
      const request = new Request(`http://localhost/api/folders/${folderId}`)
      const response = await GET_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if folder not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folderId = new ObjectId().toString()
      const params = Promise.resolve({ id: folderId })
      const request = new Request(`http://localhost/api/folders/${folderId}`)
      const response = await GET_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Folder not found')
    })

    it('should return folder by id', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folder = await createTestFolder(client, user._id!, { name: 'My Folder' })

      const params = Promise.resolve({ id: folder._id!.toString() })
      const request = new Request(`http://localhost/api/folders/${folder._id}`)
      const response = await GET_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.folder.name).toBe('My Folder')
    })

    it('should not return another user folder', async () => {
      const user1 = await createTestUser(client, { clerkId: 'user_1' })
      await createTestUser(client, { clerkId: 'user_2', email: 'user2@test.com' })

      const folder = await createTestFolder(client, user1._id!, { name: 'Private Folder' })

      setMockUserId('user_2')
      const params = Promise.resolve({ id: folder._id!.toString() })
      const request = new Request(`http://localhost/api/folders/${folder._id}`)
      const response = await GET_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Folder not found')
    })
  })

  describe('PUT /api/folders/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const folderId = new ObjectId().toString()
      const params = Promise.resolve({ id: folderId })
      const request = new Request(`http://localhost/api/folders/${folderId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      })
      const response = await PUT_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if name is empty', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folder = await createTestFolder(client, user._id!, { name: 'My Folder' })

      const params = Promise.resolve({ id: folder._id!.toString() })
      const request = new Request(`http://localhost/api/folders/${folder._id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: '' }),
      })
      const response = await PUT_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Folder name cannot be empty')
    })

    it('should return 400 for invalid color', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folder = await createTestFolder(client, user._id!, { name: 'My Folder' })

      const params = Promise.resolve({ id: folder._id!.toString() })
      const request = new Request(`http://localhost/api/folders/${folder._id}`, {
        method: 'PUT',
        body: JSON.stringify({ color: '#invalid' }),
      })
      const response = await PUT_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid color')
    })

    it('should update name only', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folder = await createTestFolder(client, user._id!, {
        name: 'Old Name',
        color: FOLDER_COLORS[0],
      })

      const params = Promise.resolve({ id: folder._id!.toString() })
      const request = new Request(`http://localhost/api/folders/${folder._id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
      })
      const response = await PUT_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.folder.name).toBe('New Name')
      expect(data.folder.color).toBe(FOLDER_COLORS[0])
    })

    it('should update color only', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folder = await createTestFolder(client, user._id!, {
        name: 'My Folder',
        color: FOLDER_COLORS[0],
      })

      const params = Promise.resolve({ id: folder._id!.toString() })
      const request = new Request(`http://localhost/api/folders/${folder._id}`, {
        method: 'PUT',
        body: JSON.stringify({ color: FOLDER_COLORS[3] }),
      })
      const response = await PUT_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.folder.color).toBe(FOLDER_COLORS[3])
      expect(data.folder.name).toBe('My Folder')
    })

    it('should return 404 if folder not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folderId = new ObjectId().toString()
      const params = Promise.resolve({ id: folderId })
      const request = new Request(`http://localhost/api/folders/${folderId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      })
      const response = await PUT_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Folder not found')
    })
  })

  describe('DELETE /api/folders/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const folderId = new ObjectId().toString()
      const params = Promise.resolve({ id: folderId })
      const request = new Request(`http://localhost/api/folders/${folderId}`, {
        method: 'DELETE',
      })
      const response = await DELETE_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if folder not found', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folderId = new ObjectId().toString()
      const params = Promise.resolve({ id: folderId })
      const request = new Request(`http://localhost/api/folders/${folderId}`, {
        method: 'DELETE',
      })
      const response = await DELETE_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Folder not found')
    })

    it('should delete folder and unset folderId on papers', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folder = await createTestFolder(client, user._id!, { name: 'To Delete' })
      const paper = await createTestPaper(client, { arxivId: '2501.99999' })
      await createTestProcessedPaper(client, user._id!.toString(), paper._id!.toString(), {
        folderId: folder._id,
      })

      const params = Promise.resolve({ id: folder._id!.toString() })
      const request = new Request(`http://localhost/api/folders/${folder._id}`, {
        method: 'DELETE',
      })
      const response = await DELETE_BY_ID(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      const db = getTestDb()
      const deletedFolder = await db.collection('folders').findOne({ _id: folder._id })
      expect(deletedFolder).toBeNull()

      const updatedPaper = await db.collection('processed_papers').findOne({ userId: user._id })
      expect(updatedPaper?.folderId).toBeUndefined()
    })
  })

  describe('PUT /api/folders/reorder', () => {
    it('should return 401 if not authenticated', async () => {
      setMockUserId(null)

      const request = new Request('http://localhost/api/folders/reorder', {
        method: 'PUT',
        body: JSON.stringify({ order: [] }),
      })
      const response = await REORDER(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid order param', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const request = new Request('http://localhost/api/folders/reorder', {
        method: 'PUT',
        body: JSON.stringify({ order: 'not-an-array' }),
      })
      const response = await REORDER(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('order must be an array of folder ID strings')
    })

    it('should reorder folders correctly', async () => {
      const user = await createTestUser(client)
      setMockUserId(user.clerkId)

      const folder1 = await createTestFolder(client, user._id!, { name: 'A', order: 0 })
      const folder2 = await createTestFolder(client, user._id!, { name: 'B', order: 1 })
      const folder3 = await createTestFolder(client, user._id!, { name: 'C', order: 2 })

      const newOrder = [
        folder3._id!.toString(),
        folder1._id!.toString(),
        folder2._id!.toString(),
      ]

      const request = new Request('http://localhost/api/folders/reorder', {
        method: 'PUT',
        body: JSON.stringify({ order: newOrder }),
      })
      const response = await REORDER(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      const db = getTestDb()
      const reorderedFolders = await db
        .collection('folders')
        .find({ userId: user._id })
        .sort({ order: 1 })
        .toArray()

      expect(reorderedFolders[0].name).toBe('C')
      expect(reorderedFolders[0].order).toBe(0)
      expect(reorderedFolders[1].name).toBe('A')
      expect(reorderedFolders[1].order).toBe(1)
      expect(reorderedFolders[2].name).toBe('B')
      expect(reorderedFolders[2].order).toBe(2)
    })
  })
})
