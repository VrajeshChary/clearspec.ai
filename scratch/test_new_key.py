import os
import sys
import json
import asyncio
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv(".env")
api_key = os.getenv("GEMINI_API_KEY")

print(f"[TEST NEW KEY] Loaded key: {api_key[:12]}... (len={len(api_key)})")

from google import genai
from google.genai import types

client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})

# 1. Test gemini-3.8-flash
print("\n--- 1. Testing gemini-3.8-flash ---")
try:
    r = client.models.generate_content(
        model="gemini-3.8-flash",
        contents="Respond with JSON: {\"status\": \"ok\", \"model\": \"gemini-3.8-flash\"}",
        config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.0)
    )
    print("SUCCESS gemini-3.8-flash response:", r.text.strip())
except Exception as e:
    print("FAILED gemini-3.8-flash:", type(e), e)

# 2. Test gemini-nano-banana-2.1
print("\n--- 2. Testing gemini-nano-banana-2.1 ---")
try:
    r_img = client.models.generate_content(
        model="gemini-nano-banana-2.1",
        contents="A minimalist export compliance hold badge with text 'HOLD'",
        config=types.GenerateContentConfig(response_modalities=["IMAGE"])
    )
    print("SUCCESS nano-banana-2.1! Candidates:", len(r_img.candidates))
    for p in r_img.candidates[0].content.parts:
        if p.inline_data:
            print("Received inline image! Size:", len(p.inline_data.data), "mime:", p.inline_data.mime_type)
except Exception as e:
    print("FAILED nano-banana-2.1:", type(e), e)

# 3. Test gemini-3.8-live
print("\n--- 3. Testing gemini-3.8-live WebSocket ---")
async def test_live():
    try:
        live_client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})
        async with asyncio.timeout(10):
            async with live_client.aio.live.connect(model="gemini-3.8-live") as session:
                print("SUCCESS: Connected to gemini-3.8-live!")
                await session.send(input="Hello", end_of_turn=True)
                async for msg in session.receive():
                    print("Received LiveServerMessage!")
                    break
    except Exception as e:
        print("FAILED gemini-3.8-live:", type(e), e)

asyncio.run(test_live())

# 4. Test real live PDF extraction on NABL_Lab_Report_104.pdf
print("\n--- 4. Testing real live PDF extraction ---")
from backend.app.services.gemini_extractor import extract_document_data
pdf_path = Path("backend/sample_packets/packet_a_rotterdam/NABL_Lab_Report_104.pdf")
with open(pdf_path, "rb") as f:
    pdf_bytes = f.read()

res_ext = extract_document_data(pdf_bytes, "NABL_Lab_Report_104.pdf")
print("Extraction Source:", res_ext.get("_source"))
print("Extracted chemical rows count:", len(res_ext.get("chemical_rows", [])))
for row in res_ext.get("chemical_rows", [])[:4]:
    print(f"  • {row.get('name')}: {row.get('raw_reported_result')} | BBox: {row.get('bbox')} | Conf: {row.get('confidence')}")

# 5. Test POST /api/v1/visual-card/generate
print("\n--- 5. Testing POST /api/v1/visual-card/generate ---")
from backend.app.services.nano_banana import generate_visual_card
async def test_card():
    res = await generate_visual_card({
        "consignment_id": "EXP/2026/GNT-104",
        "batch_id": "GNT-24A",
        "total_risk_inr": 5246000.0,
        "critical_findings": ["Weight Shortage -450 kg", "Tricyclazole BLQ Trap", "Aflatoxin B1 Exceeded"],
        "language": "en"
    })
    print("is_fallback:", res.get("is_fallback"))
    print("model_used:", res.get("model_used"))
    print("format:", res.get("format"))
    print("image_base64 len:", len(res.get("image_base64", "")))
    if res.get("note"):
        print("note:", res.get("note"))

asyncio.run(test_card())

print("\n" + "="*60)
print("ALL TESTS FINISHED")
print("="*60)
