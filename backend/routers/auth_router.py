from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any

import schemas
import crud
import auth
import database

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(database.get_db)) -> Any:
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
