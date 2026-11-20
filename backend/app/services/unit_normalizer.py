import pint
from typing import Optional, Tuple
from ..schemas.unit_normalizer import (
    ComplianceVerdict,
    EvaluateLabReportResponse,
)

ureg = pint.UnitRegistry()
try:
    ureg.define("percent_ww = 10000 * milligram / kilogram = %w/w")
    ureg.define("ppb = microgram / kilogram")
    ureg.define("ppm = milligram / kilogram")
except pint.errors.RedefinitionError:
    pass

# Direct lookup factors to canonical mg/kg as deterministic baseline
UNIT_FACTORS_TO_MG_KG = {
    "mg/kg": 1.0,
    "ppm": 1.0,
    "ug/kg": 0.001,
    "µg/kg": 0.001,
    "ppb": 0.001,
    "% w/w": 10000.0,
    "%w/w": 10000.0,
    "%": 10000.0,
    "g/kg": 1000.0,
}

def normalize_unit_to_mg_kg(value: float, unit_str: str) -> float:
    """
    Normalizes given concentration to canonical mg/kg using pint with dictionary fallback.
    """
    normalized_key = unit_str.strip().lower()
    for key, factor in UNIT_FACTORS_TO_MG_KG.items():
        if normalized_key == key.lower():
            return round(value * factor, 8)
            
    # Fallback to pint unit registry
    clean_unit = (
        unit_str.strip()
        .replace("µg", "ug")
        .replace("% w/w", "percent_ww")
        .replace("%w/w", "percent_ww")
        .replace("%", "percent_ww")
    )
    quantity = value * ureg(clean_unit)
    target = quantity.to("milligram / kilogram")
    return round(float(target.magnitude), 8)

def evaluate_blq_mrl_trap(
    compound_name: str,
    lab_status: str,
    detected_value: Optional[float],
    detected_unit: Optional[str],
    lab_loq_value: float,
    lab_loq_unit: str,
    max_limit_mg_kg: float,
) -> EvaluateLabReportResponse:
    """
    Enforces the 'BLQ > MRL Trap':
    If a lab report says BLQ (Below Limit of Quantification) or ND,
    compare lab_loq_value against legal max_limit_mg_kg.
    If lab_loq_value > max_limit_mg_kg, mark it CRITICAL_BLOCK.
    """
    canonical_loq = normalize_unit_to_mg_kg(lab_loq_value, lab_loq_unit)
    normalized_status = lab_status.strip().upper()
    is_blq = normalized_status in ["BLQ", "ND", "BELOW_LOQ", "NON_DETECT", "<LOQ", "NOT_DETECTED"]
    
    if is_blq:
        if canonical_loq > max_limit_mg_kg:
            return EvaluateLabReportResponse(
                compound_name=compound_name,
                verdict=ComplianceVerdict.CRITICAL_BLOCK,
                blq_trap_triggered=True,
                detected_value_mg_kg=None,
                lab_loq_canonical_mg_kg=canonical_loq,
                max_limit_mg_kg=max_limit_mg_kg,
                reason=(
                    f"CRITICAL_BLOCK: BLQ > MRL Trap triggered! "
                    f"Lab reported {lab_status}, but instrument LOQ ({canonical_loq:.4f} mg/kg) "
                    f"exceeds the statutory EU MRL ({max_limit_mg_kg:.4f} mg/kg). "
                    "The laboratory machine was not sensitive enough to verify regulatory compliance."
                )
            )
        return EvaluateLabReportResponse(
            compound_name=compound_name,
            verdict=ComplianceVerdict.PASS,
            blq_trap_triggered=False,
            detected_value_mg_kg=None,
            lab_loq_canonical_mg_kg=canonical_loq,
            max_limit_mg_kg=max_limit_mg_kg,
            reason=(
                f"PASS: Non-detect confirmed compliant. "
                f"Instrument LOQ ({canonical_loq:.4f} mg/kg) is sufficiently sensitive (<= MRL {max_limit_mg_kg:.4f} mg/kg)."
            )
        )
        
    # Lab reported a positive detection
    canonical_detected = normalize_unit_to_mg_kg(detected_value or 0.0, detected_unit or "mg/kg")
    if canonical_detected > max_limit_mg_kg:
        return EvaluateLabReportResponse(
            compound_name=compound_name,
            verdict=ComplianceVerdict.CRITICAL_FAIL_EXCEEDED,
            blq_trap_triggered=False,
            detected_value_mg_kg=canonical_detected,
            lab_loq_canonical_mg_kg=canonical_loq,
            max_limit_mg_kg=max_limit_mg_kg,
            reason=(
                f"CRITICAL_FAIL: Detected residue ({canonical_detected:.4f} mg/kg) exceeds legal MRL "
                f"({max_limit_mg_kg:.4f} mg/kg)."
            )
        )
        
    return EvaluateLabReportResponse(
        compound_name=compound_name,
        verdict=ComplianceVerdict.PASS,
        blq_trap_triggered=False,
        detected_value_mg_kg=canonical_detected,
        lab_loq_canonical_mg_kg=canonical_loq,
        max_limit_mg_kg=max_limit_mg_kg,
        reason=f"PASS: Detected concentration ({canonical_detected:.4f} mg/kg) is strictly within legal MRL ({max_limit_mg_kg:.4f} mg/kg)."
    )
