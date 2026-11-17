import io
from datetime import date

import pandas as pd
import pytest

from app.models import Transaction
from app.services import parser
from app.services.categorizer import categorize
from app.services.dedupe import make_hash

CSV = (
    "Date,Description,Amount\n"
    "2025-03-01,Uber trip,-12.50\n"
    "2025-03-02,Salary March,2500\n"
    "2025-03-03,Unknown shop,-9.99\n"
)


def upload(client, auth, content=CSV, name="statement.csv"):
    data = {"file": (io.BytesIO(content.encode()), name)}
    return client.post("/api/upload", headers=auth, data=data, content_type="multipart/form-data")


def test_upload_inserts_categorises_and_dedupes(client, auth):
    first = upload(client, auth)
    assert first.status_code == 201
    assert first.get_json() == {"rows_seen": 3, "inserted": 3, "duplicates_skipped": 0}
    listing = client.get("/api/transactions", headers=auth).get_json()["items"]
    by_desc = {t["description"]: t["category_name"] for t in listing}
    assert by_desc == {"Uber trip": "Transport", "Salary March": "Salaries", "Unknown shop": "Uncategorized"}

    again = upload(client, auth).get_json()
    assert again["inserted"] == 0 and again["duplicates_skipped"] == 3
    assert Transaction.query.count() == 3


def test_upload_debit_credit_columns(client, auth):
    content = "Date,Narrative,Debit,Credit\n01/04/2025,Rent,800,\n02/04/2025,Refund,,50\n"
    assert upload(client, auth, content).get_json()["inserted"] == 2
    amounts = sorted(t["amount"] for t in client.get("/api/transactions", headers=auth).get_json()["items"])
    assert amounts == [-800.0, 50.0]


def test_upload_rejects_bad_input(client, auth):
    assert client.post("/api/upload", headers=auth).status_code == 400
    assert upload(client, auth, name="notes.txt").status_code == 400
    assert upload(client, auth, "just,some\nrandom,cells\n").status_code == 400
    assert upload(client, auth, "", "empty.csv").status_code == 400


def test_upload_requires_auth(client):
    response = client.post("/api/upload", data={"file": (io.BytesIO(b"a"), "a.csv")}, content_type="multipart/form-data")
    assert response.status_code == 401


def test_parser_date_formats():
    df = pd.DataFrame({"Date": ["2025-03-04", "04/03/2025"], "Description": ["a", "b"], "Amount": [1, 2]})
    result = parser.detect_and_normalize(df)
    assert list(result["date"]) == [date(2025, 3, 4), date(2025, 3, 4)]  # ISO as-is, DD/MM/YYYY day-first


def test_parser_errors():
    with pytest.raises(parser.ParseError):
        parser.detect_and_normalize(pd.DataFrame({"Foo": [1], "Bar": [2]}))
    with pytest.raises(parser.ParseError):
        parser.read_file(io.BytesIO(b""), "x.pdf")


def test_dedupe_hash_is_stable_and_case_insensitive():
    assert make_hash("2025-01-01", " Coffee ", 3.0) == make_hash("2025-01-01", "coffee", 3.001)
    assert make_hash("2025-01-01", "coffee", 3.0) != make_hash("2025-01-02", "coffee", 3.0)


def test_categorize_matches_substring_case_insensitively():
    class Rule:
        def __init__(self, keyword, category_id):
            self.keyword, self.category_id = keyword, category_id

    rules = [Rule("uber", 1), Rule("rent", 2)]
    assert categorize("UBER *TRIP", rules) == 1
    assert categorize("Monthly Rent", rules) == 2
    assert categorize("Cinema", rules) is None


def test_create_user_cli(app):
    runner = app.test_cli_runner()
    result = runner.invoke(args=["create-user", "dave", "dave@example.com"], input="password123\npassword123\n")
    assert result.exit_code == 0 and "Created user" in result.output
    again = runner.invoke(args=["create-user", "dave", "dave@example.com"], input="password123\npassword123\n")
    assert again.exit_code != 0


def test_seed_demo_cli_is_idempotent(app):
    runner = app.test_cli_runner()
    assert runner.invoke(args=["seed-demo"]).exit_code == 0
    count = Transaction.query.count()
    assert count > 0
    assert runner.invoke(args=["seed-demo"]).exit_code == 0
    assert Transaction.query.count() == count
