const API_BASE = '/api/v1';

/**
 * Universal Unit Normalizer
 */
export async function normalizeUnit(value, sourceUnit) {
  const res = await fetch(`${API_BASE}/units/normalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: parseFloat(value), source_unit: sourceUnit }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to normalize unit');
  }
  return res.json();
}

/**
 * Standalone BLQ vs MRL sensitivity trap evaluator
 */
export async function evaluateLabReport(payload) {
  const res = await fetch(`${API_BASE}/units/evaluate-lab-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to evaluate lab report');
  }
  return res.json();
}

/**
 * Indian 8-digit ITC-HS Code Normalizer
 */
export async function normalizeHsCode(hsCode) {
  const res = await fetch(`${API_BASE}/mrl/normalize-hs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hs_code: hsCode }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to normalize HS code');
  }
  return res.json();
}

/**
 * EU MRL Substance & CAS Lookup
 */
export async function lookupChemicalMrl(payload) {
  const res = await fetch(`${API_BASE}/mrl/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to lookup substance MRL');
  }
  return res.json();
}

/**
 * CBAM 2026 Fastener & Precursor Emissions Evaluator
 */
export async function evaluateCbamFasteners(payload) {
  const res = await fetch(`${API_BASE}/cbam/evaluate-fastener`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to evaluate CBAM fastener shipment');
  }
  return res.json();
}

/**
 * Multi-Document Consignment Packet Auditor
 */
export async function auditConsignment(payload, isFormData = false) {
  const opts = isFormData
    ? { method: 'POST', body: payload }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      };

  const res = await fetch(`${API_BASE}/audit`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error during consignment audit (${res.status})`);
  }
  return res.json();
}

/**
 * Re-verify an analyte with 300% Zoom / Human Confirmation
 */
export async function reverifyAnalyte(payload) {
  const res = await fetch(`${API_BASE}/audit/re-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to re-verify analyte reading');
  }
  return res.json();
}

/**
 * Generate 16:9 WhatsApp-ready Visual Fix Card (Nano Banana 2.1)
 */
export async function generateVisualCard(payload) {
  const res = await fetch(`${API_BASE}/visual-card/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate visual card');
  }
  return res.json();
}

/**
 * Gemini 3.8 Flash Stage Text Q&A
 */
export async function askLiveText(question, auditContext = null, language = 'en') {
  const res = await fetch(`${API_BASE}/live/ask-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      audit_context: auditContext,
      language,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to get live response');
  }
  return res.json();
}

/**
 * GPT-6 Astra Key Diagnostics
 */
export async function verifyAstraKey(payload) {
  const res = await fetch(`${API_BASE}/gpt6-astra/verify-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to verify key');
  }
  return res.json();
}

/**
 * GPT-6 Astra Capabilities Catalog
 */
export async function getAstraCapabilities() {
  const res = await fetch(`${API_BASE}/gpt6-astra/capabilities`);
  if (!res.ok) {
    throw new Error('Failed to fetch capabilities');
  }
  return res.json();
}
