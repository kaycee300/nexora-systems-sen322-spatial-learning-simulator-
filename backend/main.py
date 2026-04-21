from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

try:
    from . import crud, models, schemas
    from .database import SessionLocal, engine
except ImportError:
    import crud  # type: ignore
    import models  # type: ignore
    import schemas  # type: ignore
    from database import SessionLocal, engine  # type: ignore

app = FastAPI(
    title="SkillScape API",
    description="Backend API for the SkillScape spatial learning simulator.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema():
    models.Base.metadata.create_all(
        bind=engine,
        tables=[
            models.SkillTrack.__table__,
            models.User.__table__,
            models.Scenario.__table__,
            models.Course.__table__,
            models.Module.__table__,
            models.Lesson.__table__,
            models.UserProgress.__table__,
        ],
        checkfirst=True,
    )

    inspector = inspect(engine)

    scenario_columns = {column["name"] for column in inspector.get_columns("scenarios")}

    if "skill_id" not in scenario_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE scenarios ADD COLUMN skill_id INTEGER"))

    progress_columns = {column["name"] for column in inspector.get_columns("user_progress")}
    if "user_id" not in progress_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE user_progress ADD COLUMN user_id INTEGER"))


ensure_schema()


@app.on_event("startup")
async def startup_event():
    ensure_schema()
    db = SessionLocal()
    try:
        crud.seed_scenarios(db)
    finally:
        db.close()


@app.get("/health", response_model=schemas.Message)
async def health_check():
    return {"detail": "SkillScape backend is running."}


@app.post("/auth/register", response_model=schemas.AuthResponse)
async def register_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = crud.get_user_by_email(db, payload.email)
    if existing_user is not None:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = crud.create_user(db, payload)
    return {"message": "Account created", "user": crud.build_user_profile(user)}


@app.post("/auth/login", response_model=schemas.AuthResponse)
async def login_user(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, payload)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"message": "Login successful", "user": crud.build_user_profile(user)}


@app.get("/users/{user_id}/dashboard", response_model=schemas.LearnerDashboard)
async def read_learner_dashboard(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.build_learner_dashboard(db, user)


@app.get("/scenarios", response_model=list[schemas.Scenario])
async def read_scenarios(db: Session = Depends(get_db)):
    return crud.get_scenarios(db)


@app.get("/skills", response_model=list[schemas.SkillTrack])
async def read_skill_tracks(db: Session = Depends(get_db)):
    return crud.get_skill_tracks(db)


@app.get("/skills/{skill_id}", response_model=schemas.SkillTrackDetail)
async def read_skill_track(skill_id: int, db: Session = Depends(get_db)):
    skill = crud.get_skill_track(db, skill_id)
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill track not found")
    return crud.build_skill_track_detail(db, skill)


@app.get("/courses", response_model=list[schemas.Course])
async def read_courses(db: Session = Depends(get_db)):
    return crud.get_courses(db)


@app.get("/courses/{course_id}", response_model=schemas.CourseDetail)
async def read_course(course_id: int, db: Session = Depends(get_db)):
    course = crud.get_course(db, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return crud.build_course_detail(db, course)


@app.get("/skills/{skill_id}/course", response_model=schemas.CourseDetail)
async def read_skill_course(skill_id: int, db: Session = Depends(get_db)):
    skill = crud.get_skill_track(db, skill_id)
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill track not found")
    course = crud.get_course_for_skill(db, skill_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return crud.build_course_detail(db, course)


@app.get("/skills/{skill_id}/scenarios", response_model=list[schemas.Scenario])
async def read_skill_scenarios(skill_id: int, db: Session = Depends(get_db)):
    skill = crud.get_skill_track(db, skill_id)
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill track not found")
    return crud.get_scenarios_for_skill(db, skill_id)


@app.get("/scenarios/{scenario_id}", response_model=schemas.Scenario)
async def read_scenario(scenario_id: int, db: Session = Depends(get_db)):
    scenario = crud.get_scenario(db, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@app.post("/progress", response_model=schemas.Progress)
async def save_progress(progress: schemas.ProgressCreate, db: Session = Depends(get_db)):
    scenario = crud.get_scenario(db, progress.scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    if progress.user_id is not None and crud.get_user(db, progress.user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    if progress.user_id is None and not progress.student_name:
        raise HTTPException(status_code=400, detail="Student name is required when no user account is provided")
    return crud.create_progress(db, progress)


@app.get("/progress", response_model=list[schemas.Progress])
async def list_progress(db: Session = Depends(get_db)):
    return crud.get_progress(db)
