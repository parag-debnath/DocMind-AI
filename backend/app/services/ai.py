import os

import requests


OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://host.docker.internal:11434",
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen3:1.7b",
)


def answer_question(question: str, contexts: list[dict]) -> str:
    if not contexts:
        return "I could not find relevant information in the selected document."

    context = "\n\n".join(
        f"[Source {i + 1}]\n{c['content']}"
        for i, c in enumerate(contexts)
    )

    prompt = (
        "/no_think\n"
        "You are a document question-answering assistant.\n"
        "Answer the user's question using ONLY the supplied document context.\n"
        "If the context does not contain enough information, say so clearly.\n"
        "Do not invent or assume facts.\n\n"
        f"Document Context:\n{context}\n\n"
        f"User Question:\n{question}\n\n"
        "Answer:"
    )

    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
        },
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()

    return data.get("response", "").strip()