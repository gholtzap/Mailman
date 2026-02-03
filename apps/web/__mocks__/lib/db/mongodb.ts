import { MongoClient, Db } from 'mongodb'

let mockClient: MongoClient | null = null
let mockDb: Db | null = null

export function __setMockClient(client: MongoClient, db: Db) {
  mockClient = client
  mockDb = db
}

export function __resetMockClient() {
  mockClient = null
  mockDb = null
}

export async function getDatabase(): Promise<Db> {
  if (!mockDb) {
    throw new Error('Mock database not set up. Call __setMockClient first.')
  }
  return mockDb
}

export async function getClient(): Promise<MongoClient> {
  if (!mockClient) {
    throw new Error('Mock client not set up. Call __setMockClient first.')
  }
  return mockClient
}
