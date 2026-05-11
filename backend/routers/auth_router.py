from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Any
import os

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
def signup(user: schemas.UserCreate, db: Session = Depends(database.get_db)) -> Any:
    # debug prints removed
    existing = crud.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    created = crud.create_user(db, user)
    access_token = auth.create_access_token({"sub": str(created.id), "email": created.email, "role": created.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/signin", response_model=schemas.Token)
def signin(form: schemas.UserLogin, db: Session = Depends(database.get_db)) -> Any:
    user = crud.authenticate_user(db, form.email, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = auth.create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: Any = Depends(auth.get_current_user)) -> Any:
    return current_user


@router.post("/send-code")
def send_verification_code(payload: dict, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    # payload: { email }
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    # generate 6-digit code
    import random
    code = f"{random.randint(0,999999):06d}"
    crud_email.create_verification(db, email, code)
    # send via background task
    body = f"Your SkillScape verification code is: {code}\nIt expires in 10 minutes."
    background_tasks.add_task(send_email_simple, email, "SkillScape verification code", body)
    return {"sent": True}


@router.post("/verify-code")
def verify_code(payload: dict, db: Session = Depends(database.get_db)):
    email = payload.get("email")
    code = payload.get("code")
    if not email or not code:
        raise HTTPException(status_code=400, detail="Email and code required")
    ok = crud_email.verify_code(db, email, code)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    return {"verified": True}
