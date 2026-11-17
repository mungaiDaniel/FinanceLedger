"""Minimal one-page PDF writer (avoids a heavy PDF dependency for a simple summary)."""


def _escape(text):
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_summary_pdf(month, income, expenses, count):
    """Return the bytes of a one-page PDF summarising a month."""
    lines = [
        f"Ledger monthly summary - {month}",
        f"Income: ${income:,.2f}",
        f"Expenses: ${expenses:,.2f}",
        f"Net: ${income - expenses:,.2f}",
        f"Transactions: {count}",
    ]
    content = "BT /F1 15 Tf 50 760 Td " + " ".join(f"({_escape(line)}) Tj 0 -24 Td" for line in lines) + " ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        f"<< /Length {len(content)} >>\nstream\n{content}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = "%PDF-1.4\n"
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{number} 0 obj\n{body}\nendobj\n"
    xref_start = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    pdf += "".join(f"{offset:010d} 00000 n \n" for offset in offsets)
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF"
    return pdf.encode("latin-1", errors="replace")
