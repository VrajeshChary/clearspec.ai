import os
from dotenv import load_dotenv
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional

load_dotenv(Path(__file__).resolve().parent.parent.parent.parent / ".env")
key = os.getenv("GEMINI_API_KEY")

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

print("Schema generated:", ExtractedDocumentAST.model_json_schema().keys())
