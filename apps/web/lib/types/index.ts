import { ObjectId } from "mongodb";

export interface User {
  _id?: ObjectId;
  clerkId: string;
  email: string;
  settings: {
    defaultCategories: string[];
    keywords?: string[];
    keywordMatchMode?: "any" | "all";
    maxPagesPerPaper: number;
    papersPerCategory: number;
  };
  apiKey?: {
    encryptedValue: string;
    iv: string;
    authTag: string;
    isValid: boolean;
  };
  usage: {
    currentMonthPapersProcessed: number;
    lastResetDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type PaperSource = "arxiv" | "medrxiv";

export interface Paper {
  _id?: ObjectId;
  arxivId: string;
  source?: PaperSource;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  pdfUrl: string;
  publishedDate: Date;
  pageCount?: number;
  createdAt: Date;
}

export interface Folder {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessedPaper {
  _id?: ObjectId;
  userId: ObjectId;
  paperId: ObjectId;
  arxivId: string;
  folderId?: ObjectId;
  skipAI?: boolean;
  status: "pending" | "processing" | "completed" | "failed";
  generatedContent?: string;
  humanizedContent?: string;
  costs?: {
    opusInputTokens: number;
    opusOutputTokens: number;
    sonnetInputTokens: number;
    sonnetOutputTokens: number;
    estimatedCostUsd: number;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingJob {
  _id?: ObjectId;
  userId: ObjectId;
  scheduleId?: ObjectId;
  type: "single_paper" | "batch_scrape";
  status: "queued" | "running" | "completed" | "failed";
  input: {
    arxivUrl?: string;
    categories?: string[];
    papersPerCategory?: number;
    keywords?: string[];
    keywordMatchMode?: "any" | "all";
    skipAI?: boolean;
  };
  progress: {
    total: number;
    completed: number;
  };
  result?: {
    totalFetched: number;
    totalPapersQueued: number;
    alreadyProcessedCount: number;
    filteredCount: number;
    categoriesSucceeded: number;
    categoriesFailed: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringSchedule {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  categories: string[];
  keywords?: string[];
  keywordMatchMode?: "any" | "all";
  papersPerCategory: number;
  intervalDays: number;
  scheduleType?: "interval" | "weekly";
  weekDays?: number[];
  preferredHour?: number;
  timezone?: string;
  email?: string;
  status: "active" | "paused";
  nextRunAt: Date;
  lastRunAt?: Date;
  lastRunJobId?: ObjectId;
  runCount: number;
  createdAt: Date;
  updatedAt: Date;
}
