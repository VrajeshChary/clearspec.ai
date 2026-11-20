import re
from typing import Optional, Dict, Any, Tuple
from ..schemas.eu_mrl_lookup import HsNormalizeResponse, ChemicalLookupResponse

CAS_REGEX = re.compile(r"^\d{2,7}-\d{2}-\d$")

HS4_COMMODITY_MAPPING: Dict[str, str] = {
    "0904": "Pepper of the genus Piper; dried/crushed/ground fruits of the genus Capsicum or Pimenta (e.g. Red Chili)",
    "0806": "Grapes, fresh or dried",
    "1006": "Rice (including Basmati)",
    "0902": "Tea, whether or not flavored",
    "0909": "Seeds of anise, badian, fennel, coriander, cumin or caraway; juniper berries",
    "0910": "Ginger, saffron, turmeric (curcuma), thyme, bay leaves, curry and other spices",
    "1202": "Ground-nuts, not roasted or otherwise cooked",
}

# Seed chemical database: CAS as primary key + synonyms + MRL by HS4
CHEMICAL_DATABASE = [
    {
        "cas_number": "75-21-8",
        "canonical_name": "Ethylene oxide (sum of ethylene oxide and 2-chloro-ethanol expressed as ethylene oxide)",
        "aliases": ["ethylene oxide", "eto", "oxirane", "2-chloroethanol"],
        "mrls": {
            "0904": 0.02, # default LOQ MRL in mg/kg for spices
            "0902": 0.02,
            "0909": 0.02,
            "0910": 0.02,
            "1006": 0.01,
            "default": 0.01,
        },
        "regulation_reference": "Regulation (EU) 2020/1540 & Regulation (EU) 2022/1396",
    },
    {
        "cas_number": "2921-88-2",
        "canonical_name": "Chlorpyrifos",
        "aliases": ["chlorpyrifos", "chlorpyriphos", "dursban", "chlorpyrifos-ethyl"],
        "mrls": {
            "0904": 0.01, # Ban / reduced to LOQ
            "0806": 0.01,
            "1006": 0.01,
            "default": 0.01,
        },
        "regulation_reference": "Regulation (EU) 2020/1085",
    },
    {
        "cas_number": "41814-78-2",
        "canonical_name": "Tricyclazole",
        "aliases": ["tricyclazole", "beam", "tricyclazol"],
        "mrls": {
            "1006": 0.01, # Strict 0.01 mg/kg for basmati rice
            "default": 0.01,
        },
        "regulation_reference": "Regulation (EU) 2017/626",
    },
    {
        "cas_number": "135410-20-7",
        "canonical_name": "Acetamiprid",
        "aliases": ["acetamiprid", "mospilan", "assail"],
        "mrls": {
            "0904": 0.50, # mg/kg
            "0806": 0.01,
            "0902": 0.05,
            "default": 0.01,
        },
        "regulation_reference": "Regulation (EU) 2023/1029",
    },
    {
        "cas_number": "138261-41-3",
        "canonical_name": "Imidacloprid",
        "aliases": ["imidacloprid", "confidor", "gaucho"],
        "mrls": {
            "0904": 0.01,
            "0806": 0.01,
            "1006": 0.01,
            "default": 0.01,
        },
        "regulation_reference": "Regulation (EU) 2024/331",
    },
    {
        "cas_number": "41198-08-7",
        "canonical_name": "Profenofos",
        "aliases": ["profenofos", "curacron", "profenophos"],
        "mrls": {
            "0904": 0.05, # mg/kg for chili
            "default": 0.01,
        },
        "regulation_reference": "Regulation (EU) 2021/618",
    },
]

def normalize_hs_code(raw_code: str) -> HsNormalizeResponse:
    """
    Normalizes 8-digit Indian ITC-HS code to 4-digit and 6-digit prefix.
    """
    clean_digits = "".join(ch for ch in str(raw_code) if ch.isdigit())
    if len(clean_digits) < 4:
        raise ValueError(f"HS Code must contain at least 4 digits, received: '{raw_code}'")
        
    hs4 = clean_digits[:4]
    hs6 = clean_digits[:6] if len(clean_digits) >= 6 else None
    desc = HS4_COMMODITY_MAPPING.get(hs4, "Agricultural commodity (General Schedule)")
    
    return HsNormalizeResponse(
        raw_code=raw_code,
        clean_code=clean_digits,
        hs4_prefix=hs4,
        hs6_prefix=hs6,
        description=desc,
    )

def validate_cas_checksum(cas_str: str) -> bool:
    cas_str = cas_str.strip()
    if not CAS_REGEX.match(cas_str):
        return False
    digits = [int(c) for c in cas_str.replace("-", "")]
    check_digit = digits[-1]
    body_digits = digits[:-1]
    
    total = sum((i + 1) * digit for i, digit in enumerate(reversed(body_digits)))
    return (total % 10) == check_digit

def lookup_chemical_mrl(
    raw_hs_code: str,
    cas_number: Optional[str] = None,
    chemical_alias: Optional[str] = None,
) -> ChemicalLookupResponse:
    """
    Performs database lookup:
    1. Normalizes HS code to 4-digit prefix
    2. Matches chemical by CAS Registry Number first
    3. Falls back to chemical alias name
    """
    hs_norm = normalize_hs_code(raw_hs_code)
    hs4 = hs_norm.hs4_prefix
    commodity_name = hs_norm.description
    
    matched_entry = None
    match_tier = None
    
    # 1. Match by CAS Number (Tier 1 Priority)
    if cas_number:
        clean_cas = cas_number.strip()
        for item in CHEMICAL_DATABASE:
            if item["cas_number"] == clean_cas:
                matched_entry = item
                match_tier = "CAS_NUMBER"
                break
                
    # 2. Match by Alias / Name (Tier 2 Priority)
    if not matched_entry and chemical_alias:
        clean_alias = chemical_alias.strip().lower()
        for item in CHEMICAL_DATABASE:
            aliases_lower = [a.lower() for a in item["aliases"]]
            if clean_alias in aliases_lower or clean_alias in item["canonical_name"].lower():
                matched_entry = item
                match_tier = "ALIAS"
                break
                
    if not matched_entry:
        return ChemicalLookupResponse(
            matched=False,
            match_tier=None,
            cas_number=cas_number,
            substance_name=chemical_alias,
            commodity_hs4=hs4,
            commodity_name=commodity_name,
            max_limit_mg_kg=None,
            regulation_reference=None,
            notes=f"Substance not matched by CAS '{cas_number}' or alias '{chemical_alias}'. Default EU default limit of 0.01 mg/kg applies under Regulation (EC) 396/2005 Article 18(1)(b)."
        )
        
    mrl_val = matched_entry["mrls"].get(hs4, matched_entry["mrls"].get("default", 0.01))
    
    return ChemicalLookupResponse(
        matched=True,
        match_tier=match_tier,
        cas_number=matched_entry["cas_number"],
        substance_name=matched_entry["canonical_name"],
        commodity_hs4=hs4,
        commodity_name=commodity_name,
        max_limit_mg_kg=mrl_val,
        regulation_reference=matched_entry["regulation_reference"],
        notes=f"Matched via {match_tier}. Normalized HS {raw_hs_code} -> 4-digit prefix {hs4}."
    )
