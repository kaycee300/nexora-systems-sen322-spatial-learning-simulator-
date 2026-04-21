from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ScenarioBase(BaseModel):
    title: str
    description: str
    tool: str
    difficulty: str


class Scenario(ScenarioBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


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
