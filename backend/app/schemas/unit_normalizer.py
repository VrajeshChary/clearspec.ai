from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class SupportedUnit(str, Enum):
    MG_KG = "mg/kg"
    UG_KG = "ug/kg"
    PPM = "ppm"
    PPB = "ppb"
    PERCENT_WW = "% w/w"
    G_KG = "g/kg"

class LabStatus(str, Enum):
    DETECTED = "DETECTED"
    BLQ = "BLQ"
    ND = "ND"
    BELOW_LOQ = "BELOW_LOQ"

class ComplianceVerdict(str, Enum):
    PASS = "PASS"
    CRITICAL_BLOCK = "CRITICAL_BLOCK"
    CRITICAL_FAIL_EXCEEDED = "CRITICAL_FAIL_EXCEEDED"

class NormalizeUnitRequest(BaseModel):
    value: float = Field(..., description="Numeric concentration value")
    source_unit: str = Field(..., description="Source unit (e.g., ug/kg, ppb, ppm, % w/w)")

class NormalizeUnitResponse(BaseModel):
    input_value: float
    input_unit: str
    canonical_value_mg_kg: float
    canonical_unit: str = "mg/kg"

class EvaluateLabReportRequest(BaseModel):
    compound_name: str = Field(..., description="Name of chemical substance or pesticide")
    lab_status: str = Field("DETECTED", description="Status string: DETECTED, BLQ, ND, etc.")
    detected_value: Optional[float] = Field(None, description="Reported value if detected")
    detected_unit: Optional[str] = Field("mg/kg", description="Unit of reported value")
    lab_loq_value: float = Field(..., description="Lab instrument Limit of Quantification")
    lab_loq_unit: str = Field("mg/kg", description="Unit of lab LOQ")
    max_limit_mg_kg: float = Field(..., description="Legal Maximum Residue Limit (MRL) in mg/kg")

class EvaluateLabReportResponse(BaseModel):
    compound_name: str
    verdict: ComplianceVerdict
    blq_trap_triggered: bool
    detected_value_mg_kg: Optional[float]
    lab_loq_canonical_mg_kg: float
    max_limit_mg_kg: float
    reason: str
