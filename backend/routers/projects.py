"""
routers/projects.py — Project (course) CRUD + enrollment routes
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import schemas
from .. import models
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=List[schemas.ProjectResponse])
def get_projects(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search title/description"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Return all projects, optionally filtered by category or search query."""
    query = db.query(models.Project)
    if category:
        query = query.filter(models.Project.category == category.lower())
    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            models.Project.title.ilike(term) | models.Project.description.ilike(term)
        )
    return (
        query.order_by(models.Project.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/categories", response_model=List[str])
def get_categories(db: Session = Depends(get_db)):
    """Return the distinct project categories present in the catalog."""
    rows = db.query(models.Project.category).distinct().order_by(models.Project.category).all()
    return [r[0] for r in rows]


@router.get("/{project_id}", response_model=schemas.ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can create projects")
    project = models.Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can update projects")
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can delete projects")
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()


@router.post("/{project_id}/enroll", response_model=schemas.EnrollmentOut)
def enroll(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    existing = (
        db.query(models.Enrollment)
        .filter(
            models.Enrollment.user_id == current_user.id,
            models.Enrollment.project_id == project_id,
        )
        .first()
    )
    if existing:
        return existing
    enrollment = models.Enrollment(user_id=current_user.id, project_id=project_id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/enrollments/me", response_model=List[schemas.EnrollmentWithProject])
def my_enrollments(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return (
        db.query(models.Enrollment)
        .filter(models.Enrollment.user_id == current_user.id)
        .order_by(models.Enrollment.enrolled_at.desc())
        .all()
    )


@router.put("/{project_id}/progress", response_model=schemas.EnrollmentOut)
def update_progress(
    project_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update enrollment progress/score from a simulation session."""
    enrollment = (
        db.query(models.Enrollment)
        .filter(
            models.Enrollment.user_id == current_user.id,
            models.Enrollment.project_id == project_id,
        )
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled in this project")
    progress = payload.get("progress")
    score = payload.get("score")
    if progress is not None:
        enrollment.progress = max(0, min(100, int(progress)))
    if score is not None:
        enrollment.score = int(score)
    if enrollment.progress >= 100:
        enrollment.status = "completed"
        # keep server-side UTC-naive consistent with SQLite
        from datetime import datetime, timezone
        enrollment.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(enrollment)
    return enrollment