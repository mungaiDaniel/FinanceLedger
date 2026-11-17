"""Transaction listing, editing, bulk operations and splitting."""
from hashlib import sha256

from flask import request
from flask_restful import Resource

from app.errors import ApiError
from app.extensions import db
from app.models import Category, Transaction
from app.resources.auth import current_user_id, login_required
from app.validation import apply_date_range, date_range, json_body, parse_int, parse_number

SORT_COLUMNS = {"date": Transaction.date, "amount": Transaction.amount, "category": Transaction.category_id}
MAX_PER_PAGE = 200


def _owned_category(category_id):
    """Return the caller's category or raise 404."""
    category = Category.query.filter_by(id=category_id, user_id=current_user_id()).first()
    if not category:
        raise ApiError("Category not found.", 404)
    return category


def _optional_category_id(data):
    """``category_id`` may be null (uncategorise) or the id of an owned category."""
    if "category_id" not in data:
        raise ApiError("category_id is required (use null to clear it).")
    value = data["category_id"]
    if value is None:
        return None
    category_id = parse_int(value, "category_id", minimum=1)
    _owned_category(category_id)
    return category_id


def _id_list(data):
    ids = data.get("transaction_ids")
    if not isinstance(ids, list) or not ids or len(ids) > 1000:
        raise ApiError("transaction_ids must be a list of 1-1000 ids.")
    return [parse_int(item, "transaction_ids", minimum=1) for item in ids]


def _owned_leaf_transactions(ids):
    return Transaction.query.filter(
        Transaction.id.in_(ids), Transaction.user_id == current_user_id(), Transaction.is_split_parent.is_(False)
    ).all()


class TransactionListResource(Resource):
    method_decorators = [login_required]

    def get(self):
        query = Transaction.query.filter_by(user_id=current_user_id(), is_split_parent=False)
        start, end = date_range()
        query = apply_date_range(query, Transaction.date, start, end)

        if request.args.get("category_id"):
            query = query.filter(Transaction.category_id == parse_int(request.args["category_id"], "category_id"))
        search = (request.args.get("search") or "").strip()
        if search:
            query = query.filter(Transaction.description.ilike(f"%{search}%"))

        sort_by = request.args.get("sort", "date")
        direction = request.args.get("direction", "desc")
        if sort_by not in SORT_COLUMNS:
            raise ApiError(f"sort must be one of: {', '.join(SORT_COLUMNS)}.")
        if direction not in ("asc", "desc"):
            raise ApiError("direction must be asc or desc.")
        column = SORT_COLUMNS[sort_by]
        query = query.order_by(column.asc() if direction == "asc" else column.desc(), Transaction.id.desc())

        page = parse_int(request.args.get("page", 1), "page", minimum=1)
        per_page = parse_int(request.args.get("per_page", 50), "per_page", minimum=1, maximum=MAX_PER_PAGE)
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

    def _get_or_404(self, transaction_id):
        txn = Transaction.query.filter_by(id=transaction_id, user_id=current_user_id()).first()
        if not txn:
            raise ApiError("Transaction not found.", 404)
        return txn

    def patch(self, transaction_id):
        txn = self._get_or_404(transaction_id)
        txn.category_id = _optional_category_id(json_body())
        db.session.commit()
        return txn.to_dict()

    def delete(self, transaction_id):
        db.session.delete(self._get_or_404(transaction_id))
        db.session.commit()
        return {"deleted": transaction_id}


class TransactionBulkResource(Resource):
    method_decorators = [login_required]

    def patch(self):
        data = json_body()
        ids = _id_list(data)
        category_id = _optional_category_id(data)
        transactions = _owned_leaf_transactions(ids)
        for transaction in transactions:
            transaction.category_id = category_id
        db.session.commit()
        return {"updated": len(transactions)}

    def delete(self):
        transactions = _owned_leaf_transactions(_id_list(json_body()))
        for transaction in transactions:
            db.session.delete(transaction)
        db.session.commit()
        return {"deleted": len(transactions)}


class TransactionSplitResource(Resource):
    """Split one transaction into several child transactions that sum to the original."""

    method_decorators = [login_required]

    def post(self, transaction_id):
        user_id = current_user_id()
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
        if not transaction or transaction.is_split_parent:
            raise ApiError("Transaction not found.", 404)
        splits = json_body().get("splits")
        if not isinstance(splits, list) or not (2 <= len(splits) <= 50):
            raise ApiError("Provide between 2 and 50 splits.")

        amounts, category_ids = [], []
        for split in splits:
            if not isinstance(split, dict):
                raise ApiError("Each split needs category_id and amount.")
            amounts.append(parse_number(split.get("amount"), "amount"))
            category_ids.append(parse_int(split.get("category_id"), "category_id", minimum=1))
        if any(amount == 0 for amount in amounts) or round(sum(amounts), 2) != round(transaction.amount, 2):
            raise ApiError("Split amounts must add up to the original transaction amount.")
        owned = Category.query.filter(Category.id.in_(category_ids), Category.user_id == user_id).count()
        if owned != len(set(category_ids)):
            raise ApiError("One or more categories were not found.", 404)

        transaction.is_split_parent = True
        for index, (amount, category_id) in enumerate(zip(amounts, category_ids), start=1):
            digest = sha256(f"split:{transaction.id}:{index}:{amount}:{category_id}".encode()).hexdigest()
            db.session.add(Transaction(
                user_id=user_id, date=transaction.date, description=f"{transaction.description} (split {index})",
                amount=amount, category_id=category_id, source_file=transaction.source_file,
                dedupe_hash=digest, parent_transaction_id=transaction.id,
            ))
        db.session.commit()
        return {"split": transaction_id, "children": len(splits)}, 201
