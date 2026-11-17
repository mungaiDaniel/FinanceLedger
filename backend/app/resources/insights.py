from flask import request
from flask_restful import Resource

from app.models import Budget, Transaction
from app.resources.auth import current_user_id, login_required
from app.services.insights import build_insights, month_bounds


class InsightsResource(Resource):
    method_decorators = [login_required]

    def get(self):
        month = request.args.get("month")
        try:
            start, end = month_bounds(month)
        except (TypeError, ValueError):
            return {"error": "month is required in YYYY-MM format."}, 400
        transactions = Transaction.query.filter(Transaction.user_id == current_user_id(), Transaction.date < end, Transaction.is_split_parent.is_(False)).order_by(Transaction.date.desc()).all()
        budgets = Budget.query.filter_by(user_id=current_user_id(), month=month).all()
        return build_insights(transactions, budgets, month)
