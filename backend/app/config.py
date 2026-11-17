import os
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))
DEFAULT_DATABASE_URL = "sqlite:///ledger.db"


class Config:
    # Set DATABASE_URL in your environment to override this connection, for
    # example when using different local PostgreSQL credentials.
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB
    SECRET_KEY = os.environ.get("SECRET_KEY", "local-development-change-this")
    # Render serves the frontend and API from separate subdomains. Production
    # sessions therefore need an explicitly secure cross-site cookie.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = os.environ.get("RENDER") == "true"
    SESSION_COOKIE_SAMESITE = "None" if SESSION_COOKIE_SECURE else "Lax"
    # Needed when a separately hosted frontend sends Flask's session cookie.
    # The local Vite proxy does not need this, but it keeps both setups valid.
    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://benny-ent-software.onrender.com",
    ).split(",")
    ADMIN_USERNAME = os.environ.get("LEDGER_ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.environ.get("LEDGER_ADMIN_PASSWORD", "change-me")
