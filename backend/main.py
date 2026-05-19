from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os
import sys
from sqlalchemy import inspect, text

# Add parent directory to path for imports when running from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers.auth_router import router as auth_router
from routers.oauth_router import router as oauth_router
from database import engine
import models
import settings


app = FastAPI(title="SkillScape API", version="1.0.0")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("SKILLSCAPE_SECRET", "change-me-for-local-dev"),
)

# CORS middleware - allow the frontend origin(s) for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "null",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Ensure DB tables exist
models.Base.metadata.create_all(bind=engine)


def ensure_sqlite_columns():
    if engine.dialect.name != "sqlite":
        return
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "email_verified" not in user_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0"))


ensure_sqlite_columns()


# Include routers
app.include_router(auth_router)
app.include_router(oauth_router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
