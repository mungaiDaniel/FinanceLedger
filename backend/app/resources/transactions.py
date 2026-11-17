from datetime import datetime
from hashlib import sha256
from flask import request
from flask_restful import Resource

from app.models import db, Category, Transaction
from app.resources.auth import current_user_id, login_required


def _apply_filters(query):
    start = request.args.get("start_date")
    end = request.args.get("end_date")
    category_id = request.args.get("category_id")
    search = (request.args.get("search") or "").strip()

    if start:
        query = query.filter(Transaction.date >= datetime.strptime(start, "%Y-%m-%d").date())
    if end:
        query = query.filter(Transaction.date <= datetime.strptime(end, "%Y-%m-%d").date())
    if category_id:
        query = query.filter(Transaction.category_id == int(category_id))
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))

    return query


class TransactionListResource(Resource):
    method_decorators = [login_required]
    def get(self):
        query = Transaction.query.filter_by(user_id=current_user_id(), is_split_parent=False)
        query = _apply_filters(query)
        sort_by = request.args.get("sort", "date")
        direction = request.args.get("direction", "desc")
        columns = {"date": Transaction.date, "amount": Transaction.amount, "category": Transaction.category_id}
        column = columns.get(sort_by, Transaction.date)
        query = query.order_by(column.asc() if direction == "asc" else column.desc(), Transaction.id.desc())

        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        return {
            "items": [t.to_dict() for t in paginated.items],
            "total": paginated.total,
            "page": page,
            "per_page": per_page,
            "pages": paginated.pages,
        }


class TransactionResource(Resource):
    method_decorators = [login_required]
    def patch(self, transaction_id):
        txn = Transaction.query.filter_by(id=transaction_id, user_id=current_user_id()).first()
        if not txn:
            return {"error": "Transaction not found."}, 404

        data = request.get_json(silent=True) or {}
        if "category_id" in data:
            category_id = data["category_id"]
            if category_id is not None:
                try:
                    category_id = int(category_id)
                except (TypeError, ValueError):
                    return {"error": "category_id must be a number or null."}, 400
                if not Category.query.filter_by(id=category_id, user_id=current_user_id()).first():
                    return {"error": "Category not found."}, 404
            txn.category_id = category_id

        db.session.commit()
        return txn.to_dict()

    def delete(self, transaction_id):
        txn = Transaction.query.filter_by(id=transaction_id, user_id=current_user_id()).first()
        if not txn:
            return {"error": "Transaction not found."}, 404
        db.session.delete(txn)
        db.session.commit()
        return {"deleted": transaction_id}


class TransactionBulkResource(Resource):
    method_decorators = [login_required]

    def patch(self):
        data = request.get_json(silent=True) or {}
        ids = data.get("transaction_ids")
        if not isinstance(ids, list) or not ids:
            return {"error": "transaction_ids must be a non-empty list."}, 400
        category_id = data.get("category_id")
        if category_id is not None:
            try:
                category_id = int(category_id)
            except (TypeError, ValueError):
                return {"error": "category_id must be a number or null."}, 400
            if not Category.query.filter_by(id=category_id, user_id=current_user_id()).first():
                return {"error": "Category not found."}, 404
        transactions = Transaction.query.filter(Transaction.id.in_(ids), Transaction.user_id == current_user_id(), Transaction.is_split_parent.is_(False)).all()
        for transaction in transactions:
            transaction.category_id = category_id
        db.session.commit()
        return {"updated": len(transactions)}

    def delete(self):
        data = request.get_json(silent=True) or {}
        ids = data.get("transaction_ids")
        if not isinstance(ids, list) or not ids:
            return {"error": "transaction_ids must be a non-empty list."}, 400
        transactions = Transaction.query.filter(Transaction.id.in_(ids), Transaction.user_id == current_user_id(), Transaction.is_split_parent.is_(False)).all()
        for transaction in transactions:
            db.session.delete(transaction)
        db.session.commit()
        return {"deleted": len(transactions)}


class TransactionSplitResource(Resource):
    method_decorators = [login_required]

    def post(self, transaction_id):
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=current_user_id()).first()
        if not transaction or transaction.is_split_parent:
            return {"error": "Transaction not found."}, 404
        data = request.get_json(silent=True) or {}
        splits = data.get("splits")
        if not isinstance(splits, list) or len(splits) < 2:
            return {"error": "Provide at least two splits."}, 400
        try:
            amounts = [float(split["amount"]) for split in splits]
            category_ids = [int(split["category_id"]) for split in splits]
        except (KeyError, TypeError, ValueError):
            return {"error": "Each split needs category_id and amount."}, 400
        if any(amount == 0 for amount in amounts) or round(sum(amounts), 2) != round(transaction.amount, 2):
            return {"error": "Split amounts must add up to the original transaction amount."}, 400
        owned_categories = Category.query.filter(
            Category.id.in_(category_ids), Category.user_id == current_user_id()
        ).count()
        if owned_categories != len(set(category_ids)):
            return {"error": "One or more categories were not found."}, 404
        transaction.is_split_parent = True
        for index, (amount, category_id) in enumerate(zip(amounts, category_ids), start=1):
            digest = sha256(f"split:{transaction.id}:{index}:{amount}:{category_id}".encode()).hexdigest()
            db.session.add(Transaction(user_id=current_user_id(), date=transaction.date, description=f"{transaction.description} (split {index})", amount=amount, category_id=category_id, source_file=transaction.source_file, dedupe_hash=digest, parent_transaction_id=transaction.id))
        db.session.commit()
        return {"split": transaction_id, "children": len(splits)}, 201
