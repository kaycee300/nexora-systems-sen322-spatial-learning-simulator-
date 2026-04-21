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
    student_name: str
    scenario_id: int
    status: str


class Progress(ProgressCreate):
    id: int
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class Message(BaseModel):
    detail: str
