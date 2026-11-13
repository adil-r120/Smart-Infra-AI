import pytest
from rag_engine import CivilEngineeringRAG


def test_rag_indexing():
    """Verify knowledge base documents are chunked and indexed."""
    rag = CivilEngineeringRAG.get_instance()
    assert len(rag.vector_store.chunks) >= 15
    assert rag.is_indexed is True


def test_rag_semantic_retrieval_pothole():
    """Verify semantic retrieval ranks IRC:82 highest for pothole repair queries."""
    rag = CivilEngineeringRAG.get_instance()
    results = rag.retrieve("pothole excavation tack coat bitumen", top_k=3)
    assert len(results) > 0
    top_doc = results[0]["document"]
    assert "irc_82" in top_doc
    assert results[0]["score"] > 0.1


def test_rag_semantic_retrieval_drainage():
    """Verify semantic retrieval retrieves drainage standard for water pipe burst queries."""
    rag = CivilEngineeringRAG.get_instance()
    results = rag.retrieve("water pipe burst subgrade trench restoration", top_k=3)
    assert len(results) > 0
    docs = [r["document"] for r in results]
    assert any("drainage" in d for d in docs)


def test_copilot_generate_sop_unauthenticated(client):
    """Ensure copilot endpoints require authentication."""
    resp = client.post("/copilot/generate-sop", json={
        "hazard_type": "Pothole",
        "severity": "High"
    })
    assert resp.status_code == 401


def test_copilot_generate_sop_success(client, admin_token):
    """Ensure authenticated admin can generate a full civil engineering SOP."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.post("/copilot/generate-sop", json={
        "hazard_type": "Pothole",
        "severity": "Critical",
        "notes": "Deep crater with standing water on Highway 24",
        "location": "Sector 4"
    }, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "title" in data
    assert "materials" in data
    assert "citations" in data
    assert len(data["citations"]) > 0
    assert data["sla_hours"] == 4  # Critical SLA is 4 hours
    assert "work_order_text" in data
    assert "IRC:" in data["work_order_text"] or "SOP" in data["work_order_text"]


def test_copilot_chat(client, admin_token):
    """Verify interactive Q&A against civil engineering knowledge base."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.post("/copilot/chat", json={
        "query": "What is the tack coat application rate for asphalt patching?"
    }, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert "citations" in data
    assert len(data["citations"]) > 0


def test_copilot_knowledge_base_metadata(client, admin_token):
    """Verify knowledge base listing endpoint."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.get("/copilot/knowledge-base", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert data["chunks_indexed"] >= 15
    assert len(data["documents"]) == 4

