import os
from dotenv import load_dotenv
import redis.asyncio as redis
from pymongo import MongoClient
from bullmq import Queue
from bson import ObjectId
from datetime import datetime
import asyncio

load_dotenv()

async def queue_pending():
    redis_client = redis.Redis.from_url(
        os.getenv("UPSTASH_REDIS_URL"),
        decode_responses=True,
        ssl_cert_reqs=None
    )

    mongo_client = MongoClient(os.getenv("MONGODB_URI"), tlsAllowInvalidCertificates=True)
    db = mongo_client["paper-reader"]

    try:
        paper_queue = Queue("paper-processing", {"connection": redis_client})

        users = db["users"]
        processed_papers = db["processed_papers"]
        processing_jobs = db["processing_jobs"]

        pending_papers = processed_papers.find({"status": "pending"})

        queued = 0
        for paper in pending_papers:
            user = users.find_one({"_id": paper["userId"]})
            if not user:
                print(f"User not found for paper {paper['arxivId']}")
                continue

            job_doc = processing_jobs.insert_one({
                "userId": paper["userId"],
                "type": "single_paper",
                "status": "queued",
                "input": {
                    "arxivUrl": f"https://arxiv.org/abs/{paper['arxivId']}"
                },
                "progress": {
                    "total": 1,
                    "completed": 0
                },
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            })

            job_result = await paper_queue.add("process-single-paper", {
                "userId": user["clerkId"],
                "processedPaperId": str(paper["_id"]),
                "arxivId": paper["arxivId"],
                "encryptedApiKey": user["apiKey"],
                "jobId": str(job_doc.inserted_id)
            })

            print(f"Queued job for paper {paper['arxivId']}: {job_result.id}")
            queued += 1

        print(f"\nTotal queued: {queued}")

    finally:
        await redis_client.aclose()
        mongo_client.close()

asyncio.run(queue_pending())
