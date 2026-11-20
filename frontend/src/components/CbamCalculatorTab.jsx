import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Zap,
  Info,
  Building2,
  ArrowRight,
  TrendingDown,
  Coins
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
    desc: 'Verified precursor SEE (1.95 tCO2e/t) with accredited verifier (TÜV SÜD Europe)',
    status: 'PASS'
  }
];

export default function CbamCalculatorTab() {
  const [shipmentRef, setShipmentRef] = useState('EXP-2026-EU-FASTENER-901');
  const [exportCn, setExportCn] = useState('731815');
  const [fastenerTonnes, setFastenerTonnes] = useState('10.0');
  const [directEmissions, setDirectEmissions] = useState('2.8');
  const [indirectEmissions, setIndirectEmissions] = useState('0.9');

  // Precursor wire rod (CN 7213)
  const [precursorCn, setPrecursorCn] = useState('7213');
  const [precursorTonnes, setPrecursorTonnes] = useState('10.4');
  const [precursorSee, setPrecursorSee] = useState('1.95');
  const [isVerified, setIsVerified] = useState(true);
  const [verifierBody, setVerifierBody] = useState('TÜV SÜD Europe (NAB-EU/2026)');

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeScenario, setActiveScenario] = useState('compliant');

  // Auto-evaluate on mount so tab is immediately populated
  useEffect(() => {
    handleEvaluate();
  }, []);

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
      setVerifierBody('Local Non-Accredited Lab');
    } else if (type === 'compliant') {
      setShipmentRef('EXP-2026-PASS-808');
      setExportCn('731815');
      setFastenerTonnes('10.0');
      setDirectEmissions('2.8');
      setIndirectEmissions('0.9');
      setPrecursorCn('7213');
      setPrecursorTonnes('10.4');
      setPrecursorSee('1.95');
      setIsVerified(true);
      setVerifierBody('TÜV SÜD Europe (NAB-EU/2026)');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Statutory Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              EU CBAM 2026 Carbon Intelligence Terminal
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Definitive Regime
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enforces Regulation (EU) 2023/956 compliance for steel fasteners (CN 731815) and validates mandatory precursor wire rod (CN 7213) Specific Embedded Emissions.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-300 glass-well p-2.5 rounded-xl border border-white/10 flex items-center space-x-2 self-start md:self-auto">
          <Coins className="w-4 h-4 text-emerald-400" />
          <span>ETS Certificate Reference: </span>
          <strong className="text-emerald-400 font-bold text-sm">€85 / tCO₂e</strong>
        </div>
      </div>

      {/* 1-Click Scenario Preset Strip */}
      <div className="glass-panel p-3.5 flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider mr-1">
          Preset Scenarios:
        </span>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => loadScenario(s.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-display flex items-center space-x-2 transition-all ${
              activeScenario === s.id
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/10'
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
          <form onSubmit={handleEvaluate} className="glass-panel p-6 space-y-4">
            <h3 className="font-display font-bold text-sm text-white hairline-b pb-3 flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Export Product: Steel Fasteners (CN 731815)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-mono">Shipment Reference</label>
                <input
                  type="text"
                  value={shipmentRef}
                  onChange={(e) => setShipmentRef(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-mono">Export CN Code</label>
                <input
                  type="text"
                  value={exportCn}
                  onChange={(e) => setExportCn(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-mono">Net Tonnes</label>
                <input
                  type="number"
                  step="0.1"
                  value={fastenerTonnes}
                  onChange={(e) => setFastenerTonnes(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-mono">Direct tCO₂e</label>
                <input
                  type="number"
                  step="0.1"
                  value={directEmissions}
                  onChange={(e) => setDirectEmissions(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-mono">Indirect tCO₂e</label>
                <input
                  type="number"
                  step="0.1"
                  value={indirectEmissions}
                  onChange={(e) => setIndirectEmissions(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <h3 className="font-display font-bold text-sm text-white hairline-b pb-2 pt-2 flex items-center space-x-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Precursor Material: Wire Rod (CN 7213)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-mono">Wire Rod CN Code</label>
                <input
                  type="text"
                  value={precursorCn}
                  onChange={(e) => setPrecursorCn(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-mono">Wire Rod Tonnes Consumed</label>
                <input
                  type="number"
                  step="0.1"
                  value={precursorTonnes}
                  onChange={(e) => setPrecursorTonnes(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="text-xs space-y-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 text-[11px] font-mono">Specific Embedded Emissions (tCO₂e/t)</label>
                  <span className="text-[10px] text-amber-400 font-mono">Mandatory under 2026 rules</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={precursorSee}
                  onChange={(e) => setPrecursorSee(e.target.value)}
                  placeholder="e.g. 1.95 (Leave empty to test 2026 Block)"
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center space-x-2.5 pt-1">
                <input
                  type="checkbox"
                  id="cbam-verified"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-slate-900 text-emerald-600 focus:ring-0"
                />
                <label htmlFor="cbam-verified" className="text-xs text-slate-200 select-none font-medium">
                  Third-party EU Accredited Verifier Verified
                </label>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-mono">Verifier Accreditation Body</label>
                <input
                  type="text"
                  value={verifierBody}
                  onChange={(e) => setVerifierBody(e.target.value)}
                  placeholder="e.g. TÜV SÜD Europe / DNV"
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-emerald py-3 text-xs font-bold flex items-center justify-center space-x-2 shadow-lg"
            >
              <Zap className="w-4 h-4" />
              <span>{loading ? 'Evaluating Carbon Compliance...' : 'Evaluate 2026 CBAM Compliance'}</span>
            </button>
          </form>
        </div>

        {/* Assessment Ledger (Cols 6-12) */}
        <div className="lg:col-span-7 space-y-4">
          {error && (
            <div className="glass-panel p-4 bg-rose-950/40 border-rose-800 text-rose-300 text-xs">
              <strong>Evaluation Error:</strong> {error}
            </div>
          )}

          {assessment ? (
            <div className="glass-panel p-6 space-y-5">
              {/* Verdict Header */}
              <div className="flex items-center justify-between hairline-b pb-4">
                <div className="flex items-center space-x-3">
                  {assessment.compliance_status === 'PASS' ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-display font-bold text-base text-white">
                      CBAM Assessment Verdict: {assessment.compliance_status}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{assessment.regulation_reference}</p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                    assessment.compliance_status === 'PASS'
                      ? 'badge-pass'
                      : 'badge-critical'
                  }`}
                >
                  {assessment.compliance_status}
                </span>
              </div>

              {/* Regulatory Reason Alert */}
              <div
                className={`p-4 rounded-xl text-xs leading-relaxed border ${
                  assessment.compliance_status === 'PASS'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}
              >
                {assessment.reason}
              </div>

              {/* Emissions & Financial Exposure Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="glass-well p-3.5 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-mono">Direct Emissions</span>
                  <span className="font-mono font-bold text-sm text-white block">
                    {assessment.direct_emissions_tco2e.toFixed(2)} tCO₂e
                  </span>
                </div>

                <div className="glass-well p-3.5 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-mono">Indirect Emissions</span>
                  <span className="font-mono font-bold text-sm text-white block">
                    {assessment.indirect_emissions_tco2e.toFixed(2)} tCO₂e
                  </span>
                </div>

                <div className="glass-well p-3.5 space-y-1 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-300 block font-mono">Precursor Embedded</span>
                  <span className="font-mono font-bold text-sm text-emerald-400 block">
                    {assessment.precursor_embedded_emissions_tco2e !== null
                      ? `${assessment.precursor_embedded_emissions_tco2e.toFixed(2)} tCO₂e`
                      : 'UNSPECIFIED'}
                  </span>
                </div>

                <div className="glass-well p-3.5 space-y-1 border border-amber-500/30">
                  <span className="text-[10px] text-amber-300 block font-mono">Total Embedded</span>
                  <span className="font-mono font-bold text-sm text-amber-400 block">
                    {assessment.total_embedded_emissions_tco2e !== null
                      ? `${assessment.total_embedded_emissions_tco2e.toFixed(2)} tCO₂e`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Specific Embedded Emissions per Tonne & Cost Modeling */}
              <div className="glass-well p-5 rounded-xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">Specific Embedded Emissions (Fastener):</span>
                  <span className="font-mono font-bold text-base text-white">
                    {assessment.specific_embedded_emissions_tco2e_per_t !== null
                      ? `${assessment.specific_embedded_emissions_tco2e_per_t.toFixed(3)} tCO₂e / t`
                      : 'BLOCKED'}
                  </span>
                </div>

                {assessment.compliance_status === 'PASS' && assessment.cbam_certificate_cost_eur && (
                  <div className="hairline-t pt-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-300 font-medium block">Estimated CBAM Certificate Obligation:</span>
                      <span className="text-[11px] text-slate-500 font-mono">Based on €85 / certificate ETS pricing</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-lg text-emerald-400 block drop-shadow">
                        €{assessment.cbam_certificate_cost_eur.toLocaleString('en-US', { maximumFractionDigits: 0 })} EUR
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        ≈ ₹{(assessment.cbam_certificate_cost_eur * 90).toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2026 Definitive Regime Rules Box */}
              <div className="text-xs text-slate-400 space-y-1.5 glass-well p-4 rounded-xl border border-white/10">
                <div className="flex items-center space-x-2 text-white font-semibold">
                  <Info className="w-4 h-4 text-emerald-400" />
                  <span>2026 EU CBAM Definitive Transition Note:</span>
                </div>
                <p className="text-[11px] leading-relaxed font-mono">
                  Starting January 1, 2026, transitional defaults and standard values are strictly prohibited. Non-EU fastener manufacturers must prove real, independently verified Specific Embedded Emissions for all precursor inputs (wire rod CN 7213) to clear European customs.
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-center space-y-3 border-dashed">
              <Flame className="w-10 h-10 text-slate-500" />
              <h4 className="font-display font-bold text-white">No CBAM Assessment Run Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Select one of the preset benchmark scenarios above or enter your shipment parameters to audit 2026 CBAM readiness.
              </p>
              <button
                onClick={() => handleEvaluate()}
                className="btn-emerald px-5 py-2.5 text-xs"
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
