from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGO_URL, DB_NAME

# Create a single global client and db for the app lifecycle
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def close_db_client():
    try:
        client.close()
    except Exception:
        pass