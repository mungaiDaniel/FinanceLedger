import os
from flask import Flask, jsonify
from flask_restful import Api
from flask_migrate import Migrate
from flask_cors import CORS
from sqlalchemy import text

from app.config import Config
from app.models import db, User
from app.services.workspace import seed_default_workspace, seed_demo_workspace

migrate = Migrate()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)

    api = Api(app, prefix="/api")

    from app.resources.upload import UploadResource
    from app.resources.transactions import TransactionListResource, TransactionResource, TransactionBulkResource, TransactionSplitResource
    from app.resources.categories import CategoryListResource, CategoryRuleListResource
    from app.resources.analytics import SummaryResource, ByCategoryResource, TrendResource
    from app.resources.auth import LoginResource, LogoutResource, CurrentUserResource, RegisterResource, DemoLoginResource
    from app.resources.budgets import BudgetListResource, BudgetResource
    from app.resources.insights import InsightsResource
    from app.resources.reports import TransactionExportResource, MonthlySummaryPdfResource
    from app.resources.ai import AskLedgerResource

    api.add_resource(UploadResource, "/upload")
    api.add_resource(TransactionListResource, "/transactions")
    api.add_resource(TransactionResource, "/transactions/<int:transaction_id>")
    api.add_resource(TransactionBulkResource, "/transactions/bulk")
    api.add_resource(TransactionSplitResource, "/transactions/<int:transaction_id>/split")
    api.add_resource(CategoryListResource, "/categories")
    api.add_resource(CategoryRuleListResource, "/categories/rules")
    api.add_resource(SummaryResource, "/analytics/summary")
    api.add_resource(ByCategoryResource, "/analytics/by-category")
    api.add_resource(TrendResource, "/analytics/trend")
    api.add_resource(LoginResource, "/auth/login")
    api.add_resource(RegisterResource, "/auth/register")
    api.add_resource(DemoLoginResource, "/auth/demo")
    api.add_resource(LogoutResource, "/auth/logout")
    api.add_resource(CurrentUserResource, "/auth/me")
    api.add_resource(BudgetListResource, "/budgets")
    api.add_resource(BudgetResource, "/budgets/<int:budget_id>")
    api.add_resource(InsightsResource, "/insights")
    api.add_resource(TransactionExportResource, "/reports/transactions")
    api.add_resource(MonthlySummaryPdfResource, "/reports/monthly-summary")
    api.add_resource(AskLedgerResource, "/ai/ask")

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    with app.app_context():
        db.create_all()
        _ensure_user_email_column()
        _ensure_transaction_split_columns()
        demo_user = _seed_demo_user()
        _ensure_workspace_ownership(demo_user.id)
        seed_demo_workspace(demo_user.id)
        _seed_admin_user(app)
        admin = User.query.filter_by(username=app.config["ADMIN_USERNAME"]).first()
        seed_default_workspace(admin.id)

    return app


def _seed_admin_user(app):
    """Create the local administrator account once, using environment configuration."""
    if User.query.filter_by(username=app.config["ADMIN_USERNAME"]).first():
        return
    user = User(username=app.config["ADMIN_USERNAME"])
    user.set_password(app.config["ADMIN_PASSWORD"])
    db.session.add(user)
    db.session.commit()


def _seed_demo_user():
    user = User.query.filter_by(username="demo").first()
    if user:
        return user
    user = User(username="demo", email="demo@ledger.local")
    user.set_password("demo-only")
    db.session.add(user)
    db.session.commit()
    return user


def _ensure_user_email_column():
    """Add the email field for installations created before registration existed."""
    db.session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)"))
    db.session.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
    db.session.commit()


def _ensure_transaction_split_columns():
    """Add split fields for databases created before transaction splitting existed."""
    db.session.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS parent_transaction_id INTEGER"))
    db.session.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_split_parent BOOLEAN NOT NULL DEFAULT FALSE"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_parent_transaction_id ON transactions (parent_transaction_id)"))
    db.session.commit()


def _ensure_workspace_ownership(demo_user_id):
    """Migrate pre-workspace local data into the isolated demo workspace."""
    for table in ("categories", "transactions", "budgets"):
        db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS user_id INTEGER"))
    db.session.execute(text("ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key"))
    db.session.execute(text("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_dedupe_hash_key"))
    db.session.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_categories_user_name ON categories (user_id, name)"))
    db.session.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_transactions_user_hash ON transactions (user_id, dedupe_hash)"))
    db.session.execute(text("UPDATE categories SET user_id = :user_id WHERE user_id IS NULL"), {"user_id": demo_user_id})
    db.session.execute(text("UPDATE transactions SET user_id = :user_id WHERE user_id IS NULL"), {"user_id": demo_user_id})
    db.session.execute(text("UPDATE budgets SET user_id = :user_id WHERE user_id IS NULL"), {"user_id": demo_user_id})
    db.session.commit()
