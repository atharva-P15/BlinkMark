"""
attendance.py — Attendance CRUD and defaulter calculations.
"""

from database import attendance_collection, students_collection
from datetime import datetime
from typing import List, Dict, Tuple
import numpy as np
from bson import ObjectId

COURSES = ["Machine Learning", "Computer Vision", "Big Data"]
DEFAULTER_THRESHOLD = 75.0          # percentage below which student is a defaulter
SIMILARITY_THRESHOLD = 0.55         # cosine similarity cutoff for face match


# ─── Face Matching ────────────────────────────────────────────────────────────

async def find_matching_student(embedding: np.ndarray) -> Tuple[str, str, float]:
    """
    Scan all registered students and return the best cosine-similarity match.

    Returns:
        (student_id, name, similarity)  — student_id/name are None if no match.
    """
    best_id   = None
    best_name = None
    best_sim  = -1.0

    async for student in students_collection.find({}, {"_id": 1, "name": 1, "embedding": 1}):
        stored = np.array(student["embedding"], dtype=np.float32)
        norm1 = np.linalg.norm(embedding)
        norm2 = np.linalg.norm(stored)
        if norm1 > 0 and norm2 > 0:
            sim = float(np.dot(embedding, stored) / (norm1 * norm2))
        else:
            sim = 0.0

        if sim > best_sim:
            best_sim  = sim
            best_id   = str(student["_id"])
            best_name = student["name"]

    if best_sim >= SIMILARITY_THRESHOLD:
        return best_id, best_name, best_sim
    return None, None, best_sim


# ─── Attendance Marking ───────────────────────────────────────────────────────

async def mark_attendance(student_id: str, name: str, course: str) -> Tuple[bool, str]:
    """Insert an attendance record; reject duplicates for the same day + course."""
    now  = datetime.now()
    date = now.strftime("%Y-%m-%d")

    exists = await attendance_collection.find_one({
        "student_id": student_id,
        "course":     course,
        "date":       date,
    })
    if exists:
        return False, f"Attendance already marked today for {course}"

    record = {
        "student_id": student_id,
        "name":       name,
        "course":     course,
        "timestamp":  now.strftime("%H:%M:%S"),
        "date":       date,
    }
    await attendance_collection.insert_one(record)
    return True, "Attendance marked successfully"


# ─── Read Helpers ─────────────────────────────────────────────────────────────

async def get_all_attendance() -> List[Dict]:
    records = []
    async for r in attendance_collection.find({}, {"_id": 0}):
        records.append(r)
    # Newest first
    records.sort(key=lambda x: (x.get("date", ""), x.get("timestamp", "")), reverse=True)
    return records


# ─── Defaulters ───────────────────────────────────────────────────────────────

async def get_defaulters(threshold: float = DEFAULTER_THRESHOLD) -> List[Dict]:
    """
    Return students whose attendance % falls below `threshold`.

    Percentage = (unique course-days attended) / (total possible course-days) * 100
    Total possible = unique dates × number of courses.
    """
    # Gather all students
    students = []
    async for s in students_collection.find({}, {"_id": 1, "name": 1, "prn": 1, "class_": 1}):
        s["_id"] = str(s["_id"])
        students.append(s)

    if not students:
        return []

    # Gather all attendance records
    all_records = []
    async for r in attendance_collection.find({}):
        all_records.append(r)

    # Unique dates on which any class was held
    all_dates = set(r.get("date", "") for r in all_records if r.get("date"))
    total_possible = len(all_dates) * len(COURSES) if all_dates else 0

    defaulters = []
    for student in students:
        attended = sum(
            1 for r in all_records if r.get("student_id") == student["_id"]
        )
        if total_possible > 0:
            pct = round((attended / total_possible) * 100, 1)
        else:
            pct = 100.0  # no classes held yet → no defaulters

        if pct < threshold:
            defaulters.append({
                "name":                 student["name"],
                "prn":                  student["prn"],
                "class_":               student.get("class_", ""),
                "attendance_percentage": pct,
                "attended":             attended,
                "total_possible":       total_possible,
            })

    # Sort worst first
    defaulters.sort(key=lambda x: x["attendance_percentage"])
    return defaulters
