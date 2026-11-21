from fastapi import APIRouter, HTTPException
from ..schemas.unit_normalizer import (
    NormalizeUnitRequest,
    NormalizeUnitResponse,
    EvaluateLabReportRequest,
    EvaluateLabReportResponse,
)
from ..services.unit_normalizer import (
    normalize_unit_to_mg_kg,
    evaluate_blq_mrl_trap,
)

router = APIRouter(prefix="/units", tags=["Unit Normalizer"])

@router.post("/normalize", response_model=NormalizeUnitResponse)
@router.post("/normalize/", response_model=NormalizeUnitResponse)
def normalize_unit(payload: NormalizeUnitRequest):
    try:
        canonical_val = normalize_unit_to_mg_kg(payload.value, payload.source_unit)
        return NormalizeUnitResponse(
            input_value=payload.value,
            input_unit=payload.source_unit,
            canonical_value_mg_kg=canonical_val,
            canonical_unit="mg/kg",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to normalize unit: {str(e)}")

@router.post("/evaluate-lab-report", response_model=EvaluateLabReportResponse)
@router.post("/evaluate-lab-report/", response_model=EvaluateLabReportResponse)
def evaluate_lab_report(payload: EvaluateLabReportRequest):
    try:
        return evaluate_blq_mrl_trap(
            compound_name=payload.compound_name,
            lab_status=payload.lab_status,
            detected_value=payload.detected_value,
            detected_unit=payload.detected_unit,
            lab_loq_value=payload.lab_loq_value,
            lab_loq_unit=payload.lab_loq_unit,
            max_limit_mg_kg=payload.max_limit_mg_kg,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to evaluate lab report: {str(e)}")
