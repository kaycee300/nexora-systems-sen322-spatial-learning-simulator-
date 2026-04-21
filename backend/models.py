from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func

try:
    from .database import Base
except ImportError:
    from database import Base  # type: ignore


class SkillTrack(Base):
    __tablename__ = "skill_tracks"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=False)
    demand_level = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    learning_path = Column(String, nullable=False)


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skill_tracks.id"), unique=True, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(String, nullable=False)
    level = Column(String, nullable=False)
    duration_weeks = Column(Integer, nullable=False)
    outcome = Column(String, nullable=False)


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    position = Column(Integer, nullable=False)


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    title = Column(String, nullable=False)
    objective = Column(String, nullable=False)
    format = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    position = Column(Integer, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    learning_goal = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skill_tracks.id"), nullable=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False)
    tool = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)


class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    student_name = Column(String, nullable=False)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)
    status = Column(String, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
