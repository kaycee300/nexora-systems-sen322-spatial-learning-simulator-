from pydantic import BaseModel


class ScenarioBase(BaseModel):
    title: str
    description: str
    tool: str
    difficulty: str


class Scenario(ScenarioBase):
    id: int

    class Config:
        orm_mode = True


class ProgressCreate(BaseModel):
    student_name: str
    scenario_id: int
    status: str


class Progress(ProgressCreate):
    id: int
    updated_at: str

    class Config:
        orm_mode = True


class Message(BaseModel):
    detail: str
