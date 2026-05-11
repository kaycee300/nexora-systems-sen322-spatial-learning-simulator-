from collections import defaultdict, deque
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import Any
import os
import threading
import time

import schemas
import crud
import auth
import database
import crud_email

router = APIRouter(prefix="/auth", tags=["auth"])

SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "no-reply@skillscape.local")
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


def send_email_simple(to_email: str, subject: str, body: str):
    import smtplib
    from email.message import EmailMessage

    if not SMTP_HOST:
        print("SMTP not configured; skipping email send")
        return False
    msg = EmailMessage()
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        if SMTP_USER and SMTP_PASS:
            s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)
    return True


@router.post("/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, request: Request, db: Session = Depends(database.get_db)) -> Any:
    rate_limit(request, "signup", limit=5, window_seconds=60 * 60, email=user.email)
    # debug prints removed
    existing = crud.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
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
    payload: dict,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(database.get_db),
):
    # payload: { email }
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    rate_limit(request, "send-code", limit=3, window_seconds=15 * 60, email=email)
    # generate 6-digit code
    import random
    code = f"{random.randint(0,999999):06d}"
    crud_email.create_verification(db, email, code)
    # send via background task
    body = f"Your SkillScape verification code is: {code}\nIt expires in 10 minutes."
    background_tasks.add_task(send_email_simple, email, "SkillScape verification code", body)
    return {"sent": True}


@router.post("/verify-code")
def verify_code(payload: dict, request: Request, db: Session = Depends(database.get_db)):
    email = payload.get("email")
    code = payload.get("code")
    if not email or not code:
        raise HTTPException(status_code=400, detail="Email and code required")
    rate_limit(request, "verify-code", limit=10, window_seconds=15 * 60, email=email)
    ok = crud_email.verify_code(db, email, code)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    return {"verified": True}
