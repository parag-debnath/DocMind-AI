from pathlib import Path
import fitz
from docx import Document as DocxDocument
import pandas as pd


def extract_text(path: str, mime_type: str) -> list[dict]:
    suffix = Path(path).suffix.lower()

    if suffix == ".pdf":
        doc = fitz.open(path)
        return [{"text": page.get_text("text"), "page_number": i + 1} for i, page in enumerate(doc)]

    if suffix == ".docx":
        doc = DocxDocument(path)
        text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        return [{"text": text, "page_number": None}]

    if suffix == ".txt":
        return [{"text": Path(path).read_text(encoding="utf-8", errors="ignore"), "page_number": None}]

    if suffix == ".csv":
        df = pd.read_csv(path)
        return [{"text": df.to_csv(index=False), "page_number": None}]

    if suffix in {".png", ".jpg", ".jpeg"}:
        return [{"text": "", "page_number": None}]

    raise ValueError(f"Unsupported file type: {suffix}")
