from datetime import date

import pytest

from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.models import Category, Transaction, User
from app.services.dedupe import make_hash
from app.services.workspace import seed_default_workspace


@pytest.fixture(autouse=True)
def fast_password_hashing(monkeypatch):
    """scrypt is deliberately slow; use a cheap hash so the suite stays quick."""
    from functools import partial

    from werkzeug.security import generate_password_hash

    monkeypatch.setattr("app.models.generate_password_hash", partial(generate_password_hash, method="pbkdf2:sha256:1"))


@pytest.fixture()
def app():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def make_user(username="alice", email=None, password="correct-horse-1"):
    user = User(username=username, email=email or f"{username}@example.com")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    seed_default_workspace(user.id)
    return user


def login(client, username="alice", password="correct-horse-1"):
    response = client.post("/api/auth/login", json={"identifier": username, "password": password})
    assert response.status_code == 200, response.get_json()
    return {"Authorization": f"Bearer {response.get_json()['access_token']}"}


@pytest.fixture()
def auth(client):
    """Headers for a freshly created user ('alice') with the default categories."""
    make_user()
    return login(client)


def add_transaction(user_id, when, description, amount, category_name=None):
    category = Category.query.filter_by(user_id=user_id, name=category_name).first() if category_name else None
    txn = Transaction(
        user_id=user_id, date=when, description=description, amount=amount,
        category_id=category.id if category else None,
        dedupe_hash=make_hash(when.isoformat(), description, amount),
    )
    db.session.add(txn)
    db.session.commit()
    return txn


@pytest.fixture()
def sample_data(auth):
    """Alice's transactions across two months; returns the user and rows."""
    user = User.query.filter_by(username="alice").first()
    rows = [
        add_transaction(user.id, date(2025, 1, 1), "Salary January", 3000.0, "Salaries"),
        add_transaction(user.id, date(2025, 1, 5), "Rent January", -1000.0, "Rent"),
        add_transaction(user.id, date(2025, 1, 9), "Uber ride", -40.0, "Transport"),
        add_transaction(user.id, date(2025, 2, 1), "Salary February", 3000.0, "Salaries"),
        add_transaction(user.id, date(2025, 2, 7), "Mystery charge", -60.0),
    ]
    return user, rows
