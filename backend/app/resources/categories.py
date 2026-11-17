from flask import request
from flask_restful import Resource

from app.models import db, Category, CategoryRule
from app.resources.auth import current_user_id, login_required


class CategoryListResource(Resource):
    method_decorators = [login_required]
    def get(self):
        categories = Category.query.filter_by(user_id=current_user_id()).order_by(Category.name).all()
        return [c.to_dict() for c in categories]

    def post(self):
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        ctype = data.get("type", "expense")

        if not name:
            return {"error": "name is required"}, 400
        if Category.query.filter_by(user_id=current_user_id(), name=name).first():
            return {"error": "Category already exists."}, 400

        cat = Category(user_id=current_user_id(), name=name, type=ctype)
        db.session.add(cat)
        db.session.commit()
        return cat.to_dict(), 201


class CategoryRuleListResource(Resource):
    method_decorators = [login_required]
    def get(self):
        rules = CategoryRule.query.join(Category).filter(Category.user_id == current_user_id()).all()
        return [r.to_dict() for r in rules]

    def post(self):
        data = request.get_json(silent=True) or {}
        keyword = data.get("keyword")
        category_id = data.get("category_id")

        if not keyword or not category_id:
            return {"error": "keyword and category_id are required"}, 400
        if not Category.query.filter_by(id=category_id, user_id=current_user_id()).first():
            return {"error": "category_id does not exist."}, 400

        rule = CategoryRule(keyword=keyword, category_id=category_id)
        db.session.add(rule)
        db.session.commit()
        return rule.to_dict(), 201
