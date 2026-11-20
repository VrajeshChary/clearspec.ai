import pytest
from app.services.unit_normalizer import normalize_unit_to_mg_kg, evaluate_blq_mrl_trap
from app.schemas.unit_normalizer import ComplianceVerdict

def test_unit_normalization():
    # 1000 ug/kg == 1.0 mg/kg
    assert normalize_unit_to_mg_kg(1000.0, "ug/kg") == 1.0
    # 500 ppb == 0.5 mg/kg
    assert normalize_unit_to_mg_kg(500.0, "ppb") == 0.5
    # 2.5 ppm == 2.5 mg/kg
    assert normalize_unit_to_mg_kg(2.5, "ppm") == 2.5
    # 0.01 % w/w == 100 mg/kg
    assert normalize_unit_to_mg_kg(0.01, "% w/w") == 100.0

def test_blq_mrl_trap_triggers_critical_block():
    """
    Trap Scenario:
    Lab reports BLQ, but instrument LOQ is 0.05 mg/kg (50 ug/kg).
    Legal EU MRL is strict 0.01 mg/kg.
    Result MUST be CRITICAL_BLOCK because lab instrument LOQ > MRL.
    """
    res = evaluate_blq_mrl_trap(
        compound_name="Ethylene oxide",
        lab_status="BLQ",
        detected_value=None,
        detected_unit="mg/kg",
        lab_loq_value=50.0,
        lab_loq_unit="ug/kg", # 0.05 mg/kg
        max_limit_mg_kg=0.01,
    )
    assert res.verdict == ComplianceVerdict.CRITICAL_BLOCK
    assert res.blq_trap_triggered is True
    assert "CRITICAL_BLOCK: BLQ > MRL Trap triggered" in res.reason

def test_blq_sensitive_machine_passes():
    """
    Sensitive Machine Scenario:
    Lab reports BLQ, instrument LOQ is 0.005 mg/kg.
    Legal EU MRL is 0.01 mg/kg.
    Result MUST be PASS (LOQ <= MRL).
    """
    res = evaluate_blq_mrl_trap(
        compound_name="Ethylene oxide",
        lab_status="ND",
        detected_value=None,
        detected_unit="mg/kg",
        lab_loq_value=0.005,
        lab_loq_unit="mg/kg",
        max_limit_mg_kg=0.01,
    )
    assert res.verdict == ComplianceVerdict.PASS
    assert res.blq_trap_triggered is False
