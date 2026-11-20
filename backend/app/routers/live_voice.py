import os
import json
import base64
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(ROOT_DIR / ".env")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

router = APIRouter(prefix="/live", tags=["Gemini 3.8 Live Voice Assistant"])

class AskTextRequest(BaseModel):
    question: str = Field(..., description="User query in English or Telugu")
    audit_context: Optional[Dict[str, Any]] = Field(default=None, description="Current consignment audit context")
    language: Optional[str] = Field("en", description="'en' or 'te'")

class AskTextResponse(BaseModel):
    answer: str
    model_used: str
    language: str

def build_system_prompt(audit_context: Optional[Dict[str, Any]] = None, language: str = "en") -> str:
    ctx = audit_context or {}
    batch_num = ctx.get("consignment_batch") or "GNT-24A"
    hs_code = ctx.get("declared_hs_code") or "09042211"
    risk_inr = ctx.get("financial_risk", {}).get("total_estimated_risk_inr", 5246000.0)

    prompt = f"""You are ClearSpec Live, an expert bilingual export regulatory compliance auditor speaking live on stage.
You explain with absolute authority why agricultural export shipments fail EU trade compliance.

CONSIGNMENT VERIFIED AUDIT FACTS:
- Consignment Batch: {batch_num}
- Commodity: Indian Dried Red Crushed Chili Flakes (ITC-HS {hs_code})
- Port of Destination: Port of Rotterdam, Netherlands
- Current Status: CRITICAL_BLOCK (Total Port-Rejection Risk: ₹{risk_inr:,.0f} INR)

CRITICAL FINDINGS:
1. WEIGHT DISCREPANCY: Commercial Invoice declares 18,500 kg, but Packing List confirms 18,050 kg (450 kg short-shipped). Customs misdeclaration penalty risk under Section 111/112 of the Customs Act is ₹3,50,000.
2. BLQ SENSITIVITY TRAP (Tricyclazole): Laboratory reported BLQ with instrument LOQ of 0.05 mg/kg. However, the statutory EU MRL is 0.01 mg/kg. The testing machine was not sensitive enough; hence the test is legally inconclusive and blocked.
3. CONTAMINANT EXCEEDANCE (Aflatoxin B1): Detected at 8.5 ug/kg, which exceeds the statutory EU limit of 5.0 ug/kg (0.005 mg/kg) under Regulation (EU) 2023/915.
4. OPTICAL QA OCCLUSION (Chlorpyrifos): Stamped value of 0.008 mg/kg is obscured by an ink QA inspection stamp (confidence 68%), requiring human review.

RESPONSE GUIDELINES:
- Keep answers crisp, punchy, and direct (2 to 3 sentences maximum).
- Cite specific figures: 450 kg weight mismatch, Tricyclazole LOQ 0.05 vs MRL 0.01 mg/kg, Aflatoxin B1 8.5 vs 5.0 ug/kg, and ₹52.46 Lakh risk.
- If the user asks in Telugu or asks to speak in Telugu (e.g. "తెలుగులో వివరించండి"), respond fluently in natural, professional Telugu (e.g. "కన్సైన్‌మెంట్ బ్యాచ్ GNT-24A మూడు కారణాల వల్ల ఆపివేయబడింది...").
- Never hallucinate facts outside these verified findings.
"""
    return prompt

@router.post("/ask-text", response_model=AskTextResponse)
async def ask_text_fallback(payload: AskTextRequest):
    """
    Lightweight text Q&A endpoint using gemini-3.8-flash:
    Serves as an instant, stage-safe fallback if the microphone is muted or the venue is noisy.
    """
    sys_prompt = build_system_prompt(payload.audit_context, payload.language or "en")
    full_prompt = f"{sys_prompt}\n\nUSER QUESTION: {payload.question}\nANSWER:"

    if GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            interaction = client.interactions.create(
                model="gemini-3.8-flash",
                input=full_prompt
            )
            out_text = interaction.output_text.strip()
            return AskTextResponse(
                answer=out_text,
                model_used="gemini-3.8-flash",
                language=payload.language or "en"
            )
        except Exception:
            pass

    # Deterministic stage-safe response if offline
    q_lower = payload.question.lower()
    is_te = "తెలుగు" in payload.question or payload.language == "te"

    if is_te:
        ans = (
            "కన్సైన్‌మెంట్ బ్యాచ్ GNT-24A ముఖ్యంగా మూడు కారణాల వల్ల నిలిపివేయబడింది: "
            "1) ఇన్‌వాయిస్ మరియు ప్యాకింగ్ లిస్ట్ మధ్య 450 కిలోల బరువు వ్యత్యాసం ఉంది. "
            "2) ట్రైసైక్లాజోల్ ల్యాబ్ LOQ (0.05 mg/kg) చట్టబద్ధమైన EU MRL (0.01 mg/kg) కంటే ఎక్కువగా ఉండటం వల్ల BLQ సెన్సిటివిటీ ట్రాప్ నమోదైంది. "
            "3) అఫ్లాటాక్సిన్ B1 పరిమితి మించి (8.5 ug/kg > 5.0 ug/kg) ఉంది. మొత్తం ఆర్థిక నష్ట భయం ₹52.46 లక్షలు."
        )
    elif "weight" in q_lower:
        ans = "The shipment has a 450 kg net weight discrepancy: Commercial Invoice declares 18,500 kg while the Packing List confirms only 18,050 kg, triggering a customs misdeclaration penalty of ₹3.5 Lakhs under Section 111/112."
    elif "tricyclazole" in q_lower or "trap" in q_lower or "blq" in q_lower:
        ans = "Tricyclazole was reported as BLQ, but the testing laboratory instrument had an LOQ of 0.05 mg/kg, which is 5 times higher than the strict EU MRL of 0.01 mg/kg. The machine was not sensitive enough to prove compliance."
    elif "risk" in q_lower or "cost" in q_lower or "financial" in q_lower:
        ans = "The total estimated financial exposure is ₹52,46,000 INR, consisting of Rotterdam demurrage (€2,100), mandatory NABL/EIC re-testing (₹45,000), customs misdeclaration penalty (₹3.5 Lakhs), and cargo rejection liability (₹46.62 Lakhs)."
    else:
        ans = (
            "Consignment Batch GNT-24A is under a critical export hold due to three violations: "
            "a 450 kg weight shortage between the invoice and packing list, "
            "a BLQ sensitivity trap on Tricyclazole where lab LOQ (0.05 mg/kg) exceeds the EU MRL (0.01 mg/kg), "
            "and Aflatoxin B1 contamination at 8.5 ug/kg exceeding the 5.0 ug/kg statutory ceiling. "
            "Total prevented financial risk is ₹52.46 Lakhs."
        )

    return AskTextResponse(
        answer=ans,
        model_used="deterministic-stage-engine",
        language="te" if is_te else "en"
    )

@router.websocket("/voice")
async def live_voice_bridge(websocket: WebSocket):
    """
    WebSocket endpoint bridging client microphone audio (16kHz PCM)
    to gemini-3.8-live over the google-genai Live API.
    Streams back 24kHz audio and live transcripts.
    """
    await websocket.accept()
    audit_ctx: Dict[str, Any] = {}
    gemini_session = None

    try:
        # Step 1: Wait for initialization payload
        init_raw = await websocket.receive_text()
        try:
            init_data = json.loads(init_raw)
            if init_data.get("type") == "init":
                audit_ctx = init_data.get("context", {})
        except Exception:
            pass

        sys_prompt = build_system_prompt(audit_ctx)

        if not GEMINI_API_KEY:
            await websocket.send_json({
                "type": "transcript",
                "speaker": "model",
                "text": "Live voice connected in local stage mode (GEMINI_API_KEY not configured)."
            })
            # Echo loop in fallback
            while True:
                msg = await websocket.receive_json()
                if msg.get("type") == "text":
                    await websocket.send_json({
                        "type": "transcript",
                        "speaker": "model",
                        "text": f"ClearSpec Live (Offline Mode): Batch GNT-24A blocked due to 450kg weight gap and Tricyclazole LOQ trap."
                    })
            return

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY, http_options={"api_version": "v1beta"})
        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            system_instruction=types.Content(parts=[types.Part(text=sys_prompt)])
        )

        async with client.aio.live.connect(model="gemini-3.8-live", config=config) as session:
            gemini_session = session
            await websocket.send_json({
                "type": "ready",
                "status": "connected",
                "model": "gemini-3.8-live"
            })

            async def client_to_gemini():
                """Forwards incoming client audio/text to the Gemini Live session."""
                try:
                    while True:
                        msg_str = await websocket.receive_text()
                        msg = json.loads(msg_str)
                        m_type = msg.get("type")
                        if m_type == "audio":
                            pcm_b64 = msg.get("data")
                            if pcm_b64:
                                pcm_bytes = base64.b64decode(pcm_b64)
                                await session.send_realtime_input(
                                    audio=types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
                                )
                        elif m_type == "text":
                            t = msg.get("text")
                            if t:
                                await session.send_realtime_input(text=t)
                except (WebSocketDisconnect, asyncio.CancelledError):
                    pass
                except Exception:
                    pass

            async def gemini_to_client():
                """Streams Gemini Live audio & transcription events to the browser client."""
                try:
                    async for response in session.receive():
                        content = response.server_content
                        if content:
                            if content.model_turn:
                                for part in content.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        chunk_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                                        await websocket.send_json({"type": "audio", "data": chunk_b64})
                            if content.output_transcription and content.output_transcription.text:
                                await websocket.send_json({
                                    "type": "transcript",
                                    "speaker": "model",
                                    "text": content.output_transcription.text
                                })
                            if content.input_transcription and content.input_transcription.text:
                                await websocket.send_json({
                                    "type": "transcript",
                                    "speaker": "user",
                                    "text": content.input_transcription.text
                                })
                            if content.interrupted:
                                await websocket.send_json({"type": "interrupted"})
                except (WebSocketDisconnect, asyncio.CancelledError):
                    pass
                except Exception:
                    pass

            # Run both streaming directions concurrently
            await asyncio.gather(client_to_gemini(), gemini_to_client())

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
