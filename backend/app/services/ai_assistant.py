"""Grounded Gemini integration for Benny Ent Software's Ask Benny feature."""
import json
import os
from datetime import date, timedelta
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sqlalchemy import case, func

from app.models import Category, Transaction, db


def build_finance_context(user_id):
    """Return bounded, aggregated financial context for the AI model."""
    current_start = date.today().replace(day=1)
    three_month_start = current_start
    for _ in range(2):
        three_month_start = (three_month_start - timedelta(days=1)).replace(day=1)
    current = Transaction.query.filter(Transaction.user_id == user_id, Transaction.date >= current_start, Transaction.is_split_parent.is_(False)).all()
    income = round(sum(item.amount for item in current if item.amount > 0), 2)
    expense = round(sum(-item.amount for item in current if item.amount < 0), 2)
    by_category = db.session.query(Category.name, func.sum(func.abs(Transaction.amount))).join(Transaction).filter(Category.user_id == user_id, Transaction.user_id == user_id, Transaction.date >= current_start, Transaction.amount < 0, Transaction.is_split_parent.is_(False)).group_by(Category.name).order_by(func.sum(func.abs(Transaction.amount)).desc()).limit(20).all()
    trend = db.session.query(func.to_char(Transaction.date, "YYYY-MM"), func.sum(case((Transaction.amount > 0, Transaction.amount), else_=0)), func.sum(case((Transaction.amount < 0, -Transaction.amount), else_=0))).filter(Transaction.user_id == user_id, Transaction.date >= three_month_start, Transaction.is_split_parent.is_(False)).group_by(func.to_char(Transaction.date, "YYYY-MM")).order_by(func.to_char(Transaction.date, "YYYY-MM")).all()
    return {"current_month": current_start.strftime("%Y-%m"), "summary": {"income": income, "expenses": expense, "net": round(income - expense, 2), "transaction_count": len(current)}, "expense_by_category": [{"category": name, "amount": round(float(amount), 2)} for name, amount in by_category], "three_month_trend": [{"month": month, "income": round(float(income or 0), 2), "expenses": round(float(expenses or 0), 2)} for month, income, expenses in trend]}


def ask_ledger(question, user_id):
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise ValueError("Ask Benny is not configured. Set GEMINI_API_KEY in the backend environment and restart it.")
    prompt = f"Financial context: {json.dumps(build_finance_context(user_id))}\n\nQuestion: {question}"
    payload = {"systemInstruction": {"parts": [{"text": "You are Benny, the financial assistant for Benny Ent Software. Answer only using the provided aggregated transaction data. Do not invent amounts or claim access to data not supplied. If the answer is unavailable, say so plainly. Use concise, helpful prose and US dollar (USD) formatting."}]}, "contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": {"maxOutputTokens": 500, "temperature": 0.2}}
    request = Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json", "x-goog-api-key": key}, method="POST")
    try:
        with urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace").lower()
        if "project has been denied access" in error_body:
            raise ValueError("Gemini access is denied for this Google project. Create a Gemini API key in another eligible Google AI Studio project, or contact Google AI Studio support for this project.") from error
        if error.code == 401:
            raise ValueError("Gemini rejected the API key. Check GEMINI_API_KEY and try again.") from error
        if error.code == 403:
            raise ValueError("Gemini access is forbidden for this project or key. Check the project and key restrictions in Google AI Studio.") from error
        raise ValueError("Gemini is temporarily unavailable. Please try again shortly.") from error
    except URLError as error:
        raise ValueError("Couldn't reach Gemini. Check your internet connection and try again.") from error
    try:
        return result["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as error:
        raise ValueError("Gemini returned no answer. Please try a different question.") from error
