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
    id: 'compliant',
    label: 'Scenario A: 2026 Certified Compliant (Pass)',
    desc: 'Verified precursor SEE (1.95 tCO2e/t) with accredited verifier (TÜV SÜD Europe)',
    status: 'COMPLIANT'
  },
  {
    id: 'missing-see',
    label: 'Scenario B: Missing Precursor Emissions (Block)',
    desc: 'Wire rod (CN 7213) tonnage declared, but Specific Embedded Emissions omitted',
    status: 'CRITICAL_BLOCK'
  },
  {
    id: 'unverified',
    label: 'Scenario C: Unaccredited Verifier (Block)',
    desc: 'Precursor emissions provided, but lacks an accredited third-party verification body',
    status: 'CRITICAL_BLOCK'
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

  // Auto-evaluate on mount
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
        fastener_tonnage: parseFloat(fastenerTonnes) || 10.0,
        direct_emissions_tco2e: parseFloat(directEmissions) || 0,
        indirect_emissions_tco2e: parseFloat(indirectEmissions) || 0,
        precursor_wire_rod: {
          cn_code: precursorCn,
          tonnage_consumed: parseFloat(precursorTonnes) || 10.4,
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

  // Safe numerical calculations
  const directVal = parseFloat(directEmissions) || 0;
  const indirectVal = parseFloat(indirectEmissions) || 0;
  const precTonnesVal = parseFloat(precursorTonnes) || 0;
  const precSeeVal = precursorSee !== '' ? parseFloat(precursorSee) : null;
  const precEmissionsVal = precSeeVal !== null ? precTonnesVal * precSeeVal : null;

  const isCompliant = assessment?.status === 'COMPLIANT' || assessment?.compliance_status === 'PASS';
  const totalEm = assessment?.total_embedded_emissions_tco2e ?? (isCompliant && precEmissionsVal !== null ? (directVal + indirectVal + precEmissionsVal) : null);
  const seePerT = assessment?.specific_embedded_emissions_tco2e_per_t ?? (totalEm !== null ? totalEm / (parseFloat(fastenerTonnes) || 1) : null);

  return (
    <div className="space-y-6">
      {/* Title & Plain English Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              European Carbon Border Tax (EU CBAM)
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Regulation (EU) 2023/956
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Starting in 2026, the European Union imposes a carbon tax on imported industrial goods (steel screws, bolts, and fasteners). Indian factories must declare the carbon emissions of both their factory and their raw steel (wire rod). If unverified, the shipment is blocked at European customs.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-300 glass-well p-3 rounded-xl border border-white/10 flex items-center space-x-2.5 self-start md:self-auto shrink-0">
          <Coins className="w-4 h-4 text-emerald-400" />
          <span>EU Carbon Credit Price: </span>
          <strong className="text-emerald-400 font-bold text-sm">€85 / tCO₂e</strong>
        </div>
      </div>

      {/* Preset Test Scenarios */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider mr-1">
          Test Benchmark Scenarios:
        </span>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
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

      {/* Main Grid: Form on Left, Assessment on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleEvaluate} className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-display font-bold text-sm text-white border-b border-white/[0.08] pb-3 flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Export Product: Steel Fasteners (HS Code: 731815)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1">Shipment Reference</label>
                <input
                  type="text"
                  value={shipmentRef}
                  onChange={(e) => setShipmentRef(e.target.value)}
                  className="w-full bg-[#070b13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1">Export HS / CN Code</label>
                <input
                  type="text"
                  value={exportCn}
                  onChange={(e) => setExportCn(e.target.value)}
                  className="w-full bg-[#070b13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1">Net Weight (Tonnes)</label>
                <input
                  type="number"
                  step="0.1"
                  value={fastenerTonnes}
                  onChange={(e) => setFastenerTonnes(e.target.value)}
                  className="w-full bg-[#070b13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1">Factory Direct CO₂</label>
                <input
                  type="number"
                  step="0.1"
                  value={directEmissions}
                  onChange={(e) => setDirectEmissions(e.target.value)}
                  className="w-full bg-[#070b13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1">Electricity Indirect CO₂</label>
                <input
                  type="number"
                  step="0.1"
                  value={indirectEmissions}
                  onChange={(e) => setIndirectEmissions(e.target.value)}
                  className="w-full bg-[#070b13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <h3 className="font-display font-bold text-sm text-white border-b border-white/[0.08] pb-2 pt-2 flex items-center space-x-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Raw Material Input: Steel Wire Rod (HS: 7213)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1">Wire Rod HS Code</label>
                <input
                  type="text"
                  value={precursorCn}
                  onChange={(e) => setPrecursorCn(e.target.value)}
                  className="w-full bg-[#070b13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1">Wire Rod Consumed (Tonnes)</label>
                <input
                  type="number"
                  step="0.1"
                  value={precursorTonnes}
                  onChange={(e) => setPrecursorTonnes(e.target.value)}
                  className="w-full bg-[#070b13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="text-xs space-y-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 text-xs font-medium">Raw Steel Carbon Intensity (tCO₂e / Tonne)</label>
                  <span className="text-[10px] text-amber-400 font-mono">Mandatory under 2026 EU law</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={precursorSee}
                  onChange={(e) => setPrecursorSee(e.target.value)}
                  placeholder="e.g. 1.95 (Leave empty to test missing data block)"
                  className="w-full bg-[#070b13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
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
                  Verified by EU-Accredited Independent Auditor
                </label>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1">Accredited Auditor Name</label>
                <input
                  type="text"
                  value={verifierBody}
                  onChange={(e) => setVerifierBody(e.target.value)}
                  placeholder="e.g. TÜV SÜD Europe / DNV"
                  className="w-full bg-[#070b13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-emerald py-3 text-xs font-bold flex items-center justify-center space-x-2 shadow-lg"
            >
              <Zap className="w-4 h-4" />
              <span>{loading ? 'Evaluating Carbon Compliance...' : 'Calculate EU Carbon Border Compliance'}</span>
            </button>
          </form>
        </div>

        {/* Assessment Ledger */}
        <div className="lg:col-span-7 space-y-4">
          {error && (
            <div className="glass-panel p-4 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-xl">
              <strong>Evaluation Error:</strong> {error}
            </div>
          )}

          {assessment && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 rounded-2xl space-y-5"
            >
              {/* Verdict Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center space-x-3">
                  {isCompliant ? (
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
                      European Customs Verdict: {isCompliant ? 'APPROVED (COMPLIANT)' : 'CRITICAL EXPORT BLOCK'}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">Reference: Regulation (EU) 2023/956</p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                    isCompliant ? 'badge-pass' : 'badge-critical'
                  }`}
                >
                  {isCompliant ? 'STATUTORY PASS' : 'CRITICAL_BLOCK'}
                </span>
              </div>

              {/* Regulatory Reason Alert */}
              <div
                className={`p-4 rounded-xl text-xs leading-relaxed border ${
                  isCompliant
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                {assessment.compliance_summary || assessment.critical_blocks?.[0] || 'Assessment completed.'}
              </div>

              {/* Emissions Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="glass-well p-3.5 space-y-1 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-mono">Factory Direct CO₂</span>
                  <span className="font-mono font-bold text-sm text-white block">
                    {directVal.toFixed(2)} tCO₂e
                  </span>
                </div>

                <div className="glass-well p-3.5 space-y-1 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-mono">Electricity Indirect CO₂</span>
                  <span className="font-mono font-bold text-sm text-white block">
                    {indirectVal.toFixed(2)} tCO₂e
                  </span>
                </div>

                <div className="glass-well p-3.5 space-y-1 rounded-xl border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-300 block font-mono">Raw Steel Carbon</span>
                  <span className="font-mono font-bold text-sm text-emerald-400 block">
                    {precEmissionsVal !== null ? `${precEmissionsVal.toFixed(2)} tCO₂e` : 'MISSING (BLOCKED)'}
                  </span>
                </div>

                <div className="glass-well p-3.5 space-y-1 rounded-xl border border-amber-500/30">
                  <span className="text-[10px] text-amber-300 block font-mono">Total Consignment Carbon</span>
                  <span className="font-mono font-bold text-sm text-amber-400 block">
                    {totalEm !== null ? `${totalEm.toFixed(2)} tCO₂e` : 'BLOCKED'}
                  </span>
                </div>
              </div>

              {/* Specific Embedded Emissions per Tonne & Cost Modeling */}
              <div className="glass-well p-5 rounded-xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">Carbon Intensity per Tonne of Screws/Fasteners:</span>
                  <span className="font-mono font-bold text-base text-white">
                    {seePerT !== null ? `${seePerT.toFixed(3)} tCO₂e / t` : 'BLOCKED'}
                  </span>
                </div>

                {isCompliant && totalEm !== null && (
                  <div className="border-t border-white/[0.08] pt-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-300 font-medium block">Estimated EU Carbon Certificate Cost:</span>
                      <span className="text-[11px] text-slate-500 font-mono">Calculated at statutory €85 / certificate price</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-lg text-emerald-400 block drop-shadow">
                        €{Math.round(totalEm * 85).toLocaleString('en-US')} EUR
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        ≈ ₹{Math.round(totalEm * 85 * 90).toLocaleString('en-IN')} INR
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Simple Layman Explanation Box */}
              <div className="text-xs text-slate-400 space-y-1.5 glass-well p-4 rounded-xl border border-white/10">
                <div className="flex items-center space-x-2 text-white font-semibold">
                  <Info className="w-4 h-4 text-emerald-400" />
                  <span>Why this matters to Indian Exporters:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Under the European Union's 2026 green laws, Indian factories cannot use average guesses or default numbers. If you do not provide third-party verified carbon numbers for the raw steel used to make your screws or bolts, European ports will seize the shipment. ClearSpec calculates the exact compliance score before your cargo leaves.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}