"""Statement upload: parse CSV/XLSX, skip duplicates, auto-categorise."""
import logging

from flask import request
from flask_restful import Resource

from app.errors import ApiError
from app.extensions import db
from app.models import Category, CategoryRule, Transaction
from app.resources.auth import current_user_id, login_required
from app.services import parser
from app.services.categorizer import categorize
from app.services.dedupe import make_hash

log = logging.getLogger(__name__)


class UploadResource(Resource):
    method_decorators = [login_required]

    def post(self):
        file = request.files.get("file")
        if file is None:
            raise ApiError("No file provided. Send it as multipart/form-data under key 'file'.")
        if not file.filename:
            raise ApiError("Empty filename.")

        try:
            normalized = parser.detect_and_normalize(parser.read_file(file.stream, file.filename))
        except parser.ParseError as error:
            raise ApiError(str(error))
        except Exception:
            log.exception("Statement parsing failed")
            raise ApiError("The file could not be read. Make sure it is a valid .csv or .xlsx statement.")

        user_id = current_user_id()
        rules = CategoryRule.query.join(Category).filter(Category.user_id == user_id).all()
        seen_hashes = {h for (h,) in db.session.query(Transaction.dedupe_hash).filter_by(user_id=user_id)}

        inserted = duplicates = 0
        for row in normalized.itertuples(index=False):
            amount = float(row.amount)
            digest = make_hash(row.date.isoformat(), row.description, amount)
            if digest in seen_hashes:
                duplicates += 1
                continue
            seen_hashes.add(digest)
            db.session.add(Transaction(
                user_id=user_id, date=row.date, description=row.description[:500], amount=amount,
                category_id=categorize(row.description, rules), source_file=file.filename[:255],
                dedupe_hash=digest,
            ))
            inserted += 1

        db.session.commit()
        return {"rows_seen": len(normalized), "inserted": inserted, "duplicates_skipped": duplicates}, 201
