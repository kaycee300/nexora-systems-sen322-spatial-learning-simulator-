# SkillScape – Where Practice Meets Simulation

A spatial learning simulator for vocational training in electrical work, carpentry, and mechanical repairs.
The project is intentionally split into two parts:

- `backend/`: FastAPI + SQLite API for scenarios and progress tracking.
- `frontend/`: HTML, CSS, and Three.js landing page with API integration.

## Architecture

- `backend/main.py`: FastAPI application with scenario and progress endpoints.
- `backend/database.py`: SQLite database setup with SQLAlchemy.
- `backend/models.py`: ORM models for training scenarios and user progress.
- `backend/crud.py`: Data access layer and seed data.
- `frontend/index.html`: Landing page and scenario explorer.
- `frontend/app.js`: Fetches backend data and initializes the Three.js preview.
- `frontend/styles.css`: Design and responsive layout.

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
5. Run the backend: `uvicorn main:app --reload --port 8000`

The backend will start at `http://localhost:8000` and seed sample scenarios automatically.

### Frontend

1. `cd frontend`
2. Open `index.html` in a browser, or serve it locally with a static server.

For a simple local server:

```bash
cd frontend
python3 -m http.server 3000
