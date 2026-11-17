"""Exports: transactions as CSV/XLSX and a one-page monthly summary as PDF."""
import csv
from io import BytesIO, StringIO

from flask import request, send_file
from flask_restful import Resource
from openpyxl import Workbook

from app.errors import ApiError
from app.models import Transaction
from app.resources.auth import current_user_id, login_required
from app.services.insights import month_bounds
from app.services.pdf import build_summary_pdf
from app.validation import apply_date_range, date_range, parse_month

EXPORT_HEADERS = ["Date", "Description", "Amount", "Category"]
XLSX_MIMETYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class TransactionExportResource(Resource):
    method_decorators = [login_required]

    def get(self):
        export_format = request.args.get("format", "csv").lower()
        if export_format not in {"csv", "xlsx"}:
            raise ApiError("format must be csv or xlsx.")
        start, end = date_range("start", "end")
        query = Transaction.query.filter_by(user_id=current_user_id(), is_split_parent=False)
        transactions = apply_date_range(query, Transaction.date, start, end).order_by(Transaction.date.desc()).all()
        rows = [[t.date.isoformat(), t.description, t.amount, t.category.name if t.category else "Uncategorized"]
                for t in transactions]

        if export_format == "csv":
            buffer = StringIO()
            writer = csv.writer(buffer)
            writer.writerow(EXPORT_HEADERS)
            writer.writerows(rows)
            return send_file(BytesIO(buffer.getvalue().encode("utf-8")), mimetype="text/csv",
                             as_attachment=True, download_name="ledger-transactions.csv")

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Transactions"
        sheet.append(EXPORT_HEADERS)
        for row in rows:
            sheet.append(row)
        output = BytesIO()
        workbook.save(output)
        output.seek(0)
        return send_file(output, as_attachment=True, download_name="ledger-transactions.xlsx",
                         mimetype=XLSX_MIMETYPE)


class MonthlySummaryPdfResource(Resource):
    method_decorators = [login_required]

    def get(self):
        month = parse_month(request.args.get("month"))
        start, end = month_bounds(month)
        transactions = Transaction.query.filter(
            Transaction.user_id == current_user_id(), Transaction.date >= start, Transaction.date < end,
            Transaction.is_split_parent.is_(False)).all()
        income = sum(t.amount for t in transactions if t.amount > 0)
        expenses = sum(-t.amount for t in transactions if t.amount < 0)
        pdf = build_summary_pdf(month, income, expenses, len(transactions))
        return send_file(BytesIO(pdf), mimetype="application/pdf", as_attachment=True,
                         download_name=f"ledger-summary-{month}.pdf")
