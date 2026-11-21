from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from ..services.nano_banana import generate_visual_card

router = APIRouter(prefix="/visual-card", tags=["Nano Banana 2.1 Visual Fix Card"])

class VisualCardRequest(BaseModel):
    consignment_id: Optional[str] = Field("EXP/2026/GNT-104", description="Consignment invoice or reference ID")
    batch_id: Optional[str] = Field("GNT-24A", description="Batch or lot identification code")
    total_risk_inr: Optional[float] = Field(5246000.0, description="Total computed risk exposure in INR")
    critical_findings: Optional[List[str]] = Field(default_factory=list, description="List of primary regulatory defects")
    language: Optional[str] = Field("en", description="Target language ('en' or 'te')")

class VisualCardResponse(BaseModel):
    image_base64: str
    model_used: str
    is_fallback: bool
    format: str = "png"
    note: Optional[str] = None

@router.post("/generate", response_model=VisualCardResponse)
@router.post("/generate/", response_model=VisualCardResponse)
async def generate_defect_card(payload: VisualCardRequest):
    """
    Generates a 16:9 WhatsApp-ready Visual Fix Card summarizing export non-compliance defects:
    - Calls gemini-nano-banana-2.1 with a 12s safety timeout.
    - Falls back to high-DPI Pillow graphic card so live demos never stall.
    """
    try:
        result = await generate_visual_card(payload.model_dump())
        return VisualCardResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visual card generation failed: {str(e)}")
