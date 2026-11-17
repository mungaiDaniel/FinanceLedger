"""Workspace seeding and demo data for isolated user accounts."""

from calendar import monthrange
from datetime import date, timedelta

from app.models import Category, CategoryRule, Transaction, db
from app.services.categorizer import default_categories, default_rules, categorize
from app.services.dedupe import make_hash

DEMO_ROWS = ((1, "Salary payment", 4200.00), (2, "Rent payment", -1200.00), (5, "KPLC utility bill", -145.00), (8, "Uber office trip", -32.00), (12, "Groceries", -280.00), (18, "Netflix subscription", -16.00), (24, "Software subscription", -39.00))


def seed_default_workspace(user_id):
    if Category.query.filter_by(user_id=user_id).first():
        return
    category_ids = {}
    for name, category_type in default_categories():
        category = Category(user_id=user_id, name=name, type=category_type)
        db.session.add(category)
        db.session.flush()
        category_ids[name] = category.id
    for keyword, category_id in default_rules(category_ids):
        db.session.add(CategoryRule(keyword=keyword, category_id=category_id))
    db.session.commit()


def seed_demo_workspace(user_id, months=6):
    """Create deterministic sample records only for the demo account."""
    seed_default_workspace(user_id)
    rules = CategoryRule.query.join(Category).filter(Category.user_id == user_id).all()
    month = date.today().replace(day=1)
    month_starts = []
    for _ in range(months):
        month_starts.append(month)
        month = (month - timedelta(days=1)).replace(day=1)
    for month in reversed(month_starts):
        for day, description, amount in DEMO_ROWS:
            transaction_date = month.replace(day=min(day, monthrange(month.year, month.month)[1]))
            digest = make_hash(transaction_date.isoformat(), description, amount)
            if Transaction.query.filter_by(user_id=user_id, dedupe_hash=digest).first():
                continue
            db.session.add(Transaction(user_id=user_id, date=transaction_date, description=description, amount=amount, category_id=categorize(description, rules), source_file="demo_data", dedupe_hash=digest))
    db.session.commit()
