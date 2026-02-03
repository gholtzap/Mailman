import { jest } from '@jest/globals'

export const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  getJob: jest.fn(),
  close: jest.fn(),
}

export const mockResend = {
  emails: {
    send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
  },
}

export const mockAuth = (userId: string | null = 'test_user_123') => {
  return {
    auth: jest.fn().mockResolvedValue({
      userId,
    }),
  }
}

export const createMockUser = (overrides = {}) => ({
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
    encryptedValue: 'encrypted_key',
    iv: 'test_iv',
    authTag: 'test_auth_tag',
    isValid: true,
  },
  usage: {
    currentMonthPapersProcessed: 0,
    lastResetDate: new Date(),
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockPaper = (overrides = {}) => ({
  arxivId: '2501.12345',
  title: 'Test Paper Title',
  authors: ['Author One', 'Author Two'],
  abstract: 'This is a test abstract describing the paper.',
  categories: ['cs.AI', 'cs.LG'],
  pdfUrl: 'https://arxiv.org/pdf/2501.12345.pdf',
  publishedDate: new Date('2025-01-15'),
  pageCount: 12,
  createdAt: new Date(),
  ...overrides,
})

export const createMockProcessedPaper = (userId: string, paperId: string, overrides = {}) => ({
  userId,
  paperId,
  arxivId: '2501.12345',
  status: 'completed',
  generatedContent: 'AI generated technical analysis',
  humanizedContent: 'Humanized version for engineers',
  costs: {
    opusInputTokens: 5000,
    opusOutputTokens: 3000,
    sonnetInputTokens: 3000,
    sonnetOutputTokens: 2000,
    estimatedCostUsd: 0.15,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockProcessingJob = (userId: string, overrides = {}) => ({
  userId,
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
})

export const createMockSchedule = (userId: string, overrides = {}) => ({
  userId,
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
})

export function mockClerkAuth(userId: string | null = 'test_user_123') {
  jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn(() => ({ userId })),
  }))
}

export function resetMocks() {
  mockQueue.add.mockClear()
  mockQueue.getJob.mockClear()
  mockResend.emails.send.mockClear()
}
