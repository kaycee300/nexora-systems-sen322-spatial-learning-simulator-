from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

try:
    from pydantic import ConfigDict
except ImportError:
    ConfigDict = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[str] = "user"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    email_verified: bool = False

    if ConfigDict is not None:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


class ProjectCreate(BaseModel):
    title: str
    description: str
    category: str
    level: Optional[str] = "Beginner"
    lessons: Optional[int] = 1
    duration_hours: Optional[int] = 1
    icon: Optional[str] = "bolt"
    gradient: Optional[str] = "gradient-electric"
    is_simulation: Optional[bool] = True


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    lessons: Optional[int] = None
    duration_hours: Optional[int] = None
    icon: Optional[str] = None
    gradient: Optional[str] = None
    is_simulation: Optional[bool] = None


class ProjectResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    level: str
    lessons: int
    duration_hours: int
    icon: str
    gradient: str
    is_simulation: bool
    created_at: Optional[datetime] = None

    if ConfigDict is not None:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


class EnrollmentOut(BaseModel):
    id: int
    user_id: int
    project_id: int
    progress: int
    status: str
    score: Optional[int] = None
    completed_at: Optional[datetime] = None
    enrolled_at: Optional[datetime] = None

    if ConfigDict is not None:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


class ProjectBrief(BaseModel):
    id: int
    title: str
    category: str
    level: str
    lessons: int
    icon: str
    gradient: str
    is_simulation: bool

    if ConfigDict is not None:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


class EnrollmentWithProject(EnrollmentOut):
    project: Optional[ProjectBrief] = None
