import os
import sys
import json
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv

load_dotenv(".env")
api_key = os.getenv("GEMINI_API_KEY")
print(f"[API_KEY] Loaded key: {api_key[:8]}... (length={len(api_key) if api_key else 0})")

from google import genai

# ── TEST 1: GEMINI INTERACTIONS / EXTRACTOR TEST ──
print("\n" + "="*60)
print("TEST 1: GEMINI EXTRACTOR & INTERACTIONS")
print("="*60)

# Check demo_cache.json
cache_path = Path("backend/data/demo_cache.json")
if cache_path.exists():
    with open(cache_path) as f:
        cache_data = json.load(f)
    print(f"demo_cache.json keys: {list(cache_data.keys())}")
    for k in cache_data:
        analytes = cache_data[k].get("analytes", [])
        if analytes:
            print(f"Sample bounding boxes in {k}: {[a.get('bounding_box') for a in analytes]}")

# Test what happens when an unseen dummy PDF is passed to extract_document_data
from backend.app.services.gemini_extractor import extract_document_data
import pymupdf as fitz

# Create a small in-memory dummy PDF with a table
dummy_doc = fitz.open()
page = dummy_doc.new_page()
page.insert_text((50, 50), "Commercial Invoice\nInvoice No: INV-999\nHS Code: 09042211\nNet Weight: 12500 kg\nBatch: BATCH-TEST-99")
dummy_pdf_bytes = dummy_doc.tobytes()
dummy_doc.close()

print("\nCalling extract_document_data on a brand-new unseen filename 'Unknown_Invoice_999.pdf':")
unseen_result = extract_document_data(dummy_pdf_bytes, "Unknown_Invoice_999.pdf")
print(f"Source returned: {unseen_result.get('_source')}")
print(f"Error if any: {unseen_result.get('_error')}")
print(f"Extracted net weight: {unseen_result.get('declared_net_weight_kg')}")
print(f"Extracted HS Code: {unseen_result.get('hs_code')}")


# ── TEST 2: NANO BANANA 2.1 LIVE TEST ──
print("\n" + "="*60)
print("TEST 2: NANO BANANA 2.1 VISUAL CARD (LIVE CALL)")
print("="*60)
from backend.app.services.nano_banana import generate_visual_card

async def test_nano_banana():
    payload = {
        "consignment_id": "EXP/2026/GNT-104",
        "batch_id": "GNT-24A",
        "total_risk_inr": 5246000.0,
        "critical_findings": ["Tricyclazole: BLQ Trap", "Aflatoxin B1: 8.5 ug/kg > 5.0 ug/kg"],
        "language": "en"
    }
    res = await generate_visual_card(payload)
    print(f"is_fallback: {res.get('is_fallback')}")
    print(f"model_used: {res.get('model_used')}")
    print(f"note: {res.get('note')}")
    print(f"image_base64 len: {len(res.get('image_base64', ''))}")

asyncio.run(test_nano_banana())

# Also test raw gemini-nano-banana-2.1 with google-genai
print("\nTesting raw client.models.generate_images with gemini-nano-banana-2.1:")
try:
    c = genai.Client(api_key=api_key)
    res_img = c.models.generate_images(
        model="gemini-nano-banana-2.1",
        prompt="Export rejection card for Guntur Chilli",
        config={"number_of_images": 1, "output_mime_type": "image/png"}
    )
    print("generate_images SUCCESS!")
except Exception as e:
    print(f"generate_images EXCEPTION: {type(e).__name__}: {e}")


# ── TEST 3: GEMINI 3.8 LIVE & FLASH TEST ──
print("\n" + "="*60)
print("TEST 3: GEMINI 3.8 LIVE & GEMINI-3.8-FLASH")
print("="*60)

async def test_live_conn():
    print("Testing client.aio.live.connect(model='gemini-3.8-live') with timeout=8s:")
    try:
        live_client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})
        async with asyncio.timeout(8):
            async with live_client.aio.live.connect(model="gemini-3.8-live") as session:
                print("gemini-3.8-live: Connected successfully!")
                await session.send(input="Hello", end_of_turn=True)
                async for response in session.receive():
                    print("gemini-3.8-live response received:", type(response))
                    break
    except Exception as e:
        print(f"gemini-3.8-live EXCEPTION: {type(e).__name__}: {e}")

asyncio.run(test_live_conn())

print("\nTesting client.models.generate_content with gemini-3.8-flash:")
try:
    c = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})
    res_flash = c.models.generate_content(
        model="gemini-3.8-flash",
        contents="Say one word: PASS"
    )
    print(f"gemini-3.8-flash SUCCESS: {res_flash.text.strip()}")
except Exception as e:
    print(f"gemini-3.8-flash EXCEPTION: {type(e).__name__}: {e}")

# ── TEST 4: CHECK ASK-TEXT ENDPOINT ──
from backend.app.routers.live_voice import ask_text_fallback, AskTextRequest
print("\nTesting ask-text endpoint:")
async def test_ask():
    req = AskTextRequest(question="Why did Batch GNT-24A fail?", language="en")
    ans = await ask_text_fallback(req)
    print(f"ask-text answer: {ans.answer[:120]}...")
    print(f"model_used: {ans.model_used}")
asyncio.run(test_ask())
