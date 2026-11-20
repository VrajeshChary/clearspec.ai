from pydantic import BaseModel
from typing import List

class Settings(BaseModel):
    project_name: str = "ClearSpec AI"
    api_v1_str: str = "/api/v1"
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    environment: str = "development"

settings = Settings()
