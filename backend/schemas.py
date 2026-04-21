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


class LessonBase(BaseModel):
    title: str
    objective: str
    format: str
    duration_minutes: int
    position: int


class Lesson(LessonBase):
    id: int
    module_id: int
    model_config = ConfigDict(from_attributes=True)


class ModuleBase(BaseModel):
    title: str
    description: str
    position: int


class Module(ModuleBase):
    id: int
    course_id: int
    model_config = ConfigDict(from_attributes=True)


class ModuleDetail(Module):
    lessons: list[Lesson]


class CourseBase(BaseModel):
    skill_id: int
    title: str
    summary: str
    level: str
    duration_weeks: int
    outcome: str


class Course(CourseBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class CourseDetail(Course):
    modules: list[ModuleDetail]


class LessonCompletionCreate(BaseModel):
    user_id: int
    status: str
    score: int | None = None
    feedback: str | None = None


class LessonCompletion(BaseModel):
    id: int
    user_id: int
    lesson_id: int
    status: str
    score: int | None = None
    feedback: str | None = None
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class LessonAttemptCreate(BaseModel):
    user_id: int
    answer: str


class LessonAttempt(BaseModel):
    id: int
    user_id: int
    lesson_id: int
    answer: str
    score: int
    feedback: str
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class LessonSessionCreate(BaseModel):
    user_id: int


class LessonSessionUpdate(BaseModel):
    status: str
    score: int | None = None
    notes: str | None = None


class LessonSession(BaseModel):
    id: int
    user_id: int
    lesson_id: int
    status: str
    score: int | None = None
    notes: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class LessonEventCreate(BaseModel):
    event_type: str
    event_value: str | None = None


class LessonEvent(BaseModel):
    id: int
    session_id: int
    event_type: str
    event_value: str | None = None
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class LessonRuntime(BaseModel):
    skill: SkillTrack
    course: Course
    module: Module
    lesson: Lesson
    scenario: Scenario | None = None
    checklist: list[str]
    rubric: list[str]
    prompt: str
    completion: LessonCompletion | None = None
    active_session: LessonSession | None = None


class AICoachRequest(BaseModel):
    user_id: int | None = None
    lesson_id: int
    answer: str


class AICoachResponse(BaseModel):
    feedback: str
    provider: str


class SkillTrackDetail(SkillTrack):
    scenarios: list[Scenario]
    course: CourseDetail | None = None


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
    completed_lessons: int
    active_lessons: int
    active_simulation_sessions: int
    recent_activity: list[Progress]
    recommended_skills: list[SkillTrack]
    recommended_courses: list[Course]


class Message(BaseModel):
    detail: str
