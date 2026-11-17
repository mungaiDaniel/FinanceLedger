"""Categories and keyword rules used to auto-categorise imported transactions."""
from flask_restful import Resource

from app.errors import ApiError
from app.extensions import db
from app.models import Category, CategoryRule
from app.resources.auth import current_user_id, login_required
from app.validation import json_body, parse_int, require_string

CATEGORY_TYPES = ("expense", "income")


class CategoryListResource(Resource):
    method_decorators = [login_required]

    def get(self):
        categories = Category.query.filter_by(user_id=current_user_id()).order_by(Category.name).all()
        return [c.to_dict() for c in categories]

    def post(self):
        data = json_body()
        name = require_string(data, "name", 100)
        category_type = data.get("type", "expense")
        if category_type not in CATEGORY_TYPES:
            raise ApiError("type must be 'expense' or 'income'.")
        if Category.query.filter_by(user_id=current_user_id(), name=name).first():
            raise ApiError("Category already exists.", 409)

        category = Category(user_id=current_user_id(), name=name, type=category_type)
        db.session.add(category)
        db.session.commit()
        return category.to_dict(), 201


class CategoryRuleListResource(Resource):
    method_decorators = [login_required]

    def get(self):
        rules = CategoryRule.query.join(Category).filter(Category.user_id == current_user_id()).all()
        return [r.to_dict() for r in rules]

    def post(self):
        data = json_body()
        keyword = require_string(data, "keyword", 200)
        category_id = parse_int(data.get("category_id"), "category_id", minimum=1)
        if not Category.query.filter_by(id=category_id, user_id=current_user_id()).first():
            raise ApiError("Category not found.", 404)

        rule = CategoryRule(keyword=keyword, category_id=category_id)
        db.session.add(rule)
        db.session.commit()
        return rule.to_dict(), 201
