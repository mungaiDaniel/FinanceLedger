"""Pure, rule-based financial insight helpers."""

from collections import defaultdict
from datetime import date, datetime, timedelta


def month_bounds(month):
    """Return the first day of *month* and the first day after it."""
    start = datetime.strptime(month, "%Y-%m").date().replace(day=1)
    end = date(start.year + (start.month == 12), 1 if start.month == 12 else start.month + 1, 1)
    return start, end


def build_insights(transactions, budgets, month):
    """Build structured insights from transaction-like objects and budget dicts.

    Transactions need ``id``, ``date``, ``amount`` and ``category`` attributes;
    ``category`` may be None. This keeps the rules independently testable.
    """
    start, end = month_bounds(month)
    expense_transactions = [t for t in transactions if t.amount < 0 and t.category]
    current = [t for t in expense_transactions if start <= t.date < end]
    insights = []

    actual_by_category = defaultdict(float)
    for transaction in current:
        actual_by_category[transaction.category_id] += abs(transaction.amount)

    for budget in budgets:
        actual = actual_by_category[budget.category_id]
        if actual > budget.amount:
            over_by = actual - budget.amount
            percent = round((over_by / budget.amount) * 100) if budget.amount else 0
            insights.append({
                "type": "over_budget", "category": budget.category.name,
                "message": f"{budget.category.name} spend is {percent}% over budget this month.",
                "severity": "warning", "related_transaction_ids": [t.id for t in current if t.category_id == budget.category_id],
                "category_id": budget.category_id, "amount": round(over_by, 2),
            })

    current_by_category = defaultdict(float)
    for transaction in current:
        current_by_category[transaction.category_id] += abs(transaction.amount)
    for category_id, actual in current_by_category.items():
        prior_months = []
        cursor = start
        for _ in range(3):
            cursor = (cursor.replace(day=1) - timedelta(days=1)).replace(day=1)
            prior_months.append((cursor.year, cursor.month))
        monthly_totals = []
        for year, month_number in prior_months:
            monthly_totals.append(sum(abs(t.amount) for t in expense_transactions if t.category_id == category_id and t.date.year == year and t.date.month == month_number))
        average = sum(monthly_totals) / len(monthly_totals)
        if average > 0 and actual > average * 1.2:
            category_name = next(t.category.name for t in current if t.category_id == category_id)
            swing = round(((actual - average) / average) * 100)
            insights.append({
                "type": "trending_up", "category": category_name,
                "message": f"{category_name} spend is {swing}% above its trailing three-month average.",
                "severity": "info", "related_transaction_ids": [t.id for t in current if t.category_id == category_id],
                "category_id": category_id, "amount": round(actual - average, 2),
            })

    all_by_category = defaultdict(list)
    for transaction in expense_transactions:
        all_by_category[transaction.category_id].append(transaction)
    for transaction in current:
        peers = [t for t in all_by_category[transaction.category_id] if t.id != transaction.id]
        if not peers:
            continue
        average = sum(abs(t.amount) for t in peers) / len(peers)
        if average > 0 and abs(transaction.amount) > average * 2.5:
            insights.append({
                "type": "unusual_transaction", "category": transaction.category.name,
                "message": f"{transaction.description} is unusually large for {transaction.category.name}.",
                "severity": "warning", "related_transaction_ids": [transaction.id],
                "category_id": transaction.category_id, "amount": round(abs(transaction.amount), 2),
            })

    flagged_pairs = set()
    for index, transaction in enumerate(current):
        for other in current[index + 1:]:
            if transaction.category_id != other.category_id or abs((transaction.date - other.date).days) > 3:
                continue
            larger = max(abs(transaction.amount), abs(other.amount))
            if larger and abs(abs(transaction.amount) - abs(other.amount)) / larger <= 0.01:
                pair = tuple(sorted((transaction.id, other.id)))
                if pair not in flagged_pairs:
                    flagged_pairs.add(pair)
                    insights.append({
                        "type": "possible_duplicate", "category": transaction.category.name,
                        "message": f"Two similar {transaction.category.name} payments were recorded within three days.",
                        "severity": "warning", "related_transaction_ids": list(pair),
                        "category_id": transaction.category_id, "amount": round(abs(transaction.amount), 2),
                    })

    return sorted(insights, key=lambda item: (item["severity"] != "warning", item["type"], item["message"]))
