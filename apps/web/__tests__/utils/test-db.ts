import { MongoClient, Db } from 'mongodb'

let client: MongoClient
let db: Db

export async function setupTestDatabase() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI not set by global setup')
  }

  client = new MongoClient(uri)
  await client.connect()
  db = client.db('paper-reader')

  await createIndexes()

  return { client, db }
}

export async function teardownTestDatabase() {
  if (client) {
    await client.close()
  }
}

export async function clearDatabase() {
  if (db) {
    const collections = await db.listCollections().toArray()
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({})
    }
  }
}

async function createIndexes() {
  try {
    await db.collection('users').createIndex({ clerkId: 1 }, { unique: true })
  } catch (err: any) {
    if (err.code !== 85 && err.code !== 11000) throw err
  }

  try {
    await db.collection('papers').createIndex({ arxivId: 1 }, { unique: true })
  } catch (err: any) {
    if (err.code !== 85 && err.code !== 11000) throw err
  }

  try {
    await db.collection('processed_papers').createIndex({ userId: 1, paperId: 1 }, { unique: true })
  } catch (err: any) {
    if (err.code !== 85 && err.code !== 11000) throw err
  }

  try {
    await db.collection('processed_papers').createIndex({ userId: 1, arxivId: 1 }, { unique: true })
  } catch (err: any) {
    if (err.code !== 85 && err.code !== 11000) throw err
  }

  try {
    await db.collection('recurring_schedules').createIndex({ userId: 1, name: 1 }, { unique: true })
  } catch (err: any) {
    if (err.code !== 85 && err.code !== 11000) throw err
  }

  try {
    await db.collection('folders').createIndex({ userId: 1, name: 1 }, { unique: true })
  } catch (err: any) {
    if (err.code !== 85 && err.code !== 11000) throw err
  }

  try {
    await db.collection('folders').createIndex({ userId: 1, order: 1 })
  } catch (err: any) {
    if (err.code !== 85 && err.code !== 11000) throw err
  }
}

export function getTestDb() {
  return db
}
