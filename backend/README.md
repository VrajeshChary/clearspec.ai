# ClearSpec AI - Backend Engine

FastAPI-powered regulatory compliance, unit normalization, EU MRL lookup, and CBAM 2026 definitive regime validation engine.

## Key Features
1. **Unit Normalization & BLQ Sensitivity Trap (`/api/v1/units`)**:
   - Converts `ug/kg`, `ppb`, `ppm`, `% w/w`, `g/kg` to canonical `mg/kg` using `pint`.
   - Enforces the **BLQ > MRL Trap**: Flagging `CRITICAL_BLOCK` when a lab report says BLQ/ND but the lab instrument LOQ exceeds the statutory EU MRL.
2. **EU MRL & CAS Lookup (`/api/v1/mrl`)**:
   - Normalizes 8-digit Indian ITC-HS codes (e.g. `09042211`) to 4-digit prefixes (`0904`).
   - Hierarchical chemical matching: CAS Registry Number first with checksum validation, followed by synonym/alias matching.
3. **CBAM 2026 Definitive Regime Calculator (`/api/v1/cbam`)**:
   - Verifies Regulation (EU) 2023/956 rules for steel fastener exports (CN `731815`).
   - Triggers `CRITICAL_BLOCK` if raw precursor wire rod (CN `7213`) tonnage lacks verified Specific Embedded Emissions ($t\text{CO}_2e/t$).

## Local Setup

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```

## Running Tests

```bash
pytest
```
