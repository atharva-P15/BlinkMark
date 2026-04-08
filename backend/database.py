from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "blinkmark")

# Async Motor client for FastAPI
async_client = AsyncIOMotorClient(MONGO_URL)
async_db = async_client[DB_NAME]

# Collections
students_collection = async_db["students"]
attendance_collection = async_db["attendance"]
teachers_collection = async_db["teachers"]


async def create_indexes():
    """Create necessary database indexes on startup."""
    try:
        await students_collection.create_index("prn", unique=True)
        await teachers_collection.create_index("email", unique=True)
        print("[DB] Indexes created successfully.")
    except Exception as e:
        print(f"[DB] Index creation warning: {e}")
