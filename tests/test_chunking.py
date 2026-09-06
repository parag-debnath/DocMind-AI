from app.services.chunking import chunk_text

def test_chunking():
    chunks = chunk_text("a " * 2000, chunk_size=100, overlap=10)
    assert chunks
    assert all(chunks)
