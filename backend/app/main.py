import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .config import settings
from .routers import (
    unit_normalizer,
    eu_mrl_lookup,
    cbam_calculator,
    consignment_audit,
    sample_pdf,
    visual_card,
    live_voice,
)

app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    description="ClearSpec AI - Cross-Border Export Regulatory Compliance, Unit Normalization, EU MRL, CBAM 2026 Engine & Multi-PDF Consignment Auditor",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(unit_normalizer.router, prefix=settings.api_v1_str)
app.include_router(eu_mrl_lookup.router, prefix=settings.api_v1_str)
app.include_router(cbam_calculator.router, prefix=settings.api_v1_str)
app.include_router(consignment_audit.router, prefix=settings.api_v1_str)
app.include_router(sample_pdf.router, prefix=settings.api_v1_str)
app.include_router(visual_card.router, prefix=settings.api_v1_str)
app.include_router(live_voice.router, prefix=settings.api_v1_str)

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Frontend static distribution discovery
_POSSIBLE_DIST_DIRS = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path("frontend/dist").resolve(),
    Path("/app/frontend/dist"),
]

DIST_DIR = next((d for d in _POSSIBLE_DIST_DIRS if d.is_dir() and (d / "index.html").exists()), None)

if DIST_DIR:
    assets_dir = DIST_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(str(DIST_DIR / "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path in ("health", "docs", "redoc", "openapi.json"):
            raise HTTPException(status_code=404, detail="Endpoint not found")
        candidate = DIST_DIR / full_path
        if candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(DIST_DIR / "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "status": "online",
            "service": settings.project_name,
            "docs_url": "/docs",
            "api_v1": settings.api_v1_str,
        }
