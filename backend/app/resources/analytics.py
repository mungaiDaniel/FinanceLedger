from datetime import datetime
from flask import request
from flask_restful import Resource
from sqlalchemy import func, case

from app.models import db, Transaction, Category
from app.resources.auth import current_user_id, login_required


def _date_filters(query):
    start = request.args.get("start_date")
    end = request.args.get("end_date")
    if start:
        query = query.filter(Transaction.date >= datetime.strptime(start, "%Y-%m-%d").date())
    if end:
        query = query.filter(Transaction.date <= datetime.strptime(end, "%Y-%m-%d").date())
    return query


class SummaryResource(Resource):
    method_decorators = [login_required]
    def get(self):
        query = _date_filters(Transaction.query.filter_by(user_id=current_user_id(), is_split_parent=False))
        transactions = query.all()

        income = sum(t.amount for t in transactions if t.amount > 0)
        expense = sum(-t.amount for t in transactions if t.amount < 0)
        net = income - expense
        savings_rate = (net / income * 100) if income > 0 else 0

        return {
            "total_income": round(income, 2),
            "total_expense": round(expense, 2),
            "net": round(net, 2),
            "savings_rate_pct": round(savings_rate, 1),
            "transaction_count": len(transactions),
        }


class ByCategoryResource(Resource):
    method_decorators = [login_required]
    def get(self):
        query = (
            db.session.query(
                Category.name,
                func.sum(func.abs(Transaction.amount)).label("total"),
            )
            .join(Transaction, Transaction.category_id == Category.id)
            .filter(Category.user_id == current_user_id(), Transaction.user_id == current_user_id(), Transaction.amount < 0, Transaction.is_split_parent.is_(False))
        )
        query = _date_filters(query)
        results = query.group_by(Category.name).order_by(func.sum(func.abs(Transaction.amount)).desc()).all()

        # Uncategorized (category_id is NULL)
        uncategorized_query = _date_filters(
            db.session.query(func.sum(func.abs(Transaction.amount))).filter(
                Transaction.user_id == current_user_id(), Transaction.category_id.is_(None), Transaction.amount < 0, Transaction.is_split_parent.is_(False)
            )
        )
        uncategorized_total = uncategorized_query.scalar() or 0

        data = [{"category": name, "total": round(total, 2)} for name, total in results]
        if uncategorized_total > 0:
            data.append({"category": "Uncategorized", "total": round(uncategorized_total, 2)})

        return data


class TrendResource(Resource):
    method_decorators = [login_required]
    def get(self):
        # PostgreSQL month bucketing; the frontend expects YYYY-MM strings.
        income_expr = func.sum(case((Transaction.amount > 0, Transaction.amount), else_=0))
        expense_expr = func.sum(case((Transaction.amount < 0, -Transaction.amount), else_=0))

        q = db.session.query(
            func.to_char(Transaction.date, "YYYY-MM").label("month"),
            income_expr.label("income"),
            expense_expr.label("expense"),
        )
        q = _date_filters(q.filter(Transaction.user_id == current_user_id(), Transaction.is_split_parent.is_(False)))
        results = q.group_by("month").order_by("month").all()

        return [
            {
                "month": month,
                "income": round(income or 0, 2),
                "expense": round(expense or 0, 2),
                "net": round((income or 0) - (expense or 0), 2),
            }
            for month, income, expense in results
        ]
