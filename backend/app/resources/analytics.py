"""Aggregate analytics. Queries are database-portable (PostgreSQL and SQLite)."""
from flask_restful import Resource
from sqlalchemy import case, func

from app.extensions import db
from app.models import Category, Transaction
from app.resources.auth import current_user_id, login_required
from app.validation import apply_date_range, date_range


def _user_transactions():
    return Transaction.query.filter_by(user_id=current_user_id(), is_split_parent=False)


class SummaryResource(Resource):
    method_decorators = [login_required]

    def get(self):
        start, end = date_range()
        transactions = apply_date_range(_user_transactions(), Transaction.date, start, end).all()
        income = sum(t.amount for t in transactions if t.amount > 0)
        expense = sum(-t.amount for t in transactions if t.amount < 0)
        net = income - expense
        return {
            "total_income": round(income, 2),
            "total_expense": round(expense, 2),
            "net": round(net, 2),
            "savings_rate_pct": round(net / income * 100, 1) if income > 0 else 0,
            "transaction_count": len(transactions),
        }


class ByCategoryResource(Resource):
    method_decorators = [login_required]

    def get(self):
        start, end = date_range()
        spent = func.sum(func.abs(Transaction.amount))
        query = (
            db.session.query(func.coalesce(Category.name, "Uncategorized"), spent)
            .select_from(Transaction)
            .outerjoin(Category, Transaction.category_id == Category.id)
            .filter(Transaction.user_id == current_user_id(), Transaction.amount < 0,
                    Transaction.is_split_parent.is_(False))
        )
        query = apply_date_range(query, Transaction.date, start, end)
        rows = query.group_by(func.coalesce(Category.name, "Uncategorized")).order_by(spent.desc()).all()
        return [{"category": name, "total": round(total, 2)} for name, total in rows]


class TrendResource(Resource):
    method_decorators = [login_required]

    def get(self):
        start, end = date_range()
        year, month = func.extract("year", Transaction.date), func.extract("month", Transaction.date)
        query = db.session.query(
            year, month,
            func.sum(case((Transaction.amount > 0, Transaction.amount), else_=0)),
            func.sum(case((Transaction.amount < 0, -Transaction.amount), else_=0)),
        ).filter(Transaction.user_id == current_user_id(), Transaction.is_split_parent.is_(False))
        query = apply_date_range(query, Transaction.date, start, end)
        rows = query.group_by(year, month).order_by(year, month).all()
        return [
            {"month": f"{int(y):04d}-{int(m):02d}", "income": round(inc or 0, 2),
             "expense": round(exp or 0, 2), "net": round((inc or 0) - (exp or 0), 2)}
            for y, m, inc, exp in rows
        ]
