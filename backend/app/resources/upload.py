from flask import request
from flask_restful import Resource

from app.models import db, Transaction, Category, CategoryRule
from app.services import parser
from app.services.dedupe import make_hash
from app.services.categorizer import categorize
from app.resources.auth import current_user_id, login_required


class UploadResource(Resource):
    method_decorators = [login_required]
    def post(self):
        if "file" not in request.files:
            return {"error": "No file provided. Send it as multipart/form-data under key 'file'."}, 400

        file = request.files["file"]
        if file.filename == "":
            return {"error": "Empty filename."}, 400

        try:
            raw_df = parser.read_file(file.stream, file.filename)
            normalized = parser.detect_and_normalize(raw_df)
        except parser.ParseError as e:
            return {"error": str(e)}, 400
        except Exception as e:
            return {"error": f"Failed to parse file: {e}"}, 400

        user_id = current_user_id()
        rules_cache = CategoryRule.query.join(Category).filter(Category.user_id == user_id).all()

        inserted = 0
        duplicates = 0
        rows_seen = 0

        for _, row in normalized.iterrows():
            rows_seen += 1
            date_iso = row["date"].isoformat()
            description = row["description"]
            amount = float(row["amount"])

            h = make_hash(date_iso, description, amount)

            if Transaction.query.filter_by(user_id=user_id, dedupe_hash=h).first():
                duplicates += 1
                continue

            category_id = categorize(description, rules_cache)

            txn = Transaction(
                user_id=user_id,
                date=row["date"],
                description=description,
                amount=amount,
                category_id=category_id,
                source_file=file.filename,
                dedupe_hash=h,
            )
            db.session.add(txn)
            inserted += 1

        db.session.commit()

        return {
            "rows_seen": rows_seen,
            "inserted": inserted,
            "duplicates_skipped": duplicates,
        }, 201
