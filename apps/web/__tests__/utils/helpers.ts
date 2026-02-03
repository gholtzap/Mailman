import { MongoClient, ObjectId as MongoObjectId } from 'mongodb'

function toObjectId(id: string | MongoObjectId): MongoObjectId {
  return typeof id === 'string' ? new MongoObjectId(id) : id
}

export async function createTestUser(client: MongoClient, overrides: any = {}) {
  const db = client.db('paper-reader')
  const defaultUser = {
    clerkId: 'test_user_123',
    email: 'test@example.com',
    settings: {
      defaultCategories: ['cs.AI'],
      keywords: [],
      keywordMatchMode: 'any',
      maxPagesPerPaper: 50,
      papersPerCategory: 5,
    },
    apiKey: {
      encryptedValue: 'U2FsdGVkX1+encrypted_test_key',
      iv: 'test_initialization_vector',
      authTag: 'test_auth_tag_value',
      isValid: true,
    },
    usage: {
      currentMonthPapersProcessed: 0,
      lastResetDate: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const user = {
    ...defaultUser,
    ...overrides,
    settings: {
      ...defaultUser.settings,
      ...(overrides.settings || {}),
    },
    usage: {
      ...defaultUser.usage,
      ...(overrides.usage || {}),
    },
  }

  if (overrides.apiKey === undefined && !('apiKey' in overrides)) {
    user.apiKey = defaultUser.apiKey
  } else if (overrides.apiKey !== undefined) {
    user.apiKey = overrides.apiKey
  }

  const result = await db.collection('users').insertOne(user as any)
  return { ...user, _id: result.insertedId }
}

export async function createTestPaper(client: MongoClient, overrides = {}) {
  const db = client.db('paper-reader')
  const paper = {
    arxivId: '2501.12345',
    title: 'Test Paper: Novel Approach to AI',
    authors: ['John Doe', 'Jane Smith'],
    abstract: 'This paper presents a novel approach to artificial intelligence that improves performance by 20%.',
    categories: ['cs.AI', 'cs.LG'],
    pdfUrl: 'https://arxiv.org/pdf/2501.12345.pdf',
    publishedDate: new Date('2025-01-15'),
    pageCount: 15,
    createdAt: new Date(),
    ...overrides,
  }

  const result = await db.collection('papers').insertOne(paper)
  return { ...paper, _id: result.insertedId }
}

export async function createTestProcessedPaper(
  client: MongoClient,
  userId: string,
  paperId: string,
  overrides: any = {}
) {
  const db = client.db('paper-reader')

  const paperObjectId = toObjectId(paperId)
  const paper = await db.collection('papers').findOne({ _id: paperObjectId })
  const arxivId = paper?.arxivId || overrides.arxivId || '2501.12345'

  const processedPaper = {
    userId: toObjectId(userId),
    paperId: paperObjectId,
    arxivId,
    status: 'completed',
    generatedContent: `# Technical Analysis

This paper introduces a transformer-based architecture that achieves state-of-the-art results on benchmark datasets. The model uses attention mechanisms to capture long-range dependencies in sequential data.

## Key Contributions
- Novel attention mechanism with O(n log n) complexity
- 20% improvement over previous SOTA
- Reduced training time by 40%`,
    humanizedContent: `This paper is about a new AI model that works better than previous ones.

The main idea is using a smart way to look at data that makes it faster and more accurate. They tested it and it works 20% better than other models while taking less time to train.`,
    costs: {
      opusInputTokens: 8500,
      opusOutputTokens: 4200,
      sonnetInputTokens: 4200,
      sonnetOutputTokens: 2800,
      estimatedCostUsd: 0.25,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }

  const result = await db.collection('processed_papers').insertOne(processedPaper)
  return { ...processedPaper, _id: result.insertedId }
}

export async function createTestProcessingJob(
  client: MongoClient,
  userId: string,
  overrides: any = {}
) {
  const db = client.db('paper-reader')
  const job = {
    userId: toObjectId(userId),
    type: 'single_paper',
    status: 'completed',
    input: {
      arxivUrl: 'https://arxiv.org/abs/2501.12345',
    },
    progress: {
      total: 1,
      completed: 1,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }

  const result = await db.collection('processing_jobs').insertOne(job)
  return { ...job, _id: result.insertedId }
}

export async function createTestSchedule(client: MongoClient, userId: string, overrides: any = {}) {
  const db = client.db('paper-reader')
  const schedule = {
    userId: toObjectId(userId),
    name: 'Daily AI Papers',
    categories: ['cs.AI'],
    papersPerCategory: 3,
    intervalDays: 1,
    keywords: [],
    keywordMatchMode: 'any',
    email: 'test@example.com',
    status: 'active',
    nextRunAt: new Date(Date.now() + 86400000),
    runCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }

  const result = await db.collection('recurring_schedules').insertOne(schedule)
  return { ...schedule, _id: result.insertedId }
}

export function mockArxivResponse() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2501.12345v1</id>
    <updated>2025-01-15T00:00:00Z</updated>
    <published>2025-01-15T00:00:00Z</published>
    <title>Test Paper: Novel Approach to AI</title>
    <summary>This paper presents a novel approach to artificial intelligence that improves performance by 20%.</summary>
    <author>
      <name>John Doe</name>
    </author>
    <author>
      <name>Jane Smith</name>
    </author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <link href="http://arxiv.org/abs/2501.12345v1" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/2501.12345v1" rel="related" type="application/pdf"/>
  </entry>
</feed>`
}
