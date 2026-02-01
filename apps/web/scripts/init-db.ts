import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}

async function initializeDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const db = client.db("paper-reader");

    console.log("Initializing database indexes...");

    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ clerkId: 1 }, { unique: true });
    await usersCollection.createIndex({ email: 1 });
    console.log("Created indexes for users collection");

    const papersCollection = db.collection("papers");
    await papersCollection.createIndex({ arxivId: 1 }, { unique: true });
    await papersCollection.createIndex({ categories: 1 });
    await papersCollection.createIndex({ publishedDate: -1 });
    console.log("Created indexes for papers collection");

    const processedPapersCollection = db.collection("processed_papers");
    await processedPapersCollection.createIndex({ userId: 1, paperId: 1 }, { unique: true });
    await processedPapersCollection.createIndex({ arxivId: 1 });
    await processedPapersCollection.createIndex({ status: 1 });
    await processedPapersCollection.createIndex({ createdAt: -1 });
    await processedPapersCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log("Created indexes for processed_papers collection");

    const processingJobsCollection = db.collection("processing_jobs");
    await processingJobsCollection.createIndex({ userId: 1 });
    await processingJobsCollection.createIndex({ status: 1 });
    await processingJobsCollection.createIndex({ createdAt: -1 });
    await processingJobsCollection.createIndex({ userId: 1, createdAt: -1 });
    await processingJobsCollection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 30 * 24 * 60 * 60 }
    );
    console.log("Created indexes for processing_jobs collection");

    const recurringSchedulesCollection = db.collection("recurring_schedules");
    await recurringSchedulesCollection.createIndex({ userId: 1, name: 1 }, { unique: true });
    await recurringSchedulesCollection.createIndex({ status: 1, nextRunAt: 1 });
    await recurringSchedulesCollection.createIndex({ userId: 1, status: 1 });
    console.log("Created indexes for recurring_schedules collection");

    console.log("Database initialization complete");
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

initializeDatabase();
