from typing import List, Tuple
from ..schemas.cbam_calculator import (
    CBAMAssessmentStatus,
    FastenerShipmentEvaluationRequest,
    FastenerShipmentEvaluationResponse,
)

def evaluate_fastener_cbam_shipment(
    request: FastenerShipmentEvaluationRequest,
) -> FastenerShipmentEvaluationResponse:
    """
    Evaluates steel fastener exports (CN 731815) under 2026 EU CBAM definitive regime.
    Mandates verified Specific Embedded Emissions (tCO2e/t) for precursor wire rod (CN 7213).
    """
    critical_blocks: List[str] = []
    
    clean_export_cn = "".join(ch for ch in request.export_cn_code if ch.isdigit())
    precursor_cn = "".join(ch for ch in request.precursor_wire_rod.cn_code if ch.isdigit())
    
    # Verify export goods are steel fasteners (CN 731815 or heading 7318)
    if not clean_export_cn.startswith("7318"):
        critical_blocks.append(
            f"Scope mismatch: Export code {request.export_cn_code} is outside CBAM steel fastener scope (CN 7318)."
        )
        
    # Check precursor wire rod (CN 7213)
    is_wire_rod_precursor = precursor_cn.startswith("7213") or precursor_cn.startswith("7227")
    precursor_see = request.precursor_wire_rod.specific_embedded_emissions_tco2e_per_t
    precursor_verified = request.precursor_wire_rod.is_verified
    
    if is_wire_rod_precursor:
        if precursor_see is None or precursor_see <= 0:
            critical_blocks.append(
                f"CRITICAL_BLOCK: Raw precursor wire rod (CN {request.precursor_wire_rod.cn_code}) "
                f"tonnage ({request.precursor_wire_rod.tonnage_consumed} t) is missing verified "
                "Specific Embedded Emissions (tCO2e/t). Under Regulation (EU) 2023/956 (2026 definitive regime), "
                "actual verified precursor emissions data is mandatory; default values are disallowed."
            )
        elif not precursor_verified:
            critical_blocks.append(
                f"CRITICAL_BLOCK: Raw precursor wire rod (CN {request.precursor_wire_rod.cn_code}) emissions "
                f"({precursor_see:.3f} tCO2e/t) lack third-party accreditation verification. "
                "2026 EU CBAM mandates accredited verification per ISO 14065 / EU CBAM Verifier standards."
            )
    else:
        critical_blocks.append(
            f"CRITICAL_BLOCK: Steel fasteners (CN 731815) require raw wire rod precursor (CN 7213 / CN 7227). "
            f"Provided precursor code: {request.precursor_wire_rod.cn_code}."
        )

    if critical_blocks:
        return FastenerShipmentEvaluationResponse(
            shipment_reference=request.shipment_reference,
            export_cn_code=request.export_cn_code,
            status=CBAMAssessmentStatus.CRITICAL_BLOCK,
            total_embedded_emissions_tco2e=None,
            specific_embedded_emissions_tco2e_per_t=None,
            critical_blocks=critical_blocks,
            compliance_summary="Declaration blocked: Missing verified precursor wire rod emissions data.",
        )

    # Compute embedded emissions
    precursor_tonnes = request.precursor_wire_rod.tonnage_consumed
    precursor_emissions = precursor_tonnes * precursor_see
    total_embedded = (
        request.direct_emissions_tco2e +
        request.indirect_emissions_tco2e +
        precursor_emissions
    )
    see_per_tonne = total_embedded / request.fastener_tonnage
    
    summary = (
        f"Compliant 2026 CBAM Assessment: Total embedded emissions: {total_embedded:.2f} tCO2e. "
        f"Specific Embedded Emissions: {see_per_tonne:.4f} tCO2e/t fastener. "
        f"Precursor CN 7213 verified by {request.precursor_wire_rod.verifier_accreditation_body or 'Accredited Verifier'}."
    )

    return FastenerShipmentEvaluationResponse(
        shipment_reference=request.shipment_reference,
        export_cn_code=request.export_cn_code,
        status=CBAMAssessmentStatus.COMPLIANT,
        total_embedded_emissions_tco2e=round(total_embedded, 4),
        specific_embedded_emissions_tco2e_per_t=round(see_per_tonne, 4),
        critical_blocks=[],
        compliance_summary=summary,
    )
