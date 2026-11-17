import re
import pandas as pd
from dateutil import parser as date_parser

_ISO_DATE_RE = re.compile(r"^\d{4}-\d{1,2}-\d{1,2}")

# Candidate header names we'll try to match against, in priority order.
DATE_CANDIDATES = ["date", "transaction date", "txn date", "value date", "posting date"]
DESC_CANDIDATES = ["description", "narrative", "details", "particulars", "narration", "memo", "remarks"]
AMOUNT_CANDIDATES = ["amount", "value", "transaction amount"]
DEBIT_CANDIDATES = ["debit", "withdrawal", "money out", "dr"]
CREDIT_CANDIDATES = ["credit", "deposit", "money in", "cr"]


class ParseError(Exception):
    pass


def _normalize_headers(columns):
    return {str(c).strip().lower(): c for c in columns}


def _find_column(normalized_headers, candidates):
    for cand in candidates:
        if cand in normalized_headers:
            return normalized_headers[cand]
    # fallback: substring match
    for header_lower, original in normalized_headers.items():
        for cand in candidates:
            if cand in header_lower:
                return original
    return None


def read_file(file_stream, filename: str) -> pd.DataFrame:
    """Read CSV or XLSX into a raw DataFrame."""
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(file_stream)
    elif filename.lower().endswith((".xlsx", ".xls")):
        df = pd.read_excel(file_stream)
    else:
        raise ParseError("Unsupported file type. Please upload a .csv or .xlsx file.")

    if df.empty:
        raise ParseError("The uploaded file has no rows.")

    return df


def detect_and_normalize(df: pd.DataFrame) -> pd.DataFrame:
    """
    Auto-detect date/description/amount columns (or debit+credit pair) and
    return a normalized DataFrame with columns: date, description, amount.
    """
    headers = _normalize_headers(df.columns)

    date_col = _find_column(headers, DATE_CANDIDATES)
    desc_col = _find_column(headers, DESC_CANDIDATES)
    amount_col = _find_column(headers, AMOUNT_CANDIDATES)
    debit_col = _find_column(headers, DEBIT_CANDIDATES)
    credit_col = _find_column(headers, CREDIT_CANDIDATES)

    if date_col is None:
        raise ParseError("Could not detect a date column. Expected a header like 'Date' or 'Transaction Date'.")
    if desc_col is None:
        raise ParseError("Could not detect a description column. Expected a header like 'Description' or 'Narrative'.")
    if amount_col is None and not (debit_col or credit_col):
        raise ParseError("Could not detect an amount column (or debit/credit columns).")

    out = pd.DataFrame()
    out["date"] = df[date_col].apply(_parse_date)
    out["description"] = df[desc_col].astype(str).str.strip()

    if amount_col is not None:
        out["amount"] = pd.to_numeric(df[amount_col], errors="coerce")
    else:
        debit = pd.to_numeric(df[debit_col], errors="coerce").fillna(0) if debit_col else 0
        credit = pd.to_numeric(df[credit_col], errors="coerce").fillna(0) if credit_col else 0
        # Convention: debit = money out (expense, negative), credit = money in (income, positive)
        out["amount"] = credit - debit

    out = out.dropna(subset=["date", "amount"])
    out = out[out["description"].str.len() > 0]

    if out.empty:
        raise ParseError("No valid rows found after parsing dates/amounts. Check the file's date and amount formats.")

    return out.reset_index(drop=True)


def _parse_date(value):
    if pd.isna(value):
        return None
    try:
        if isinstance(value, str):
            value = value.strip()
            # Unambiguous ISO format (YYYY-MM-DD or YYYY/MM/DD): parse directly,
            # since dayfirst=True can otherwise incorrectly swap month/day here.
            if _ISO_DATE_RE.match(value):
                return date_parser.parse(value, yearfirst=True, dayfirst=False).date()
            # Otherwise assume day-first (common in Kenyan bank statements, e.g. DD/MM/YYYY)
            return date_parser.parse(value, dayfirst=True).date()
        # pandas Timestamp or datetime
        return pd.to_datetime(value).date()
    except (ValueError, TypeError):
        return None
