import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, ArrowRight, Info } from 'lucide-react';
import { normalizeUnit, evaluateLabReport } from '../services/api';

export default function UnitNormalizerTab() {
  // Conversion state
  const [val, setVal] = useState('250');
  const [unit, setUnit] = useState('ug/kg');
  const [conversionResult, setConversionResult] = useState(null);

  // Trap evaluation state
  const [compound, setCompound] = useState('Ethylene oxide');
  const [labStatus, setLabStatus] = useState('BLQ');
  const [labLoqVal, setLabLoqVal] = useState('50');
  const [labLoqUnit, setLabLoqUnit] = useState('ug/kg');
  const [mrlVal, setMrlVal] = useState('0.01');
  const [evalResult, setEvalResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuickConvert = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await normalizeUnit(val, unit);
      setConversionResult(res);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEvaluateTrap = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await evaluateLabReport({
        compound_name: compound,
        lab_status: labStatus,
        detected_value: null,
        detected_unit: 'mg/kg',
        lab_loq_value: parseFloat(labLoqVal),
        lab_loq_unit: labLoqUnit,
        max_limit_mg_kg: parseFloat(mrlVal),
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
    setEvalResult(null);
  };

  const loadPassScenario = () => {
    setCompound('Ethylene oxide');
    setLabStatus('BLQ');
    setLabLoqVal('5');
    setLabLoqUnit('ug/kg'); // 0.005 mg/kg -> sensitive enough!
    setMrlVal('0.01');
    setEvalResult(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Unit Normalizer & BLQ Sensitivity Guard</h2>
        <p className="text-slate-400 mt-1">
          Standardizes chemical residue test units into canonical <span className="text-emerald-400 font-mono">mg/kg</span> and prevents export rejections from the <strong className="text-amber-400">"BLQ &gt; MRL Trap"</strong>.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Normalizer */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Canonical Unit Converter
            </h3>
            <form onSubmit={handleQuickConvert} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Concentration Value</label>
                  <input
                    type="number"
                    step="any"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Source Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ug/kg">ug/kg (ppb)</option>
                    <option value="ppb">ppb</option>
                    <option value="ppm">ppm (mg/kg)</option>
                    <option value="% w/w">% w/w</option>
                    <option value="g/kg">g/kg</option>
                    <option value="mg/kg">mg/kg</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                Normalize to mg/kg <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {conversionResult && (
            <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Canonical Result</div>
              <div className="text-2xl font-bold text-white mt-1 font-mono">
                {conversionResult.canonical_value_mg_kg} <span className="text-sm font-normal text-slate-400">mg/kg</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Converted {conversionResult.input_value} {conversionResult.input_unit}
              </div>
            </div>
          )}
        </div>

        {/* BLQ > MRL Trap Evaluator */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              "BLQ &gt; MRL Trap" Validator
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadTrapScenario}
                className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded"
              >
                Load Trap Scenario
              </button>
              <button
                type="button"
                onClick={loadPassScenario}
                className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded"
              >
                Load Pass Scenario
              </button>
            </div>
          </div>

          <form onSubmit={handleEvaluateTrap} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Substance / Chemical Name</label>
              <input
                type="text"
                value={compound}
                onChange={(e) => setCompound(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Lab Result Status</label>
                <select
                  value={labStatus}
                  onChange={(e) => setLabStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="BLQ">BLQ (Below Limit of Quantification)</option>
                  <option value="ND">ND (Non-Detect)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Legal EU MRL (mg/kg)</label>
                <input
                  type="number"
                  step="any"
                  value={mrlVal}
                  onChange={(e) => setMrlVal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Lab LOQ Value</label>
                <input
                  type="number"
                  step="any"
                  value={labLoqVal}
                  onChange={(e) => setLabLoqVal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Lab LOQ Unit</label>
                <select
                  value={labLoqUnit}
                  onChange={(e) => setLabLoqUnit(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ug/kg">ug/kg</option>
                  <option value="ppb">ppb</option>
                  <option value="ppm">ppm</option>
                  <option value="mg/kg">mg/kg</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Evaluating...' : 'Evaluate BLQ Compliance Verdict'}
            </button>
          </form>

          {evalResult && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                evalResult.verdict === 'CRITICAL_BLOCK'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {evalResult.verdict === 'CRITICAL_BLOCK' ? (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span className="text-rose-400">CRITICAL_BLOCK - Lab Machine Insensitive</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400">PASS - Non-Detect Legally Verified</span>
                  </>
                )}
              </div>
              <p className="text-xs leading-relaxed text-slate-300 mt-1">{evalResult.reason}</p>
              <div className="mt-3 grid grid-cols-2 text-xs border-t border-slate-800 pt-2 text-slate-400">
                <div>Lab LOQ: <span className="font-mono text-white">{evalResult.lab_loq_canonical_mg_kg} mg/kg</span></div>
                <div>Legal MRL: <span className="font-mono text-white">{evalResult.max_limit_mg_kg} mg/kg</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
