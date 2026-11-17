"""Monthly per-category budgets compared against actual spending."""
from flask import request
from flask_restful import Resource
from sqlalchemy import func

from app.errors import ApiError
from app.extensions import db
from app.models import Budget, Category, Transaction
from app.resources.auth import current_user_id, login_required
from app.services.insights import month_bounds
from app.validation import json_body, parse_int, parse_month, parse_number


class BudgetListResource(Resource):
    method_decorators = [login_required]

    def get(self):
        month = parse_month(request.args.get("month"))
        start, end = month_bounds(month)
        actuals = dict(
            db.session.query(Transaction.category_id, func.sum(func.abs(Transaction.amount)))
            .filter(Transaction.user_id == current_user_id(), Transaction.date >= start, Transaction.date < end,
                    Transaction.amount < 0, Transaction.category_id.isnot(None),
                    Transaction.is_split_parent.is_(False))
            .group_by(Transaction.category_id).all()
        )
        budgets = (Budget.query.filter_by(user_id=current_user_id(), month=month)
                   .join(Category, Budget.category_id == Category.id).order_by(Category.name).all())
        result = []
        for budget in budgets:
            actual = actuals.get(budget.category_id, 0)
            result.append({
                "id": budget.id, "category_id": budget.category_id, "category_name": budget.category.name,
                "month": budget.month, "planned": round(budget.amount, 2), "actual": round(actual, 2),
                "variance": round(budget.amount - actual, 2),
                "pct_used": round(actual / budget.amount * 100, 1) if budget.amount else 0,
            })
        return result

    def post(self):
        """Create the budget for (category, month), or update it if it exists."""
        data = json_body()
        month = parse_month(data.get("month"))
        category_id = parse_int(data.get("category_id"), "category_id", minimum=1)
        amount = parse_number(data.get("amount"), "amount")
        if amount <= 0:
            raise ApiError("Budget amount must be greater than zero.")
        category = Category.query.filter_by(id=category_id, user_id=current_user_id()).first()
        if not category:
            raise ApiError("Category not found.", 404)
        if category.type != "expense":
            raise ApiError("Budgets can only be set for expense categories.")

        budget = Budget.query.filter_by(user_id=current_user_id(), category_id=category_id, month=month).first()
        status = 200
        if budget:
            budget.amount = amount
        else:
            budget = Budget(user_id=current_user_id(), category_id=category_id, month=month, amount=amount)
            db.session.add(budget)
            status = 201
        db.session.commit()
        return {"id": budget.id, "category_id": category_id, "month": month, "planned": budget.amount}, status


class BudgetResource(Resource):
    method_decorators = [login_required]

    def delete(self, budget_id):
        budget = Budget.query.filter_by(id=budget_id, user_id=current_user_id()).first()
        if not budget:
            raise ApiError("Budget not found.", 404)
        db.session.delete(budget)
        db.session.commit()
        return {"deleted": budget_id}
