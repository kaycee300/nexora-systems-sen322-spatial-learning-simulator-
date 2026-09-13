from collections import defaultdict, deque
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Any
import threading
import time

from .. import schemas
from .. import crud
from .. import auth
from .. import database

router = APIRouter(prefix="/auth", tags=["auth"])


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
    if request.client:
        return request.client.host
    return "unknown"


def rate_limit(request: Request, action: str, limit: int, window_seconds: int, email: str | None = None) -> None:
    ip = client_ip(request)
    rate_limiter.check(f"{action}:ip:{ip}", limit, window_seconds)
    if email:
        rate_limiter.check(f"{action}:email:{email.lower()}", limit, window_seconds)


@router.post("/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, request: Request, db: Session = Depends(database.get_db)) -> Any:
    rate_limit(request, "signup", limit=5, window_seconds=60 * 60, email=user.email)
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