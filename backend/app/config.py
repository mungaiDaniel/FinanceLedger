"""Application configuration, driven entirely by environment variables.

See ``.env.example`` for the full list. Nothing sensitive has a usable default:
in production the app refuses to start without real secrets.
"""
import os
import secrets
from datetime import timedelta

from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _database_url():
    url = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'ledger.db')}")
    # Some hosts (e.g. Heroku/Render) still hand out the legacy "postgres://" scheme.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


class Config:
    APP_ENV = os.environ.get("APP_ENV", "development")
    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB upload limit

    # Signing key for JWTs. A random per-process key is used in development
    # only; tokens then stop working whenever the server restarts.
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.environ.get("JWT_ACCESS_MINUTES", "30")))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.environ.get("JWT_REFRESH_DAYS", "14")))

    CORS_ORIGINS = [o.strip() for o in os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]

    # Enables POST /api/auth/demo, which signs in as the seeded demo user
    # without a password. Leave off for any deployment holding real data.
    DEMO_LOGIN_ENABLED = os.environ.get("DEMO_LOGIN_ENABLED", "false").lower() == "true"

    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

    @classmethod
    def validate(cls):
        """Fail fast on unsafe production configuration."""
        if cls.APP_ENV == "production" and not cls.JWT_SECRET_KEY:
            raise RuntimeError("JWT_SECRET_KEY must be set when APP_ENV=production.")


class TestingConfig(Config):
    APP_ENV = "testing"
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    JWT_SECRET_KEY = "test-only-secret-key-at-least-32-bytes-long"
    DEMO_LOGIN_ENABLED = True
    GEMINI_API_KEY = None


def resolve_jwt_key(config):
    if not config.get("JWT_SECRET_KEY"):
        config["JWT_SECRET_KEY"] = secrets.token_urlsafe(48)
