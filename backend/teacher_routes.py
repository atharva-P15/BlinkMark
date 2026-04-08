"""
teacher_routes.py — Teacher registration, login, and JWT-protected dashboard endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models import TeacherRegisterRequest, TeacherLoginRequest, TeacherLoginResponse
from database import teachers_collection
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os

router = APIRouter(prefix="/teacher", tags=["Teacher"])

# ─── Password hashing ─────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── JWT config ───────────────────────────────────────────────────────────────
SECRET_KEY  = os.getenv("SECRET_KEY", "blinkmark-secret-key-2024")
ALGORITHM   = "HS256"
TOKEN_EXPIRE_HOURS = 8
security    = HTTPBearer()


def _create_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register")
async def register_teacher(req: TeacherRegisterRequest):
    if await teachers_collection.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    teacher = {
        "name":          req.name,
        "email":         req.email,
        "password_hash": pwd_context.hash(req.password),
        "created_at":    datetime.now().isoformat(),
    }
    await teachers_collection.insert_one(teacher)
    return {"message": "Teacher registered successfully"}


@router.post("/login", response_model=TeacherLoginResponse)
async def login_teacher(req: TeacherLoginRequest):
    teacher = await teachers_collection.find_one({"email": req.email})
    if not teacher or not pwd_context.verify(req.password, teacher["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _create_token(teacher["email"])
    return TeacherLoginResponse(
        access_token=token,
        token_type="bearer",
        name=teacher["name"],
    )
