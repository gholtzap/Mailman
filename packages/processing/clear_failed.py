import os
from dotenv import load_dotenv
import redis.asyncio as redis
import asyncio

load_dotenv()

async def clear():
    client = redis.Redis.from_url(os.getenv("UPSTASH_REDIS_URL"), decode_responses=True, ssl_cert_reqs=None)
    try:
        failed_ids = await client.zrange("bull:paper-processing:failed", 0, -1)
        print(f"Clearing {len(failed_ids)} failed jobs...")
        
        for job_id in failed_ids:
            await client.delete(f"bull:paper-processing:{job_id}")
            await client.zrem("bull:paper-processing:failed", job_id)
        
        print("Done!")
    finally:
        await client.aclose()

asyncio.run(clear())
