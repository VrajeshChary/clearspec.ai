import pytest
from app.services.eu_mrl_lookup import (
    normalize_hs_code,
    lookup_chemical_mrl,
    validate_cas_checksum,
)

def test_hs_normalization():
    # 8-digit Indian HS code for ground red chili: 09042211
    res = normalize_hs_code("09042211")
    assert res.hs4_prefix == "0904"
    assert res.hs6_prefix == "090422"
    assert "Capsicum" in res.description

def test_cas_checksum():
    assert validate_cas_checksum("75-21-8") is True
    assert validate_cas_checksum("2921-88-2") is True
    assert validate_cas_checksum("123-45-9") is False

def test_chemical_lookup_by_cas_priority():
    # Ethylene oxide via CAS
    res = lookup_chemical_mrl(
        raw_hs_code="09042211",
        cas_number="75-21-8",
        chemical_alias="random_alias",
    )
    assert res.matched is True
    assert res.match_tier == "CAS_NUMBER"
    assert res.commodity_hs4 == "0904"
    assert res.max_limit_mg_kg == 0.02

def test_chemical_lookup_by_alias_fallback():
    # Chlorpyrifos via trade name 'dursban'
    res = lookup_chemical_mrl(
        raw_hs_code="09042211",
        cas_number=None,
        chemical_alias="dursban",
    )
    assert res.matched is True
    assert res.match_tier == "ALIAS"
    assert res.cas_number == "2921-88-2"
    assert res.max_limit_mg_kg == 0.01
