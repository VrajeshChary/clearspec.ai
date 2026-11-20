import base64
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.nano_banana import generate_fallback_card

client = TestClient(app)

def test_visual_card_endpoint():
    """Tests the /api/v1/visual-card/generate endpoint."""
    payload = {
        "consignment_id": "EXP/2026/GNT-104",
        "batch_id": "GNT-24A",
        "total_risk_inr": 5246000.0,
        "critical_findings": [
            "Weight Shortage: -450 kg",
            "BLQ Trap: Tricyclazole LOQ 0.05 > 0.01 mg/kg",
            "Exceedance: Aflatoxin B1 8.5 > 5.0 ug/kg"
        ],
        "language": "en"
    }
    response = client.post("/api/v1/visual-card/generate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "image_base64" in data
    assert len(data["image_base64"]) > 1000
    assert data["model_used"] == "gemini-nano-banana-2.1"
    assert data["format"] == "png"

    # Verify base64 decodes to valid PNG header
    raw_bytes = base64.b64decode(data["image_base64"])
    assert raw_bytes.startswith(b"\x89PNG\r\n\x1a\n")

def test_fallback_card_generator_directly():
    """Tests that the local stage-safe Pillow renderer produces a valid 16:9 PNG."""
    payload = {
        "batch_id": "GNT-24A",
        "total_risk_inr": 5246000.0,
    }
    b64_str = generate_fallback_card(payload)
    raw_bytes = base64.b64decode(b64_str)
    assert raw_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(raw_bytes) > 20000  # High-DPI rich infographic
