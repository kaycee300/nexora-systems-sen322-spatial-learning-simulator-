from sqlalchemy.orm import Session
from .models import PasswordReset
import datetime
import hashlib


def create_reset_token(db: Session, user_id: int, token_hash: str, ttl_seconds: int = 3600):
    """Create a password reset token for a user."""
    expires = datetime.datetime.utcnow() + datetime.timedelta(seconds=ttl_seconds)
    # Invalidate any existing unused tokens for this user
    db.query(PasswordReset).filter(
        PasswordReset.user_id == user_id,
        PasswordReset.used == 0,
    ).update({PasswordReset.used: 1})
    
    reset = PasswordReset(user_id=user_id, token_hash=token_hash, expires_at=expires, used=0)
    db.add(reset)
    db.commit()
    db.refresh(reset)
    return reset


def get_reset_token(db: Session, token_hash: str):
    """Get a password reset token by its hash."""
    now = datetime.datetime.utcnow()
    return db.query(PasswordReset).filter(
        PasswordReset.token_hash == token_hash,
        PasswordReset.used == 0,
        PasswordReset.expires_at >= now,
    ).first()


def use_reset_token(db: Session, token_id: int) -> bool:
    """Mark a reset token as used."""
    token = db.query(PasswordReset).filter(PasswordReset.id == token_id).first()
    if not token:
        return False
    token.used = 1
    db.add(token)
    db.commit()
    return True


def cleanup_expired_tokens(db: Session):
    """Remove expired tokens (optional maintenance)."""
    now = datetime.datetime.utcnow()
    db.query(PasswordReset).filter(PasswordReset.expires_at < now).delete()
    db.commit()