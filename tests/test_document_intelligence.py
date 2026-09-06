from app.services.document_intelligence import search_documents


def test_document_search_empty_query_returns_empty_list():
    class FakeDB:
        def execute(self, *_args, **_kwargs):
            raise AssertionError("Database should not be queried")

    assert search_documents(FakeDB(), 1, "   ") == []