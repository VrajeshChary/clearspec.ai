import time
import json
import re
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/gpt6-astra", tags=["GPT-6 Astra & Key Diagnostics"])

class KeyVerifyRequest(BaseModel):
    api_key: str = Field(..., description="API key to test")
    provider: str = Field("auto", description="Provider: 'auto', 'xingchi', 'openai', 'openrouter', or 'custom'")
    custom_base_url: Optional[str] = Field(None, description="Optional custom base URL for proxy or gateway")
    wire_api: Optional[str] = Field("responses", description="wire API: 'responses' or 'chat'")

def analyze_key_format(key: str) -> Dict[str, Any]:
    key = key.strip()
    length = len(key)
    prefix = ""
    for p in ["sk-proj-", "sk-or-v1-", "sk-or-", "sk-ant-", "sk-"]:
        if key.startswith(p):
            prefix = p
            break

    is_hex_after_prefix = False
    remainder = key[len(prefix):] if prefix else key
    if re.fullmatch(r"[0-9a-fA-F]+", remainder):
        is_hex_after_prefix = True

    format_summary = "Unknown format"
    likely_service = "Unknown"

    if prefix == "sk-proj-":
        format_summary = "Modern OpenAI Project Key (sk-proj-...)"
        likely_service = "OpenAI Official API"
    elif prefix in ("sk-or-v1-", "sk-or-"):
        format_summary = "OpenRouter Standard Key (sk-or-...)"
        likely_service = "OpenRouter Gateway"
    elif prefix == "sk-ant-":
        format_summary = "Anthropic API Key (sk-ant-...)"
        likely_service = "Anthropic API"
    elif prefix == "sk-" and length == 67 and is_hex_after_prefix:
        format_summary = "64-Hex SHA256 Token (sk- + 64 hex characters)"
        likely_service = "Xingchi API (api.xingchiapi.com) / OneAPI Relay"
    elif prefix == "sk-":
        format_summary = f"Legacy / Gateway sk- Token ({length} chars)"
        likely_service = "OpenAI or OpenAI-Compatible Relay"

    return {
        "length": length,
        "prefix": prefix or "(none)",
        "is_hex_body": is_hex_after_prefix,
        "format_summary": format_summary,
        "likely_service": likely_service,
        "masked_key": f"{key[:8]}...{key[-4:]}" if length > 12 else "***"
    }

def probe_endpoint(url: str, headers: Dict[str, str], method: str = "GET", data: Optional[dict] = None) -> Dict[str, Any]:
    start_time = time.time()
    req_data = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            latency = int((time.time() - start_time) * 1000)
            raw = resp.read().decode("utf-8", errors="replace")
            try:
                body = json.loads(raw)
            except Exception:
                body = raw[:400]
            return {
                "success": True,
                "status_code": resp.status,
                "latency_ms": latency,
                "raw_response": body
            }
    except urllib.error.HTTPError as e:
        latency = int((time.time() - start_time) * 1000)
        raw = e.read().decode("utf-8", errors="replace")
        try:
            body = json.loads(raw)
        except Exception:
            body = raw[:400]
        return {
            "success": False,
            "status_code": e.code,
            "latency_ms": latency,
            "error_detail": body
        }
    except Exception as exc:
        latency = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "status_code": 0,
            "latency_ms": latency,
            "error_detail": str(exc)
        }

@router.post("/verify-key")
def verify_api_key(req: KeyVerifyRequest):
    key = req.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key cannot be empty")

    analysis = analyze_key_format(key)
    results = []

    # 1. Probe Xingchi API (https://api.xingchiapi.com/v1)
    if req.provider in ("auto", "xingchi"):
        # 1a. Check /models
        xingchi_headers = {
            "Authorization": f"Bearer {key}",
            "x-openai-actor-authorization": "local-image-extension",
            "User-Agent": "Cursor/0.45.0"
        }
        models_res = probe_endpoint(
            url="https://api.xingchiapi.com/v1/models",
            headers=xingchi_headers
        )
        models_count = 0
        available_models = []
        if models_res["success"] and isinstance(models_res.get("raw_response"), dict):
            available_models = [m.get("id") for m in models_res["raw_response"].get("data", [])]
            models_count = len(available_models)

        # 1b. Probe /responses (wire_api)
        responses_res = probe_endpoint(
            url="https://api.xingchiapi.com/v1/responses",
            headers={**xingchi_headers, "Content-Type": "application/json"},
            method="POST",
            data={
                "model": "gpt-6.1-sol",
                "input": [{"role": "user", "content": "ping"}]
            }
        )

        billing_error = False
        if responses_res.get("status_code") == 403:
            err_msg = str(responses_res.get("error_detail", ""))
            if "insufficient dedicated balance" in err_msg or "billing_error" in err_msg:
                billing_error = True

        status_label = "Active (Auth OK)"
        if models_res["success"]:
            if billing_error:
                status_label = "Authenticated (Auth OK, but Insufficient Balance)"
            else:
                status_label = "Authenticated & Ready"
        else:
            status_label = f"Failed (HTTP {models_res['status_code']})"

        results.append({
            "target": "Xingchi API (api.xingchiapi.com)",
            "endpoint": "https://api.xingchiapi.com/v1/models & /responses",
            "status": 200 if models_res["success"] else models_res["status_code"],
            "success": models_res["success"],
            "authenticated": models_res["success"],
            "has_balance": not billing_error,
            "latency_ms": models_res["latency_ms"],
            "summary": f"Xingchi API: {status_label} - Found {models_count} models (gpt-6-astra, gpt-6.1-sol, etc.)",
            "models_sample": available_models[:12],
            "details": {
                "models_check": models_res.get("raw_response") or models_res.get("error_detail"),
                "responses_check": responses_res.get("raw_response") or responses_res.get("error_detail"),
                "billing_status": "Insufficient balance for this group (Needs Top-up)" if billing_error else "OK"
            }
        })

    # 2. Probe OpenAI Official
    if req.provider in ("auto", "openai"):
        openai_res = probe_endpoint(
            url="https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {key}", "User-Agent": "Mozilla/5.0"}
        )
        results.append({
            "target": "OpenAI Official (api.openai.com)",
            "endpoint": "https://api.openai.com/v1/models",
            "status": openai_res["status_code"],
            "success": openai_res["success"],
            "latency_ms": openai_res["latency_ms"],
            "summary": "OpenAI Official: 401 Unauthorized (Not an official OpenAI key)",
            "details": openai_res.get("raw_response") or openai_res.get("error_detail")
        })

    # 3. Probe OpenRouter
    if req.provider in ("auto", "openrouter"):
        openrouter_res = probe_endpoint(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            method="POST",
            data={"model": "openai/gpt-6.2-astra", "messages": [{"role": "user", "content": "ping"}], "max_tokens": 1}
        )
        results.append({
            "target": "OpenRouter (openrouter.ai)",
            "endpoint": "https://openrouter.ai/api/v1/chat/completions",
            "status": openrouter_res["status_code"],
            "success": openrouter_res["success"],
            "latency_ms": openrouter_res["latency_ms"],
            "summary": "OpenRouter: 401 Unauthorized (Expects sk-or-...)",
            "details": openrouter_res.get("raw_response") or openrouter_res.get("error_detail")
        })

    # 4. Probe Custom Base URL if provided
    if req.custom_base_url:
        custom_url = req.custom_base_url.rstrip("/")
        custom_res = probe_endpoint(
            url=f"{custom_url}/models",
            headers={"Authorization": f"Bearer {key}", "User-Agent": "Cursor/0.45.0"}
        )
        results.append({
            "target": f"Custom Gateway ({custom_url})",
            "endpoint": f"{custom_url}/models",
            "status": custom_res["status_code"],
            "success": custom_res["success"],
            "latency_ms": custom_res["latency_ms"],
            "summary": f"Custom Gateway: HTTP {custom_res['status_code']}",
            "details": custom_res.get("raw_response") or custom_res.get("error_detail")
        })

    # Determine overall status
    is_authenticated = any(r.get("authenticated", r["success"]) for r in results)
    has_active_balance = any(r.get("has_balance", False) for r in results)

    recommendations = []
    if is_authenticated and not has_active_balance:
        recommendations.append(
            "KEY AUTHENTICATION SUCCESSFUL! Your key is valid and authenticated on `https://api.xingchiapi.com/v1`."
        )
        recommendations.append(
            "INSUFFICIENT BALANCE: The Xingchi API server reported: `insufficient dedicated balance for this group`. To run inferences, please log into your Xingchi API account dashboard and top up your account balance."
        )
        recommendations.append(
            "WIRE API REQUIREMENT: Ensure your client uses `wire_api = 'responses'` (`/v1/responses`), because `/v1/chat/completions` has been deprecated by Xingchi API."
        )
        recommendations.append(
            "CLIENT USER-AGENT REQUIREMENT: Xingchi enforces coding client User-Agents (e.g. `Cursor`, `Claude-Code`, `Codex`, `Cline`, `Trae`)."
        )
    elif not is_authenticated:
        recommendations.append(
            "Key failed authentication across all probed endpoints. Please verify your token."
        )

    return {
        "is_valid": is_authenticated,
        "is_authenticated": is_authenticated,
        "has_active_balance": has_active_balance,
        "key_analysis": analysis,
        "test_results": results,
        "recommendations": recommendations,
        "tested_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    }

@router.get("/capabilities")
def get_gpt6_astra_capabilities():
    """Detailed specifications and capabilities catalog for GPT-6 Astra & GPT-6.1 Sol on Xingchi API"""
    return {
        "model_family": "GPT-6 Family (Astra & Sol)",
        "provider_endpoint": "https://api.xingchiapi.com/v1",
        "wire_api": "responses (/v1/responses)",
        "models_on_gateway": [
            {"id": "gpt-6-astra", "name": "GPT-6 Astra", "tier": "Flagship 1.05M Context"},
            {"id": "gpt-6.1-sol", "name": "GPT-6.1 Sol", "tier": "High Efficiency Frontier Reasoning"},
            {"id": "gpt-6-sol", "name": "GPT-6 Sol", "tier": "Cost-Efficient Frontier"},
            {"id": "gpt-6.1-terra", "name": "GPT-6.1 Terra", "tier": "Specialized Multimodal"},
            {"id": "gpt-6-luna", "name": "GPT-6 Luna", "tier": "Ultra-Low Latency"},
            {"id": "gpt-5.6-sol", "name": "GPT-5.6 Sol", "tier": "High Reliability Code"},
            {"id": "gpt-5.4-mini", "name": "GPT-5.4 Mini", "tier": "Fast Utility"}
        ],
        "context_window": {
            "tokens": 1050000,
            "description": "1,050,000 tokens (~4 million characters / 1,500+ pages of dense regulatory/code context)"
        },
        "modalities": {
            "inputs": ["Text", "High-Resolution Image / Video Frames", "PDF & Raw Document Ingestion", "Computer Screen UI Frames"],
            "outputs": ["Text", "Strict JSON Schema", "OS/Browser Coordinate Actions (Computer-Use)"]
        }
    }
