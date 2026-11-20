# ClearSpec AI

ClearSpec AI is an export regulatory compliance intelligence system designed to enforce rigorous cross-border trade standards, chemical residue checks (EU Maximum Residue Limits), and EU Carbon Border Adjustment Mechanism (CBAM 2026 definitive regime) rules.

## Project Architecture

```
clearspec-ai/
├── .agents/
│   └── skills/
│       ├── unit-normalizer-skill/
│       │   └── SKILL.md
│       ├── eu-mrl-cas-lookup-skill/
│       │   └── SKILL.md
│       └── cbam-2026-calculator-skill/
│           └── SKILL.md
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/
│   │   │   ├── unit_normalizer.py
│   │   │   ├── eu_mrl_lookup.py
│   │   │   └── cbam_calculator.py
│   │   ├── services/
│   │   │   ├── unit_normalizer.py
│   │   │   ├── eu_mrl_lookup.py
│   │   │   └── cbam_calculator.py
│   │   └── schemas/
│   │       ├── unit_normalizer.py
│   │       ├── eu_mrl_lookup.py
│   │       └── cbam_calculator.py
│   ├── tests/
│   │   ├── test_unit_normalizer.py
│   │   ├── test_eu_mrl_lookup.py
│   │   └── test_cbam_calculator.py
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── UnitNormalizerTab.jsx
│   │   │   ├── MrlLookupTab.jsx
│   │   │   └── CbamCalculatorTab.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── README.md
├── .gitignore
└── README.md
```

## Agent Skills (`.agents/skills/`)
1. **`unit-normalizer-skill`**:
   - Instructs code to convert `ug/kg`, `ppb`, `ppm`, `% w/w` to canonical `mg/kg` using Python `pint`.
   - Enforces the **"BLQ > MRL Trap"**: Flags `CRITICAL_BLOCK` when a lab report says BLQ/ND but the lab instrument LOQ exceeds the statutory EU MRL.
2. **`eu-mrl-cas-lookup-skill`**:
   - Normalizes 8-digit Indian ITC-HS codes (e.g. `09042211`) to 4-digit prefixes (`0904`).
   - Chemical matching by CAS Registry Number (Tier 1 checksum priority) first, then alias name fallback.
3. **`cbam-2026-calculator-skill`**:
   - Verifies 2026 EU CBAM definitive regime rules under Regulation (EU) 2023/956 for steel fastener exports (`CN 731815`).
   - Flags `CRITICAL_BLOCK` if raw precursor wire rod (`CN 7213`) tonnage is missing its verified Specific Embedded Emissions ($t\text{CO}_2e/t$).
