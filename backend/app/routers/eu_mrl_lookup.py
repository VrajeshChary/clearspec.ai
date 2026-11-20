from fastapi import APIRouter, HTTPException
from ..schemas.eu_mrl_lookup import (
    HsNormalizeRequest,
    HsNormalizeResponse,
    ChemicalLookupRequest,
    ChemicalLookupResponse,
)
from ..services.eu_mrl_lookup import (
    normalize_hs_code,
    lookup_chemical_mrl,
)

router = APIRouter(prefix="/mrl", tags=["EU MRL & CAS Lookup"])

@router.post("/normalize-hs", response_model=HsNormalizeResponse)
def normalize_hs(payload: HsNormalizeRequest):
    try:
        return normalize_hs_code(payload.hs_code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/lookup", response_model=ChemicalLookupResponse)
def lookup_substance_mrl(payload: ChemicalLookupRequest):
    try:
        return lookup_chemical_mrl(
            raw_hs_code=payload.effective_hs_code,
            cas_number=payload.cas_number,
            chemical_alias=payload.chemical_alias,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
