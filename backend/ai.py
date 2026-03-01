import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

from openai import OpenAI
import os

client = OpenAI(
    api_key=os.getenv("NVIDIA_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1"
)

def generate_faqs(chunk, limit=3):

    response = client.chat.completions.create(
        model="meta/llama-3.1-70b-instruct",
        messages=[
            {
                "role": "system",
                "content": f"""
Generate exactly {limit} FAQs from the text.

Return strictly in JSON format:
[
  {{
    "question": "...",
    "answer": "..."
  }}
]
"""
            },
            {
                "role": "user",
                "content": chunk
            }
        ]
    )

    return response.choices[0].message.content