import os
from pathlib import Path
from dotenv import load_dotenv

# Load env from backend/.env
ROOT_BACKEND = Path(__file__).resolve().parents[2]  # /app/backend
load_dotenv(ROOT_BACKEND / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL is not set in backend/.env")
if not DB_NAME:
    raise RuntimeError("DB_NAME is not set in backend/.env")