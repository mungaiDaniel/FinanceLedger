"""Grounded Gemini integration for the "Ask Benny" feature.

Only aggregated figures (never raw transaction rows) are sent to the model.
"""
import json
import logging
from collections import defaultdict
from datetime import date, timedelta
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import current_app

from app.models import Transaction

log = logging.getLogger(__name__)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
SYSTEM_PROMPT = (
    "You are Benny, the financial assistant for Benny Ent Software. Answer only using the provided "
    "aggregated transaction data. Do not invent amounts or claim access to data not supplied. If the "
    "answer is unavailable, say so plainly. Use concise, helpful prose and US dollar (USD) formatting."
)


class AssistantUnavailable(Exception):
    """The assistant cannot answer (not configured, upstream error, ...)."""

    def __init__(self, message, status=503):
        super().__init__(message)
        self.status = status


def _months_back(start, count):
    for _ in range(count):
        start = (start - timedelta(days=1)).replace(day=1)
    return start


def build_finance_context(user_id):
    """Aggregate the current month and a three-month trend for one user."""
    month_start = date.today().replace(day=1)
    trend_start = _months_back(month_start, 2)
    transactions = Transaction.query.filter(
        Transaction.user_id == user_id, Transaction.date >= trend_start, Transaction.is_split_parent.is_(False)
    ).all()

    trend = defaultdict(lambda: {"income": 0.0, "expenses": 0.0})
    by_category = defaultdict(float)
    current = [t for t in transactions if t.date >= month_start]
    for t in transactions:
        trend[t.date.strftime("%Y-%m")]["income" if t.amount > 0 else "expenses"] += abs(t.amount)
    for t in current:
        if t.amount < 0:
            by_category[t.category.name if t.category else "Uncategorized"] += -t.amount

    income = sum(t.amount for t in current if t.amount > 0)
    expenses = sum(-t.amount for t in current if t.amount < 0)
    top_categories = sorted(by_category.items(), key=lambda item: item[1], reverse=True)[:20]
    return {
        "current_month": month_start.strftime("%Y-%m"),
        "summary": {"income": round(income, 2), "expenses": round(expenses, 2),
                    "net": round(income - expenses, 2), "transaction_count": len(current)},
        "expense_by_category": [{"category": name, "amount": round(amount, 2)} for name, amount in top_categories],
        "three_month_trend": [{"month": month, "income": round(v["income"], 2), "expenses": round(v["expenses"], 2)}
                              for month, v in sorted(trend.items())],
    }


def ask_ledger(question, user_id):
    key = current_app.config.get("GEMINI_API_KEY")
    if not key:
        raise AssistantUnavailable("Ask Benny is not configured. Set GEMINI_API_KEY on the server.")

    prompt = f"Financial context: {json.dumps(build_finance_context(user_id))}\n\nQuestion: {question}"
    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 500, "temperature": 0.2},
    }
    request = Request(GEMINI_URL, data=json.dumps(payload).encode("utf-8"), method="POST",
                      headers={"Content-Type": "application/json", "x-goog-api-key": key})
    try:
        with urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        log.warning("Gemini returned HTTP %s", error.code)
        if error.code in (401, 403):
            raise AssistantUnavailable("Gemini rejected the API key or project access.", 502) from error
        raise AssistantUnavailable("Gemini is temporarily unavailable. Please try again shortly.", 502) from error
    except URLError as error:
        raise AssistantUnavailable("Could not reach Gemini. Please try again shortly.", 502) from error

    try:
        return result["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as error:
        raise AssistantUnavailable("Gemini returned no answer. Please try a different question.", 502) from error
