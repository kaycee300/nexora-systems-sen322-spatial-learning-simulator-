# SkillScape – Where Practice Meets Simulation

A spatial learning simulator for vocational training in electrical work, carpentry, and mechanical repairs.
The project is intentionally split into two parts:

- `backend/`: FastAPI + SQLite API for scenarios and progress tracking.
- `frontend/`: HTML, CSS, and Three.js landing page with API integration.

## Architecture

- `backend/main.py`: FastAPI application with scenario, progress, and admin endpoints.
- `backend/database.py`: SQLite database setup with SQLAlchemy.
- `backend/models.py`: ORM models for training scenarios and user progress.
- `backend/crud.py`: Data access layer and seed data.
- `frontend/index.html`: Landing page with role selection modal.
- `frontend/user.html`: Learner dashboard for scenarios and progress tracking.
- `frontend/admin.html`: Admin dashboard for managing scenarios and viewing progress.
- `frontend/app.js`: Handles landing page modal and navigation.
- `frontend/user.js`: Learner page functionality.
- `frontend/admin.js`: Admin page functionality.
- `frontend/styles.css`: Design and responsive layout.

## API Endpoints

- `GET /scenarios` — list training scenarios.
- `GET /scenarios/{id}` — get scenario details.
- `POST /scenarios` — create new scenario (admin).
- `POST /progress` — save learner progress.
- `GET /progress` — list all progress records (admin).

## Skill Categories

SkillScape is designed to support a wide range of practical learning domains, including:

- Electrical work
- Carpentry
- Mechanical repair
- Baking and food preparation
- AI and technical workflow planning

## Local Setup

### Backend

1. `cd backend`
2. Create a virtual environment: `python3 -m venv venv`
3. Activate it: `source venv/bin/activate`
4. Install requirements: `pip install -r requirements.txt`
5. Optional for local AI coaching: install Ollama and pull a local model such as `qwen3:1.7b`
6. Run the backend: `uvicorn main:app --reload --port 8000`

The backend will start at `http://localhost:8000` and seed sample scenarios automatically.

#### Local AI Coach With Ollama

SkillScape can run its lesson coach locally without paid API usage.

1. Install Ollama
2. Start Ollama: `ollama serve`
3. Pull a model: `ollama pull qwen3:1.7b`
4. Optionally set a different model:

```bash
export OLLAMA_MODEL="qwen3:1.7b"
```

By default the backend calls `http://localhost:11434/api/chat`. If Ollama is not running, SkillScape falls back to built-in coaching hints.

### Frontend

1. `cd frontend`
2. Open `index.html` in a browser, or serve it locally with a static server.

For a simple local server:

```bash
cd frontend
python3 -m http.server 3000
