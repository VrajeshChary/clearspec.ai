import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from pydantic import BaseModel

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
# Load root .env followed by backend/.env if present
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "backend" / ".env")

class Settings(BaseModel):
    project_name: str = "ClearSpec AI"
    api_v1_str: str = "/api/v1"
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    environment: str = os.getenv("ENVIRONMENT", "development")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    confidence_threshold: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.85"))

settings = Settings()
