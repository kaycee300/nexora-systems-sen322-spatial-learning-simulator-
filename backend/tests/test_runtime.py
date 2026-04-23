from pathlib import Path
import sys

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend import crud, main, models, schemas


def build_test_client(tmp_path: Path):
    database_path = tmp_path / "skillscape-test.db"
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    models.Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    crud.seed_scenarios(db)

    def override_get_db():
        override_session = TestingSessionLocal()
        try:
            yield override_session
        finally:
            override_session.close()

    main.app.dependency_overrides[main.get_db] = override_get_db
    client = TestClient(main.app)
    return client, db


def create_user_and_lesson(db):
    user = crud.create_user(
        db,
        schemas.UserCreate(
            name="Debbie Tester",
            email="debbie@example.com",
            password="strong-password",
            learning_goal="Master practical electrical work",
        ),
    )
    lesson = db.query(models.Lesson).order_by(models.Lesson.id.asc()).first()
    return user, lesson


def test_lesson_session_endpoints_round_trip(tmp_path):
    client, db = build_test_client(tmp_path)
    user, lesson = create_user_and_lesson(db)

    started = client.post(f"/lessons/{lesson.id}/sessions/start", json={"user_id": user.id})
    assert started.status_code == 200
    session = started.json()
    assert session["status"] == "In progress"

    first_event = client.post(
        f"/lesson-sessions/{session['id']}/events",
        json={"event_type": "inspect_panel", "event_value": "inspect_panel"},
    )
    assert first_event.status_code == 200

    retry_event = client.post(
        f"/lesson-sessions/{session['id']}/events",
        json={"event_type": "retry_started", "event_value": "attempt:1"},
    )
    assert retry_event.status_code == 200

    detail = client.get(f"/lesson-sessions/{session['id']}")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert [event["event_type"] for event in detail_payload["events"]] == ["inspect_panel", "retry_started"]

    completed = client.post(
        f"/lesson-sessions/{session['id']}/complete",
        json={"status": "Needs review", "score": 15, "notes": "inspect_panel | retries:1"},
    )
    assert completed.status_code == 200
    completed_payload = completed.json()
    assert completed_payload["status"] == "Needs review"
    assert completed_payload["completed_at"] is not None

    db.close()
    main.app.dependency_overrides.clear()


def test_dashboard_surfaces_retry_and_failure_metrics(tmp_path):
    client, db = build_test_client(tmp_path)
    user, lesson = create_user_and_lesson(db)

    crud.create_progress(
        db,
        schemas.ProgressCreate(
            user_id=user.id,
            student_name=user.name,
            scenario_id=1,
            status="Completed",
        ),
    )
    crud.upsert_lesson_completion(
        db,
        lesson,
        schemas.LessonCompletionCreate(
            user_id=user.id,
            status="Completed",
            score=92,
            feedback="Solid sequence and safety notes.",
        ),
    )

    passed_session = crud.start_lesson_session(db, lesson, schemas.LessonSessionCreate(user_id=user.id))
    crud.complete_lesson_session(
        db,
        passed_session,
        schemas.LessonSessionUpdate(
            status="Completed",
            score=90,
            notes="inspect_panel, pick_multimeter, identify_live_wire, secure_circuit | retries:1",
        ),
    )

    failed_session = models.LessonSession(user_id=user.id, lesson_id=lesson.id, status="In progress")
    db.add(failed_session)
    db.commit()
    db.refresh(failed_session)
    crud.complete_lesson_session(
        db,
        failed_session,
        schemas.LessonSessionUpdate(
            status="Needs review",
            score=10,
            notes="sequence_error | retries:2",
        ),
    )

    active_session = models.LessonSession(user_id=user.id, lesson_id=lesson.id, status="In progress")
    db.add(active_session)
    db.commit()

    dashboard = client.get(f"/users/{user.id}/dashboard")
    assert dashboard.status_code == 200
    payload = dashboard.json()

    assert payload["passed_simulation_sessions"] == 1
    assert payload["failed_simulation_sessions"] == 1
    assert payload["retry_count_total"] == 3
    assert payload["active_simulation_sessions"] == 1
    assert payload["simulation_status_badge"] == "Needs another rep"

    db.close()
    main.app.dependency_overrides.clear()
