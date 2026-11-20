---
name: unit-normalizer-skill
description: Normalizes chemical residue and contaminant test units into canonical mg/kg using Python pint and enforces the BLQ/ND vs MRL sensitivity trap check.
---

# Unit Normalizer & BLQ/ND Sensitivity Skill

## Purpose
This skill standardizes laboratory test result units into canonical `mg/kg` (ppm equivalent for mass/mass) and enforces the critical **"BLQ > MRL Trap"** compliance check for export regulations (e.g., EU Maximum Residue Limits).

---

## 1. Unit Normalization to Canonical `mg/kg`

All chemical residue concentrations must be converted to canonical milligrams per kilogram (`mg/kg`).

### Unit Conversion Table & Equivalencies
| Input Unit | Canonical Form | Factor to `mg/kg` | Notes |
| :--- | :--- | :--- | :--- |
| `mg/kg` | `mg/kg` | `1.0` | Base canonical unit |
| `ppm` | `mg/kg` | `1.0` | Parts per million (mass/mass: $1\text{ mg}/1\text{ kg}$) |
| `ug/kg` or `µg/kg` | `mg/kg` | `0.001` | Micrograms per kilogram ($10^{-3}\text{ mg/kg}$) |
| `ppb` | `mg/kg` | `0.001` | Parts per billion ($1\text{ ppb} = 1\,\mu\text{g/kg} = 0.001\text{ mg/kg}$) |
| `% w/w` or `%` | `mg/kg` | `10000.0` | Percent weight-by-weight ($1\% = 10,000\text{ mg/kg}$) |
| `g/kg` | `mg/kg` | `1000.0` | Grams per kilogram |

### Python `pint` Implementation Pattern
```python
import pint

ureg = pint.UnitRegistry()
# Define context or custom definitions if needed
ureg.define("percent_ww = 10000 * milligram / kilogram = %w/w")
ureg.define("ppb = microgram / kilogram")
ureg.define("ppm = milligram / kilogram")

def normalize_to_mg_per_kg(value: float, unit_str: str) -> float:
    """
    Converts incoming numeric value and unit string to canonical mg/kg.
    """
    clean_unit = (
        unit_str.strip()
        .replace("µg", "ug")
        .replace("% w/w", "percent_ww")
        .replace("%w/w", "percent_ww")
        .replace("%", "percent_ww")
    )
    
    quantity = value * ureg(clean_unit)
    target_quantity = quantity.to("milligram / kilogram")
    return float(target_quantity.magnitude)
```

---

## 2. The "BLQ > MRL Trap" Enforcement

### The Problem
When a laboratory issues a report with **BLQ** (*Below Limit of Quantification*) or **ND** (*Non-Detect*), non-technical evaluators may mistakenly classify the sample as compliant. However, if the lab instrument's Limit of Quantification (`lab_loq_value`) is higher than the legal Maximum Residue Limit (`max_limit_mg_kg`), the test is **legally inconclusive and non-compliant**. The lab instrument was not sensitive enough to detect residues between the legal MRL and the LOQ.

### Evaluation Logic
When processing lab test results:
1. Normalize both `lab_loq_value` and `max_limit_mg_kg` to canonical `mg/kg`.
2. Inspect report result status:
   - If status in `["BLQ", "ND", "BELOW_LOQ", "NON_DETECT", "<LOQ"]`:
     - Compare:
       $$\text{lab\_loq\_value}_{\text{canonical}} > \text{max\_limit\_mg\_kg}_{\text{canonical}}$$
     - If `True`:
       - **Classification:** `CRITICAL_BLOCK`
       - **Reason:** Lab instrument sensitivity failure ("BLQ > MRL Trap").
       - **Action:** Reject certificate. Require re-testing with an accredited laboratory using High-Resolution / Mass Spectrometry (LC-MS/MS or GC-MS/MS) capable of $\text{LOQ} \le \text{MRL}$.
     - If `False` ($\text{lab\_loq\_value} \le \text{max\_limit\_mg\_kg}$):
       - **Classification:** `PASS`
       - **Reason:** Confirmed below legal limit.
3. If numeric result is reported ($\text{detected\_value} > \text{LOQ}$):
   - Compare $\text{detected\_value} \le \text{max\_limit\_mg\_kg}$.
   - If greater, mark `CRITICAL_FAIL_EXCEEDED_MRL`.

### Code Implementation Spec
```python
from enum import Enum
from typing import Optional
from pydantic import BaseModel

class ComplianceStatus(str, Enum):
    PASS = "PASS"
    CRITICAL_BLOCK = "CRITICAL_BLOCK"
    CRITICAL_FAIL_EXCEEDED = "CRITICAL_FAIL_EXCEEDED"
    REQUIRES_REVIEW = "REQUIRES_REVIEW"

class LabEvaluationResult(BaseModel):
    status: ComplianceStatus
    compound_name: str
    detected_value_mg_kg: Optional[float]
    lab_loq_mg_kg: float
    max_limit_mg_kg: float
    trap_triggered: bool
    message: str

def evaluate_residue_compliance(
    compound_name: str,
    raw_status: str,
    raw_value: Optional[float],
    raw_unit: str,
    raw_loq_value: float,
    loq_unit: str,
    max_limit_mg_kg: float
) -> LabEvaluationResult:
    loq_mg_kg = normalize_to_mg_per_kg(raw_loq_value, loq_unit)
    is_blq = raw_status.upper().strip() in ["BLQ", "ND", "BELOW_LOQ", "NON_DETECT", "<LOQ"]
    
    if is_blq:
        if loq_mg_kg > max_limit_mg_kg:
            return LabEvaluationResult(
                status=ComplianceStatus.CRITICAL_BLOCK,
                compound_name=compound_name,
                detected_value_mg_kg=None,
                lab_loq_mg_kg=loq_mg_kg,
                max_limit_mg_kg=max_limit_mg_kg,
                trap_triggered=True,
                message=(
                    f"CRITICAL_BLOCK: BLQ > MRL Trap triggered for {compound_name}. "
                    f"Lab LOQ ({loq_mg_kg:.4f} mg/kg) exceeds legal MRL ({max_limit_mg_kg:.4f} mg/kg). "
                    "The laboratory equipment was not sensitive enough to verify regulatory compliance."
                )
            )
        return LabEvaluationResult(
            status=ComplianceStatus.PASS,
            compound_name=compound_name,
            detected_value_mg_kg=None,
            lab_loq_mg_kg=loq_mg_kg,
            max_limit_mg_kg=max_limit_mg_kg,
            trap_triggered=False,
            message=f"Compliant: Non-detect confirmed with sensitive instrument (LOQ {loq_mg_kg:.4f} <= MRL {max_limit_mg_kg:.4f} mg/kg)."
        )
    
    # Numeric reading present
    val_mg_kg = normalize_to_mg_per_kg(raw_value or 0.0, raw_unit)
    if val_mg_kg > max_limit_mg_kg:
        return LabEvaluationResult(
            status=ComplianceStatus.CRITICAL_FAIL_EXCEEDED,
            compound_name=compound_name,
            detected_value_mg_kg=val_mg_kg,
            lab_loq_mg_kg=loq_mg_kg,
            max_limit_mg_kg=max_limit_mg_kg,
            trap_triggered=False,
            message=f"CRITICAL FAIL: Detected residue {val_mg_kg:.4f} mg/kg exceeds legal MRL {max_limit_mg_kg:.4f} mg/kg."
        )
        
    return LabEvaluationResult(
        status=ComplianceStatus.PASS,
        compound_name=compound_name,
        detected_value_mg_kg=val_mg_kg,
        lab_loq_mg_kg=loq_mg_kg,
        max_limit_mg_kg=max_limit_mg_kg,
        trap_triggered=False,
        message=f"Compliant: Detected {val_mg_kg:.4f} mg/kg is within legal MRL {max_limit_mg_kg:.4f} mg/kg."
    )
```
