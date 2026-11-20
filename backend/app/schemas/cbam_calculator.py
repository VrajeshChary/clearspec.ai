from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field

class CBAMAssessmentStatus(str, Enum):
    COMPLIANT = "COMPLIANT"
    CRITICAL_BLOCK = "CRITICAL_BLOCK"
    WARNING = "WARNING"

class PrecursorWireRodInput(BaseModel):
    cn_code: str = Field("7213", description="CN Code for raw wire rod (CN 7213 / 7227)")
    tonnage_consumed: float = Field(..., gt=0, description="Tonnes of wire rod consumed")
    specific_embedded_emissions_tco2e_per_t: Optional[float] = Field(
        None, description="Specific Embedded Emissions (SEE) in tCO2e/t"
    )
    is_verified: bool = Field(False, description="Whether emissions data has accredited third-party verification")
    verifier_accreditation_body: Optional[str] = Field(None, description="Accredited Verifier Name or ID")

class FastenerShipmentEvaluationRequest(BaseModel):
    shipment_reference: str = Field(..., description="Shipment tracking or invoice ID")
    export_cn_code: str = Field("731815", description="Export goods CN code (731815 for threaded steel fasteners)")
    fastener_tonnage: float = Field(..., gt=0, description="Finished product export quantity (tonnes)")
    direct_emissions_tco2e: float = Field(..., ge=0, description="Direct fabrication emissions (tCO2e)")
    indirect_emissions_tco2e: float = Field(..., ge=0, description="Indirect emissions from electricity (tCO2e)")
    precursor_wire_rod: PrecursorWireRodInput

class FastenerShipmentEvaluationResponse(BaseModel):
    shipment_reference: str
    export_cn_code: str
    status: CBAMAssessmentStatus
    total_embedded_emissions_tco2e: Optional[float]
    specific_embedded_emissions_tco2e_per_t: Optional[float]
    critical_blocks: List[str]
    compliance_summary: str
