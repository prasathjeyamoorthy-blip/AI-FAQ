


# -------- PDF TEXT EXTRACTION --------
from pypdf import PdfReader
import io


def extract_pdf_pages(file_bytes):
    pdf = PdfReader(io.BytesIO(file_bytes))

    pages = []

    for i, page in enumerate(pdf.pages):
        text = page.extract_text()

        if text:
            pages.append({
                "page": i + 1,
                "text": text
            })

    return pages


# -------- SEMANTIC CHUNKING --------
def semantic_chunk(pages):

    chunks = []
    chunk_count = 0

    for page in pages:

        page_text = page["text"]
        paragraphs = page_text.split("\n\n")

        char_cursor = 0   # tracks current position in page text

        for para in paragraphs:

            clean = para.strip()

            # find real start position inside original text
            start = page_text.find(para, char_cursor)

            if start == -1:
                continue

            end = start + len(para)

            if len(clean) > 120:
                chunks.append({
                    "chunk_id": f"chunk_{chunk_count}",
                    "page": page["page"],
                    "text": clean,
                    "char_start": start,
                    "char_end": end
                })

                chunk_count += 1

            # move cursor forward to avoid matching earlier text
            char_cursor = end

    return chunks

# -------- REMOVE DUPLICATES --------
def deduplicate_faqs(faqs):
    seen = set()
    unique = []

    for f in faqs:
        q = f["question"].lower()

        if q not in seen:
            seen.add(q)
            unique.append(f)

    return unique


# -------- QUALITY FILTER --------
def filter_faqs(faqs):
    return [
        f for f in faqs
        if len(f["question"]) > 10
    ]