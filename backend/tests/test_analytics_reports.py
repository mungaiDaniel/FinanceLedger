import io
from datetime import date

from openpyxl import load_workbook

from app.models import Budget
from app.extensions import db
from tests.test_transactions import category_id


def test_summary(client, auth, sample_data):
    body = client.get("/api/analytics/summary", headers=auth).get_json()
    assert body == {"total_income": 6000.0, "total_expense": 1100.0, "net": 4900.0,
                    "savings_rate_pct": 81.7, "transaction_count": 5}
    january = client.get("/api/analytics/summary?start_date=2025-01-01&end_date=2025-01-31", headers=auth).get_json()
    assert january["total_expense"] == 1040.0


def test_summary_empty_has_zero_savings_rate(client, auth):
    assert client.get("/api/analytics/summary", headers=auth).get_json()["savings_rate_pct"] == 0


def test_by_category_includes_uncategorized(client, auth, sample_data):
    data = client.get("/api/analytics/by-category", headers=auth).get_json()
    assert data[0] == {"category": "Rent", "total": 1000.0}
    assert {"category": "Uncategorized", "total": 60.0} in data
    assert all(row["category"] != "Salaries" for row in data)  # income is excluded


def test_trend_is_monthly(client, auth, sample_data):
    data = client.get("/api/analytics/trend", headers=auth).get_json()
    assert [row["month"] for row in data] == ["2025-01", "2025-02"]
    assert data[0] == {"month": "2025-01", "income": 3000.0, "expense": 1040.0, "net": 1960.0}


def test_analytics_reject_bad_dates(client, auth):
    assert client.get("/api/analytics/summary?start_date=oops", headers=auth).status_code == 400


def test_csv_export(client, auth, sample_data):
    response = client.get("/api/reports/transactions?format=csv&start=2025-02-01", headers=auth)
    assert response.status_code == 200 and response.mimetype == "text/csv"
    lines = response.get_data(as_text=True).strip().splitlines()
    assert lines[0] == "Date,Description,Amount,Category" and len(lines) == 3


def test_xlsx_export(client, auth, sample_data):
    response = client.get("/api/reports/transactions?format=xlsx", headers=auth)
    assert response.status_code == 200
    sheet = load_workbook(io.BytesIO(response.data)).active
    assert sheet.max_row == 6


def test_export_validation(client, auth):
    assert client.get("/api/reports/transactions?format=pdf", headers=auth).status_code == 400
    assert client.get("/api/reports/transactions?start=bad", headers=auth).status_code == 400


def test_monthly_pdf(client, auth, sample_data):
    response = client.get("/api/reports/monthly-summary?month=2025-01", headers=auth)
    assert response.status_code == 200 and response.mimetype == "application/pdf"
    assert response.data.startswith(b"%PDF-1.4") and b"Income: $3,000.00" in response.data
    assert client.get("/api/reports/monthly-summary", headers=auth).status_code == 400


def test_insights_flags_over_budget(client, auth, sample_data):
    user, _ = sample_data
    db.session.add(Budget(user_id=user.id, category_id=category_id("Rent"), month="2025-01", amount=500))
    db.session.commit()
    insights = client.get("/api/insights?month=2025-01", headers=auth).get_json()
    assert any(i["type"] == "over_budget" and i["category"] == "Rent" for i in insights)
    assert client.get("/api/insights", headers=auth).status_code == 400


def test_ask_requires_configuration_and_valid_question(client, auth):
    assert client.post("/api/ai/ask", headers=auth, json={"question": "How am I doing?"}).status_code == 503
    assert client.post("/api/ai/ask", headers=auth, json={"question": "  "}).status_code == 400
    assert client.post("/api/ai/ask", headers=auth, json={"question": "x" * 1001}).status_code == 400


def test_ask_returns_model_answer(app, client, auth, monkeypatch):
    app.config["GEMINI_API_KEY"] = "fake"
    monkeypatch.setattr("app.resources.ai.ask_ledger", lambda question, user_id: "You spent a lot on rent.")
    response = client.post("/api/ai/ask", headers=auth, json={"question": "Where does my money go?"})
    assert response.get_json() == {"answer": "You spent a lot on rent."}


def test_finance_context_is_aggregated(app, sample_data):
    from app.services.ai_assistant import build_finance_context

    user, _ = sample_data
    context = build_finance_context(user.id)
    assert set(context) == {"current_month", "summary", "expense_by_category", "three_month_trend"}
    assert context["current_month"] == date.today().strftime("%Y-%m")
