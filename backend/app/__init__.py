"""Ledger API application factory."""
import logging

from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config, resolve_jwt_key
from app.errors import JsonApi, register_error_handlers
from app.extensions import db, jwt, migrate


def create_app(config_object=Config):
    config_object.validate()
    app = Flask(__name__)
    app.config.from_object(config_object)
    resolve_jwt_key(app.config)
    logging.basicConfig(level=logging.INFO)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, origins=app.config["CORS_ORIGINS"])
    register_error_handlers(app)

    _register_routes(app)

    from app.cli import register_cli
    register_cli(app)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    return app


def _register_routes(app):
    from app.resources.ai import AskLedgerResource
    from app.resources.analytics import ByCategoryResource, SummaryResource, TrendResource
    from app.resources.auth import (
        CurrentUserResource, DemoLoginResource, LoginResource, RefreshResource, RegisterResource,
    )
    from app.resources.budgets import BudgetListResource, BudgetResource
    from app.resources.categories import CategoryListResource, CategoryRuleListResource
    from app.resources.insights import InsightsResource
    from app.resources.reports import MonthlySummaryPdfResource, TransactionExportResource
    from app.resources.transactions import (
        TransactionBulkResource, TransactionListResource, TransactionResource, TransactionSplitResource,
    )
    from app.resources.upload import UploadResource

    api = JsonApi(app, prefix="/api")
    routes = [
        (RegisterResource, "/auth/register"),
        (LoginResource, "/auth/login"),
        (RefreshResource, "/auth/refresh"),
        (DemoLoginResource, "/auth/demo"),
        (CurrentUserResource, "/auth/me"),
        (UploadResource, "/upload"),
        (TransactionListResource, "/transactions"),
        (TransactionBulkResource, "/transactions/bulk"),
        (TransactionResource, "/transactions/<int:transaction_id>"),
        (TransactionSplitResource, "/transactions/<int:transaction_id>/split"),
        (CategoryListResource, "/categories"),
        (CategoryRuleListResource, "/categories/rules"),
        (SummaryResource, "/analytics/summary"),
        (ByCategoryResource, "/analytics/by-category"),
        (TrendResource, "/analytics/trend"),
        (BudgetListResource, "/budgets"),
        (BudgetResource, "/budgets/<int:budget_id>"),
        (InsightsResource, "/insights"),
        (TransactionExportResource, "/reports/transactions"),
        (MonthlySummaryPdfResource, "/reports/monthly-summary"),
        (AskLedgerResource, "/ai/ask"),
    ]
    for resource, path in routes:
        api.add_resource(resource, path)
