from sqlalchemy.orm import Session
from .models import EmailVerification
import datetime
import hashlib


def create_verification(db: Session, email: str, code: str, ttl_seconds: int = 600):
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    expires = datetime.datetime.utcnow() + datetime.timedelta(seconds=ttl_seconds)
    db.query(EmailVerification).filter(
        EmailVerification.email == email,
        EmailVerification.used == 0,
    ).update({EmailVerification.used: 1})
    ev = EmailVerification(email=email, code_hash=code_hash, expires_at=expires, used=0)
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def verify_code(db: Session, email: str, code: str):
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    now = datetime.datetime.utcnow()
    ev = db.query(EmailVerification).filter(EmailVerification.email == email, EmailVerification.code_hash == code_hash, EmailVerification.used == 0, EmailVerification.expires_at >= now).first()
    if not ev:
        return False
    ev.used = 1
    db.add(ev)
    db.commit()
    return True


def has_recent_verified_code(db: Session, email: str):
    now = datetime.datetime.utcnow()
    return db.query(EmailVerification).filter(
        EmailVerification.email == email,
        EmailVerification.used == 1,
        EmailVerification.expires_at >= now,
    ).first() is not None
