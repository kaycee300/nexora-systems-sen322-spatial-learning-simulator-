from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

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


@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    try:
        crud.seed_scenarios(db)
    finally:
        db.close()


@app.get("/health", response_model=schemas.Message)
async def health_check():
    return {"detail": "SkillScape backend is running."}


@app.get("/scenarios", response_model=list[schemas.Scenario])
async def read_scenarios(db: Session = Depends(get_db)):
    return crud.get_scenarios(db)


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
    return crud.create_progress(db, progress)


@app.get("/progress", response_model=list[schemas.Progress])
async def list_progress(db: Session = Depends(get_db)):
    return crud.get_progress(db)
