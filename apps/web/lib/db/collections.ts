import { Collection } from "mongodb";
import { getDatabase } from "./mongodb";
import { User, Paper, ProcessedPaper, ProcessingJob } from "../types";

export async function getUsersCollection(): Promise<Collection<User>> {
  const db = await getDatabase();
  const collection = db.collection<User>("users");
  
  await collection.createIndex({ clerkId: 1 }, { unique: true });
  await collection.createIndex({ email: 1 });
  
  return collection;
}

export async function getPapersCollection(): Promise<Collection<Paper>> {
  const db = await getDatabase();
  const collection = db.collection<Paper>("papers");
  
  await collection.createIndex({ arxivId: 1 }, { unique: true });
  await collection.createIndex({ categories: 1 });
  await collection.createIndex({ publishedDate: -1 });
  
  return collection;
}

export async function getProcessedPapersCollection(): Promise<Collection<ProcessedPaper>> {
  const db = await getDatabase();
  const collection = db.collection<ProcessedPaper>("processed_papers");
  
  await collection.createIndex({ userId: 1 });
  await collection.createIndex({ paperId: 1 });
  await collection.createIndex({ arxivId: 1 });
  await collection.createIndex({ status: 1 });
  await collection.createIndex({ createdAt: -1 });
  await collection.createIndex({ userId: 1, createdAt: -1 });
  
  return collection;
}

export async function getProcessingJobsCollection(): Promise<Collection<ProcessingJob>> {
  const db = await getDatabase();
  const collection = db.collection<ProcessingJob>("processing_jobs");
  
  await collection.createIndex({ userId: 1 });
  await collection.createIndex({ status: 1 });
  await collection.createIndex({ createdAt: -1 });
  await collection.createIndex({ userId: 1, createdAt: -1 });
  
  return collection;
}
