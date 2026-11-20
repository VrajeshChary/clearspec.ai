from typing import Optional, List
from pydantic import BaseModel, Field

class HsNormalizeRequest(BaseModel):
    hs_code: str = Field(..., description="Indian 8-digit ITC-HS or standard HS code")

class HsNormalizeResponse(BaseModel):
    raw_code: str
    clean_code: str
    hs4_prefix: str
    hs6_prefix: Optional[str]
    description: Optional[str]

class ChemicalLookupRequest(BaseModel):
    hs_code: str = Field(..., description="8-digit or 4-digit HS code")
    cas_number: Optional[str] = Field(None, description="CAS Registry Number (e.g. 75-21-8)")
    chemical_alias: Optional[str] = Field(None, description="Trade name or common chemical synonym")

class ChemicalLookupResponse(BaseModel):
    matched: bool
    match_tier: Optional[str]  # "CAS_NUMBER", "ALIAS", or None
    cas_number: Optional[str]
    substance_name: Optional[str]
    commodity_hs4: str
    commodity_name: Optional[str]
    max_limit_mg_kg: Optional[float]
    regulation_reference: Optional[str]
    notes: Optional[str]
