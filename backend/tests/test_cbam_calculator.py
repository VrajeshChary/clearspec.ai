import pytest
from app.services.cbam_calculator import evaluate_fastener_cbam_shipment
from app.schemas.cbam_calculator import (
    FastenerShipmentEvaluationRequest,
    PrecursorWireRodInput,
    CBAMAssessmentStatus,
)

def test_missing_precursor_emissions_triggers_critical_block():
    """
    CBAM 2026 rule: Fasteners (CN 731815) must have verified SEE for precursor wire rod (CN 7213).
    Missing SEE -> CRITICAL_BLOCK.
    """
    req = FastenerShipmentEvaluationRequest(
        shipment_reference="INV-2026-EU-001",
        export_cn_code="731815",
        fastener_tonnage=10.0,
        direct_emissions_tco2e=3.5,
        indirect_emissions_tco2e=1.5,
        precursor_wire_rod=PrecursorWireRodInput(
            cn_code="7213",
            tonnage_consumed=10.5,
            specific_embedded_emissions_tco2e_per_t=None, # Missing!
            is_verified=False,
        ),
    )
    res = evaluate_fastener_cbam_shipment(req)
    assert res.status == CBAMAssessmentStatus.CRITICAL_BLOCK
    assert len(res.critical_blocks) > 0
    assert any("missing verified Specific Embedded Emissions" in b for b in res.critical_blocks)

def test_unverified_precursor_emissions_triggers_critical_block():
    """
    Unverified SEE -> CRITICAL_BLOCK under 2026 definitive regime.
    """
    req = FastenerShipmentEvaluationRequest(
        shipment_reference="INV-2026-EU-002",
        export_cn_code="731815",
        fastener_tonnage=10.0,
        direct_emissions_tco2e=3.5,
        indirect_emissions_tco2e=1.5,
        precursor_wire_rod=PrecursorWireRodInput(
            cn_code="7213",
            tonnage_consumed=10.5,
            specific_embedded_emissions_tco2e_per_t=2.1,
            is_verified=False, # Unverified!
        ),
    )
    res = evaluate_fastener_cbam_shipment(req)
    assert res.status == CBAMAssessmentStatus.CRITICAL_BLOCK
    assert any("lack third-party accreditation verification" in b for b in res.critical_blocks)

def test_compliant_cbam_shipment():
    """
    Valid verified precursor SEE -> COMPLIANT and calculates total & SEE/t correctly.
    """
    # 10.5 t wire rod * 2.0 tCO2e/t = 21.0 tCO2e precursor emissions
    # Direct = 3.0, Indirect = 1.0 => Total = 25.0 tCO2e
    # Fastener = 10 t => SEE = 2.5 tCO2e/t
    req = FastenerShipmentEvaluationRequest(
        shipment_reference="INV-2026-EU-003",
        export_cn_code="731815",
        fastener_tonnage=10.0,
        direct_emissions_tco2e=3.0,
        indirect_emissions_tco2e=1.0,
        precursor_wire_rod=PrecursorWireRodInput(
            cn_code="7213",
            tonnage_consumed=10.5,
            specific_embedded_emissions_tco2e_per_t=2.0,
            is_verified=True,
            verifier_accreditation_body="TÜV SÜD CBAM Accredited Verifier",
        ),
    )
    res = evaluate_fastener_cbam_shipment(req)
    assert res.status == CBAMAssessmentStatus.COMPLIANT
    assert res.total_embedded_emissions_tco2e == 25.0
    assert res.specific_embedded_emissions_tco2e_per_t == 2.5
