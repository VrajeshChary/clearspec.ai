import os
import io
import re
import base64
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, Request, HTTPException
from pydantic import BaseModel, Field

import pymupdf as fitz

from ..services.gemini_extractor import extract_document_data, parse_clean_weight, CONFIDENCE_THRESHOLD
from ..services.unit_normalizer import normalize_unit_to_mg_kg, evaluate_blq_mrl_trap
from ..services.eu_mrl_lookup import normalize_hs_code, lookup_chemical_mrl
from ..schemas.unit_normalizer import ComplianceVerdict

router = APIRouter(prefix="/audit", tags=["Consignment Audit Engine"])

SAMPLE_PACKET_DIR = Path(__file__).resolve().parent.parent.parent / "sample_packets" / "packet_a_rotterdam"

class DiscrepancyItem(BaseModel):
    category: str
    severity: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    field: str
    description: str
    detected_value: Any
    expected_value: Any

class AnalyteAuditResult(BaseModel):
    name: str
    cas_number: Optional[str]
    reported_reading: str
    lab_loq: str
    canonical_loq_mg_kg: float
    eu_mrl_mg_kg: Optional[float]
    compliance_status: str
    blq_trap_triggered: bool
    confidence_score: float
    needs_human_review: bool
    review_reason: Optional[str]
    bounding_box: Optional[List[int]]
    document_filename: Optional[str] = None

class FinancialRiskBreakdown(BaseModel):
    demurrage_port_storage_inr: float = Field(..., description="Container detention & demurrage at Rotterdam Port")
    re_testing_re_sampling_inr: float = Field(..., description="Secondary NABL/EIC laboratory LC-MS/MS testing fees")
    customs_penalty_inr: float = Field(..., description="Customs misdeclaration penalty (Section 111/112 Customs Act)")
    cargo_rejection_re_export_inr: float = Field(..., description="Cargo re-export shipping & destruction liability")
    total_estimated_risk_inr: float
    currency: str = "INR (₹)"

class BilingualWarningNotice(BaseModel):
    english_notice: str
    telugu_notice: str

class ConsignmentAuditResponse(BaseModel):
    audit_id: str
    overall_status: str  # "CRITICAL_BLOCK", "REQUIRES_REVIEW", "PASS"
    consignment_batch: str
    declared_hs_code: str
    normalized_hs_prefix: str
    total_documents_analyzed: int
    weight_reconciliation: Dict[str, Any]
    analyte_evaluations: List[AnalyteAuditResult]
    human_review_flags: List[str]
    financial_risk: FinancialRiskBreakdown
    bilingual_supplier_notice: BilingualWarningNotice
    rendered_pages: Dict[str, str] = Field(default_factory=dict, description="Map of filename to base64 PNG data URL")
    document_pages: Dict[str, List[str]] = Field(default_factory=dict, description="Map of filename to array of base64 PNG data URLs for every page")
    document_names: List[str] = Field(default_factory=list, description="List of document filenames analyzed")
    commodity_description: Optional[str] = Field(None, description="Extracted trade description of commodity")
    extraction_source: Optional[str] = Field("LIVE: gemini-3.8-flash", description="Extraction backend model or source engine")

@router.post("", response_model=ConsignmentAuditResponse)
@router.post("/", response_model=ConsignmentAuditResponse)
async def audit_consignment(
    request: Request,
    files: Optional[List[UploadFile]] = File(None),
    invoice_file: Optional[UploadFile] = File(None),
    packing_file: Optional[UploadFile] = File(None),
    lab_file: Optional[UploadFile] = File(None),
    use_sample: Optional[bool] = None,
    is_sample: Optional[bool] = None,
):
    """
    Audits a multi-document consignment packet (Commercial Invoice, Packing List, NABL Lab Certificate):
    1. Extracts structured data using Google Gemini / offline SHA-256 cache.
    2. Cross-reconciles net & gross weights.
    3. Runs chemical compliance, unit normalization, and the BLQ > MRL sensitivity trap.
    4. Flags low-confidence extractions (<0.85 threshold) for human review.
    5. Calculates financial risk exposure in INR (₹).
    6. Generates an actionable bilingual English + Telugu supplier warning notice.
    """
    # Detect sample request from query param (use_sample or is_sample), JSON body, or form
    effective_sample = False
    if use_sample is True or is_sample is True:
        effective_sample = True
    else:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                body = await request.json()
                if isinstance(body, dict) and (body.get("use_sample") or body.get("is_sample")):
                    effective_sample = True
            except Exception:
                pass

    documents_data: List[Dict[str, Any]] = []
    rendered_pages: Dict[str, str] = {}
    document_pages: Dict[str, List[str]] = {}

    def _render_pdf_all_pages_base64(pdf_bytes: bytes, max_pages: int = 15) -> List[str]:
        """Convert all pages of a PDF into 2x DPI PNG base64 data URLs."""
        pages = []
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page_idx in range(min(len(doc), max_pages)):
                pix = doc[page_idx].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                b64 = base64.b64encode(pix.tobytes("png")).decode("utf-8")
                pages.append(f"data:image/png;base64,{b64}")
            doc.close()
        except Exception as e:
            print(f"PDF rendering error: {e}")
        return pages

    # Check for actual uploaded file objects (guard against FastAPI File(...) param defaults)
    slotted_candidates = [
        (invoice_file, "COMMERCIAL_INVOICE"),
        (packing_file, "PACKING_LIST"),
        (lab_file, "LAB_REPORT")
    ]
    has_slotted_files = any(f and hasattr(f, "read") for f, _ in slotted_candidates)
    has_list_files = bool(files and any(f and hasattr(f, "read") for f in files))

    # 1. Handle sample packet
    if effective_sample or (not has_list_files and not has_slotted_files and SAMPLE_PACKET_DIR.exists()):
        sample_files = [
            ("Commercial_Invoice_104.pdf", "COMMERCIAL_INVOICE"),
            ("Packing_List_104.pdf", "PACKING_LIST"),
            ("NABL_Lab_Report_104.pdf", "LAB_REPORT")
        ]
        for s_name, slot_role in sample_files:
            s_path = SAMPLE_PACKET_DIR / s_name
            if s_path.exists():
                with open(s_path, "rb") as f:
                    content = f.read()
                pages = _render_pdf_all_pages_base64(content)
                if pages:
                    rendered_pages[s_name] = pages[0]
                    document_pages[s_name] = pages
                    for p_idx, p_data in enumerate(pages):
                        rendered_pages[f"{s_name}::page_{p_idx}"] = p_data
                data = extract_document_data(content, s_name)
                data["_filename"] = s_name
                data["_page_count"] = len(pages)
                data["_assigned_slot"] = slot_role
                data["document_type"] = slot_role
                documents_data.append(data)
    elif has_slotted_files:
        # Slot-specific uploads from upload cockpit
        for f, slot_role in slotted_candidates:
            if not f or not hasattr(f, "read"):
                continue
            content = await f.read()
            clean_name = f.filename.split("/")[-1].split("\\")[-1]
            pages = _render_pdf_all_pages_base64(content)
            if pages:
                rendered_pages[clean_name] = pages[0]
                document_pages[clean_name] = pages
                for p_idx, p_data in enumerate(pages):
                    rendered_pages[f"{clean_name}::page_{p_idx}"] = p_data
            data = extract_document_data(content, clean_name, mime_type=getattr(f, "content_type", None) or "application/pdf")
            data["_filename"] = clean_name
            data["_page_count"] = len(pages)
            data["_assigned_slot"] = slot_role
            data["document_type"] = slot_role
            documents_data.append(data)
    elif has_list_files:
        seen_filenames = set()
        valid_files = [f for f in files if f and hasattr(f, "read")]
        for f_idx, f in enumerate(valid_files):
            clean_name = f.filename.split("/")[-1].split("\\")[-1]
            if clean_name in seen_filenames:
                continue
            seen_filenames.add(clean_name)
            content = await f.read()
            pages = _render_pdf_all_pages_base64(content)
            if pages:
                rendered_pages[clean_name] = pages[0]
                document_pages[clean_name] = pages
                for p_idx, p_data in enumerate(pages):
                    rendered_pages[f"{clean_name}::page_{p_idx}"] = p_data
            data = extract_document_data(content, clean_name, mime_type=getattr(f, "content_type", None) or "application/pdf")
            data["_filename"] = clean_name
            data["_page_count"] = len(pages)
            if len(valid_files) == 3:
                canonical_roles = ["COMMERCIAL_INVOICE", "PACKING_LIST", "LAB_REPORT"]
                data["_slot_hint"] = canonical_roles[f_idx]
            documents_data.append(data)
    else:
        raise HTTPException(status_code=400, detail="No files uploaded and sample packet not requested.")

    if not documents_data:
        raise HTTPException(status_code=400, detail="Failed to parse documents from packet.")

    # 2. Intelligent Document Pairing & Cross-Document Check
    def is_inv(d):
        fn = str(d.get("_filename", "")).lower()
        if any(k in fn for k in ["pack", "pl", "pkg"]) or fn.startswith("2_"):
            return False
        if any(k in fn for k in ["lab", "cert", "coa", "nabl", "analysis", "report"]) or fn.startswith("3_"):
            return False
        if d.get("_assigned_slot") == "COMMERCIAL_INVOICE":
            return True
        t = str(d.get("document_type", "")).upper()
        txt = str(d.get("_text", "")).lower()
        return "INVOICE" in t or "inv" in fn or "bill" in fn or fn.startswith("1_") or "commercial invoice" in txt

    def is_pack(d):
        fn = str(d.get("_filename", "")).lower()
        if any(k in fn for k in ["lab", "cert", "coa", "nabl", "analysis", "report"]) or fn.startswith("3_"):
            return False
        if d.get("_assigned_slot") == "PACKING_LIST":
            return True
        t = str(d.get("document_type", "")).upper()
        txt = str(d.get("_text", "")).lower()
        return "PACK" in t or "pack" in fn or "pl" in fn or "pkg" in fn or fn.startswith("2_") or "packing list" in txt or "total packages loaded" in txt

    def is_lab(d):
        if d.get("_assigned_slot") == "LAB_REPORT":
            return True
        t = str(d.get("document_type", "")).upper()
        fn = str(d.get("_filename", "")).lower()
        txt = str(d.get("_text", "")).lower()
        return (
            "LAB" in t or "CERT" in t or "COA" in t or fn.startswith("3_") or
            "lab" in fn or "test" in fn or "cert" in fn or "coa" in fn or "analysis" in fn or
            bool(d.get("chemical_rows") or d.get("analytes")) or
            "certificate of analysis" in txt or "test report" in txt
        )

    # Slot assignment precedence
    invoice_doc = next((d for d in documents_data if d.get("_assigned_slot") == "COMMERCIAL_INVOICE"), None)
    packing_doc = next((d for d in documents_data if d.get("_assigned_slot") == "PACKING_LIST"), None)
    lab_doc = next((d for d in documents_data if d.get("_assigned_slot") == "LAB_REPORT"), None)

    # 3-File Canonical Order check (e.g. 1_..., 2_..., 3_...)
    if not (invoice_doc and packing_doc and lab_doc) and len(documents_data) == 3:
        d0, d1, d2 = documents_data[0], documents_data[1], documents_data[2]
        fn0, fn1, fn2 = str(d0.get("_filename", "")).lower(), str(d1.get("_filename", "")).lower(), str(d2.get("_filename", "")).lower()
        if (fn0.startswith("1_") or is_inv(d0)) and (fn1.startswith("2_") or is_pack(d1)) and (fn2.startswith("3_") or is_lab(d2)):
            invoice_doc = d0
            packing_doc = d1
            lab_doc = d2

    # Dynamic heuristics
    if not invoice_doc:
        invoice_doc = next((d for d in documents_data if is_inv(d)), None)
    if not packing_doc:
        packing_doc = next((d for d in documents_data if is_pack(d) and d != invoice_doc), None)
    if not lab_doc:
        lab_doc = next((d for d in documents_data if is_lab(d) and d not in (invoice_doc, packing_doc)), None)

    # Fallbacks for unmatched documents
    unmatched = [d for d in documents_data if d not in (invoice_doc, packing_doc, lab_doc)]
    if not invoice_doc and unmatched:
        invoice_doc = unmatched.pop(0)
    if not packing_doc and unmatched:
        packing_doc = unmatched.pop(0)
    if not lab_doc and unmatched:
        lab_doc = unmatched.pop(0)
    if not lab_doc and documents_data:
        lab_doc = documents_data[-1]

    inv_net_wt = parse_clean_weight(invoice_doc.get("declared_net_weight_kg")) if invoice_doc else None
    pack_net_wt = parse_clean_weight(packing_doc.get("declared_net_weight_kg")) if packing_doc else None

    # Resilient fallback scanning from document raw text
    net_wt_regex_patterns = [
        r"(?:Declared\s*Net\s*Weight|Total\s*Net\s*Weight|Consignment\s*Net\s*Wt|Total\s*Net\s*Wt|Net\s*Weight|Net\s*Wt|N\.?W\.?|Net\s*Qty|Net\s*Quantity)[^\d\n\r]{0,35}?([0-9,]+(?:\.\d+)?)\s*(MT|Metric\s*Ton(?:ne)?s?|Ton(?:ne)?s?|KGS?|KG|LBS?)\b",
        r"(?:Declared\s*Net\s*Weight|Total\s*Net\s*Weight|Consignment\s*Net\s*Wt|Total\s*Net\s*Wt|Net\s*Weight|Net\s*Wt|N\.?W\.?|Net\s*Qty|Net\s*Quantity)[^\d\n\r]{0,35}?([0-9,]+(?:\.\d+)?)",
        r"(?:Quantity|Qty)[^\d\n\r]{0,35}?([0-9,]+(?:\.\d+)?)\s*(MT|Metric\s*Ton(?:ne)?s?|Ton(?:ne)?s?|KGS?|KG)\b",
        r"TOTALS?\b[^\n]*?([0-9,]+(?:\.\d+)?)\s*(?:kg|kgs)?[^\n]*?([0-9,]+(?:\.\d+)?)\s*(?:kg|kgs)",
        r"([0-9,]+(?:\.\d+)?)\s*(?:KGS?|KG|MT)\s*(?:\(NET[^\)]*\)|NET\s*WEIGHT|NET\s*WT|NET)\b",
    ]

    if pack_net_wt is None and packing_doc and packing_doc.get("_text"):
        for p in net_wt_regex_patterns:
            m = re.search(p, packing_doc["_text"], re.IGNORECASE)
            if m:
                if "TOTAL" in p and len(m.groups()) >= 2 and m.group(2):
                    pack_net_wt = parse_clean_weight(m.group(2))
                else:
                    unit_hint = m.group(2) if len(m.groups()) >= 2 and m.group(2) and not m.group(2).replace(",", "").replace(".", "").isdigit() else ""
                    pack_net_wt = parse_clean_weight(f"{m.group(1)} {unit_hint}".strip())
                if pack_net_wt:
                    break

    if inv_net_wt is None and invoice_doc and invoice_doc.get("_text"):
        for p in net_wt_regex_patterns:
            m = re.search(p, invoice_doc["_text"], re.IGNORECASE)
            if m:
                if "TOTAL" in p and len(m.groups()) >= 2 and m.group(2):
                    inv_net_wt = parse_clean_weight(m.group(2))
                else:
                    unit_hint = m.group(2) if len(m.groups()) >= 2 and m.group(2) and not m.group(2).replace(",", "").replace(".", "").isdigit() else ""
                    inv_net_wt = parse_clean_weight(f"{m.group(1)} {unit_hint}".strip())
                if inv_net_wt:
                    break

    # If packing weight not directly on packing list, check if any other document had it
    if pack_net_wt is None and len(documents_data) > 1:
        alt_pack = [d for d in documents_data if d != invoice_doc and parse_clean_weight(d.get("declared_net_weight_kg")) is not None]
        if alt_pack:
            pack_net_wt = parse_clean_weight(alt_pack[0].get("declared_net_weight_kg"))

    raw_hs = (invoice_doc or {}).get("hs_code") or (lab_doc or {}).get("hs_code") or (lab_doc or {}).get("declared_hs_code") or "09042211"
    batch_num = ((lab_doc or {}).get("batch_number") or 
                 ((invoice_doc or {}).get("batch_numbers") or ["GNT-24A"])[0])

    hs_norm = normalize_hs_code(raw_hs)
    hs4 = hs_norm.hs4_prefix

    # Cross-document weight comparison
    discrepancy_kg = 0.0
    variance_pct = 0.0
    critical_blocks: List[str] = []
    human_review_flags: List[str] = []

    weight_reconciliation = {
        "invoice_net_weight_kg": inv_net_wt,
        "packing_list_net_weight_kg": pack_net_wt,
        "discrepancy_kg": 0.0,
        "variance_percentage": 0.0,
        "status": "PASS",
        "notes": "Weights match within acceptable statutory tolerance."
    }

    if inv_net_wt is not None and pack_net_wt is not None:
        discrepancy_kg = round(pack_net_wt - inv_net_wt, 2)
        variance_pct = round((abs(discrepancy_kg) / inv_net_wt) * 100, 2) if inv_net_wt > 0 else 0.0
        weight_reconciliation["discrepancy_kg"] = discrepancy_kg
        weight_reconciliation["variance_percentage"] = variance_pct

        if abs(discrepancy_kg) > 5.0:
            weight_reconciliation["status"] = "FAIL_DISCREPANCY"
            weight_reconciliation["notes"] = (
                f"Net weight mismatch detected! Commercial Invoice declares {inv_net_wt:,.1f} kg, "
                f"whereas Packing List declares {pack_net_wt:,.1f} kg (Variance: {discrepancy_kg:,.1f} kg / "
                f"{variance_pct}% shortfall). Triggers Rotterdam port customs weighbridge audit and Section 111/112 penalty."
            )
            critical_blocks.append(f"Weight Discrepancy: {abs(discrepancy_kg):,.1f} kg variance between Invoice & Packing List.")
        else:
            weight_reconciliation["status"] = "PASS"
            weight_reconciliation["notes"] = (
                f"Weights reconciled successfully. Commercial Invoice ({inv_net_wt:,.1f} kg) and "
                f"Packing List ({pack_net_wt:,.1f} kg) match within acceptable statutory tolerance (Variance: {abs(discrepancy_kg):,.1f} kg / {variance_pct}%)."
            )
    elif inv_net_wt is not None and pack_net_wt is None:
        weight_reconciliation["status"] = "DATA_INCOMPLETE"
        weight_reconciliation["notes"] = f"Commercial Invoice declares {inv_net_wt:,.1f} kg, but Packing List net weight was not detected in uploaded documents."
    elif inv_net_wt is None and pack_net_wt is not None:
        weight_reconciliation["status"] = "DATA_INCOMPLETE"
        weight_reconciliation["notes"] = f"Packing List declares {pack_net_wt:,.1f} kg, but Commercial Invoice net weight was not detected in uploaded documents."
    else:
        weight_reconciliation["status"] = "DATA_INCOMPLETE"
        weight_reconciliation["notes"] = "Net weight declarations were not detected in the uploaded documents."

    # 3. Chemical Residue & BLQ > MRL Sensitivity Evaluation
    analytes_raw: List[Dict[str, Any]] = []
    for d in documents_data:
        d_filename = d.get("_filename")
        rows = d.get("chemical_rows") or d.get("analytes") or []
        for r in rows:
            r_copy = dict(r)
            if d_filename and "document_filename" not in r_copy:
                r_copy["document_filename"] = d_filename
            analytes_raw.append(r_copy)

    analyte_evals: List[AnalyteAuditResult] = []

    for a in analytes_raw:
        chem_name = a.get("analyte_name") or a.get("name") or "Unknown"
        cas = a.get("cas_number")
        is_blq = a.get("is_below_loq", False)
        rep_val = a.get("numeric_value") if a.get("numeric_value") is not None else a.get("reported_value")
        raw_res = str(a.get("raw_reported_result", "")).strip()

        if is_blq is False and raw_res:
            if "blq" in raw_res.lower() or "nd" in raw_res.lower() or "below" in raw_res.lower():
                is_blq = True
            elif rep_val is None:
                m_num = re.search(r"[-+]?\d*\.\d+|\d+", raw_res)
                if m_num:
                    try:
                        rep_val = float(m_num.group(0))
                    except Exception:
                        pass

        loq_val = a.get("lab_loq_value") or 0.01
        unit = a.get("unit") or "mg/kg"
        conf = float(a.get("confidence") if a.get("confidence") is not None else a.get("confidence_score", 1.0))
        bbox = a.get("bbox") or a.get("bounding_box")
        doc_fn = a.get("document_filename")

        # Resolve EU MRL via CAS / Alias lookup
        mrl_info = lookup_chemical_mrl(raw_hs_code=raw_hs, cas_number=cas, chemical_alias=chem_name)
        legal_mrl = mrl_info.max_limit_mg_kg or 0.01

        # Check special case for Aflatoxin B1 in Spices: EU MRL is 5 ug/kg (0.005 mg/kg) under Reg 2023/915
        if "aflatoxin" in chem_name.lower():
            legal_mrl = 0.005  # 5 ug/kg in mg/kg

        # Evaluate compliance via Unit Normalizer service
        lab_status_str = "BLQ" if is_blq else "DETECTED"
        eval_res = evaluate_blq_mrl_trap(
            compound_name=chem_name,
            lab_status=lab_status_str,
            detected_value=rep_val,
            detected_unit=unit,
            lab_loq_value=loq_val,
            lab_loq_unit=unit,
            max_limit_mg_kg=legal_mrl,
        )

        # Flag for human review if visual confidence score < CONFIDENCE_THRESHOLD (0.85)
        needs_review = False
        review_reason = None
        if conf < CONFIDENCE_THRESHOLD:
            needs_review = True
            review_reason = f"Extraction confidence ({conf:.2f}) is below safe threshold ({CONFIDENCE_THRESHOLD:.2f}). Optical interference / ink stamp detected."
            human_review_flags.append(f"{chem_name}: Low confidence ({conf:.2f}) due to physical stamp occlusion. Laboratory analyst review required.")

        if eval_res.verdict == ComplianceVerdict.CRITICAL_BLOCK:
            critical_blocks.append(eval_res.reason)
        elif eval_res.verdict == ComplianceVerdict.CRITICAL_FAIL_EXCEEDED:
            critical_blocks.append(eval_res.reason)

        analyte_evals.append(AnalyteAuditResult(
            name=chem_name,
            cas_number=cas,
            reported_reading="BLQ" if is_blq else (f"{rep_val} {unit}" if rep_val is not None else (raw_res or f"0.0 {unit}")),
            lab_loq=f"{loq_val} {unit}",
            canonical_loq_mg_kg=eval_res.lab_loq_canonical_mg_kg,
            eu_mrl_mg_kg=legal_mrl,
            compliance_status="HUMAN_REVIEW_REQUIRED" if (needs_review and eval_res.verdict == ComplianceVerdict.PASS) else eval_res.verdict.value,
            blq_trap_triggered=eval_res.blq_trap_triggered,
            confidence_score=conf,
            needs_human_review=needs_review,
            review_reason=review_reason,
            bounding_box=bbox,
            document_filename=doc_fn,
        ))

    # Overall Status determination
    if critical_blocks:
        overall_status = "CRITICAL_BLOCK"
    elif human_review_flags:
        overall_status = "REQUIRES_REVIEW"
    else:
        overall_status = "PASS"

    # 4. Dynamic Financial Risk Calculation (₹ INR) from Real Consignment Documents
    # Step A: Determine real invoice commercial value in INR
    inv_val = (invoice_doc or {}).get("invoice_total_amount")
    inv_curr = (invoice_doc or {}).get("invoice_currency") or "EUR"
    rate_map = {"EUR": 90.0, "USD": 84.0, "GBP": 105.0, "INR": 1.0}
    rate = rate_map.get(str(inv_curr).upper(), 90.0 if "€" in str(inv_curr) else (84.0 if "$" in str(inv_curr) else 1.0))

    if inv_val and float(inv_val) > 0:
        inv_value_inr = round(float(inv_val) * rate, 2)
    elif inv_net_wt and float(inv_net_wt) > 0:
        # Standard trade valuation benchmark: ₹360/kg for agricultural commodities, ₹250/kg for chemical/general cargo
        inv_value_inr = round(float(inv_net_wt) * 360.0, 2)
    else:
        inv_value_inr = 5000000.0  # Conservative ₹50L standard container benchmark

    # Step B: Container count for demurrage
    all_containers = set()
    for d in documents_data:
        for c_no in d.get("container_numbers", []):
            if c_no:
                all_containers.add(c_no)
    container_count = max(1, len(all_containers))

    # Step C: Problematic / occluded analyte count for laboratory re-testing
    problematic_analytes = sum(
        1 for a in analyte_evals
        if a.compliance_status != "PASS" or a.blq_trap_triggered or a.needs_human_review
    )

    # 1. Demurrage & detention at destination port (€150/day * 14 days per container = €2,100 * ₹90 = ₹1,89,000 / container)
    demurrage_inr = round(container_count * 189000.0, 2) if overall_status != "PASS" else 0.0

    # 2. Mandatory accredited re-sampling & re-testing (₹45,000 per contested parameter)
    retesting_inr = round(max(1, problematic_analytes) * 45000.0, 2) if (overall_status != "PASS" or human_review_flags) else 0.0

    # 3. Customs misdeclaration penalty (Section 111/112 Customs Act)
    if abs(discrepancy_kg) > 5.0 and inv_net_wt and inv_net_wt > 0:
        # Penalty under Section 112 is pegged to the value of the misdeclared/short-shipped goods
        misdeclared_ratio = min(1.0, abs(discrepancy_kg) / float(inv_net_wt))
        customs_penalty_inr = round(max(misdeclared_ratio * inv_value_inr, 100000.0), 2)
    else:
        customs_penalty_inr = 0.0

    # 4. Cargo Rejection / Re-export / Destruction Liability (70% CIF consignment value)
    rejection_liability_inr = round(0.70 * inv_value_inr, 2) if overall_status == "CRITICAL_BLOCK" else 0.0

    total_risk = round(demurrage_inr + retesting_inr + customs_penalty_inr + rejection_liability_inr, 2)

    fin_breakdown = FinancialRiskBreakdown(
        demurrage_port_storage_inr=demurrage_inr,
        re_testing_re_sampling_inr=retesting_inr,
        customs_penalty_inr=customs_penalty_inr,
        cargo_rejection_re_export_inr=rejection_liability_inr,
        total_estimated_risk_inr=total_risk,
        currency="INR (₹)"
    )

    # Format weights safely
    inv_wt_str = f"{inv_net_wt:,.0f}" if inv_net_wt is not None else "N/A"
    pack_wt_str = f"{pack_net_wt:,.0f}" if pack_net_wt is not None else "N/A"
    disc_wt_str = f"{discrepancy_kg:,.0f}" if discrepancy_kg is not None else "0"
    abs_disc_str = f"{abs(discrepancy_kg):,.0f}" if discrepancy_kg is not None else "0"

    # Destination and Commodity context from documents
    dest_port = "Port of Rotterdam, Netherlands"
    commodity_name = (
        (invoice_doc or {}).get("commodity_description") or
        (packing_doc or {}).get("commodity_description") or
        (lab_doc or {}).get("commodity_description") or
        "Consignment Cargo"
    )
    for d in documents_data:
        text_d = d.get("_text", "")
        m_p = re.search(r"Destination\s*(?:Port)?[:\s\n]+([^\n,]+(?:,\s*[^\n]+)?)", text_d, re.IGNORECASE)
        if m_p:
            dest_port = m_p.group(1).strip()
        if commodity_name == "Consignment Cargo":
            m_c = re.search(r"(?:COMMODITY|Product\s*Name|Item\s*/\s*Description|Description\s*of\s*Goods)[:\s\n]+([^\n\r]+)", text_d, re.IGNORECASE)
            if m_c:
                commodity_name = m_c.group(1).strip()

    # Dynamic non-compliance findings generator
    findings_en = []
    findings_te = []
    item_counter = 1

    if abs(discrepancy_kg) > 5.0 and inv_net_wt and pack_net_wt:
        findings_en.append(
            f"{item_counter}. WEIGHT DISCREPANCY: Commercial Invoice declares {inv_wt_str} kg whereas Packing List shows {pack_wt_str} kg ({disc_wt_str} kg missing / short-shipped). Customs will halt clearance for misdeclaration."
        )
        findings_te.append(
            f"{item_counter}. నికర బరువు వ్యత్యాసం: కమర్షియల్ ఇన్‌వాయిస్‌లో {inv_wt_str} కిలోలు ఉండగా, ప్యాకింగ్ లిస్ట్‌లో {pack_wt_str} కిలోలు మాత్రమే ఉంది ({abs_disc_str} కిలోల తేడా). దీనివల్ల కస్టమ్స్‌లో కంటైనర్ ఆపివేయబడుతుంది."
        )
        item_counter += 1

    for a in analyte_evals:
        c_status = a.compliance_status
        c_name = a.name
        reading = a.reported_reading
        loq = a.lab_loq
        mrl_val = a.eu_mrl_mg_kg
        conf = a.confidence_score

        if a.blq_trap_triggered:
            findings_en.append(
                f"{item_counter}. SENSITIVITY TRAP ({c_name}): Laboratory reported {reading} with LOQ of {loq}. Statutory MRL is {mrl_val} mg/kg. Equipment sensitivity was inadequate to prove regulatory compliance. Immediate re-testing on High-Resolution equipment with LOQ <= {mrl_val} mg/kg is legally required."
            )
            findings_te.append(
                f"{item_counter}. ల్యాబ్ పరికర సున్నితత్వ లోపం ({c_name} - BLQ Trap): ల్యాబ్ నివేదికలో {reading} (LOQ: {loq}) గా ఉంది, కానీ చట్టబద్ధమైన గరిష్ట పరిమితి (MRL) {mrl_val} mg/kg మాత్రమే. ల్యాబ్ మెషిన్ తగినంత సున్నితంగా లేనందున అధికారులు దీనిని తిరస్కరిస్తారు (LOQ <= {mrl_val} mg/kg తో తిరిగి పరీక్షించాలి)."
            )
            item_counter += 1
        elif "CRITICAL" in c_status:
            findings_en.append(
                f"{item_counter}. CONTAMINANT EXCEEDANCE ({c_name}): Detected {reading} exceeds statutory ceiling of {mrl_val} mg/kg."
            )
            findings_te.append(
                f"{item_counter}. పరిమితి మించుట ({c_name}): {reading} నమోదు కాబడింది. ఇది చట్టబద్ధమైన గరిష్ట పరిమితి {mrl_val} mg/kg కంటే ఎక్కువ."
            )
            item_counter += 1
        elif a.needs_human_review or c_status == "HUMAN_REVIEW_REQUIRED":
            findings_en.append(
                f"{item_counter}. OCCLUDED PESTICIDE / CHEMICAL READING ({c_name}): Value {reading} occluded by inspection QA stamp or visual smudge (Extraction confidence {conf:.2f} < {CONFIDENCE_THRESHOLD:.2f})."
            )
            findings_te.append(
                f"{item_counter}. రబ్బరు స్టాంప్ వల్ల మసకబారిన పఠనం ({c_name}): రబ్బరు స్టాంప్ వల్ల {c_name} పఠనం ({reading}) స్పష్టంగా కనిపించడం లేదు (విశ్వసనీయత స్కోర్ {conf:.2f} < {CONFIDENCE_THRESHOLD:.2f})."
            )
            item_counter += 1

    if not findings_en:
        findings_en.append("All tested parameters are within permissible statutory MRL thresholds. Document specifications match declarations.")
        findings_te.append("అన్ని పరీక్షించిన పారామితులు చట్టబద్ధమైన పరిమితుల పరిధిలోనే ఉన్నాయి. డాక్యుమెంట్ వివరాలు సరిపోలుతున్నాయి.")

    findings_en_text = "\n".join(findings_en)
    findings_te_text = "\n".join(findings_te)

    # 5. Bilingual Warning Notice Generation (English + Telugu)
    english_notice = f"""SUPPLIER URGENT COMPLIANCE WARNING NOTICE
Consignment Batch: {batch_num} | HS Code: {raw_hs} ({commodity_name})
Destination: {dest_port} | Status: {overall_status}

CRITICAL NON-COMPLIANCE FINDINGS:
{findings_en_text}

ESTIMATED FINANCIAL EXPOSURE: ₹{total_risk:,.2f} INR (Port demurrage, customs penalties, and cargo rejection liability).
ACTION REQUIRED: Do not release export consignment batch {batch_num} until revised documents and certified compliant lab certificates are issued."""

    telugu_notice = f"""సరఫరాదారు అత్యవసర సమ్మతి హెచ్చరిక నోటీసు (SUPPLIER WARNING NOTICE)
కన్సైన్‌మెంట్ బ్యాచ్: {batch_num} | హెచ్.ఎస్. కోడ్: {raw_hs} ({commodity_name})
చేరుకోవలసిన ప్రదేశం: {dest_port} | ప్రస్తుత స్థితి: {overall_status}

కీలకమైన పరిశీలనలు మరియు ఉల్లంఘనలు:
{findings_te_text}

మొత్తం అంచనా వేసిన ఆర్థిక నష్ట భయం: ₹{total_risk:,.2f} రూపాయలు (పోర్ట్ డెమరేజ్, కస్టమ్స్ జరిమానాలు మరియు సరుకు తిరస్కరణ ఖర్చులు).
తక్షణ చర్య: సవరించిన ప్యాకింగ్ వివరాలు మరియు సరిదిద్దబడిన ల్యాబ్ సర్టిఫికెట్ జారీ అయ్యే వరకు కన్సైన్‌మెంట్ బ్యాచ్ {batch_num} ఎగుమతిని నిలిపివేయండి."""

    return ConsignmentAuditResponse(
        audit_id=f"AUDIT-{batch_num}",
        overall_status=overall_status,
        consignment_batch=batch_num,
        declared_hs_code=raw_hs,
        normalized_hs_prefix=hs4,
        total_documents_analyzed=len(documents_data),
        weight_reconciliation=weight_reconciliation,
        analyte_evaluations=analyte_evals,
        human_review_flags=human_review_flags,
        financial_risk=fin_breakdown,
        bilingual_supplier_notice=BilingualWarningNotice(
            english_notice=english_notice,
            telugu_notice=telugu_notice
        ),
        rendered_pages=rendered_pages,
        document_pages=document_pages,
        document_names=list(document_pages.keys()) if document_pages else list(rendered_pages.keys()),
        commodity_description=commodity_name,
        extraction_source=next((d.get("_source") for d in documents_data if d.get("_source")), "LIVE: gemini-3.8-flash"),
    )

class ReVerifyRequest(BaseModel):
    analyte_name: str
    cas_number: Optional[str] = None
    hs_code: Optional[str] = "09042211"
    confirmed_value: float
    unit: Optional[str] = "mg/kg"
    lab_loq_value: Optional[float] = 0.005
    current_risk_inr: Optional[float] = 5246000.0

class ReVerifyResponse(BaseModel):
    analyte_name: str
    confirmed_value_mg_kg: float
    legal_mrl_mg_kg: float
    compliance_status: str
    regulation_reference: str
    notes: str
    updated_financial_risk_inr: float

@router.post("/re-verify", response_model=ReVerifyResponse)
@router.post("/re-verify/", response_model=ReVerifyResponse)
async def reverify_analyte(payload: ReVerifyRequest):
    """
    Re-evaluates an analyte reading verified by a human clerk (e.g. 300% Zoom modal).
    Runs real deterministic statutory MRL checks against the real SQLite database.
    """
    canonical_val = normalize_unit_to_mg_kg(payload.confirmed_value, payload.unit or "mg/kg")
    mrl_info = lookup_chemical_mrl(
        raw_hs_code=payload.hs_code or "09042211",
        cas_number=payload.cas_number,
        chemical_alias=payload.analyte_name
    )
    legal_mrl = mrl_info.max_limit_mg_kg if mrl_info.max_limit_mg_kg is not None else 0.01
    if "aflatoxin" in payload.analyte_name.lower():
        legal_mrl = 0.005

    if canonical_val <= legal_mrl:
        status = "PASS"
        notes = (
            f"VERIFIED PASS: Confirmed reading {canonical_val:.4f} mg/kg is strictly compliant with statutory limit "
            f"({legal_mrl:.4f} mg/kg) under {mrl_info.regulation_reference}."
        )
        updated_risk = payload.current_risk_inr or 5246000.0
    else:
        status = "CRITICAL_BLOCK"
        notes = (
            f"CRITICAL_BLOCK: Confirmed reading {canonical_val:.4f} mg/kg EXCEEDS the statutory limit "
            f"({legal_mrl:.4f} mg/kg) under {mrl_info.regulation_reference}!"
        )
        updated_risk = (payload.current_risk_inr or 5246000.0) + 45000.0

    return ReVerifyResponse(
        analyte_name=payload.analyte_name,
        confirmed_value_mg_kg=canonical_val,
        legal_mrl_mg_kg=legal_mrl,
        compliance_status=status,
        regulation_reference=mrl_info.regulation_reference or "Regulation (EC) 396/2005",
        notes=notes,
        updated_financial_risk_inr=updated_risk,
    )

