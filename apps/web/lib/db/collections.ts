import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "./mongodb";
import { User, Paper, ProcessedPaper, ProcessingJob, RecurringSchedule, Folder } from "../types";

export async function getUsersCollection(): Promise<Collection<User>> {
  const db = await getDatabase();
  return db.collection<User>("users");
}

export async function getPapersCollection(): Promise<Collection<Paper>> {
  const db = await getDatabase();
  return db.collection<Paper>("papers");
}

export async function getProcessedPapersCollection(): Promise<Collection<ProcessedPaper>> {
  const db = await getDatabase();
  return db.collection<ProcessedPaper>("processed_papers");
}

export async function getProcessingJobsCollection(): Promise<Collection<ProcessingJob>> {
  const db = await getDatabase();
  return db.collection<ProcessingJob>("processing_jobs");
}

export async function getRecurringSchedulesCollection(): Promise<Collection<RecurringSchedule>> {
  const db = await getDatabase();
  return db.collection<RecurringSchedule>("recurring_schedules");
}

export async function getFoldersCollection(): Promise<Collection<Folder>> {
  const db = await getDatabase();
  return db.collection<Folder>("folders");
}

export async function getCountersCollection(): Promise<Collection<{ userId: ObjectId; scope: string; seq: number }>> {
  const db = await getDatabase();
  return db.collection("counters");
}
