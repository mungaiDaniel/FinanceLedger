"""'Ask Ledger': natural-language questions answered from aggregated data."""
from flask_restful import Resource

from app.errors import ApiError
from app.resources.auth import current_user_id, login_required
from app.services.ai_assistant import AssistantUnavailable, ask_ledger
from app.validation import json_body

MAX_QUESTION_LENGTH = 1000


class AskLedgerResource(Resource):
    method_decorators = [login_required]

    def post(self):
        question = json_body().get("question")
        if not isinstance(question, str) or not question.strip():
            raise ApiError("Ask a question first.")
        if len(question) > MAX_QUESTION_LENGTH:
            raise ApiError(f"Questions must be {MAX_QUESTION_LENGTH:,} characters or fewer.")
        try:
            return {"answer": ask_ledger(question.strip(), current_user_id())}
        except AssistantUnavailable as error:
            raise ApiError(str(error), error.status)
