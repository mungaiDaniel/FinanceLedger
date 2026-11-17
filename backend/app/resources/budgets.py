from datetime import datetime

from flask import request
from flask_restful import Resource
from sqlalchemy import func

from app.models import Budget, Category, Transaction, db
from app.resources.auth import current_user_id, login_required
from app.services.insights import month_bounds


def _month_from_request():
    month = request.args.get("month") or (request.get_json(silent=True) or {}).get("month")
    if not month:
        raise ValueError("month is required in YYYY-MM format.")
    try:
        month_bounds(month)
    except (TypeError, ValueError):
        raise ValueError("month must use YYYY-MM format.")
    return month


class BudgetListResource(Resource):
    method_decorators = [login_required]

    def get(self):
        try:
            month = _month_from_request()
        except ValueError as error:
            return {"error": str(error)}, 400
        start, end = month_bounds(month)
        actuals = dict(
            db.session.query(Transaction.category_id, func.sum(func.abs(Transaction.amount)))
            .filter(Transaction.user_id == current_user_id(), Transaction.date >= start, Transaction.date < end, Transaction.amount < 0, Transaction.category_id.isnot(None), Transaction.is_split_parent.is_(False))
            .group_by(Transaction.category_id).all()
        )
        budgets = Budget.query.filter_by(user_id=current_user_id(), month=month).join(Category).order_by(Category.name).all()
        return [{
            "id": budget.id, "category_id": budget.category_id, "category_name": budget.category.name,
            "month": budget.month, "planned": round(budget.amount, 2),
            "actual": round(actuals.get(budget.category_id, 0), 2),
            "variance": round(budget.amount - actuals.get(budget.category_id, 0), 2),
            "pct_used": round((actuals.get(budget.category_id, 0) / budget.amount) * 100, 1) if budget.amount else 0,
        } for budget in budgets]

    def post(self):
        data = request.get_json(silent=True) or {}
        try:
            month = _month_from_request()
            category_id = int(data.get("category_id"))
            amount = float(data.get("amount"))
        except (TypeError, ValueError):
            return {"error": "category_id, month, and a positive amount are required."}, 400
        if amount <= 0:
            return {"error": "Budget amount must be greater than zero."}, 400
        category = Category.query.filter_by(id=category_id, user_id=current_user_id()).first()
        if not category:
            return {"error": "category_id does not exist."}, 400
        if category.type != "expense":
            return {"error": "Budgets can only be set for expense categories."}, 400
        budget = Budget.query.filter_by(user_id=current_user_id(), category_id=category_id, month=month).first()
        if budget:
            budget.amount = amount
        else:
            budget = Budget(user_id=current_user_id(), category_id=category_id, month=month, amount=amount)
            db.session.add(budget)
        db.session.commit()
        return {"id": budget.id, "category_id": category_id, "month": month, "planned": budget.amount}, 201


class BudgetResource(Resource):
    method_decorators = [login_required]

    def delete(self, budget_id):
        budget = Budget.query.filter_by(id=budget_id, user_id=current_user_id()).first()
        if not budget:
            return {"error": "Budget not found."}, 404
        db.session.delete(budget)
        db.session.commit()
        return {"deleted": budget_id}
