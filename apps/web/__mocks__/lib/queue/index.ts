export const mockPaperProcessingQueue = {
  add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  getJob: jest.fn(),
  close: jest.fn(),
}

export const paperProcessingQueue = mockPaperProcessingQueue

export function resetQueueMocks() {
  mockPaperProcessingQueue.add.mockClear()
  mockPaperProcessingQueue.getJob.mockClear()
  mockPaperProcessingQueue.close.mockClear()
}
