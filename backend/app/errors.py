"""Uniform JSON error responses: every failure is ``{"error": "<message>"}``."""
import logging

from flask import jsonify, make_response
from flask_restful import Api
from werkzeug.exceptions import HTTPException

log = logging.getLogger(__name__)


class ApiError(Exception):
    """Raise anywhere in a request to return a clean JSON error."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def error_response(exc):
    if isinstance(exc, ApiError):
        return make_response(jsonify(error=exc.message), exc.status)
    if isinstance(exc, HTTPException):
        return make_response(jsonify(error=exc.description), exc.code)
    log.exception("Unhandled error", exc_info=exc)
    return make_response(jsonify(error="Internal server error."), 500)


class JsonApi(Api):
    """Flask-RESTful Api that renders all errors with ``error_response``."""

    def handle_error(self, exc):
        return error_response(exc)


def register_error_handlers(app):
    app.register_error_handler(Exception, error_response)
