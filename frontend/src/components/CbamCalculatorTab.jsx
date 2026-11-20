import React, { useState } from 'react';
import { Flame, AlertOctagon, CheckCircle2, ShieldAlert, FileText } from 'lucide-react';
import { evaluateCbamFasteners } from '../services/api';

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

  const handleEvaluate = async (e) => {
    e.preventDefault();
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

  const loadMissingPrecursorScenario = () => {
    setShipmentRef('EXP-2026-BLOCK-001');
    setExportCn('731815');
    setFastenerTonnes('10.0');
    setDirectEmissions('3.0');
    setIndirectEmissions('1.0');
    setPrecursorCn('7213');
    setPrecursorTonnes('10.5');
    setPrecursorSee(''); // Missing SEE!
    setIsVerified(false);
    setVerifierBody('');
    setAssessment(null);
  };

  const loadUnverifiedScenario = () => {
    setShipmentRef('EXP-2026-BLOCK-002');
    setExportCn('731815');
    setFastenerTonnes('10.0');
    setDirectEmissions('3.0');
    setIndirectEmissions('1.0');
    setPrecursorCn('7213');
    setPrecursorTonnes('10.5');
    setPrecursorSee('2.15'); // Given but unverified!
    setIsVerified(false);
    setVerifierBody('');
    setAssessment(null);
  };

  const loadCompliantScenario = () => {
    setShipmentRef('EXP-2026-PASS-003');
    setExportCn('731815');
    setFastenerTonnes('10.0');
    setDirectEmissions('2.8');
    setIndirectEmissions('0.9');
    setPrecursorCn('7213');
    setPrecursorTonnes('10.4');
    setPrecursorSee('1.95');
    setIsVerified(true);
    setVerifierBody('DNV GL / TÜV SÜD CBAM Accredited Verifier');
    setAssessment(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">2026 EU CBAM Compliance Calculator</h2>
        <p className="text-slate-400 mt-1">
          Enforces definitive regime requirements under <span className="text-rose-400 font-semibold">Regulation (EU) 2023/956</span> for steel fastener exports (CN 731815), blocking declarations when raw precursor wire rod (CN 7213) lacks verified Specific Embedded Emissions ($t\text{CO}_2e/t$).
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-slate-200">Fastener Export Declaration Assessment</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadMissingPrecursorScenario}
              className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded"
            >
              Demo: Missing Precursor SEE (Trap)
            </button>
            <button
              onClick={loadUnverifiedScenario}
              className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded"
            >
              Demo: Unverified SEE (Block)
            </button>
            <button
              onClick={loadCompliantScenario}
              className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded"
            >
              Demo: Verified Compliant
            </button>
          </div>
        </div>

        <form onSubmit={handleEvaluate} className="space-y-6">
          {/* Section 1: Finished Fasteners */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              1. Finished Product Export Declaration
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Shipment Reference</label>
                <input
                  type="text"
                  value={shipmentRef}
                  onChange={(e) => setShipmentRef(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Export CN Code</label>
                <input
                  type="text"
                  value={exportCn}
                  onChange={(e) => setExportCn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Quantity (Tonnes)</label>
                <input
                  type="number"
                  step="any"
                  value={fastenerTonnes}
                  onChange={(e) => setFastenerTonnes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Direct Em. (tCO2e)</label>
                <input
                  type="number"
                  step="any"
                  value={directEmissions}
                  onChange={(e) => setDirectEmissions(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Precursor Wire Rod */}
          <div className="border-t border-slate-800 pt-5">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              2. Precursor Wire Rod (Mandatory for CN 731815)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Precursor CN Code</label>
                <input
                  type="text"
                  value={precursorCn}
                  onChange={(e) => setPrecursorCn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                  required
                />
                <span className="text-[11px] text-slate-500">e.g. 7213 (Hot-rolled wire rod)</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Precursor Consumed (t)</label>
                <input
                  type="number"
                  step="any"
                  value={precursorTonnes}
                  onChange={(e) => setPrecursorTonnes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Specific Embedded Emissions (tCO2e/t)
                </label>
                <input
                  type="number"
                  step="any"
                  value={precursorSee}
                  onChange={(e) => setPrecursorSee(e.target.value)}
                  placeholder="Required under 2026 CBAM"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                />
                <span className="text-[11px] text-rose-400">Leave blank to test Critical Block</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Third-Party Verification</label>
                <div className="flex items-center h-10">
                  <label className="relative flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={isVerified}
                      onChange={(e) => setIsVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-slate-900 border-slate-700"
                    />
                    <span>Accredited Verifier Signed</span>
                  </label>
                </div>
              </div>
            </div>

            {isVerified && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Accredited Verifier ID / Reference
                </label>
                <input
                  type="text"
                  value={verifierBody}
                  onChange={(e) => setVerifierBody(e.target.value)}
                  placeholder="e.g. TÜV SÜD / Bureau Veritas (ISO 14065)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Flame className="w-4 h-4" />
            {loading ? 'Validating 2026 CBAM Rules...' : 'Run 2026 CBAM Assessment'}
          </button>
        </form>

        {assessment && (
          <div className="mt-8">
            {assessment.status === 'CRITICAL_BLOCK' ? (
              <div className="p-5 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                  <AlertOctagon className="w-6 h-6 shrink-0" />
                  <span>CRITICAL_BLOCK: 2026 CBAM Compliance Failure</span>
                </div>
                <div className="space-y-2">
                  {assessment.critical_blocks.map((msg, i) => (
                    <div key={i} className="text-sm text-rose-200 bg-rose-900/30 p-3 rounded-lg border border-rose-800/50">
                      {msg}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-rose-300">
                  Export shipment declaration cannot be submitted to the EU CBAM Registry without verified precursor wire rod emissions data.
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <span>2026 CBAM Assessment Compliant</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-400">Total Embedded Emissions</div>
                    <div className="text-2xl font-bold font-mono text-white mt-1">
                      {assessment.total_embedded_emissions_tco2e} <span className="text-sm font-normal text-slate-400">tCO2e</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-400">Specific Embedded Emissions (Fastener)</div>
                    <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                      {assessment.specific_embedded_emissions_tco2e_per_t} <span className="text-sm font-normal text-slate-400">tCO2e / t</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {assessment.compliance_summary}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
