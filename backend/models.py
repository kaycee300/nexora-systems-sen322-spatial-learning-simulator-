from sqlalchemy import Column, Integer, String, DateTime, func, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")
    email_verified = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    code_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Integer, default=0)


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    token_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False, index=True)
    level = Column(String, nullable=False, default="Beginner")
    lessons = Column(Integer, nullable=False, default=1)
    duration_hours = Column(Integer, nullable=False, default=1)
    icon = Column(String, nullable=False, default="bolt")
    gradient = Column(String, nullable=False, default="gradient-electric")
    is_simulation = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, server_default=func.now())


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    progress = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="in_progress")
    score = Column(Integer, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    enrolled_at = Column(DateTime, server_default=func.now())

    project = relationship("Project")