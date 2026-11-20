---
name: eu-mrl-cas-lookup-skill
description: Normalizes 8-digit Indian HS codes to 4-digit prefixes and performs hierarchical chemical lookups by CAS Registry Number first, then alias name against EU MRL databases.
---

# EU MRL & CAS Registry Lookup Skill

## Purpose
This skill provides instructions for mapping trade shipment product codes and active pesticide/chemical substances against European Union Maximum Residue Limit (EU MRL) databases (Regulation (EC) No 396/2005 and amendments).

---

## 1. HS Code Normalization (Indian ITC-HS to WCO/EU Chapter & Heading)

### Context
Indian export documentation frequently reports **8-digit ITC-HS codes** (e.g., `09042211` for crushed or ground red chili peppers). However, EU MRL commodity schedules, Annex I of Regulation (EC) No 396/2005, and TARIC classifications generally align with:
- **4-digit HS Heading** (e.g., `0904`: Pepper of the genus *Piper*; dried or crushed or ground fruits of the genus *Capsicum* or of the genus *Pimenta*)
- **6-digit WCO Subheading** (e.g., `090422`: Fruits of the genus *Capsicum* or *Pimenta*, crushed or ground)

### Normalization Rules
1. Strip all formatting (whitespace, periods, dashes) from input code.
2. Validate that the string consists of numeric characters.
3. Extract the **4-digit prefix** (`hs_code[:4]`) to determine the base agricultural commodity heading and product group.
4. Optionally extract the **6-digit prefix** (`hs_code[:6]`) for refined sub-commodity matching.
5. Query the commodity classification mapping:
   - Example:
     - `09042211` -> 4-digit prefix `0904` -> Commodity: *Capsicum spp. / Spices (fruits)*
     - `08061000` -> 4-digit prefix `0806` -> Commodity: *Grapes (table and wine)*
     - `10063010` -> 4-digit prefix `1006` -> Commodity: *Rice (semi-milled or wholly milled)*

```python
def normalize_hs_code(raw_code: str) -> dict:
    """
    Normalizes an 8-digit national HS code to standardized 4-digit and 6-digit prefixes.
    """
    clean_code = "".join(ch for ch in str(raw_code) if ch.isdigit())
    if len(clean_code) < 4:
        raise ValueError(f"Invalid HS code: {raw_code}. Must contain at least 4 digits.")
        
    return {
        "raw_code": raw_code,
        "clean_code": clean_code,
        "hs4_prefix": clean_code[:4],
        "hs6_prefix": clean_code[:6] if len(clean_code) >= 6 else None,
        "national_code": clean_code if len(clean_code) >= 8 else None,
    }
```

---

## 2. Chemical Identification & Hierarchical Lookup Priority

Trade lab reports often use trivial, trade, or IUPAC names that may differ from official EU pesticide legislation terminology. To ensure 100% deterministic matching without false negatives:

### Lookup Hierarchy:
1. **Tier 1: CAS Registry Number Lookup (Highest Priority)**
   - Regex validation: `^[0-9]{2,7}-[0-9]{2}-[0-9]$`
   - Calculate CAS checksum:
     $$\text{Check Digit} = \left(\sum_{i=1}^{N} d_i \times i\right) \bmod 10$$
   - Match against official EU pesticide active substance database where CAS is primary key.
   - Eliminates ambiguity across spelling variants (e.g., *Ethylene Oxide* vs *oxirane*, CAS `75-21-8`).

2. **Tier 2: Normalized Alias / Synonym Lookup (Secondary Priority)**
   - Used when CAS is omitted or unindexed in the raw certificate.
   - Clean string: lowercase, remove punctuation, strip `(sum of...)`, trim stereoisomer prefixes if querying parent definition.
   - Match against synonym and alias dictionaries (e.g., *Acephate*, *Chlorpyrifos*, *Tricyclazole*).

```python
import re
from typing import Optional, Dict, Any

CAS_REGEX = re.compile(r"^\d{2,7}-\d{2}-\d$")

def is_valid_cas(cas_str: str) -> bool:
    cas_str = cas_str.strip()
    if not CAS_REGEX.match(cas_str):
        return False
    digits = [int(c) for c in cas_str.replace("-", "")]
    check_digit = digits[-1]
    body_digits = digits[:-1]
    
    calc_sum = sum((idx + 1) * digit for idx, digit in enumerate(reversed(body_digits)))
    return (calc_sum % 10) == check_digit

def lookup_chemical_mrl(
    db_session: Any,
    commodity_code_hs4: str,
    cas_number: Optional[str] = None,
    chemical_alias: Optional[str] = None
) -> Dict[str, Any]:
    """
    Resolves the applicable EU MRL using CAS first, falling back to canonicalized alias.
    """
    substance = None
    
    # 1. CAS Number Lookup
    if cas_number and is_valid_cas(cas_number):
        substance = db_session.query_by_cas(cas_number.strip())
        
    # 2. Alias Fallback
    if not substance and chemical_alias:
        normalized_name = chemical_alias.strip().lower()
        substance = db_session.query_by_alias(normalized_name)
        
    if not substance:
        return {
            "found": False,
            "error": "SUBSTANCE_NOT_FOUND",
            "message": f"Could not match chemical with CAS '{cas_number}' or alias '{chemical_alias}'."
        }
        
    # Query MRL for (substance_id, commodity_code_hs4)
    mrl_record = db_session.query_mrl(substance_id=substance["id"], hs4=commodity_code_hs4)
    return {
        "found": True,
        "substance_id": substance["id"],
        "substance_name": substance["canonical_name"],
        "cas_number": substance.get("cas_number"),
        "commodity_hs4": commodity_code_hs4,
        "max_limit_mg_kg": mrl_record.get("mrl_mg_kg", 0.01), # EU default MRL is 0.01 mg/kg if not specified
        "regulation_reference": mrl_record.get("regulation_ref", "Regulation (EC) No 396/2005 default limit")
    }
```
