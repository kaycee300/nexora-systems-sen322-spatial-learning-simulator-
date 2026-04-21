from sqlalchemy.orm import Session

try:
    from . import models, schemas
except ImportError:
    import models  # type: ignore
    import schemas  # type: ignore


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
    sample_titles = {
        record.title
        for record in db.query(models.Scenario.title).all()
    }
    samples = []
    new_scenarios = [
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
        models.Scenario(
            title="Baking Fundamentals",
            description="Follow a virtual recipe, mix ingredients by weight, and observe dough texture and oven timing.",
            tool="Digital Scale",
            difficulty="Beginner",
        ),
        models.Scenario(
            title="AI Workflow Planning",
            description="Build a high-level AI solution by choosing datasets, model types, and evaluation metrics.",
            tool="Planning Board",
            difficulty="Intermediate",
        ),
        models.Scenario(
            title="Creative Skills Simulation",
            description="Explore how different vocational and knowledge skills like baking, AI, and design can be trained in simulation.",
            tool="Virtual Toolkit",
            difficulty="Intermediate",
        ),
    ]
    for scenario in new_scenarios:
        if scenario.title not in sample_titles:
            samples.append(scenario)
    if not samples:
        return
    db.add_all(samples)
    db.commit()
