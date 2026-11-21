import re
import sqlite3
from typing import Optional, Dict, Any, Tuple
from ..schemas.eu_mrl_lookup import HsNormalizeResponse, ChemicalLookupResponse
from .statutory_db import get_db_connection, init_statutory_database

CAS_REGEX = re.compile(r"^\d{2,7}-\d{2}-\d$")

HS4_COMMODITY_MAPPING: Dict[str, str] = {
    "0904": "Pepper of the genus Piper; dried/crushed/ground fruits of the genus Capsicum or Pimenta (e.g. Red Chili)",
    "0806": "Grapes, fresh or dried",
    "1006": "Rice (including Basmati)",
    "0902": "Tea, whether or not flavored",
    "0909": "Seeds of anise, badian, fennel, coriander, cumin or caraway; juniper berries",
    "0910": "Ginger, saffron, turmeric (curcuma), thyme, bay leaves, curry and other spices",
    "1202": "Ground-nuts, not roasted or otherwise cooked",
    "0306": "Crustaceans, whether in shell or not (e.g. Frozen Shrimp)",
    "7318": "Screws, bolts, nuts, coach screws, screw hooks, rivets, cotters, cotter-pins, washers (including spring washers) and similar articles, of iron or steel",
}

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
    """Validates CAS Registry Number checksum."""
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
    market: str = "EU",
) -> ChemicalLookupResponse:
    """
    Performs real SQLite database lookup from backend/data/statutory_rules.db:
    1. Normalizes HS code to 4-digit prefix.
    2. Matches chemical by CAS Registry Number first.
    3. Falls back to chemical alias name via chemical_aliases table.
    4. Finds commodity-specific MRL by HS4 prefix, or default regulation limit.
    """
    init_statutory_database()
    hs_norm = normalize_hs_code(raw_hs_code)
    hs4 = hs_norm.hs4_prefix
    commodity_name = hs_norm.description

    clean_cas = cas_number.strip() if cas_number else None
    matched_cas = None
    match_tier = None
    canonical_name = None
    max_limit = None
    reg_ref = None

    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Tier 1: Match by CAS number directly
        if clean_cas:
            cursor.execute(
                "SELECT canonical_name, max_limit_mg_kg, regulation_reference FROM mrl_rules WHERE cas_number = ? AND hs4_prefix = ? AND market = ? LIMIT 1",
                (clean_cas, hs4, market)
            )
            row = cursor.fetchone()
            if not row:
                cursor.execute(
                    "SELECT canonical_name, max_limit_mg_kg, regulation_reference FROM mrl_rules WHERE cas_number = ? AND market = ? LIMIT 1",
                    (clean_cas, market)
                )
                row = cursor.fetchone()

            if row:
                matched_cas = clean_cas
                match_tier = "CAS_NUMBER"
                canonical_name = row["canonical_name"]
                max_limit = row["max_limit_mg_kg"]
                reg_ref = row["regulation_reference"]

        # Tier 2: Match by chemical alias / name in SQLite
        if not matched_cas and chemical_alias:
            alias_clean = chemical_alias.strip().lower()
            cursor.execute(
                "SELECT cas_number FROM chemical_aliases WHERE alias = ? LIMIT 1",
                (alias_clean,)
            )
            alias_row = cursor.fetchone()

            if not alias_row:
                # Substring or like match
                cursor.execute(
                    "SELECT cas_number FROM chemical_aliases WHERE alias LIKE ? OR ? LIKE ('%' || alias || '%') LIMIT 1",
                    (f"%{alias_clean}%", alias_clean)
                )
                alias_row = cursor.fetchone()

            if alias_row:
                found_cas = alias_row["cas_number"]
                cursor.execute(
                    "SELECT canonical_name, max_limit_mg_kg, regulation_reference FROM mrl_rules WHERE cas_number = ? AND hs4_prefix = ? AND market = ? LIMIT 1",
                    (found_cas, hs4, market)
                )
                row = cursor.fetchone()
                if not row:
                    cursor.execute(
                        "SELECT canonical_name, max_limit_mg_kg, regulation_reference FROM mrl_rules WHERE cas_number = ? AND market = ? LIMIT 1",
                        (found_cas, market)
                    )
                    row = cursor.fetchone()

                if row:
                    matched_cas = found_cas
                    match_tier = "ALIAS"
                    canonical_name = row["canonical_name"]
                    max_limit = row["max_limit_mg_kg"]
                    reg_ref = row["regulation_reference"]

        # Also check direct name match in mrl_rules if not found via aliases table
        if not matched_cas and chemical_alias:
            alias_clean = chemical_alias.strip().lower()
            cursor.execute(
                "SELECT cas_number, canonical_name, max_limit_mg_kg, regulation_reference FROM mrl_rules WHERE LOWER(canonical_name) LIKE ? AND hs4_prefix = ? LIMIT 1",
                (f"%{alias_clean}%", hs4)
            )
            row = cursor.fetchone()
            if not row:
                cursor.execute(
                    "SELECT cas_number, canonical_name, max_limit_mg_kg, regulation_reference FROM mrl_rules WHERE LOWER(canonical_name) LIKE ? LIMIT 1",
                    (f"%{alias_clean}%",)
                )
                row = cursor.fetchone()

            if row:
                matched_cas = row["cas_number"]
                match_tier = "NAME_SEARCH"
                canonical_name = row["canonical_name"]
                max_limit = row["max_limit_mg_kg"]
                reg_ref = row["regulation_reference"]
    finally:
        conn.close()

    if not matched_cas:
        return ChemicalLookupResponse(
            matched=False,
            match_tier=None,
            cas_number=cas_number,
            substance_name=chemical_alias,
            commodity_hs4=hs4,
            commodity_name=commodity_name,
            max_limit_mg_kg=0.01,
            regulation_reference="Regulation (EC) 396/2005 Article 18(1)(b) (Statutory Default LOQ)",
            notes=f"Substance not matched by CAS '{cas_number}' or alias '{chemical_alias}'. Default EU default limit of 0.01 mg/kg applies under Regulation (EC) 396/2005 Article 18(1)(b)."
        )

    return ChemicalLookupResponse(
        matched=True,
        match_tier=match_tier,
        cas_number=matched_cas,
        substance_name=canonical_name,
        commodity_hs4=hs4,
        commodity_name=commodity_name,
        max_limit_mg_kg=max_limit,
        regulation_reference=reg_ref,
        notes=f"Matched via SQLite database ({match_tier}). Normalized HS {raw_hs_code} -> 4-digit prefix {hs4}."
    )
