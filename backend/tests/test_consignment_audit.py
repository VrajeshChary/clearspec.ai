import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_audit_rotterdam_sample_packet():
    """
    Tests the end-to-end multi-PDF consignment audit endpoint using sample packet A:
    1. Net weight discrepancy (18,500 kg vs 18,050 kg = -450 kg).
    2. BLQ sensitivity trap on Tricyclazole (LOQ 0.05 mg/kg > EU MRL 0.01 mg/kg).
    3. Contaminant exceedance on Aflatoxin B1 (8.5 ug/kg > EU MRL 5 ug/kg).
    4. Occluded reading on Chlorpyrifos with confidence 0.68 < 0.85 threshold.
    5. Financial risk calculation in INR (> 0).
    6. Actionable bilingual English + Telugu supplier warning notice.
    """
    response = client.post("/api/v1/audit", data={"use_sample": "true"})
    assert response.status_code == 200
    data = response.json()

    assert data["overall_status"] == "CRITICAL_BLOCK"
    assert data["consignment_batch"] == "GNT-24A"
    assert data["normalized_hs_prefix"] == "0904"

    # Weight reconciliation check
    w = data["weight_reconciliation"]
    assert w["status"] == "FAIL_DISCREPANCY"
    assert w["discrepancy_kg"] == -450.0

    # Analytes check
    analytes = {a["name"]: a for a in data["analyte_evaluations"]}
    assert "Tricyclazole" in analytes
    assert analytes["Tricyclazole"]["blq_trap_triggered"] is True
    assert analytes["Tricyclazole"]["compliance_status"] == "CRITICAL_BLOCK"

    assert "Aflatoxin B1" in analytes
    assert analytes["Aflatoxin B1"]["compliance_status"] == "CRITICAL_FAIL_EXCEEDED"

    assert "Chlorpyrifos" in analytes
    assert analytes["Chlorpyrifos"]["needs_human_review"] is True
    assert analytes["Chlorpyrifos"]["confidence_score"] < 0.85

    # Financial risk check
    risk = data["financial_risk"]
    assert risk["total_estimated_risk_inr"] > 1000000.0

    # Bilingual notice check
    notices = data["bilingual_supplier_notice"]
    assert "CRITICAL NON-COMPLIANCE FINDINGS" in notices["english_notice"]
    assert "సరఫరాదారు అత్యవసర సమ్మతి హెచ్చరిక నోటీసు" in notices["telugu_notice"]
    assert "18,050" in notices["telugu_notice"]

def test_reverify_endpoint():
    """Tests the real deterministic statutory re-evaluation endpoint."""
    # Chlorpyrifos MRL is 0.01 mg/kg
    res_pass = client.post("/api/v1/audit/re-verify", json={
        "analyte_name": "Chlorpyrifos",
        "confirmed_value": 0.008,
        "hs_code": "09042211"
    })
    assert res_pass.status_code == 200
    d_pass = res_pass.json()
    assert d_pass["compliance_status"] == "PASS"
    assert d_pass["confirmed_value_mg_kg"] == 0.008
    assert d_pass["legal_mrl_mg_kg"] == 0.01

    res_fail = client.post("/api/v1/audit/re-verify", json={
        "analyte_name": "Chlorpyrifos",
        "confirmed_value": 0.05,
        "hs_code": "09042211"
    })
    assert res_fail.status_code == 200
    d_fail = res_fail.json()
    assert d_fail["compliance_status"] == "CRITICAL_BLOCK"
    assert d_fail["confirmed_value_mg_kg"] == 0.05
    assert d_fail["legal_mrl_mg_kg"] == 0.01

