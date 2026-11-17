from tests.test_transactions import category_id


def test_list_and_create_category(client, auth):
    names = [c["name"] for c in client.get("/api/categories", headers=auth).get_json()]
    assert names == sorted(names) and "Rent" in names
    created = client.post("/api/categories", headers=auth, json={"name": "Pets", "type": "expense"})
    assert created.status_code == 201 and created.get_json()["name"] == "Pets"


def test_create_category_validation(client, auth):
    assert client.post("/api/categories", headers=auth, json={"name": "Rent"}).status_code == 409
    assert client.post("/api/categories", headers=auth, json={"name": ""}).status_code == 400
    assert client.post("/api/categories", headers=auth, json={"name": "x" * 101}).status_code == 400
    assert client.post("/api/categories", headers=auth, json={"name": "Odd", "type": "banana"}).status_code == 400


def test_category_rules(client, auth):
    created = client.post("/api/categories/rules", headers=auth,
                          json={"keyword": "Costco", "category_id": category_id("Groceries")})
    assert created.status_code == 201
    assert created.get_json()["category_name"] == "Groceries"
    keywords = [r["keyword"] for r in client.get("/api/categories/rules", headers=auth).get_json()]
    assert "Costco" in keywords
    assert client.post("/api/categories/rules", headers=auth, json={"keyword": "x", "category_id": 9999}).status_code == 404
    assert client.post("/api/categories/rules", headers=auth, json={"category_id": 1}).status_code == 400


def test_budget_lifecycle_with_actuals(client, auth, sample_data):
    rent = category_id("Rent")
    created = client.post("/api/budgets", headers=auth, json={"category_id": rent, "month": "2025-01", "amount": 800})
    assert created.status_code == 201
    updated = client.post("/api/budgets", headers=auth, json={"category_id": rent, "month": "2025-01", "amount": 1200})
    assert updated.status_code == 200 and updated.get_json()["planned"] == 1200

    budgets = client.get("/api/budgets?month=2025-01", headers=auth).get_json()
    assert len(budgets) == 1
    assert budgets[0]["actual"] == 1000 and budgets[0]["variance"] == 200 and budgets[0]["pct_used"] == 83.3
    assert client.get("/api/budgets?month=2025-02", headers=auth).get_json() == []

    assert client.delete(f"/api/budgets/{budgets[0]['id']}", headers=auth).status_code == 200
    assert client.delete(f"/api/budgets/{budgets[0]['id']}", headers=auth).status_code == 404


def test_budget_validation(client, auth):
    rent, salaries = category_id("Rent"), category_id("Salaries")
    post = lambda **body: client.post("/api/budgets", headers=auth, json=body).status_code  # noqa: E731
    assert post(category_id=rent, month="2025-13", amount=5) == 400
    assert post(category_id=rent, month="2025-01", amount=0) == 400
    assert post(category_id=rent, month="2025-01", amount="lots") == 400
    assert post(category_id=salaries, month="2025-01", amount=5) == 400  # income category
    assert post(category_id=9999, month="2025-01", amount=5) == 404
    assert client.get("/api/budgets", headers=auth).status_code == 400
