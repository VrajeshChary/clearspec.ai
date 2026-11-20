import os
import sys
import json
import asyncio
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(".env")
api_key = os.getenv("GEMINI_API_KEY")
print(f"Loaded GEMINI_API_KEY: {api_key[:8]}... (len={len(api_key) if api_key else 0})")

from google import genai

client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})

print("\n================== 1. TESTING GEMINI INTERACTIONS / EXTRACTOR ==================")
try:
    print("Testing client.interactions.create with gemini-3.8-flash...")
    interaction = client.interactions.create(
        model="gemini-3.8-flash",
        input=[{"text": "Hello, respond with JSON: {\"test\": 123}"}]
    )
    print("SUCCESS: interactions.create output:", interaction.output_text[:200])
except Exception as e:
    print(f"FAILED interactions.create: {type(e).__name__}: {e}")

try:
    print("\nTesting client.models.generate_content with gemini-2.5-flash / gemini-2.0-flash...")
    res = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="Say Hello"
    )
    print("SUCCESS: generate_content output:", res.text.strip())
except Exception as e:
    print(f"FAILED generate_content: {type(e).__name__}: {e}")

print("\n================== 2. TESTING NANO BANANA 2.1 VISUAL CARD ==================")
from backend.app.services.nano_banana import generate_visual_card

async def test_nano_banana():
    payload = {
        "consignment_id": "EXP/2026/GNT-104",
        "batch_id": "GNT-24A",
        "total_risk_inr": 5246000.0,
        "critical_findings": ["Tricyclazole: BLQ Trap", "Aflatoxin B1: 8.5 ug/kg > 5.0 ug/kg"],
        "language": "en"
    }
    print("Calling generate_visual_card()...")
    res = await generate_visual_card(payload)
    print(f"Result -> model_used: {res.get('model_used')}, is_fallback: {res.get('is_fallback')}, format: {res.get('format')}")
    print(f"Note: {res.get('note')}")
    print(f"Image base64 length: {len(res.get('image_base64', ''))}")

asyncio.run(test_nano_banana())

print("\n================== 3. TESTING GEMINI 3.8 LIVE ==================")
async def test_live_voice():
    print("Connecting to client.aio.live.connect(model='gemini-3.8-live')...")
    try:
        live_client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})
        async with live_client.aio.live.connect(model="gemini-3.8-live") as session:
            print("SUCCESS: Connected to gemini-3.8-live WebSocket session!")
            await session.send(input="Hello, why did batch GNT-24A fail?", end_of_turn=True)
            async for response in session.receive():
                sc = response.server_content
                if sc and sc.model_turn:
                    for part in sc.model_turn.parts:
                        if part.text:
                            print("Live model text:", part.text[:150])
                        if part.inline_data:
                            print("Live model audio chunk received! Size:", len(part.inline_data.data))
                if sc and sc.turn_complete:
                    print("Turn complete received!")
                    break
    except Exception as e:
        print(f"FAILED Live voice session: {type(e).__name__}: {e}")

asyncio.run(test_live_voice())

print("\n================== 4. TESTING GEMINI-3.8-FLASH VIA ASK-TEXT ==================")
try:
    print("Testing gemini-3.8-flash for ask-text...")
    res = client.models.generate_content(
        model="gemini-3.8-flash",
        contents="Why was batch GNT-24A rejected? Answer in 1 sentence."
    )
    print("SUCCESS ask-text gemini-3.8-flash response:", res.text.strip())
except Exception as e:
    print(f"FAILED ask-text gemini-3.8-flash: {type(e).__name__}: {e}")

