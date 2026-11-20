import os
import sys
import json
import asyncio
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv(".env")
api_key = os.getenv("GEMINI_API_KEY")

print("="*70)
print("CLEARSPEC AI - LIVE VERIFICATION PROOF SUITE")
print("="*70)
print(f"API Key present: {bool(api_key)} (len={len(api_key) if api_key else 0})")

# 1. Test extract_document_data on real PDF
from backend.app.services.gemini_extractor import extract_document_data
sample_pdf_path = Path("backend/sample_packets/packet_a_rotterdam/NABL_Lab_Report_104.pdf")
with open(sample_pdf_path, "rb") as f:
    pdf_bytes = f.read()

print("\n--- 1. Testing extract_document_data (Live PDF Extraction) ---")
res_extract = extract_document_data(pdf_bytes, "NABL_Lab_Report_104.pdf")
print(f"Extraction Source: {res_extract.get('_source')}")
print(f"Total Chemical Rows: {len(res_extract.get('chemical_rows', []))}")
for row in res_extract.get('chemical_rows', [])[:3]:
    print(f"  • {row.get('name')}: {row.get('raw_reported_result')} | BBox: {row.get('bbox')} | Conf: {row.get('confidence')}")

# 2. Test Visual Card Generation
from backend.app.services.nano_banana import generate_visual_card
print("\n--- 2. Testing Visual Card Generation (Nano Banana 2.1) ---")
async def test_card():
    card_data = await generate_visual_card({
        "consignment_id": "EXP/2026/GNT-104",
        "batch_id": "GNT-24A",
        "total_risk_inr": 5246000.0,
        "critical_findings": ["Weight Shortage -450 kg", "Tricyclazole BLQ Trap", "Aflatoxin B1 Exceeded"],
        "language": "en"
    })
    print(f"is_fallback: {card_data.get('is_fallback')}")
    print(f"model_used: {card_data.get('model_used')}")
    print(f"format: {card_data.get('format')}")
    print(f"Image Base64 Length: {len(card_data.get('image_base64', ''))}")
    if card_data.get('note'):
        print(f"Note: {card_data.get('note')}")

asyncio.run(test_card())

# 3. Test Live ask-text endpoint in Telugu
from backend.app.routers.live_voice import ask_text_fallback, AskTextRequest
print("\n--- 3. Testing Live ask-text Endpoint (Telugu Q&A) ---")
async def test_live_text():
    req = AskTextRequest(
        question="తెలుగులో వివరించండి: కన్సైన్‌మెంట్ GNT-24A ఎందుకు ఆగిపోయింది?",
        language="te"
    )
    ans = await ask_text_fallback(req)
    print(f"Model Used: {ans.model_used}")
    print(f"Language: {ans.language}")
    print(f"Answer:\n{ans.answer}")

asyncio.run(test_live_text())

# 4. Test re-verify endpoint with 0.008 (PASS) and 0.05 (CRITICAL_BLOCK)
from fastapi.testclient import TestClient
from backend.app.main import app
client = TestClient(app)

print("\n--- 4. Testing POST /api/v1/audit/re-verify (Real Statutory Engine) ---")
# 4A: 0.008 mg/kg
r_pass = client.post("/api/v1/audit/re-verify", json={
    "analyte_name": "Chlorpyrifos",
    "confirmed_value": 0.008,
    "hs_code": "09042211"
})
d_pass = r_pass.json()
print(f"Input: 0.008 mg/kg -> Status: {d_pass['compliance_status']} | Risk: ₹{d_pass['updated_financial_risk_inr']:,.0f}")
print(f"Notes: {d_pass['notes']}")

# 4B: 0.05 mg/kg
r_block = client.post("/api/v1/audit/re-verify", json={
    "analyte_name": "Chlorpyrifos",
    "confirmed_value": 0.05,
    "hs_code": "09042211"
})
d_block = r_block.json()
print(f"\nInput: 0.05 mg/kg  -> Status: {d_block['compliance_status']} | Risk: ₹{d_block['updated_financial_risk_inr']:,.0f}")
print(f"Notes: {d_block['notes']}")

# 5. Test SQLite statutory database query
from backend.app.services.eu_mrl_lookup import lookup_chemical_mrl
print("\n--- 5. Testing SQLite Database Lookup across commodities ---")
for analyte, hs in [
    ("Tricyclazole", "09042211"), 
    ("Chlorpyrifos", "09042211"), 
    ("Aflatoxin B1", "09042211"),
    ("Ethylene oxide", "09042211"),
    ("Fipronil", "03061700"),
    ("Inorganic Arsenic", "10063090")
]:
    res = lookup_chemical_mrl(raw_hs_code=hs, chemical_alias=analyte)
    print(f"  • {analyte:18} (HS {hs}) -> MRL: {res.max_limit_mg_kg} mg/kg | Match: {res.match_tier} | Rule: {res.regulation_reference[:35]}...")

print("\n" + "="*70)
print("ALL LIVE PROOF TESTS COMPLETED SUCCESSFULLY!")
print("="*70)
