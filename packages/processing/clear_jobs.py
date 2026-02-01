import os
import ssl
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
mongo_client = MongoClient(MONGODB_URI, tlsAllowInvalidCertificates=True)
db = mongo_client["paper-reader"]

jobs = db["processing_jobs"]
result = jobs.delete_many({"status": {"$in": ["queued", "failed"]}})

print(f"Deleted {result.deleted_count} jobs")

mongo_client.close()
