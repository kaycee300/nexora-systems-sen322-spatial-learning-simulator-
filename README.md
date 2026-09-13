# SkillScape – Where Practice Meets Simulation

An immersive vocational training platform that enables learners to master skills through interactive **3D simulations**. Built with a **FastAPI** backend and a vanilla HTML/CSS/JavaScript frontend powered by **Three.js**.

## ✨ Features

- **Interactive 3D hero** — animated Three.js scene on the landing page (drag to explore)
- **3D Skill Tree** — floating icosahedron network rendered live on the dashboard
- **Circuit Builder simulation** — click-to-wire raycast simulation with scoring and assessment
- **3D tilt course cards** — perspective transform cards with hover rotation
- **Course catalog** — 16 simulated vocational courses with live search + category filters
- **Full auth suite** — email verification, JWT, password reset, Google OAuth, rate limiting
- **Project API** — auth-protected course CRUD + enrollment endpoints with seed script

## 🚀 Quick Start

### 1. Setup

```bash
pip install -r backend/requirements.txt
cp .env.example .env
```

### 2. Run backend

```bash
./run_backend.sh            # starts uvicorn on :8084
# optionally seed the course catalog:
.venv/bin/python -m backend.seed_projects
```

### 3. Run frontend

```bash
cd frontend && python -m http.server 3000
```

Open `http://127.0.0.1:3000`.

## 📁 Project Structure

```
skillscape/
├── backend/
│   ├── main.py              # FastAPI app — registers all routers
│   ├── auth.py              # JWT utilities + get_current_user
│   ├── crud*.py             # User / email / password database ops
│   ├── database.py          # SQLite engine + session
│   ├── models.py            # User, EmailVerification, PasswordReset, Project, Enrollment
│   ├── schemas.py           # Pydantic schemas (users + projects + enrollments)
│   ├── seed_projects.py     # Seeds the 16-course catalog
│   └── routers/
│       ├── auth_router.py   # /auth/* endpoints + sliding-window rate limiter
│       ├── oauth_router.py  # Google OAuth
│       └── projects.py      # /projects/* CRUD + enroll
├── frontend/
│   ├── landing.html           # Marketing page + 3D hero
│   ├── landing-3d.js          # Three.js hero scene
│   ├── dashboard.html         # App dashboard (3D skill tree, stats, progress)
│   ├── catalog.html           # Course catalog (search + filters)
│   ├── simulation.html/.js    # Interactive 3D Circuit Builder
│   ├── signup / signin / forgot-password / reset-password
│   ├── app.css                # Design system + app components
│   ├── app.js                 # Dashboards: auth guard, 3D tree, tilt cards, sidebar
│   ├── auth.css / auth.js     # Auth pages
│   └── landing.css            # Landing page styles
├── .env / .env.example
└── run_backend.sh
```

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/auth/signup` | Create account (after email verification) |
| `POST` | `/auth/signin` | Login → JWT |
| `GET` | `/auth/me` | Current user profile |
| `POST` | `/auth/send-code` | Send 6-digit verification code |
| `POST` | `/auth/verify-code` | Verify code |
| `POST` | `/auth/forgot-password` | Email password-reset link |
| `POST` | `/auth/reset-password` | Set new password with token |
| `GET` | `/auth/google/*` | Google OAuth login/callback |

### Projects (course catalog)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/projects/` | List projects (category + search filters) |
| `GET` | `/projects/categories` | Distinct categories |
| `GET` | `/projects/{id}` | Single project |
| `POST` | `/projects/` | Create project (instructor only) |
| `PUT` | `/projects/{id}` | Update project (instructor only) |
| `DELETE` | `/projects/{id}` | Delete project (instructor only) |
| `POST` | `/projects/{id}/enroll` | Enroll (auth required) |
| `GET` | `/projects/enrollments/me` | My enrollments (auth required) |

## 🎮 The 3D Simulation

The **Circuit Builder** (`frontend/simulation.html`) is a fully interactive Three.js scene:

1. Pick a glowing wire coil from the tray
2. Click a terminal pair to complete a circuit
3. Completed circuits light an overhead globe
4. Score is based on circuits completed and move efficiency
5. Submit the assessment to record your grade

## 🚧 Roadmap

- [ ] Practice-form: instructor-created lessons inside the simulator
- [ ] Certificates & badges with shareable URLs
- [ ] AI coaching hints during simulations
- [ ] Leaderboards + weekly challenges
- [ ] Alembic migrations, PostgreSQL in production
- [ ] Docker + CI/CD, PWA offline support, dark mode

## 🔒 Security

PBKDF2-SHA256 password hashing · 7-day JWTs · mandatory email verification · sliding-window rate limiting · CORS allow-list · SMTP TLS for email