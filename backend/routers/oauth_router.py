from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
import os
import auth
import database
import crud
import settings

router = APIRouter(prefix="/auth", tags=["oauth"])

# Configure OAuth client
oauth = OAuth()
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )


@router.get("/google/login")
async def google_login(request: Request):
    if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET):
        return HTMLResponse(
            """
            <!doctype html>
            <title>Google login not configured</title>
            <body style="font-family:system-ui;margin:40px;line-height:1.5">
              <h1>Google login is not configured</h1>
              <p>Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env or backend/.env, then restart the API.</p>
            </body>
            """,
            status_code=503,
        )
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request):
    if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET):
        return HTMLResponse("Google OAuth is not configured on the server.", status_code=503)
    token = await oauth.google.authorize_access_token(request)
    userinfo = await oauth.google.parse_id_token(request, token)
    # userinfo contains 'sub', 'email', 'name', 'picture', etc.
    email = userinfo.get("email")
    name = userinfo.get("name") or email

    # create or get user
    db = next(database.get_db())
    existing = crud.get_user_by_email(db, email)
    if existing is None:
        # create a user with a random password (not used) and mark created
        from schemas import UserCreate
        uc = UserCreate(email=email, password=os.urandom(24).hex(), full_name=name)
        user = crud.create_user(db, uc)
    else:
        user = existing

    access_token = auth.create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    # Redirect to frontend with token in fragment for SPA to pick up
    redirect_to = f"{FRONTEND_URL}/?token={access_token}"
    return RedirectResponse(url=redirect_to)
