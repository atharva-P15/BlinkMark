from pydantic import BaseModel
from typing import List, Optional


class StudentRegisterRequest(BaseModel):
    name: str
    class_: str
    prn: str
    frames: List[str]  # base64-encoded JPEG frames


class VerifyFaceRequest(BaseModel):
    frames: List[str]  # base64-encoded JPEG frames
    course: str


class TeacherRegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class TeacherLoginRequest(BaseModel):
    email: str
    password: str


class TeacherLoginResponse(BaseModel):
    access_token: str
    token_type: str
    name: str
