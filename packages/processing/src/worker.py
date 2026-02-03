import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from bullmq import Worker, Queue
import redis.asyncio as redis
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import asyncio
import requests

load_dotenv()

sys.path.append(str(Path(__file__).parent))

from process_paper import generate_text_from_paper, humanize_text
import xml.etree.ElementTree as ET

MONGODB_URI = os.getenv("MONGODB_URI")
REDIS_URL = os.getenv("UPSTASH_REDIS_URL")

mongo_client = MongoClient(MONGODB_URI, tlsAllowInvalidCertificates=True)
db = mongo_client["paper-reader"]

paper_queue = None

def matches_keywords(paper, keywords, match_mode):
    if not keywords or len(keywords) == 0:
        return True

    title = paper['title'].lower()
    abstract = paper['abstract'].lower()
    combined_text = f"{title} {abstract}"

    keywords_lower = [kw.lower() for kw in keywords]

    if match_mode == "all":
        return all(kw in combined_text for kw in keywords_lower)
    else:
        return any(kw in combined_text for kw in keywords_lower)

async def fetch_arxiv_papers(category, max_results=5):
    url = f"http://export.arxiv.org/api/query?search_query=cat:{category}&start=0&max_results={max_results}&sortBy=submittedDate&sortOrder=descending"
    response = requests.get(url)

    if response.status_code != 200:
        raise Exception(f"Failed to fetch papers from arXiv: {response.status_code}")

    root = ET.fromstring(response.content)
    namespace = {'atom': 'http://www.w3.org/2005/Atom'}

    papers = []
    for entry in root.findall('atom:entry', namespace):
        arxiv_id = entry.find('atom:id', namespace).text.split('/abs/')[-1]
        title = entry.find('atom:title', namespace).text.strip()
        abstract = entry.find('atom:summary', namespace).text.strip()

        authors = []
        for author in entry.findall('atom:author', namespace):
            name = author.find('atom:name', namespace).text
            authors.append(name)

        categories = []
        for cat in entry.findall('atom:category', namespace):
            categories.append(cat.get('term'))

        published = entry.find('atom:published', namespace).text

        papers.append({
            'arxivId': arxiv_id,
            'title': title,
            'abstract': abstract,
            'authors': authors,
            'categories': categories,
            'pdfUrl': f'https://arxiv.org/pdf/{arxiv_id}.pdf',
            'publishedDate': datetime.fromisoformat(published.replace('Z', '+00:00')),
            'createdAt': datetime.utcnow()
        })

    return papers

async def process_batch_scrape(job):
    job_data = job.data

    try:
        users = db["users"]
        user = users.find_one({"clerkId": job_data["userId"]})

        if not user:
            raise Exception(f"User not found: {job_data['userId']}")

        user_id = user["_id"]

        jobs = db["processing_jobs"]
        jobs.update_one(
            {"_id": ObjectId(job_data["jobId"])},
            {"$set": {"status": "running", "updatedAt": datetime.utcnow()}}
        )

        papers_collection = db["papers"]
        processed_papers = db["processed_papers"]
        categories = job_data["categories"]
        papers_per_category = job_data["papersPerCategory"]
        max_pages = job_data["maxPagesPerPaper"]
        keywords = job_data.get("keywords", [])
        keyword_match_mode = job_data.get("keywordMatchMode", "any")

        total_papers = 0
        filtered_count = 0

        for category in categories:
            fetched_papers = await fetch_arxiv_papers(category, papers_per_category)

            for paper_data in fetched_papers:
                if not matches_keywords(paper_data, keywords, keyword_match_mode):
                    filtered_count += 1
                    print(f"Paper {paper_data['arxivId']} filtered out by keywords")
                    continue

                existing = papers_collection.find_one({"arxivId": paper_data["arxivId"]})

                if not existing:
                    result = papers_collection.insert_one(paper_data)
                    paper_id = result.inserted_id
                else:
                    paper_id = existing["_id"]

                user_already_processed = processed_papers.find_one({
                    "userId": user_id,
                    "arxivId": paper_data["arxivId"]
                })

                if not user_already_processed:
                    proc_result = processed_papers.insert_one({
                        "userId": user_id,
                        "paperId": paper_id,
                        "arxivId": paper_data["arxivId"],
                        "status": "pending",
                        "createdAt": datetime.utcnow(),
                        "updatedAt": datetime.utcnow()
                    })

                    await paper_queue.add("process-single-paper", {
                        "userId": job_data["userId"],
                        "processedPaperId": str(proc_result.inserted_id),
                        "arxivId": paper_data["arxivId"],
                        "encryptedApiKey": job_data["encryptedApiKey"],
                        "jobId": job_data["jobId"]
                    })

                    total_papers += 1

        jobs.update_one(
            {"_id": ObjectId(job_data["jobId"])},
            {
                "$set": {
                    "status": "completed" if total_papers > 0 else "failed",
                    "progress.total": total_papers,
                    "updatedAt": datetime.utcnow()
                }
            }
        )

        print(f"Batch scrape completed: {total_papers} papers queued for processing, {filtered_count} papers filtered by keywords")

    except Exception as e:
        print(f"Error in batch scrape: {e}")

        jobs = db["processing_jobs"]
        jobs.update_one(
            {"_id": ObjectId(job_data["jobId"])},
            {"$set": {"status": "failed", "updatedAt": datetime.utcnow()}}
        )

        raise

def decrypt_api_key(encrypted_data):
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
    import hashlib
    import base64

    secret = os.getenv("API_KEY_ENCRYPTION_SECRET").encode()
    iv = base64.b64decode(encrypted_data["iv"])
    ciphertext = base64.b64decode(encrypted_data["encryptedValue"])

    m1 = hashlib.md5(secret).digest()
    m2 = hashlib.md5(m1 + secret).digest()
    key = m1 + m2

    cipher = Cipher(
        algorithms.AES(key[:32]),
        modes.CBC(iv),
        backend=default_backend()
    )

    decryptor = cipher.decryptor()
    plaintext = decryptor.update(ciphertext) + decryptor.finalize()

    padding_length = plaintext[-1]
    return plaintext[:-padding_length].decode('utf-8')

async def process_single_paper(job):
    job_data = job.data

    try:
        api_key = decrypt_api_key(job_data["encryptedApiKey"])
        print(f"Decrypted API key length: {len(api_key) if api_key else 0}, starts with: {api_key[:10] if api_key else 'None'}...")
        
        processed_papers = db["processed_papers"]
        processed_papers.update_one(
            {"_id": ObjectId(job_data["processedPaperId"])},
            {"$set": {"status": "processing", "updatedAt": datetime.utcnow()}}
        )
        
        pdf_url = f"https://arxiv.org/pdf/{job_data['arxivId']}.pdf"
        prompts_dir = os.path.join(os.path.dirname(__file__), "..", "prompts")
        
        generated_text, page_count, opus_in, opus_out = generate_text_from_paper(
            pdf_url,
            api_key,
            max_pages=50,
            prompts_dir=prompts_dir
        )
        
        humanized_text, sonnet_in, sonnet_out = humanize_text(
            generated_text,
            api_key,
            prompts_dir
        )
        
        opus_cost = (opus_in / 1_000_000 * 15.00) + (opus_out / 1_000_000 * 75.00)
        sonnet_cost = (sonnet_in / 1_000_000 * 3.00) + (sonnet_out / 1_000_000 * 15.00)
        total_cost = opus_cost + sonnet_cost
        
        processed_papers.update_one(
            {"_id": ObjectId(job_data["processedPaperId"])},
            {
                "$set": {
                    "status": "completed",
                    "generatedContent": generated_text,
                    "humanizedContent": humanized_text,
                    "costs": {
                        "opusInputTokens": opus_in,
                        "opusOutputTokens": opus_out,
                        "sonnetInputTokens": sonnet_in,
                        "sonnetOutputTokens": sonnet_out,
                        "estimatedCostUsd": round(total_cost, 4)
                    },
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        papers = db["papers"]
        papers.update_one(
            {"arxivId": job_data["arxivId"]},
            {"$set": {"pageCount": page_count}}
        )
        
        jobs = db["processing_jobs"]
        jobs.update_one(
            {"_id": ObjectId(job_data["jobId"])},
            {
                "$set": {
                    "status": "completed",
                    "progress.completed": 1,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        print(f"Successfully processed paper {job_data['arxivId']}")
        
    except Exception as e:
        print(f"Error processing paper: {e}")
        
        processed_papers = db["processed_papers"]
        processed_papers.update_one(
            {"_id": ObjectId(job_data["processedPaperId"])},
            {
                "$set": {
                    "status": "failed",
                    "error": str(e),
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        jobs = db["processing_jobs"]
        jobs.update_one(
            {"_id": ObjectId(job_data["jobId"])},
            {
                "$set": {
                    "status": "failed",
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        raise

async def process_job(job, token):
    job_name = job.name
    if job_name == "batch-scrape":
        await process_batch_scrape(job)
    elif job_name == "process-single-paper":
        await process_single_paper(job)
    else:
        print(f"Unknown job type: {job_name}")

async def main():
    global paper_queue
    import ssl

    redis_client = redis.Redis.from_url(
        REDIS_URL,
        decode_responses=True,
        ssl_cert_reqs=None
    )

    paper_queue = Queue("paper-processing", {"connection": redis_client})

    worker = Worker(
        "paper-processing",
        process_job,
        {"connection": redis_client}
    )

    print("Worker started, waiting for jobs...")
    
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down worker...")
        await worker.close()
        await redis_client.close()

if __name__ == "__main__":
    asyncio.run(main())
