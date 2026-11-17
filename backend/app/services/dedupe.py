import hashlib


def make_hash(date_iso: str, description: str, amount: float) -> str:
    """Stable hash for a transaction so re-uploading the same file/period doesn't duplicate rows."""
    key = f"{date_iso}|{description.strip().lower()}|{round(float(amount), 2)}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()
