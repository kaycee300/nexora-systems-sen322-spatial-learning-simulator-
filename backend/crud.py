from sqlalchemy.orm import Session
from . import models, schemas


def get_scenarios(db: Session):
    return db.query(models.Scenario).all()


def get_scenario(db: Session, scenario_id: int):
    return db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()


def get_progress(db: Session):
    return db.query(models.UserProgress).all()


def create_progress(db: Session, progress: schemas.ProgressCreate):
    db_progress = models.UserProgress(
        student_name=progress.student_name,
        scenario_id=progress.scenario_id,
        status=progress.status,
    )
    db.add(db_progress)
    db.commit()
    db.refresh(db_progress)
    return db_progress


def seed_scenarios(db: Session):
    existing = db.query(models.Scenario).count()
    if existing:
        return
    samples = [
        models.Scenario(
            title="Electrical Wiring Basics",
            description="Inspect a virtual wall panel, identify wiring color codes, and trace circuit paths.",
            tool="Multimeter",
            difficulty="Beginner",
        ),
        models.Scenario(
            title="Carpentry Joint Layout",
            description="Measure and mark a mortise-and-tenon joint using a virtual square, pencil, and chisel.",
            tool="Combination Square",
            difficulty="Intermediate",
        ),
        models.Scenario(
            title="Mechanical Repair Diagnostics",
            description="Diagnose a hydraulic pump fault, interpret readings, and choose the correct repair step.",
            tool="Pressure Gauge",
            difficulty="Advanced",
        ),
    ]
    db.add_all(samples)
    db.commit()
