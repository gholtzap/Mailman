import os
from dotenv import load_dotenv
import redis.asyncio as redis
import asyncio

load_dotenv()

async def retry():
    client = redis.Redis.from_url(os.getenv("UPSTASH_REDIS_URL"), decode_responses=True, ssl_cert_reqs=None)
    try:
        job_id = "6"
        
        await client.zrem("bull:paper-processing:failed", job_id)
        
        await client.hdel(f"bull:paper-processing:{job_id}", "failedReason", "finishedOn", "processedOn", "stacktrace")
        
        await client.lpush("bull:paper-processing:wait", job_id)
        
        print(f"Job {job_id} moved back to wait queue")
        
    finally:
        await client.aclose()

asyncio.run(retry())
