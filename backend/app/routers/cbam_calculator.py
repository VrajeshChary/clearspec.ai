from fastapi import APIRouter, HTTPException
from ..schemas.cbam_calculator import (
    FastenerShipmentEvaluationRequest,
    FastenerShipmentEvaluationResponse,
)
from ..services.cbam_calculator import evaluate_fastener_cbam_shipment

router = APIRouter(prefix="/cbam", tags=["CBAM 2026 Calculator"])

@router.post("/evaluate-fastener", response_model=FastenerShipmentEvaluationResponse)
@router.post("/evaluate-fastener/", response_model=FastenerShipmentEvaluationResponse)
def evaluate_fastener_shipment(payload: FastenerShipmentEvaluationRequest):
    try:
        return evaluate_fastener_cbam_shipment(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
