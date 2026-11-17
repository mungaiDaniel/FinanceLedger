from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    categories = db.relationship("Category", backref="owner", lazy=True, cascade="all, delete-orphan")
    transactions = db.relationship("Transaction", backref="owner", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Category(db.Model):
    __tablename__ = "categories"
    __table_args__ = (db.UniqueConstraint("user_id", "name", name="uq_category_user_name"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False, default="expense")  # expense | income

    rules = db.relationship("CategoryRule", backref="category", lazy=True, cascade="all, delete-orphan")
    transactions = db.relationship("Transaction", backref="category", lazy=True)
    budgets = db.relationship("Budget", backref="category", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "type": self.type}


class CategoryRule(db.Model):
    __tablename__ = "category_rules"

    id = db.Column(db.Integer, primary_key=True)
    keyword = db.Column(db.String(200), nullable=False)  # matched case-insensitively, substring
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "keyword": self.keyword,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
        }


class Transaction(db.Model):
    __tablename__ = "transactions"
    __table_args__ = (db.UniqueConstraint("user_id", "dedupe_hash", name="uq_transaction_user_hash"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(500), nullable=False)
    amount = db.Column(db.Float, nullable=False)  # negative = expense, positive = income
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    source_file = db.Column(db.String(255), nullable=True)
    dedupe_hash = db.Column(db.String(64), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    parent_transaction_id = db.Column(db.Integer, db.ForeignKey("transactions.id"), nullable=True, index=True)
    is_split_parent = db.Column(db.Boolean, nullable=False, default=False)
    split_children = db.relationship("Transaction", backref=db.backref("parent_transaction", remote_side=[id]), lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.isoformat(),
            "description": self.description,
            "amount": self.amount,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else "Uncategorized",
            "source_file": self.source_file,
            "parent_transaction_id": self.parent_transaction_id,
        }


class Budget(db.Model):
    __tablename__ = "budgets"
    __table_args__ = (db.UniqueConstraint("category_id", "month", name="uq_budget_category_month"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False, index=True)
    month = db.Column(db.String(7), nullable=False, index=True)  # YYYY-MM
    amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
