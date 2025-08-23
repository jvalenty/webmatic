from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import os
import logging
from app.core.db import init_db_client, close_db_client
from app.auth.router import router as auth_router
from app.projects.router import router as projects_router
from app.projects.router_chat import router as chat_router
from app.projects.router_generate import router as generate_router
from app.templates.router import router as templates_router

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("webmatic")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    init_db_client()
    yield
    # Shutdown
    logger.info("Shutting down...")
    close_db_client()

app = FastAPI(title="Webmatic API", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
api_router = APIRouter(prefix="/api")

# Include routers
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(projects_router, tags=["projects"])
api_router.include_router(chat_router, tags=["chat"])
api_router.include_router(generate_router, tags=["generate"])
api_router.include_router(templates_router, tags=["templates"])

app.include_router(api_router)

@app.get("/api/health")
async def health():
    return {"ok": True, "db": "test_database"}

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )

@app.on_event("startup")
async def startup_db_client():
    init_db_client()

@app.on_event("shutdown")
async def shutdown_db_client():
    close_db_client()