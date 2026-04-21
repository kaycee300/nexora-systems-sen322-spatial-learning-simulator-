from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ScenarioBase(BaseModel):
    skill_id: int | None = None
    title: str
    description: str
    tool: str
    difficulty: str


class Scenario(ScenarioBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class SkillTrackBase(BaseModel):
    slug: str
    title: str
    category: str
    description: str
    demand_level: str
    difficulty: str
    learning_path: str


class SkillTrack(SkillTrackBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class SkillTrackDetail(SkillTrack):
    scenarios: list[Scenario]


class ProgressCreate(BaseModel):
    user_id: int | None = None
    student_name: str | None = None
    scenario_id: int
    status: str


class Progress(ProgressCreate):
    id: int
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    learning_goal: str | None = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserProfile(BaseModel):
    id: int
    name: str
    email: str
    learning_goal: str | None = None
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    message: str
    user: UserProfile


class LearnerDashboard(BaseModel):
    user: UserProfile
    total_progress_entries: int
    completed_sessions: int
    in_progress_sessions: int
    recent_activity: list[Progress]
    recommended_skills: list[SkillTrack]


class Message(BaseModel):
    detail: str
