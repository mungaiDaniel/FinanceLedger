"""Authentication: registration, login, token refresh and the demo account.

Stateless JWT auth. Clients send ``Authorization: Bearer <access_token>`` and
exchange the long-lived refresh token at ``/auth/refresh`` when it expires.
"""
from functools import wraps

from flask import current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, get_jwt_identity, verify_jwt_in_request,
)
from flask_jwt_extended.exceptions import JWTExtendedException
from flask_restful import Resource
from jwt.exceptions import ExpiredSignatureError, PyJWTError
from sqlalchemy import or_

from app.errors import ApiError
from app.extensions import db
from app.models import User
from app.services.workspace import seed_default_workspace
from app.validation import json_body, require_string, valid_email


def current_user_id():
    return int(get_jwt_identity())


def _token_guard(refresh):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            try:
                verify_jwt_in_request(refresh=refresh)
            except ExpiredSignatureError:
                raise ApiError("Token has expired.", 401)
            except (JWTExtendedException, PyJWTError):
                raise ApiError("Authentication required.", 401)
            return view(*args, **kwargs)

        return wrapped

    return decorator


#: Require a valid access token; any failure becomes a JSON 401.
login_required = _token_guard(refresh=False)
#: Require a valid refresh token (used only by /auth/refresh).
refresh_required = _token_guard(refresh=True)


def _token_response(user, status=200):
    identity = str(user.id)
    body = {
        "access_token": create_access_token(identity=identity),
        "refresh_token": create_refresh_token(identity=identity),
        "user": user.to_dict(),
    }
    return body, status


class RegisterResource(Resource):
    def post(self):
        data = json_body()
        username = require_string(data, "username", 80, min_length=3)
        email = (data.get("email") or "").strip().lower() if isinstance(data.get("email"), str) else ""
        password = data.get("password")
        if not valid_email(email):
            raise ApiError("Enter a valid email address.")
        if not isinstance(password, str) or not (8 <= len(password) <= 128):
            raise ApiError("Password must be between 8 and 128 characters.")
        if User.query.filter_by(username=username).first():
            raise ApiError("That username is already in use.", 409)
        if User.query.filter_by(email=email).first():
            raise ApiError("That email address is already in use.", 409)

        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        seed_default_workspace(user.id)
        return _token_response(user, 201)


class LoginResource(Resource):
    def post(self):
        data = json_body()
        identifier = data.get("identifier") or data.get("username")
        password = data.get("password")
        if not isinstance(identifier, str) or not isinstance(password, str) or not identifier.strip():
            raise ApiError("Username/email and password are required.")
        identifier = identifier.strip()
        user = User.query.filter(or_(User.username == identifier, User.email == identifier.lower())).first()
        if not user or not user.check_password(password):
            raise ApiError("Invalid username or password.", 401)
        return _token_response(user)


class RefreshResource(Resource):
    method_decorators = [refresh_required]

    def post(self):
        user = db.session.get(User, int(get_jwt_identity()))
        if not user:
            raise ApiError("Authentication required.", 401)
        return {"access_token": create_access_token(identity=str(user.id))}


class DemoLoginResource(Resource):
    def post(self):
        if not current_app.config["DEMO_LOGIN_ENABLED"]:
            raise ApiError("Demo login is disabled on this server.", 404)
        user = User.query.filter_by(username="demo").first()
        if not user:
            raise ApiError("Demo account is not set up. Run `flask --app run seed-demo`.", 503)
        return _token_response(user)


class CurrentUserResource(Resource):
    method_decorators = [login_required]

    def get(self):
        user = db.session.get(User, current_user_id())
        if not user:
            raise ApiError("Authentication required.", 401)
        return user.to_dict()
