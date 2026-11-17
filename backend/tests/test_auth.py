from flask_jwt_extended import create_access_token

from tests.conftest import login, make_user


def register(client, **overrides):
    body = {"username": "bob", "email": "bob@example.com", "password": "s3cret-pass!"}
    body.update(overrides)
    return client.post("/api/auth/register", json=body)


def test_health(client):
    assert client.get("/api/health").get_json() == {"status": "ok"}


def test_register_returns_tokens_and_seeds_categories(client):
    response = register(client)
    assert response.status_code == 201
    data = response.get_json()
    assert data["user"] == {"username": "bob", "email": "bob@example.com"}
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    categories = client.get("/api/categories", headers=headers).get_json()
    assert any(c["name"] == "Rent" for c in categories)


def test_register_validation(client):
    assert register(client, username="ab").status_code == 400
    assert register(client, email="not-an-email").status_code == 400
    assert register(client, password="short").status_code == 400
    assert client.post("/api/auth/register", data="garbage").status_code == 400


def test_register_duplicates_conflict(client):
    assert register(client).status_code == 201
    assert register(client, email="other@example.com").status_code == 409
    assert register(client, username="other").status_code == 409


def test_login_by_username_and_email(client):
    make_user()
    for identifier in ("alice", "ALICE@example.com"):
        response = client.post("/api/auth/login", json={"identifier": identifier, "password": "correct-horse-1"})
        assert response.status_code == 200
        assert {"access_token", "refresh_token", "user"} <= response.get_json().keys()


def test_login_rejects_bad_credentials(client):
    make_user()
    bad = client.post("/api/auth/login", json={"identifier": "alice", "password": "wrong"})
    assert bad.status_code == 401
    assert client.post("/api/auth/login", json={"identifier": "nobody", "password": "x"}).status_code == 401
    assert client.post("/api/auth/login", json={"identifier": "alice"}).status_code == 400


def test_me_requires_valid_token(client, auth):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401
    me = client.get("/api/auth/me", headers=auth)
    assert me.status_code == 200
    assert me.get_json()["username"] == "alice"


def test_protected_endpoints_return_json_401(client):
    for path in ("/api/transactions", "/api/categories", "/api/budgets?month=2025-01", "/api/insights?month=2025-01"):
        response = client.get(path)
        assert response.status_code == 401
        assert "error" in response.get_json()


def test_refresh_token_flow(client):
    make_user()
    tokens = client.post("/api/auth/login", json={"identifier": "alice", "password": "correct-horse-1"}).get_json()
    # An access token must not be accepted as a refresh token.
    assert client.post("/api/auth/refresh", headers={"Authorization": f"Bearer {tokens['access_token']}"}).status_code == 401
    fresh = client.post("/api/auth/refresh", headers={"Authorization": f"Bearer {tokens['refresh_token']}"})
    assert fresh.status_code == 200
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {fresh.get_json()['access_token']}"})
    assert me.status_code == 200


def test_refresh_token_cannot_call_api(client):
    make_user()
    tokens = client.post("/api/auth/login", json={"identifier": "alice", "password": "correct-horse-1"}).get_json()
    response = client.get("/api/transactions", headers={"Authorization": f"Bearer {tokens['refresh_token']}"})
    assert response.status_code == 401


def test_expired_token_is_rejected(app, client):
    from datetime import timedelta

    user = make_user()
    token = create_access_token(identity=str(user.id), expires_delta=timedelta(seconds=-1))
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "expired" in response.get_json()["error"].lower()


def test_demo_login_disabled_by_default_config(app, client):
    app.config["DEMO_LOGIN_ENABLED"] = False
    assert client.post("/api/auth/demo").status_code == 404


def test_demo_login_needs_seeded_user_then_works(app, client):
    assert client.post("/api/auth/demo").status_code == 503
    from app.cli import get_or_create_demo_user

    get_or_create_demo_user()
    response = client.post("/api/auth/demo")
    assert response.status_code == 200
    assert response.get_json()["user"]["email"] == "demo@example.com"


def test_unknown_route_is_json_404(client):
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert "error" in response.get_json()


def test_login_helper_roundtrip(client):
    make_user("carol")
    assert "Authorization" in login(client, "carol")
