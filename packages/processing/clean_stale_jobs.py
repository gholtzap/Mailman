from pymongo import MongoClient
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

mongo_client = MongoClient(os.getenv("MONGODB_URI"), tlsAllowInvalidCertificates=True)
db = mongo_client["paper-reader"]

jobs = db["processing_jobs"]

result = jobs.update_many(
    {"status": {"$in": ["queued", "running"]}},
    {"$set": {"status": "failed", "updatedAt": datetime.utcnow()}}
)

print(f"Updated {result.modified_count} stale jobs to failed status")

remaining = jobs.count_documents({"status": {"$in": ["queued", "running"]}})
print(f"Remaining active jobs: {remaining}")

mongo_client.close()
