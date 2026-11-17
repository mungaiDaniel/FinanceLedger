import csv
from datetime import datetime
from io import BytesIO, StringIO

from flask import request, send_file
from flask_restful import Resource
from openpyxl import Workbook

from app.models import Transaction
from app.resources.auth import current_user_id, login_required


def _transactions_for_request():
    query = Transaction.query.filter_by(user_id=current_user_id(), is_split_parent=False)
    start, end = request.args.get("start"), request.args.get("end")
    if start:
        query = query.filter(Transaction.date >= datetime.strptime(start, "%Y-%m-%d").date())
    if end:
        query = query.filter(Transaction.date <= datetime.strptime(end, "%Y-%m-%d").date())
    return query.order_by(Transaction.date.desc()).all()


def _monthly_summary(month):
    try:
        start = datetime.strptime(month, "%Y-%m").date().replace(day=1)
    except (TypeError, ValueError):
        raise ValueError("month is required in YYYY-MM format.")
    end = start.replace(year=start.year + (start.month == 12), month=1 if start.month == 12 else start.month + 1)
    transactions = Transaction.query.filter(Transaction.user_id == current_user_id(), Transaction.date >= start, Transaction.date < end, Transaction.is_split_parent.is_(False)).all()
    income = sum(item.amount for item in transactions if item.amount > 0)
    expenses = sum(-item.amount for item in transactions if item.amount < 0)
    return income, expenses, transactions


class TransactionExportResource(Resource):
    method_decorators = [login_required]

    def get(self):
        export_format = request.args.get("format", "csv").lower()
        if export_format not in {"csv", "xlsx"}:
            return {"error": "format must be csv or xlsx."}, 400
        try:
            transactions = _transactions_for_request()
        except ValueError:
            return {"error": "Dates must use YYYY-MM-DD format."}, 400
        rows = [[item.date.isoformat(), item.description, item.amount, item.category.name if item.category else "Uncategorized"] for item in transactions]
        headers = ["Date", "Description", "Amount", "Category"]
        if export_format == "csv":
            buffer = StringIO()
            writer = csv.writer(buffer); writer.writerow(headers); writer.writerows(rows)
            return send_file(BytesIO(buffer.getvalue().encode("utf-8")), mimetype="text/csv", as_attachment=True, download_name="ledger-transactions.csv")
        workbook = Workbook(); sheet = workbook.active; sheet.title = "Transactions"; sheet.append(headers)
        for row in rows: sheet.append(row)
        output = BytesIO(); workbook.save(output); output.seek(0)
        return send_file(output, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", as_attachment=True, download_name="ledger-transactions.xlsx")


class MonthlySummaryPdfResource(Resource):
    method_decorators = [login_required]

    def get(self):
        try:
            income, expenses, transactions = _monthly_summary(request.args.get("month"))
        except ValueError as error:
            return {"error": str(error)}, 400
        # Minimal standards-compliant PDF; avoids adding a heavy PDF runtime dependency.
        lines = [f"Ledger monthly summary - {request.args['month']}", f"Income: ${income:,.2f}", f"Expenses: ${expenses:,.2f}", f"Net: ${income - expenses:,.2f}", f"Transactions: {len(transactions)}"]
        text = " BT /F1 15 Tf 50 760 Td " + " ".join(f"({line.replace('(', '[').replace(')', ']')}) Tj 0 -24 Td" for line in lines) + " ET "
        objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", f"<< /Length {len(text.encode('latin-1'))} >>\nstream\n{text}\nendstream", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
        pdf = "%PDF-1.4\n"; offsets = [0]
        for index, obj in enumerate(objects, 1): offsets.append(len(pdf.encode("latin-1"))); pdf += f"{index} 0 obj\n{obj}\nendobj\n"
        xref = len(pdf.encode("latin-1")); pdf += f"xref\n0 {len(objects)+1}\n0000000000 65535 f \n" + "".join(f"{offset:010d} 00000 n \n" for offset in offsets[1:]) + f"trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF"
        return send_file(BytesIO(pdf.encode("latin-1")), mimetype="application/pdf", as_attachment=True, download_name=f"ledger-summary-{request.args['month']}.pdf")
