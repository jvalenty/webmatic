from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import logging
from app.core.config import CORS_ORIGINS, DB_NAME
from app.core.db import close_db_client, db
from app.projects.router import router as projects_router

# FastAPI app and /api router
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Health route
@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"ok": True, "db": DB_NAME}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# Mount feature routers
api_router.include_router(projects_router)

# Include the /api router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("webmatic")

@app.on_event("shutdown")
async def shutdown_db_client():
    close_db_client()