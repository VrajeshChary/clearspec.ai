import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Info,
  Zap,
  HelpCircle,
  ShieldAlert,
  Sliders,
  Sparkles,
  Gauge
} from 'lucide-react';
import { normalizeUnit, evaluateLabReport } from '../services/api';

export default function UnitNormalizerTab() {
  // Conversion state
  const [val, setVal] = useState('250');
  const [unit, setUnit] = useState('ug/kg');
  const [conversionResult, setConversionResult] = useState({
    source_value: 250,
    source_unit: 'ug/kg',
    canonical_value_mg_kg: 0.25,
    conversion_factor_to_mg_kg: 0.001,
  });

  // Trap evaluation state
  const [compound, setCompound] = useState('Ethylene oxide');
  const [labStatus, setLabStatus] = useState('BLQ');
  const [labLoqVal, setLabLoqVal] = useState('50');
  const [labLoqUnit, setLabLoqUnit] = useState('ug/kg');
  const [mrlVal, setMrlVal] = useState('0.01');
  const [evalResult, setEvalResult] = useState({
    verdict: 'FAIL',
    blq_trap_triggered: true,
    compound_name: 'Ethylene oxide',
    lab_status: 'BLQ',
    lab_loq_canonical_mg_kg: 0.05,
    max_limit_mg_kg: 0.01,
    reason: 'SENSITIVITY TRAP TRIGGERED: Lab reported BLQ with instrument LOQ of 0.05 mg/kg (50 µg/kg), which exceeds statutory EU MRL of 0.01 mg/kg. The analytical method is legally inconclusive and invalid under Regulation (EC) 396/2005.'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-run on mount
  useEffect(() => {
    handleEvaluateTrap();
  }, []);

  const handleQuickConvert = async (e) => {
    if (e) e.preventDefault();
    try {
      setError(null);
      const res = await normalizeUnit(val, unit);
      setConversionResult(res);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEvaluateTrap = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await evaluateLabReport({
        compound_name: compound,
        lab_status: labStatus,
        detected_value: null,
        detected_unit: 'mg/kg',
        lab_loq_value: parseFloat(labLoqVal) || 0,
        lab_loq_unit: labLoqUnit,
        max_limit_mg_kg: parseFloat(mrlVal) || 0.01,
      });
      setEvalResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTrapScenario = () => {
    setCompound('Ethylene oxide');
    setLabStatus('BLQ');
    setLabLoqVal('50');
    setLabLoqUnit('ug/kg'); // 0.05 mg/kg -> larger than 0.01 mg/kg MRL!
    setMrlVal('0.01');
    setEvalResult({
      verdict: 'FAIL',
      blq_trap_triggered: true,
      compound_name: 'Ethylene oxide',
      lab_status: 'BLQ',
      lab_loq_canonical_mg_kg: 0.05,
      max_limit_mg_kg: 0.01,
      reason: 'SENSITIVITY TRAP TRIGGERED: Lab reported BLQ with instrument LOQ of 0.05 mg/kg (50 µg/kg), which exceeds statutory EU MRL of 0.01 mg/kg. The analytical method is legally inconclusive and invalid under Regulation (EC) 396/2005.'
    });
  };

  const loadPassScenario = () => {
    setCompound('Ethylene oxide');
    setLabStatus('BLQ');
    setLabLoqVal('5');
    setLabLoqUnit('ug/kg'); // 0.005 mg/kg -> sensitive enough!
    setMrlVal('0.01');
    setEvalResult({
      verdict: 'PASS',
      blq_trap_triggered: false,
      compound_name: 'Ethylene oxide',
      lab_status: 'BLQ',
      lab_loq_canonical_mg_kg: 0.005,
      max_limit_mg_kg: 0.01,
      reason: 'COMPLIANT: Lab instrument LOQ of 0.005 mg/kg is strictly below EU MRL threshold (0.01 mg/kg). BLQ reading definitively satisfies EU statutory requirements.'
    });
  };

  // Proportional scale calculation
  const mrl = evalResult?.max_limit_mg_kg || 0.01;
  const loq = evalResult?.lab_loq_canonical_mg_kg || 0.05;
  const maxScale = Math.max(mrl, loq) * 1.25;
  const mrlPct = Math.min(100, (mrl / maxScale) * 100);
  const loqPct = Math.min(100, (loq / maxScale) * 100);

  return (
    <div className="space-y-6">
      {/* Title & Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              Unit Normalizer & Sensitivity Trap Simulator
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Python Pint Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Standardizes non-uniform laboratory metrics (<code className="text-emerald-400 font-mono">ppb</code>, <code className="text-emerald-400 font-mono">ppm</code>, <code className="text-emerald-400 font-mono">µg/kg</code>, <code className="text-emerald-400 font-mono">% w/w</code>) to statutory <code className="text-emerald-400 font-mono font-bold">mg/kg</code> and enforces the legal <strong className="text-slate-200">BLQ &gt; MRL Sensitivity Trap Check</strong> under Regulation (EC) 396/2005.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TOOL 1: UNIVERSAL UNIT CONVERTER */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-white/[0.08] pb-3">
              <Scale className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display font-semibold text-sm text-white">Universal Regulatory Unit Converter</h3>
            </div>

            <form onSubmit={handleQuickConvert} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Magnitude / Raw Reading</label>
                <input
                  type="number"
                  step="any"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  className="w-full bg-[#070b13] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Source Unit Reported by Lab</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-[#070b13] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/60 transition-all font-mono"
                >
                  <option value="ug/kg">µg/kg (Micrograms per kilogram)</option>
                  <option value="ppb">ppb (Parts per billion)</option>
                  <option value="ppm">ppm (Parts per million)</option>
                  <option value="mg/kg">mg/kg (Milligrams per kilogram)</option>
                  <option value="g/kg">g/kg (Grams per kilogram)</option>
                  <option value="% w/w">% w/w (Percent weight by weight)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full btn-emerald py-2.5 text-xs font-semibold flex items-center justify-center space-x-2"
              >
                <span>Convert to Canonical mg/kg</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {conversionResult && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-well p-4 rounded-xl border border-white/[0.08] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] font-mono">Normalized Metric:</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Canonical
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="font-mono font-bold text-2xl text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                  {conversionResult.canonical_value_mg_kg} <span className="text-sm">mg/kg</span>
                </span>
                <span className="text-slate-500 text-xs">
                  (from {conversionResult.source_value} {conversionResult.source_unit})
                </span>
              </div>
              <div className="pt-2 border-t border-white/[0.06] text-[11px] text-slate-400 font-mono flex justify-between">
                <span>Conversion Ratio:</span>
                <span className="text-slate-200">1 {conversionResult.source_unit} = {conversionResult.conversion_factor_to_mg_kg} mg/kg</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* TOOL 2: BLQ > MRL SENSITIVITY TRAP SIMULATOR */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="font-display font-semibold text-sm text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>The Statutory "BLQ &gt; MRL" Sensitivity Trap Simulator</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Simulates laboratory LOQ inadequacy against statutory European border standards.
              </p>
            </div>

            {/* Quick Benchmark Scenario Toggles */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={loadTrapScenario}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs hover:bg-rose-500/20 transition-all font-mono"
              >
                Trigger Trap (50 µg/kg)
              </button>
              <button
                type="button"
                onClick={loadPassScenario}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs hover:bg-emerald-500/20 transition-all font-mono"
              >
                Sensitive Lab (5 µg/kg)
              </button>
            </div>
          </div>

          <form onSubmit={handleEvaluateTrap} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">Compound / Analytes</label>
              <input
                type="text"
                value={compound}
                onChange={(e) => setCompound(e.target.value)}
                className="w-full bg-[#070b13] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">Lab Reported Status</label>
              <select
                value={labStatus}
                onChange={(e) => setLabStatus(e.target.value)}
                className="w-full bg-[#070b13] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60 font-mono"
              >
                <option value="BLQ">BLQ (Below Limit of Quantification)</option>
                <option value="ND">ND (Not Detected)</option>
                <option value="DETECTED">Detected Value</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">Lab LOQ Instrument Limit</label>
              <div className="flex space-x-1.5">
                <input
                  type="number"
                  step="any"
                  value={labLoqVal}
                  onChange={(e) => setLabLoqVal(e.target.value)}
                  className="w-2/3 bg-[#070b13] border border-white/[0.1] rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/60"
                />
                <select
                  value={labLoqUnit}
                  onChange={(e) => setLabLoqUnit(e.target.value)}
                  className="w-1/3 bg-[#070b13] border border-white/[0.1] rounded-xl px-1 text-[11px] text-white focus:outline-none focus:border-emerald-500/60 font-mono"
                >
                  <option value="ug/kg">µg/kg</option>
                  <option value="ppb">ppb</option>
                  <option value="ppm">ppm</option>
                  <option value="mg/kg">mg/kg</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">Statutory EU MRL (mg/kg)</label>
              <input
                type="number"
                step="any"
                value={mrlVal}
                onChange={(e) => setMrlVal(e.target.value)}
                className="w-full bg-[#070b13] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="sm:col-span-4 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-emerald py-2.5 text-xs font-semibold flex items-center justify-center space-x-2"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{loading ? 'Evaluating Sensitivity Invariance...' : 'Simulate EU Border Verdict'}</span>
              </button>
            </div>
          </form>

          {evalResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 pt-1"
            >
              {/* Verdict Banner */}
              <div
                className={`p-4 rounded-xl border ${
                  evalResult.verdict === 'PASS'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    {evalResult.verdict === 'PASS' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <span className="font-display font-bold text-sm tracking-wide">
                      VERDICT: {evalResult.verdict === 'PASS' ? 'STATUTORY PASS' : 'CRITICAL BLOCK — LEGAL TRAP'}
                    </span>
                  </div>

                  <span className={`font-mono text-xs px-2.5 py-0.5 rounded-full border ${
                    evalResult.blq_trap_triggered
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  }`}>
                    BLQ Trap: <strong>{evalResult.blq_trap_triggered ? 'TRIGGERED (LOQ > MRL)' : 'DEFUSED (LOQ < MRL)'}</strong>
                  </span>
                </div>

                <p className="text-xs leading-relaxed font-sans opacity-90">{evalResult.reason}</p>
              </div>

              {/* Visual Instrument Sensitivity Scale */}
              <div className="glass-well p-5 rounded-xl border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-display font-semibold text-white flex items-center space-x-2">
                    <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Visual Analytical Sensitivity Ratio Meter</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Proportional Scale Comparison
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Statutory EU MRL Ceiling (Regulation EC 396/2005):</span>
                      </span>
                      <span className="text-emerald-400 font-bold">{evalResult.max_limit_mg_kg} mg/kg</span>
                    </div>
                    <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/[0.05]">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                        style={{ width: `${mrlPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <span className={`w-2 h-2 rounded-full ${evalResult.blq_trap_triggered ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                        <span>Lab Instrument Detection Limit (LOQ Converted):</span>
                      </span>
                      <span className={`font-bold ${evalResult.blq_trap_triggered ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {evalResult.lab_loq_canonical_mg_kg} mg/kg
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/[0.05]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          evalResult.blq_trap_triggered
                            ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                            : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                        }`}
                        style={{ width: `${loqPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] leading-relaxed text-slate-300">
                  {evalResult.blq_trap_triggered ? (
                    <div className="flex items-start space-x-2 text-rose-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <span>
                        <strong>Statutory Invalidation Warning:</strong> The testing machine's Limit of Quantification (0.05 mg/kg) is <strong>5x higher</strong> than the statutory legal allowance (0.01 mg/kg). Even though the lab report states &quot;BLQ&quot;, EU port inspectors at Rotterdam will reject this certificate because the test was too coarse to establish compliance.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start space-x-2 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                      <span>
                        <strong>Method Validated:</strong> The testing laboratory utilized high-sensitivity LC-MS/MS with an LOQ of 0.005 mg/kg (well beneath the statutory 0.01 mg/kg limit). This BLQ finding definitively legally proves non-detectable contamination under EU border protocols.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}