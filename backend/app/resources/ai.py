from flask import request
from flask_restful import Resource

from app.resources.auth import current_user_id, login_required
from app.services.ai_assistant import ask_ledger


class AskLedgerResource(Resource):
    method_decorators = [login_required]

    def post(self):
        question = (request.get_json(silent=True) or {}).get("question", "").strip()
        if not question:
            return {"error": "Ask a question first."}, 400
        if len(question) > 1000:
            return {"error": "Questions must be 1,000 characters or fewer."}, 400
        try:
            return {"answer": ask_ledger(question, current_user_id())}
        except ValueError as error:
            return {"error": str(error)}, 503
        except Exception:
            return {"error": "Ask Benny could not complete that request. Please try again."}, 502
