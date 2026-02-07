import { MongoMemoryReplSet } from 'mongodb-memory-server'

export default async function globalSetup() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 }
  })
  const uri = replSet.getUri()

  ;(global as any).__MONGOINSTANCE = replSet
  process.env.MONGODB_URI = uri

  console.log(`MongoDB Memory ReplSet started at ${uri}`)
}
