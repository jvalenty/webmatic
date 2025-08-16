from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
import uuid
from datetime import datetime
from ..core.db import db
from .utils import hash_password, verify_password, create_access_token, decode_token

router = APIRouter()

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/auth/register")
async def register(payload: RegisterRequest):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    user = {
        "_id": str(uuid.uuid4()),
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["_id"], user["email"])
    return {"access_token": token, "token_type": "bearer"}

@router.post("/auth/login")
async def login(payload: LoginRequest):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["_id"], user["email"])
    return {"access_token": token, "token_type": "bearer"}

@router.get("/auth/me")
async def me(request: Request):
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"user_id": payload.get("sub"), "email": payload.get("email")}