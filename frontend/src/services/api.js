const API_BASE = '/api/v1';

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

export async function getAstraCapabilities() {
  const res = await fetch(`${API_BASE}/gpt6-astra/capabilities`);
  if (!res.ok) {
    throw new Error('Failed to fetch capabilities');
  }
  return res.json();
}
