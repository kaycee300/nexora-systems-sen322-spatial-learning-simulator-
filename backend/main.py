from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from routers.auth_router import router as auth_router
from database import engine
import models


app = FastAPI(title="SkillScape API", version="1.0.0")

# CORS middleware - allow the frontend origin(s) for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Ensure DB tables exist
models.Base.metadata.create_all(bind=engine)


# Include routers
app.include_router(auth_router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)



