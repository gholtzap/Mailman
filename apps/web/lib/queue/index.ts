import { Queue } from "bullmq";
import { Redis } from "ioredis";

if (!process.env.UPSTASH_REDIS_URL) {
  throw new Error("UPSTASH_REDIS_URL is required in environment");
}

const connection = new Redis(process.env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: {
    rejectUnauthorized: false,
  },
});

export const paperProcessingQueue = new Queue("paper-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

export interface SinglePaperJobData {
  userId: string;
  paperId: string;
  arxivId: string;
  encryptedApiKey: {
    encryptedValue: string;
    iv: string;
    authTag: string;
  };
}

export interface BatchScrapeJobData {
  userId: string;
  categories: string[];
  papersPerCategory: number;
  maxPagesPerPaper: number;
  encryptedApiKey: {
    encryptedValue: string;
    iv: string;
    authTag: string;
  };
}
