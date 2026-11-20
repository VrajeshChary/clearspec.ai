from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import unit_normalizer, eu_mrl_lookup, cbam_calculator, consignment_audit, sample_pdf

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

app.include_router(unit_normalizer.router, prefix=settings.api_v1_str)
app.include_router(eu_mrl_lookup.router, prefix=settings.api_v1_str)
app.include_router(cbam_calculator.router, prefix=settings.api_v1_str)
app.include_router(consignment_audit.router, prefix=settings.api_v1_str)
app.include_router(sample_pdf.router, prefix=settings.api_v1_str)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.project_name,
        "docs_url": "/docs",
        "api_v1": settings.api_v1_str,
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
