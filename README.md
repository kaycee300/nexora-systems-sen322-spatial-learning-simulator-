# SkillScape – Where Practice Meets Simulation

An immersive vocational training platform that enables learners to master skills through interactive simulations. Built with a FastAPI backend and vanilla HTML/CSS/JavaScript frontend.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip

### 1. Clone and Setup

```bash
# Navigate to project directory
cd skillscape

# Create Python virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Application Secret (generate a strong random key for production)
SKILLSCAPE_SECRET=your-secret-key-here

# SMTP Email Configuration (for verification codes)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_USE_TLS=true
SMTP_TIMEOUT=10

# Frontend URL
FRONTEND_URL=http://127.0.0.1:3000

# Optional: Google OAuth
# GOOGLE_CLIENT_ID=your-client-id
# GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Run the Application

**Option A: Using the startup script (recommended)**
```bash
./run_backend.sh
```

**Option B: Manual startup**
```bash
# From project root (NOT from backend/)
uvicorn backend.main:app --reload --port 8084
```

### 4. Start Frontend

```bash
cd frontend
python -m http.server 3000
```

Open `http://127.0.0.1:3000` in your browser.

## 📁 Project Structure

```
skillscape/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── auth.py              # JWT authentication utilities
│   ├── crud.py              # Database operations for users
│   ├── crud_email.py        # Email verification operations
│   ├── database.py          # Database configuration (SQLite)
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic validation schemas
│   ├── settings.py          # Environment configuration loader
│   └── routers/
│       ├── auth_router.py   # Authentication endpoints
│       └── oauth_router.py  # Google OAuth endpoints
├── frontend/
│   ├── landing.html         # Landing page
│   ├── signup.html          # User registration
│   ├── signin.html          # User login
│   ├── dashboard.html       # User dashboard
│   ├── auth.js              # Authentication logic
│   ├── auth.css             # Auth pages styling
│   ├── landing.css          # Landing page styling
│   └── dashboard.html       # User dashboard
├── .env                     # Environment configuration
├── .env.example             # Configuration template
├── run_backend.sh           # Backend startup script
└── README.md
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/auth/signup` | Create new account |
| `POST` | `/auth/signin` | Login |
| `GET` | `/auth/me` | Get current user profile |
| `POST` | `/auth/send-code` | Send email verification code |
| `POST` | `/auth/verify-code` | Verify email code |
| `GET` | `/auth/google/login` | Initiate Google OAuth |
| `GET` | `/auth/google/callback` | Google OAuth callback |

## 🔒 Security Features

- **Password Hashing**: PBKDF2_SHA256 with automatic salt
- **JWT Tokens**: 7-day expiration with configurable secret key
- **Email Verification**: Required before account activation
- **Rate Limiting**: Protection against brute force attacks
- **CORS Protection**: Configured for development origins
- **OAuth 2.0**: Google sign-in support

## 🗄️ Database

By default, SkillScape uses SQLite for development:
- Database file: `backend/skillscape.db`
- Auto-created on first run
- No additional setup required

### Switching to PostgreSQL

1. Install psycopg2:
```bash
pip install psycopg2-binary
```

2. Update `backend/database.py`:
```python
DATABASE_URL = "postgresql://user:password@localhost:5432/skillscape"
```

3. Create the database:
```sql
CREATE DATABASE skillscape;
```

## 🛠️ Development

### Running Tests
```bash
# TODO: Add test suite
pytest backend/tests/
```

### Code Style
- Backend: PEP 8 compliant
- Frontend: Vanilla JS, no build tools required

### Adding New Features

1. Create new models in `backend/models.py`
2. Add CRUD operations in `backend/crud.py`
3. Define schemas in `backend/schemas.py`
4. Create router in `backend/routers/`
5. Register router in `backend/main.py`

## 🚧 Roadmap & Suggested Improvements

### Core Features (Planned)
- [ ] **Course Management**: Create, browse, and enroll in courses
- [ ] **3D Simulations**: Interactive WebGL-based skill simulations
- [ ] **Progress Tracking**: Track completion and skill mastery
- [ ] **Assessment System**: Quizzes and practical evaluations
- [ ] **Certificate Generation**: Downloadable completion certificates
- [ ] **Discussion Forums**: Community Q&A per course
- [ ] **Instructor Dashboard**: Content creation and student management

### Backend Improvements
- [ ] **Database Migrations**: Use Alembic for schema versioning
- [ ] **Redis Caching**: Session and rate limit storage
- [ ] **Email Templates**: HTML email templates for verification
- [ ] **Password Reset**: Forgot password functionality
- [ ] **User Roles**: Admin, Instructor, Student permissions
- [ ] **API Versioning**: `/api/v1/` prefix for future compatibility
- [ ] **Request Logging**: Structured logging with correlation IDs
- [ ] **File Upload**: Receipt/certificate upload to S3/Cloudinary

### Frontend Improvements
- [ ] **Responsive Design**: Mobile-first approach
- [ ] **Progressive Web App**: Offline support and install prompt
- [ ] **Accessibility**: WCAG 2.1 AA compliance
- [ ] **Dark Mode**: User preference toggle
- [ ] **Loading States**: Skeleton screens and spinners
- [ ] **Error Boundaries**: Graceful error handling
- [ ] **Form Validation**: Real-time client-side validation
- [ ] **Toast Notifications**: Non-blocking status messages

### DevOps & Infrastructure
- [ ] **Docker Support**: Containerize backend and frontend
- [ ] **CI/CD Pipeline**: GitHub Actions for testing and deployment
- [ ] **Environment-specific configs**: Dev, staging, production
- [ ] **Health Monitoring**: Uptime and performance dashboards
- [ ] **Backup Strategy**: Automated database backups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- FastAPI for the excellent web framework
- SQLAlchemy for database abstraction
- Authlib for OAuth integration
- All contributors to the SkillScape project

---

**Built with ❤️ for vocational education**