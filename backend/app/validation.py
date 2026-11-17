"""Small, dependency-free request validation helpers.

Each helper raises ``ApiError(400)`` with a message naming the bad field.
"""
import re
from datetime import date, datetime

from flask import request

from app.errors import ApiError

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.")
    return data


def parse_date(value, field):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        raise ApiError(f"{field} must use YYYY-MM-DD format.")


def optional_date(args, field):
    value = args.get(field)
    return parse_date(value, field) if value else None


def parse_month(value, field="month"):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", value):
        raise ApiError(f"{field} is required in YYYY-MM format.")
    return value


def parse_int(value, field, minimum=None, maximum=None):
    if isinstance(value, bool):
        raise ApiError(f"{field} must be a whole number.")
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ApiError(f"{field} must be a whole number.")
    if minimum is not None and number < minimum:
        raise ApiError(f"{field} must be at least {minimum}.")
    if maximum is not None and number > maximum:
        raise ApiError(f"{field} must be at most {maximum}.")
    return number


def parse_number(value, field):
    if isinstance(value, bool):
        raise ApiError(f"{field} must be a number.")
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ApiError(f"{field} must be a number.")
    if number != number or number in (float("inf"), float("-inf")):
        raise ApiError(f"{field} must be a finite number.")
    return number


def require_string(data, field, max_length, min_length=1):
    value = data.get(field)
    if not isinstance(value, str) or not (min_length <= len(value.strip()) <= max_length):
        raise ApiError(f"{field} must be between {min_length} and {max_length} characters.")
    return value.strip()


def valid_email(value):
    return isinstance(value, str) and len(value) <= 255 and bool(_EMAIL_RE.match(value))


def date_range(start_param="start_date", end_param="end_date"):
    start = optional_date(request.args, start_param)
    end = optional_date(request.args, end_param)
    if start and end and start > end:
        raise ApiError(f"{start_param} must not be after {end_param}.")
    return start, end


def apply_date_range(query, column, start, end):
    if start:
        query = query.filter(column >= start)
    if end:
        query = query.filter(column <= end)
    return query


def month_start(month: str) -> date:
    return datetime.strptime(month, "%Y-%m").date()
