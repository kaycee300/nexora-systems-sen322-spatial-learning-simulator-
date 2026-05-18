from collections import defaultdict, deque
from email.message import EmailMessage
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Any
import os
import secrets
import smtplib
import threading
import time

import schemas
import crud
import auth
import database
import crud_email
import settings

router = APIRouter(prefix="/auth", tags=["auth"])

SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER") or os.environ.get("SMTP_USERNAME")
SMTP_PASS = os.environ.get("SMTP_PASS") or os.environ.get("SMTP_PASSWORD")
FROM_EMAIL = os.environ.get("FROM_EMAIL") or os.environ.get("SMTP_FROM_EMAIL") or "no-reply@skillscape.local"
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}
SMTP_USE_SSL = os.environ.get("SMTP_USE_SSL", "").lower() in {"1", "true", "yes"}
SMTP_TIMEOUT = float(os.environ.get("SMTP_TIMEOUT", 10))
TRUST_PROXY_HEADERS = os.environ.get("TRUST_PROXY_HEADERS", "").lower() in {"1", "true", "yes"}


class SlidingWindowRateLimiter:
    def __init__(self):
        self._attempts = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        cutoff = now - window_seconds

        with self._lock:
            attempts = self._attempts[key]
            while attempts and attempts[0] <= cutoff:
                attempts.popleft()

            if len(attempts) >= limit:
                retry_after = max(1, int(window_seconds - (now - attempts[0])))
                raise HTTPException(
                    status_code=429,
                    detail="Too many attempts. Please try again later.",
                    headers={"Retry-After": str(retry_after)},
                )

            attempts.append(now)


rate_limiter = SlidingWindowRateLimiter()


def client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for") if TRUST_PROXY_HEADERS else None
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def rate_limit(request: Request, action: str, limit: int, window_seconds: int, email: str | None = None) -> None:
    ip = client_ip(request)
    rate_limiter.check(f"{action}:ip:{ip}", limit, window_seconds)
    if email:
        rate_limiter.check(f"{action}:email:{email.lower()}", limit, window_seconds)


def smtp_is_configured() -> bool:
    return bool(SMTP_HOST and FROM_EMAIL)


def send_email_simple(to_email: str, subject: str, body: str) -> None:
    if not smtp_is_configured():
        raise RuntimeError("SMTP_HOST and FROM_EMAIL must be configured before email can be sent.")
    msg = EmailMessage()
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    smtp_class = smtplib.SMTP_SSL if SMTP_USE_SSL else smtplib.SMTP
    with smtp_class(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT) as s:
        if SMTP_USE_TLS and not SMTP_USE_SSL:
            s.starttls()
        if SMTP_USER and SMTP_PASS:
            s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)


@router.post("/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, request: Request, db: Session = Depends(database.get_db)) -> Any:
    rate_limit(request, "signup", limit=5, window_seconds=60 * 60, email=user.email)
    # debug prints removed
    existing = crud.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if not crud_email.has_recent_verified_code(db, user.email):
        raise HTTPException(status_code=400, detail="Please verify your email before creating an account")
    created = crud.create_user(db, user)
    access_token = auth.create_access_token({"sub": str(created.id), "email": created.email, "role": created.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/signin", response_model=schemas.Token)
def signin(form: schemas.UserLogin, request: Request, db: Session = Depends(database.get_db)) -> Any:
    rate_limit(request, "signin", limit=10, window_seconds=15 * 60, email=form.email)
    user = crud.authenticate_user(db, form.email, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = auth.create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: Any = Depends(auth.get_current_user)) -> Any:
    return current_user


@router.post("/send-code")
def send_verification_code(
    payload: schemas.EmailRequest,
    request: Request,
    db: Session = Depends(database.get_db),
):
    email = payload.email.lower()
    rate_limit(request, "send-code", limit=3, window_seconds=15 * 60, email=email)
    if crud.get_user_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email already registered. Sign in instead.")
    if not smtp_is_configured():
        raise HTTPException(
            status_code=503,
            detail="Email delivery is not configured. Set SMTP_HOST and FROM_EMAIL on the server.",
        )
    code = f"{secrets.randbelow(1000000):06d}"
    body = (
        f"Your SkillScape verification code is: {code}\n\n"
        "It expires in 10 minutes. If you did not request this code, you can ignore this email."
    )
    crud_email.create_verification(db, email, code)
    try:
        send_email_simple(email, "SkillScape verification code", body)
    except (OSError, smtplib.SMTPException, RuntimeError) as exc:
        print(f"SMTP send failed: {exc}")
        raise HTTPException(status_code=503, detail="Unable to send verification email. Try again later.")
    return {"sent": True}


@router.post("/verify-code")
def verify_code(payload: schemas.EmailCodeVerify, request: Request, db: Session = Depends(database.get_db)):
    email = payload.email.lower()
    code = payload.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="Code required")
    rate_limit(request, "verify-code", limit=10, window_seconds=15 * 60, email=email)
    ok = crud_email.verify_code(db, email, code)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    return {"verified": True}
