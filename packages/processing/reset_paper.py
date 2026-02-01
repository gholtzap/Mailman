from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

mongo_client = MongoClient(os.getenv("MONGODB_URI"), tlsAllowInvalidCertificates=True)
db = mongo_client["paper-reader"]

processed_papers = db["processed_papers"]
result = processed_papers.update_one(
    {"arxivId": "2601.00009"},
    {"$set": {"status": "pending"}}
)

print(f"Reset paper 2601.00009 to pending status (matched: {result.matched_count})")
mongo_client.close()
