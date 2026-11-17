from app.models import Category, Transaction, User
from tests.conftest import login, make_user


def category_id(name, username="alice"):
    user = User.query.filter_by(username=username).first()
    return Category.query.filter_by(user_id=user.id, name=name).first().id


def test_list_returns_paginated_newest_first(client, auth, sample_data):
    body = client.get("/api/transactions?per_page=2", headers=auth).get_json()
    assert body["total"] == 5 and body["pages"] == 3 and len(body["items"]) == 2
    assert body["items"][0]["description"] == "Mystery charge"
    assert body["items"][0]["category_name"] == "Uncategorized"


def test_list_filters_and_sorting(client, auth, sample_data):
    january = client.get("/api/transactions?start_date=2025-01-01&end_date=2025-01-31", headers=auth).get_json()
    assert january["total"] == 3
    searched = client.get("/api/transactions?search=salary", headers=auth).get_json()
    assert searched["total"] == 2
    by_cat = client.get(f"/api/transactions?category_id={category_id('Rent')}", headers=auth).get_json()
    assert [t["description"] for t in by_cat["items"]] == ["Rent January"]
    asc = client.get("/api/transactions?sort=amount&direction=asc", headers=auth).get_json()
    assert asc["items"][0]["amount"] == -1000.0


def test_list_rejects_bad_params(client, auth):
    for query in ("start_date=yesterday", "page=0", "per_page=100000", "page=abc", "sort=password",
                  "direction=sideways", "category_id=x", "start_date=2025-02-01&end_date=2025-01-01"):
        response = client.get(f"/api/transactions?{query}", headers=auth)
        assert response.status_code == 400, query
        assert "error" in response.get_json()


def test_patch_updates_category_and_allows_null(client, auth, sample_data):
    _, rows = sample_data
    mystery = rows[-1]
    response = client.patch(f"/api/transactions/{mystery.id}", headers=auth, json={"category_id": category_id("Groceries")})
    assert response.status_code == 200
    assert response.get_json()["category_name"] == "Groceries"
    cleared = client.patch(f"/api/transactions/{mystery.id}", headers=auth, json={"category_id": None})
    assert cleared.get_json()["category_name"] == "Uncategorized"


def test_patch_validation_and_not_found(client, auth, sample_data):
    _, rows = sample_data
    url = f"/api/transactions/{rows[0].id}"
    assert client.patch(url, headers=auth, json={}).status_code == 400
    assert client.patch(url, headers=auth, json={"category_id": "abc"}).status_code == 400
    assert client.patch(url, headers=auth, json={"category_id": 99999}).status_code == 404
    assert client.patch("/api/transactions/99999", headers=auth, json={"category_id": None}).status_code == 404


def test_delete_transaction(client, auth, sample_data):
    _, rows = sample_data
    assert client.delete(f"/api/transactions/{rows[0].id}", headers=auth).get_json() == {"deleted": rows[0].id}
    assert client.delete(f"/api/transactions/{rows[0].id}", headers=auth).status_code == 404


def test_users_cannot_touch_each_others_data(client, auth, sample_data):
    _, rows = sample_data
    make_user("mallory")
    mallory = login(client, "mallory")
    assert client.get("/api/transactions", headers=mallory).get_json()["total"] == 0
    assert client.delete(f"/api/transactions/{rows[0].id}", headers=mallory).status_code == 404
    foreign = category_id("Rent", "alice")
    mine = Transaction.query.filter_by(user_id=User.query.filter_by(username="mallory").first().id).count()
    assert mine == 0
    assert client.patch("/api/transactions/bulk", headers=mallory,
                        json={"transaction_ids": [rows[0].id], "category_id": foreign}).status_code == 404
    assert Transaction.query.count() == 5


def test_bulk_update_and_delete(client, auth, sample_data):
    _, rows = sample_data
    ids = [rows[2].id, rows[4].id]
    updated = client.patch("/api/transactions/bulk", headers=auth,
                           json={"transaction_ids": ids, "category_id": category_id("Groceries")})
    assert updated.get_json() == {"updated": 2}
    assert client.patch("/api/transactions/bulk", headers=auth, json={"transaction_ids": [], "category_id": None}).status_code == 400
    deleted = client.delete("/api/transactions/bulk", headers=auth, json={"transaction_ids": ids})
    assert deleted.get_json() == {"deleted": 2}
    assert client.delete("/api/transactions/bulk", headers=auth, json={"transaction_ids": ["x"]}).status_code == 400


def test_split_transaction(client, auth, sample_data):
    _, rows = sample_data
    rent = rows[1]  # -1000
    splits = [{"category_id": category_id("Rent"), "amount": -700}, {"category_id": category_id("Utilities"), "amount": -300}]
    response = client.post(f"/api/transactions/{rent.id}/split", headers=auth, json={"splits": splits})
    assert response.status_code == 201 and response.get_json()["children"] == 2
    listing = client.get("/api/transactions?per_page=50", headers=auth).get_json()
    descriptions = [t["description"] for t in listing["items"]]
    assert "Rent January" not in descriptions and "Rent January (split 1)" in descriptions
    # a split parent cannot be split again
    assert client.post(f"/api/transactions/{rent.id}/split", headers=auth, json={"splits": splits}).status_code == 404


def test_split_validation(client, auth, sample_data):
    _, rows = sample_data
    url = f"/api/transactions/{rows[1].id}/split"
    rent = category_id("Rent")
    assert client.post(url, headers=auth, json={"splits": [{"category_id": rent, "amount": -1000}]}).status_code == 400
    wrong_sum = [{"category_id": rent, "amount": -500}, {"category_id": rent, "amount": -400}]
    assert client.post(url, headers=auth, json={"splits": wrong_sum}).status_code == 400
    bad_cat = [{"category_id": 99999, "amount": -500}, {"category_id": rent, "amount": -500}]
    assert client.post(url, headers=auth, json={"splits": bad_cat}).status_code == 404
    assert client.post(url, headers=auth, json={"splits": ["x", "y"]}).status_code == 400
