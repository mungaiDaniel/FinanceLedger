"""Add realistic sample transactions to the configured PostgreSQL database.

The script is safe to run repeatedly: existing rows are skipped using the same
dedupe hash as file uploads.
"""

from calendar import monthrange
from datetime import date, timedelta

from app import create_app
from app.models import CategoryRule, Transaction, db
from app.services.categorizer import categorize
from app.services.dedupe import make_hash


MONTHLY_TRANSACTIONS = (
    (1, "Salary - Monthly Pay", 150000.00),
    (2, "Rent Payment", -35000.00),
    (4, "KPLC Postpaid Bill", -4200.00),
    (6, "Safaricom Airtime and Data", -1800.00),
    (8, "Uber trip to office", -650.00),
    (11, "Groceries and household shopping", -7800.00),
    (14, "Netflix subscription", -1100.00),
    (17, "Uber trip home", -720.00),
    (20, "Spotify subscription", -450.00),
    (24, "Software subscription", -2400.00),
    (27, "Weekend entertainment", -3200.00),
)


def _previous_months(count: int):
    """Return the first day of the current month and preceding months."""
    month = date.today().replace(day=1)
    months = []
    for _ in range(count):
        months.append(month)
        month = (month - timedelta(days=1)).replace(day=1)
    return reversed(months)


def seed_mock_data(month_count: int = 6):
    app = create_app()
    with app.app_context():
        rules = CategoryRule.query.all()
        inserted = 0

        for month in _previous_months(month_count):
            last_day = monthrange(month.year, month.month)[1]
            for day, description, amount in MONTHLY_TRANSACTIONS:
                transaction_date = month.replace(day=min(day, last_day))
                dedupe_hash = make_hash(transaction_date.isoformat(), description, amount)
                if Transaction.query.filter_by(dedupe_hash=dedupe_hash).first():
                    continue

                db.session.add(
                    Transaction(
                        date=transaction_date,
                        description=description,
                        amount=amount,
                        category_id=categorize(description, rules),
                        source_file="mock_data_seed",
                        dedupe_hash=dedupe_hash,
                    )
                )
                inserted += 1

        db.session.commit()
        print(f"Mock data seed complete: {inserted} transaction(s) inserted.")


if __name__ == "__main__":
    seed_mock_data()
