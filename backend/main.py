"""
main.py — BlinkMark FastAPI application entry point.
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import numpy as np
from datetime import datetime

from database import create_indexes, students_collection
from models import StudentRegisterRequest, VerifyFaceRequest
from face_pipeline import run_pipeline
from attendance import (
    mark_attendance,
    get_all_attendance,
    get_defaulters,
    find_matching_student,
)
from teacher_routes import router as teacher_router


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_indexes()
    yield


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="BlinkMark API",
    description="Anti-spoofing face recognition attendance system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(teacher_router)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "BlinkMark", "timestamp": datetime.now().isoformat()}


@app.post("/register-student")
async def register_student(req: StudentRegisterRequest):
    """Run liveness pipeline and register student with face embedding."""
    # Duplicate PRN guard
    if await students_collection.find_one({"prn": req.prn}):
        raise HTTPException(status_code=400, detail=f"PRN {req.prn} is already registered")

    passed, message, embedding = run_pipeline(req.frames)
    if not passed:
        raise HTTPException(status_code=400, detail=message)
    if embedding is None:
        raise HTTPException(status_code=500, detail="Failed to generate face embedding")

    student = {
        "name":          req.name,
        "class_":        req.class_,
        "prn":           req.prn,
        "embedding":     embedding.tolist(),
        "registered_at": datetime.now().isoformat(),
    }
    result = await students_collection.insert_one(student)

    return {
        "success":    True,
        "message":    f"Student '{req.name}' registered successfully",
        "student_id": str(result.inserted_id),
    }


@app.post("/verify-face")
async def verify_face(req: VerifyFaceRequest):
    """
    Run liveness pipeline, match embedding against stored students,
    and mark attendance for the given course — all in one call.
    """
    passed, message, embedding = run_pipeline(req.frames)
    if not passed:
        raise HTTPException(status_code=400, detail=message)
    if embedding is None:
        raise HTTPException(status_code=500, detail="Could not generate face embedding")

    student_id, name, similarity = await find_matching_student(np.array(embedding, dtype=np.float32))
    if not student_id:
        raise HTTPException(
            status_code=404,
            detail=f"Face not recognized (best match score: {similarity:.3f})",
        )

    success, attend_msg = await mark_attendance(student_id, name, req.course)
    if not success:
        raise HTTPException(status_code=409, detail=attend_msg)

    return {
        "success":    True,
        "message":    f"Attendance marked for {name}",
        "student":    name,
        "course":     req.course,
        "similarity": round(float(similarity), 4),
    }


@app.get("/students")
async def list_students():
    """Return all registered students (embeddings omitted)."""
    students = []
    async for s in students_collection.find({}, {"embedding": 0}):
        s["_id"] = str(s["_id"])
        students.append(s)
    return students


@app.get("/attendance")
async def list_attendance():
    """Return all attendance records, newest first."""
    return await get_all_attendance()


@app.get("/defaulters")
async def list_defaulters():
    """Return students with attendance below 75%."""
    return await get_defaulters()
