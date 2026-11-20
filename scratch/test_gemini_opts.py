import os
from dotenv import load_dotenv
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional

load_dotenv("c:/Users/ksaia/Downloads/clearspec-ai/.env")
key = os.getenv("GEMINI_API_KEY")

from google import genai
from google.genai import types
client = genai.Client(api_key=key)

class ChemicalRowAST(BaseModel):
    analyte_name: str
    cas_number: Optional[str] = None
    raw_reported_result: str
    numeric_value: Optional[float] = None
    is_below_loq: bool = False
    lab_loq_value: Optional[float] = None
    unit: str = "mg/kg"
    confidence: float = 0.95
    bbox: Optional[List[int]] = None

class ExtractedDocumentAST(BaseModel):
    document_type: str = "LAB_REPORT"
    hs_code: Optional[str] = None
    batch_numbers: List[str] = []
    chemical_rows: List[ChemicalRowAST] = []

# Try 1: client.models.generate_content with response_schema=ExtractedDocumentAST
try:
    res = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Extract sample Tricyclazole BLQ LOQ 0.05 mg/kg",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ExtractedDocumentAST
        )
    )
    print("SUCCESS client.models.generate_content:", res.text[:200])
except Exception as e:
    print("generate_content failed:", e)

# Try 2: client.interactions.create with generation_config
try:
    res2 = client.interactions.create(
        model="gemini-3.8-flash",
        input="Return JSON with ExtractedDocumentAST: Tricyclazole BLQ LOQ 0.05 mg/kg",
        generation_config={
            "response_mime_type": "application/json"
        }
    )
    print("SUCCESS interactions.create with json mime_type:", res2.output_text[:200])
except Exception as e:
    print("interactions with generation_config failed:", e)
