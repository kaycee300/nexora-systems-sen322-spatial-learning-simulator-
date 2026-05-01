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

# Database setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.path.join(BASE_DIR, "skillscape.db")

@contextmanager
def get_db():
	conn = sqlite3.connect(DATABASE_URL)
	conn.row_factory = sqlite3.Row
	try:
		yield conn
	finally:
		conn.close()


def init_db():
	with get_db() as conn:
		conn.execute('''
			CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				email TEXT UNIQUE NOT NULL,
				password_hash TEXT NOT NULL,
				full_name TEXT NOT NULL,
				role TEXT NOT NULL DEFAULT 'user',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		''')
		conn.commit()


init_db()

# Pydantic models
class UserCreate(BaseModel):
	email: str
	password: str
	full_name: str
	role: Optional[str] = "user"


class UserLogin(BaseModel):
	email: str
	password: str


class Token(BaseModel):
	access_token: str
	token_type: str


# JWT settings
SECRET_KEY = os.environ.get("SKILLSCAPE_SECRET", "change-me-for-production")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
	return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
	return hash_password(password) == hashed


def create_access_token(data: dict):
	to_encode = data.copy()
	expire = datetime.datetime.utcnow() + datetime.timedelta(days=7)
	to_encode.update({"exp": int(expire.timestamp())})
	encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
	return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
	try:
		payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
		return payload
	except PyJWTError:
		raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(authorization: Optional[str] = Header(None)):
	if not authorization:
		raise HTTPException(status_code=401, detail="Authorization header missing")

	if not authorization.lower().startswith("bearer "):
		raise HTTPException(status_code=401, detail="Invalid authorization header")

	token = authorization.split(" ", 1)[1]
	payload = decode_access_token(token)
	user_id = payload.get("sub")
	if not user_id:
		raise HTTPException(status_code=401, detail="Invalid token payload")

	with get_db() as conn:
		db_user = conn.execute("SELECT id, email, full_name, role, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
		if not db_user:
			raise HTTPException(status_code=404, detail="User not found")
		return dict(db_user)


@app.post("/auth/signup", response_model=Token)
async def signup(user: UserCreate):
	with get_db() as conn:
		existing = conn.execute("SELECT id FROM users WHERE email = ?", (user.email,)).fetchone()
		if existing:
			raise HTTPException(status_code=400, detail="Email already registered")

		password_hash = hash_password(user.password)
		cursor = conn.execute(
			"INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
			(user.email, password_hash, user.full_name, user.role),
		)
		user_id = cursor.lastrowid
		conn.commit()

		access_token = create_access_token({"sub": str(user_id), "email": user.email, "role": user.role})
		return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/signin", response_model=Token)
async def signin(user: UserLogin):
	with get_db() as conn:
		db_user = conn.execute("SELECT * FROM users WHERE email = ?", (user.email,)).fetchone()
		if not db_user or not verify_password(user.password, db_user["password_hash"]):
			raise HTTPException(status_code=401, detail="Invalid credentials")

		access_token = create_access_token({
			"sub": str(db_user["id"]),
			"email": db_user["email"],
			"role": db_user["role"],
		})
		return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me")
def read_current_user(current_user: Dict[str, Any] = Depends(get_current_user)):
	return {"user": current_user}


@app.get("/health")
async def health_check():
	return {"status": "healthy"}


if __name__ == "__main__":
	import uvicorn
	port = int(os.environ.get("PORT", 8002))
	uvicorn.run(app, host="0.0.0.0", port=port)

