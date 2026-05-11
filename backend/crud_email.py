from sqlalchemy.orm import Session
from models import EmailVerification
import datetime
import hashlib


def create_verification(db: Session, email: str, code: str, ttl_seconds: int = 600):
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    expires = datetime.datetime.utcnow() + datetime.timedelta(seconds=ttl_seconds)
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
