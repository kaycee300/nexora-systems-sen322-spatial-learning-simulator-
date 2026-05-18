# Smart Student Expense Tracker

A modern finance app for students with expense tracking, category budgets, receipt upload, AI-style spending insights, weekly/monthly analytics, and a savings goal tracker.

## Run

### Frontend only

Open `index.html` in a browser. Signup and login require the API, but the tracker can keep showing cached data if the API goes offline after login.

### Full stack with FastAPI and PostgreSQL

1. Create a PostgreSQL database and user:

```sql
CREATE USER student_expense WITH PASSWORD 'student_expense';
CREATE DATABASE student_expense OWNER student_expense;
```

2. Create a Python virtual environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

3. Configure the database and SMTP settings:

```bash
cp backend/.env.example backend/.env
```

Update `backend/.env` with your PostgreSQL details, a long random `SECRET_KEY`, and the SMTP account that should send verification codes.

For Gmail, enable 2-step verification and create an app password, then use:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=youraddress@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM_EMAIL=youraddress@gmail.com
SMTP_USE_TLS=true
SMTP_USE_SSL=false
SMTP_TIMEOUT=10
```

For most providers, port `587` uses `SMTP_USE_TLS=true`. Use port `465` with `SMTP_USE_SSL=true` and `SMTP_USE_TLS=false` only when your provider requires implicit SSL.

4. Start the API and frontend:

```bash
uvicorn backend.main:app --reload
```

Then open `http://localhost:8000`.

The backend creates the database tables on startup. Each new user gets private default categories and a savings goal during signup.

If you created the database with an earlier version, recreate the database or add migrations before starting this version because the schema now includes `users.email_verified` and `email_verification_codes`.

## Features

- Expense tracking with PostgreSQL persistence through FastAPI
- Signup/login with bearer-token authentication
- Email verification after signup
- Private per-user expenses, budgets, and savings goal data
- Bcrypt password hashing
- JWT access tokens with configurable expiry
- Basic login lockout after repeated failed attempts
- Local browser cache when the API goes offline after login
- Budget categories and over-budget status
- Weekly/monthly analytics by category
- Rule-based AI suggestions such as food spend percentage and daily pace
- Receipt image upload with browser OCR through Tesseract.js and a fallback scanner
- Savings goal tracker with progress ring

## API

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `GET /api/state`
- `PATCH /api/profile`
- `GET /api/expenses`
- `POST /api/expenses`
- `PUT /api/goal`

## Auth Security

- Passwords are stored as bcrypt hashes, never plaintext.
- Existing legacy PBKDF2 hashes are still accepted and are upgraded to bcrypt after a successful login.
- Access tokens are signed with `SECRET_KEY` and expire after `ACCESS_TOKEN_MINUTES`.
- New accounts must verify email before accessing private finance data.
- Verification codes are stored as HMAC hashes, expire after `EMAIL_VERIFICATION_MINUTES`, and are attempt-limited.
- Login attempts are rate-limited in memory with `LOGIN_MAX_ATTEMPTS` and `LOGIN_LOCKOUT_MINUTES`.

For production, set a long random `SECRET_KEY`, use HTTPS, and move rate limiting to a shared store such as Redis.

If SMTP settings are empty, verification codes are printed to the backend terminal for local development. Configure `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM_EMAIL` in `backend/.env` to send real emails. If the SMTP provider rejects a message, signup and resend return `503` so the app does not report a false success.

## Extra Ideas Included

- Monthly allowance control
- Daily spending pace insight
- Budget surplus suggestion
- Receipt text and filename extraction for merchant, category, and amount
