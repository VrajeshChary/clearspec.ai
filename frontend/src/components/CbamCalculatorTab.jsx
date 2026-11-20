import React, { useState } from 'react';
import {
  Flame,
  AlertOctagon,
  CheckCircle2,
  ShieldAlert,
  FileText,
  Zap,
  Info,
  Scale,
  ArrowRight,
  TrendingUp,
  Euro
} from 'lucide-react';
import { evaluateCbamFasteners } from '../services/api';

const SCENARIOS = [
  {
    id: 'missing-see',
    label: 'Scenario A: Missing Precursor SEE (Block)',
    desc: 'Wire rod (CN 7213) tonnage present, but Specific Embedded Emissions (SEE) omitted',
    status: 'CRITICAL_BLOCK'
  },
  {
    id: 'unverified',
    label: 'Scenario B: Unaccredited Verifier (Block)',
    desc: 'Precursor SEE provided, but lacks an EU-accredited independent verification body',
    status: 'CRITICAL_BLOCK'
  },
  {
    id: 'compliant',
    label: 'Scenario C: 2026 Certified Compliant (Pass)',
    desc: 'Verified precursor SEE (1.85 tCO2e/t) with accredited verifier (TÜV SÜD Europe)',
    status: 'PASS'
  }
];

export default function CbamCalculatorTab() {
  const [shipmentRef, setShipmentRef] = useState('EXP-2026-EU-FASTENER-901');
  const [exportCn, setExportCn] = useState('731815');
  const [fastenerTonnes, setFastenerTonnes] = useState('10.0');
  const [directEmissions, setDirectEmissions] = useState('3.2');
  const [indirectEmissions, setIndirectEmissions] = useState('1.1');

  // Precursor wire rod (CN 7213)
  const [precursorCn, setPrecursorCn] = useState('7213');
  const [precursorTonnes, setPrecursorTonnes] = useState('10.4');
  const [precursorSee, setPrecursorSee] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifierBody, setVerifierBody] = useState('');

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeScenario, setActiveScenario] = useState('missing-see');

  const handleEvaluate = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await evaluateCbamFasteners({
        shipment_reference: shipmentRef,
        export_cn_code: exportCn,
        fastener_tonnage: parseFloat(fastenerTonnes),
        direct_emissions_tco2e: parseFloat(directEmissions),
        indirect_emissions_tco2e: parseFloat(indirectEmissions),
        precursor_wire_rod: {
          cn_code: precursorCn,
          tonnage_consumed: parseFloat(precursorTonnes),
          specific_embedded_emissions_tco2e_per_t: precursorSee !== '' ? parseFloat(precursorSee) : null,
          is_verified: isVerified,
          verifier_accreditation_body: verifierBody.trim() || null,
        },
      });
      setAssessment(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadScenario = (type) => {
    setActiveScenario(type);
    if (type === 'missing-see') {
      setShipmentRef('EXP-2026-BLOCK-001');
      setExportCn('731815');
      setFastenerTonnes('10.0');
      setDirectEmissions('3.0');
      setIndirectEmissions('1.0');
      setPrecursorCn('7213');
      setPrecursorTonnes('10.5');
      setPrecursorSee('');
      setIsVerified(false);
      setVerifierBody('');
      setAssessment(null);
    } else if (type === 'unverified') {
      setShipmentRef('EXP-2026-BLOCK-002');
      setExportCn('731815');
      setFastenerTonnes('10.0');
      setDirectEmissions('3.0');
      setIndirectEmissions('1.0');
      setPrecursorCn('7213');
      setPrecursorTonnes('10.5');
      setPrecursorSee('1.85');
      setIsVerified(false);
      setVerifierBody('Local Testing Lab');
      setAssessment(null);
    } else if (type === 'compliant') {
      setShipmentRef('EXP-2026-PASS-808');
      setExportCn('731815');
      setFastenerTonnes('10.0');
      setDirectEmissions('2.8');
      setIndirectEmissions('0.9');
      setPrecursorCn('7213');
      setPrecursorTonnes('10.4');
      setPrecursorSee('1.85');
      setIsVerified(true);
      setVerifierBody('TÜV SÜD Europe (NAB-EU/2026)');
      setAssessment(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Statutory Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              EU CBAM 2026 Carbon Intelligence Terminal
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
              Definitive Regime
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Enforces Regulation (EU) 2023/956 compliance for steel fasteners (CN 731815) and validates mandatory precursor wire rod (CN 7213) Specific Embedded Emissions.
          </p>
        </div>

        <div className="text-xs font-mono text-muted bg-paper-well p-2 rounded border border-rule">
          <span>CBAM Certificate Reference: </span>
          <strong className="text-emerald-400">€85 / tCO₂e</strong>
        </div>
      </div>

      {/* 1-Click Scenario Preset Strip */}
      <div className="reg-card p-3 bg-paper-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-display font-semibold text-muted uppercase tracking-wider mr-1">
          Preset Scenarios:
        </span>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => loadScenario(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-display flex items-center space-x-1.5 transition-colors ${
              activeScenario === s.id
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'bg-paper-well text-muted hover:text-white border border-rule hover:border-rule-strong'
            }`}
          >
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Form on Left, Carbon Intelligence Assessment on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs (Cols 1-5) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleEvaluate} className="reg-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm text-white hairline-b pb-2 flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Export Product: Steel Fasteners (CN 731815)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-muted text-[11px] mb-1">Shipment Reference</label>
                <input
                  type="text"
                  value={shipmentRef}
                  onChange={(e) => setShipmentRef(e.target.value)}
                  className="w-full bg-paper-well border border-rule rounded px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-muted text-[11px] mb-1">Export CN Code</label>
                <input
                  type="text"
                  value={exportCn}
                  onChange={(e) => setExportCn(e.target.value)}
                  className="w-full bg-paper-well border border-rule rounded px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-muted text-[11px] mb-1">Fastener Tonnes</label>
                <input
                  type="number"
                  step="0.1"
                  value={fastenerTonnes}
                  onChange={(e) => setFastenerTonnes(e.target.value)}
                  className="w-full bg-paper-well border border-rule rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-muted text-[11px] mb-1">Direct (tCO₂e)</label>
                <input
                  type="number"
                  step="0.1"
                  value={directEmissions}
                  onChange={(e) => setDirectEmissions(e.target.value)}
                  className="w-full bg-paper-well border border-rule rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-muted text-[11px] mb-1">Indirect (tCO₂e)</label>
                <input
                  type="number"
                  step="0.1"
                  value={indirectEmissions}
                  onChange={(e) => setIndirectEmissions(e.target.value)}
                  className="w-full bg-paper-well border border-rule rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <h3 className="font-display font-semibold text-sm text-white hairline-b pb-2 pt-2 flex items-center space-x-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Precursor Material: Wire Rod (CN 7213)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-muted text-[11px] mb-1">Wire Rod CN Code</label>
                <input
                  type="text"
                  value={precursorCn}
                  onChange={(e) => setPrecursorCn(e.target.value)}
                  className="w-full bg-paper-well border border-rule rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-muted text-[11px] mb-1">Wire Rod Tonnes Consumed</label>
                <input
                  type="number"
                  step="0.1"
                  value={precursorTonnes}
                  onChange={(e) => setPrecursorTonnes(e.target.value)}
                  className="w-full bg-paper-well border border-rule rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="text-xs space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-muted text-[11px]">Specific Embedded Emissions (tCO₂e/t)</label>
                  <span className="text-[10px] text-amber-400 font-mono">Mandatory under 2026 rules</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={precursorSee}
                  onChange={(e) => setPrecursorSee(e.target.value)}
                  placeholder="e.g. 1.85 (Leave empty to test 2026 Block)"
                  className="w-full bg-paper-well border border-rule rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="cbam-verified"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="w-4 h-4 rounded border-rule bg-paper-well text-emerald-600 focus:ring-0"
                />
                <label htmlFor="cbam-verified" className="text-xs text-ink-2 select-none">
                  Third-party EU Accredited Verifier Verified
                </label>
              </div>

              <div>
                <label className="block text-muted text-[11px] mb-1">Verifier Accreditation Body</label>
                <input
                  type="text"
                  value={verifierBody}
                  onChange={(e) => setVerifierBody(e.target.value)}
                  placeholder="e.g. TÜV SÜD Europe / DNV"
                  className="w-full bg-paper-well border border-rule rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full keycap-btn keycap-btn-primary py-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{loading ? 'Evaluating Carbon Compliance...' : 'Evaluate 2026 CBAM Compliance'}</span>
            </button>
          </form>
        </div>

        {/* Assessment Ledger (Cols 6-12) */}
        <div className="lg:col-span-7 space-y-4">
          {error && (
            <div className="reg-card p-4 bg-red-950/40 border-red-800 text-red-300 text-xs">
              <strong>Evaluation Error:</strong> {error}
            </div>
          )}

          {assessment ? (
            <div className="reg-card p-5 space-y-4">
              {/* Verdict Header */}
              <div className="flex items-center justify-between hairline-b pb-3">
                <div className="flex items-center space-x-2.5">
                  {assessment.compliance_status === 'PASS' ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-display font-semibold text-sm text-white">
                      CBAM Assessment Verdict: {assessment.compliance_status}
                    </h3>
                    <p className="text-[11px] text-muted font-mono">{assessment.regulation_reference}</p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded text-xs font-mono font-bold ${
                    assessment.compliance_status === 'PASS'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-red-950 text-red-300 border border-red-700'
                  }`}
                >
                  {assessment.compliance_status}
                </span>
              </div>

              {/* Regulatory Reason Alert */}
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed border ${
                  assessment.compliance_status === 'PASS'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                    : 'bg-red-950/40 border-red-800/60 text-red-200'
                }`}
              >
                {assessment.reason}
              </div>

              {/* Emissions & Financial Exposure Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-paper-well p-3 rounded border border-rule">
                  <span className="text-[10px] text-muted block">Direct Emissions</span>
                  <span className="font-mono font-bold text-sm text-white mt-1 block">
                    {assessment.direct_emissions_tco2e.toFixed(2)} tCO₂e
                  </span>
                </div>

                <div className="bg-paper-well p-3 rounded border border-rule">
                  <span className="text-[10px] text-muted block">Indirect Emissions</span>
                  <span className="font-mono font-bold text-sm text-white mt-1 block">
                    {assessment.indirect_emissions_tco2e.toFixed(2)} tCO₂e
                  </span>
                </div>

                <div className="bg-paper-well p-3 rounded border border-rule">
                  <span className="text-[10px] text-muted block">Precursor Embedded</span>
                  <span className="font-mono font-bold text-sm text-emerald-400 mt-1 block">
                    {assessment.precursor_embedded_emissions_tco2e !== null
                      ? `${assessment.precursor_embedded_emissions_tco2e.toFixed(2)} tCO₂e`
                      : 'UNSPECIFIED'}
                  </span>
                </div>

                <div className="bg-paper-well p-3 rounded border border-rule">
                  <span className="text-[10px] text-muted block">Total Embedded</span>
                  <span className="font-mono font-bold text-sm text-amber-400 mt-1 block">
                    {assessment.total_embedded_emissions_tco2e !== null
                      ? `${assessment.total_embedded_emissions_tco2e.toFixed(2)} tCO₂e`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Specific Embedded Emissions per Tonne & Cost Modeling */}
              <div className="bg-paper-well p-4 rounded-lg border border-rule space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Specific Embedded Emissions (Fastener):</span>
                  <span className="font-mono font-bold text-sm text-white">
                    {assessment.specific_embedded_emissions_tco2e_per_t !== null
                      ? `${assessment.specific_embedded_emissions_tco2e_per_t.toFixed(3)} tCO₂e / t`
                      : 'BLOCKED'}
                  </span>
                </div>

                {assessment.compliance_status === 'PASS' && assessment.cbam_certificate_cost_eur && (
                  <div className="hairline-t pt-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted block">Estimated CBAM Certificate Obligation:</span>
                      <span className="text-[10px] text-muted/80">Based on €85 / certificate ETS pricing</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-base text-emerald-400 block">
                        €{assessment.cbam_certificate_cost_eur.toLocaleString('en-US', { maximumFractionDigits: 0 })} EUR
                      </span>
                      <span className="text-[11px] font-mono text-muted">
                        ≈ ₹{(assessment.cbam_certificate_cost_eur * 90).toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2026 Definitive Regime Rules Box */}
              <div className="text-xs text-muted space-y-1 bg-paper-3 p-3 rounded border border-rule">
                <div className="flex items-center space-x-1.5 text-white font-semibold">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2026 EU CBAM Definitive Transition Note:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Starting January 1, 2026, transitional defaults and standard values are strictly prohibited. Non-EU fastener manufacturers must prove real, independently verified Specific Embedded Emissions for all precursor inputs (wire rod CN 7213) to clear European customs.
                </p>
              </div>
            </div>
          ) : (
            <div className="reg-card p-12 flex flex-col items-center justify-center text-center space-y-3 bg-paper-well border-dashed">
              <Flame className="w-10 h-10 text-muted" />
              <h4 className="font-display font-semibold text-white">No CBAM Assessment Run Yet</h4>
              <p className="text-xs text-muted max-w-sm">
                Select one of the preset benchmark scenarios above or enter your shipment parameters to audit 2026 CBAM readiness.
              </p>
              <button
                onClick={() => handleEvaluate()}
                className="keycap-btn keycap-btn-primary px-4 py-2 text-xs font-semibold"
              >
                Run Preset Assessment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
