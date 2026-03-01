from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import math

from utils import extract_pdf_pages, semantic_chunk
from ai import generate_faqs

app = FastAPI()

# ---- CORS (React access) ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "FAQ Builder Running"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...), limit: int = Form(5)):

    # 1️⃣ Read PDF
    contents = await file.read()

    # 2️⃣ Extract pages
    pages = extract_pdf_pages(contents)

    # 3️⃣ Create semantic chunks
    chunks = semantic_chunk(pages)
    
    # Process up to 5 chunks for performance, distribute the requested limit evenly
    chunks_to_process = chunks[:5]
    limit_per_chunk = max(1, math.ceil(limit / max(1, len(chunks_to_process))))

    results = []

    # 4️⃣ Generate FAQs
    for chunk in chunks_to_process:

        faqs = generate_faqs(chunk["text"], limit_per_chunk)

        results.append({
            "citation": {
                "document": file.filename,
                "page": chunk["page"],
                "chunk_id": chunk["chunk_id"],
                "char_range": [
                    chunk["char_start"],
                    chunk["char_end"]
                ]
            },
            "source_preview": chunk["text"][:120],
            "faqs": faqs
        })

    return {"results": results}