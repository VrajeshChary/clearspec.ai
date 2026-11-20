---
name: cbam-2026-calculator-skill
description: Verifies 2026 EU CBAM compliance under Regulation (EU) 2023/956 for steel fastener exports (CN 731815) and enforces precursor emissions validation.
---

# 2026 EU CBAM Calculator & Precursor Validation Skill

## Purpose
This skill governs compliance verification and calculation of Specific Embedded Emissions (SEE) for steel goods exported to the European Union under **Regulation (EU) 2023/956** (Carbon Border Adjustment Mechanism - CBAM).

Effective January 1, 2026, the CBAM definitive regime mandates verified installation-level embedded emissions declarations and the purchase of corresponding CBAM certificates. The transitional reporting default-value tolerances sunset, requiring actual primary data and third-party verification for relevant precursors.

---

## 1. Scope & Commodity Classification
- **Export Commodity:** Steel Fasteners / Screws / Bolts (Combined Nomenclature code **CN 7318 15** - *Threaded screws and bolts, whether or not with their nuts or washers*).
- **Mandatory Precursor:** Hot-rolled wire rod in coils (Combined Nomenclature code **CN 7213** - *Bars and rods, hot-rolled, in irregularly wound coils, of iron or non-alloy steel*, or **CN 7227**).

---

## 2. The "Precursor Wire Rod Verification" Rule

Under Annex IV of Regulation (EU) 2023/956:
- Fasteners (CN 7318) are classified as **complex goods**.
- Embedded emissions of complex goods include both the direct and indirect emissions from the production process **plus** the specific embedded emissions of the precursor materials consumed.
- For CN 7318 15, the primary raw precursor is drawn wire or hot-rolled wire rod (**CN 7213**).

### CRITICAL_BLOCK Trigger Conditions:
1. Fastener shipment (CN 731815) references precursor wire rod (CN 7213).
2. The precursor input has:
   - `precursor_specific_embedded_emissions` (`SEE_precursor`, in $t\text{CO}_2e/t$) missing, `null`, or $\le 0.0$.
   - OR `precursor_emissions_verified` is `False`.
   - OR missing accredited third-party verifier statement.
3. **Outcome:** Immediate `CRITICAL_BLOCK`. 
   Export declarations, customs filing packages, or compliance reports must not be approved without verified precursor emissions data.

---

## 3. Mathematical Formula for Embedded Emissions

$$\text{SEE}_{\text{complex}} = \frac{\text{AttrEmg}_{\text{direct}} + \text{AttrEmg}_{\text{indirect}} + \sum (\text{Mass}_{\text{precursor}} \times \text{SEE}_{\text{precursor}})}{\text{Production}_{\text{fasteners}}}$$

Where:
- $\text{SEE}_{\text{complex}}$: Specific Embedded Emissions of fastener ($t\text{CO}_2e / t$).
- $\text{AttrEmg}_{\text{direct}}$: Attributed direct emissions of the fastener fabrication installation ($t\text{CO}_2e$).
- $\text{AttrEmg}_{\text{indirect}}$: Attributed indirect emissions from consumed electricity ($t\text{CO}_2e$).
- $\text{Mass}_{\text{precursor}}$: Tonnes of precursor wire rod (CN 7213) consumed per tonne of fastener produced (scrap factor considered).
- $\text{SEE}_{\text{precursor}}$: Verified specific embedded emissions of the wire rod ($t\text{CO}_2e / t$).

---

## 4. Python Implementation Specification

```python
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class CBAMStatus(str, Enum):
    COMPLIANT = "COMPLIANT"
    CRITICAL_BLOCK = "CRITICAL_BLOCK"
    WARNING = "WARNING"

class PrecursorInput(BaseModel):
    cn_code: str = Field(..., description="CN Code of precursor, e.g. 7213 for wire rod")
    consumed_tonnes: float = Field(gt=0, description="Tonnage of precursor consumed")
    specific_embedded_emissions_tco2e_per_t: Optional[float] = Field(
        None, description="Verified Specific Embedded Emissions (tCO2e/t)"
    )
    is_verified: bool = Field(False, description="Whether emissions data has accredited verifier sign-off")
    verifier_id: Optional[str] = Field(None, description="Accredited Verifier ID / Reference")

class FastenerShipment(BaseModel):
    shipment_id: str
    export_cn_code: str = "731815"
    fastener_tonnes: float
    direct_emissions_tco2e: float
    indirect_emissions_tco2e: float
    precursor: PrecursorInput

class CBAMAssessment(BaseModel):
    status: CBAMStatus
    total_embedded_emissions_tco2e: Optional[float]
    specific_embedded_emissions_per_tonne: Optional[float]
    critical_block_reasons: list[str]
    compliance_notes: list[str]

def evaluate_cbam_fastener_shipment(shipment: FastenerShipment) -> CBAMAssessment:
    """
    Evaluates 2026 CBAM definitive regime compliance for steel fastener exports (CN 731815).
    Enforces mandatory verified precursor (CN 7213) emissions.
    """
    blocks = []
    notes = []
    
    # 1. Precursor verification check
    is_wire_rod = shipment.precursor.cn_code.startswith("7213")
    if is_wire_rod:
        see_val = shipment.precursor.specific_embedded_emissions_tco2e_per_t
        if see_val is None or see_val <= 0:
            blocks.append(
                f"CRITICAL_BLOCK: Raw precursor wire rod (CN {shipment.precursor.cn_code}) "
                "is missing verified Specific Embedded Emissions (tCO2e/t). Under 2026 EU CBAM definitive regime, "
                "actual verified precursor data is strictly required."
            )
        elif not shipment.precursor.is_verified:
            blocks.append(
                f"CRITICAL_BLOCK: Raw precursor wire rod (CN {shipment.precursor.cn_code}) emissions "
                "are reported as unverified. Third-party accreditation verification is required for 2026 CBAM."
            )
            
    if blocks:
        return CBAMAssessment(
            status=CBAMStatus.CRITICAL_BLOCK,
            total_embedded_emissions_tco2e=None,
            specific_embedded_emissions_per_tonne=None,
            critical_block_reasons=blocks,
            compliance_notes=notes
        )
        
    # 2. Compute embedded emissions
    precursor_emissions = (
        shipment.precursor.consumed_tonnes * shipment.precursor.specific_embedded_emissions_tco2e_per_t
    )
    total_emissions = (
        shipment.direct_emissions_tco2e +
        shipment.indirect_emissions_tco2e +
        precursor_emissions
    )
    specific_emissions = total_emissions / shipment.fastener_tonnes
    
    notes.append(
        f"Fastener CN 731815 calculation successful. "
        f"Total SEE: {specific_emissions:.3f} tCO2e/t (Direct: {shipment.direct_emissions_tco2e:.2f}, "
        f"Indirect: {shipment.indirect_emissions_tco2e:.2f}, Precursor: {precursor_emissions:.2f} tCO2e)."
    )
    
    return CBAMAssessment(
        status=CBAMStatus.COMPLIANT,
        total_embedded_emissions_tco2e=round(total_emissions, 4),
        specific_embedded_emissions_per_tonne=round(specific_emissions, 4),
        critical_block_reasons=[],
        compliance_notes=notes
    )
```
