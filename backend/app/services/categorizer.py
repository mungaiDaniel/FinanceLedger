from app.models import CategoryRule


def categorize(description: str, rules_cache=None):
    """
    Return a category_id for a transaction description by matching against
    CategoryRule keywords (case-insensitive substring match), or None if no match.
    rules_cache: optional pre-fetched list of CategoryRule to avoid repeated queries.
    """
    rules = rules_cache if rules_cache is not None else CategoryRule.query.all()
    desc_lower = description.lower()
    for rule in rules:
        if rule.keyword.lower() in desc_lower:
            return rule.category_id
    return None


def default_categories():
    """Seed categories to create on first run."""
    return [
        ("Salaries", "income"),
        ("Transport", "expense"),
        ("Marketing", "expense"),
        ("Rent", "expense"),
        ("Utilities", "expense"),
        ("Procurement", "expense"),
        ("Software Subscriptions", "expense"),
        ("Groceries", "expense"),
        ("Entertainment", "expense"),
        ("Income", "income"),
        ("Other", "expense"),
    ]


def default_rules(category_name_to_id):
    """Seed keyword rules mapped to category ids, given a name->id lookup."""
    mapping = [
        ("KPLC", "Utilities"),
        ("SAFARICOM", "Utilities"),
        ("UBER", "Transport"),
        ("BOLT", "Transport"),
        ("NETFLIX", "Entertainment"),
        ("SPOTIFY", "Entertainment"),
        ("SALARY", "Salaries"),
        ("RENT", "Rent"),
        ("SUBSCRIPTION", "Software Subscriptions"),
    ]
    return [(kw, category_name_to_id[name]) for kw, name in mapping if name in category_name_to_id]
