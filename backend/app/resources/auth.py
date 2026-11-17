from functools import wraps

from flask import current_app, request, session
from flask_restful import Resource
from sqlalchemy import or_

from app.models import User, db
from app.services.workspace import seed_default_workspace


def current_user_id():
    return session["user_id"]


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return {"error": "Authentication required."}, 401
        return view(*args, **kwargs)

    return wrapped


class LoginResource(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        identifier = (data.get("identifier") or data.get("username") or "").strip()
        password = data.get("password") or ""
        user = User.query.filter(or_(User.username == identifier, User.email == identifier.lower())).first()
        if not user or not user.check_password(password):
            return {"error": "Invalid username or password."}, 401

        session.clear()
        session["user_id"] = user.id
        return {"username": user.username}


class RegisterResource(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        username = (data.get("username") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if len(username) < 3 or len(username) > 80:
            return {"error": "Username must be between 3 and 80 characters."}, 400
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            return {"error": "Enter a valid email address."}, 400
        if len(password) < 8:
            return {"error": "Password must be at least 8 characters."}, 400
        if User.query.filter_by(username=username).first():
            return {"error": "That username is already in use."}, 409
        if User.query.filter_by(email=email).first():
            return {"error": "That email address is already in use."}, 409

        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        seed_default_workspace(user.id)

        session.clear()
        session["user_id"] = user.id
        return {"username": user.username, "email": user.email}, 201


class DemoLoginResource(Resource):
    def post(self):
        user = User.query.filter_by(username="demo").first()
        if not user:
            return {"error": "Demo account is unavailable."}, 503
        session.clear()
        session["user_id"] = user.id
        return {"username": user.username, "email": user.email, "demo": True}


class LogoutResource(Resource):
    def post(self):
        session.clear()
        return {"message": "Logged out."}


class CurrentUserResource(Resource):
    def get(self):
        user_id = session.get("user_id")
        if not user_id:
            return {"error": "Not authenticated."}, 401
        user = db.session.get(User, user_id)
        if not user:
            session.clear()
            return {"error": "Not authenticated."}, 401
        return {"username": user.username, "email": user.email}
