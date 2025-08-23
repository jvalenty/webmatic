from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt
from passlib.hash import bcrypt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..core.config import AUTH_SECRET

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.verify(password, password_hash)
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, AUTH_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, AUTH_SECRET, algorithms=[ALGORITHM])
    except Exception:
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current user - requires authentication"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return payload


async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict[str, Any]]:
    """Get current user - authentication optional, returns None if not authenticated"""
    if not credentials:
        return None
    
    return decode_token(credentials.credentials)