from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import sqlite3
import hashlib
import jwt
import datetime
from contextlib import contextmanager
import os
from jwt import PyJWTError


app = FastAPI(title="SkillScape API", version="1.0.0")

# CORS middleware - allow the frontend origin
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3000"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os

import database
import models
import schemas
import crud
import auth


app = FastAPI(title="SkillScape API", version="1.0.0")

# CORS middleware - allow the frontend origin
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3000"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


# Ensure DB tables exist
models.Base.metadata.create_all(bind=database.engine)


@app.post("/auth/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
	existing = crud.get_user_by_email(db, user.email)
	if existing:
		raise HTTPException(status_code=400, detail="Email already registered")
	created = crud.create_user(db, user)
	access_token = auth.create_access_token({"sub": str(created.id), "email": created.email, "role": created.role})
	return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/signin", response_model=schemas.Token)
def signin(form: schemas.UserLogin, db: Session = Depends(database.get_db)):
	user = crud.authenticate_user(db, form.email, form.password)
	if not user:
		raise HTTPException(status_code=401, detail="Invalid credentials")
	access_token = auth.create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
	return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
	return current_user


@app.get("/health")
def health_check():
	return {"status": "healthy"}


if __name__ == "__main__":
	import uvicorn
	port = int(os.environ.get("PORT", 8002))
	uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)



