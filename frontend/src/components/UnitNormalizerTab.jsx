import React, { useState } from 'react';
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
  Sliders
} from 'lucide-react';
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
    <div className="space-y-6">
      {/* Title & Overview */}
      <div>
        <div className="flex items-center space-x-2">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Unit Normalizer & Sensitivity Trap Simulator
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            Python Pint Engine
          </span>
        </div>
        <p className="text-xs text-muted mt-1">
          Normalizes chemical and pesticide test units (<code className="text-emerald-400">ppb</code>, <code className="text-emerald-400">ppm</code>, <code className="text-emerald-400">ug/kg</code>, <code className="text-emerald-400">% w/w</code>) to canonical <code className="text-emerald-400 font-bold">mg/kg</code> and enforces the statutory <strong>BLQ &gt; MRL Sensitivity Trap Check</strong>.
        </p>
      </div>

      {/* TOOL 1: UNIVERSAL UNIT CONVERTER */}
      <div className="reg-card p-5 space-y-4">
        <h3 className="font-display font-semibold text-sm text-white hairline-b pb-2 flex items-center space-x-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          <span>Universal Regulatory Unit Converter</span>
        </h3>

        <form onSubmit={handleQuickConvert} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs">
          <div className="sm:col-span-5">
            <label className="block text-muted text-[11px] mb-1">Magnitude / Reading</label>
            <input
              type="number"
              step="any"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full bg-paper-well border border-rule rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-muted text-[11px] mb-1">Source Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-paper-well border border-rule rounded px-3 py-2 text-xs text-white"
            >
              <option value="ug/kg">µg/kg (Micrograms per kilogram)</option>
              <option value="ppb">ppb (Parts per billion)</option>
              <option value="ppm">ppm (Parts per million)</option>
              <option value="mg/kg">mg/kg (Milligrams per kilogram)</option>
              <option value="g/kg">g/kg (Grams per kilogram)</option>
              <option value="% w/w">% w/w (Percent weight by weight)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              className="w-full keycap-btn keycap-btn-primary py-2 text-xs font-semibold flex items-center justify-center space-x-1"
            >
              <span>Convert to mg/kg</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {conversionResult && (
          <div className="bg-paper-well p-4 rounded-lg border border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="space-y-1">
              <span className="text-muted block text-[11px]">Normalized Canonical Result:</span>
              <div className="flex items-baseline space-x-2">
                <span className="font-mono font-bold text-lg text-emerald-400">
                  {conversionResult.canonical_value_mg_kg} mg/kg
                </span>
                <span className="text-muted text-xs">
                  (from {conversionResult.source_value} {conversionResult.source_unit})
                </span>
              </div>
            </div>

            <div className="text-right text-[11px] text-muted font-mono bg-paper-3 px-3 py-1.5 rounded border border-rule">
              Factor: 1 {conversionResult.source_unit} = {conversionResult.conversion_factor_to_mg_kg} mg/kg
            </div>
          </div>
        )}
      </div>

      {/* TOOL 2: BLQ > MRL SENSITIVITY TRAP SIMULATOR */}
      <div className="reg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 hairline-b pb-3">
          <div>
            <h3 className="font-display font-semibold text-sm text-white flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>The "BLQ &gt; MRL" Sensitivity Trap Simulator</span>
            </h3>
            <p className="text-[11px] text-muted mt-0.5">
              Simulates laboratory LOQ inadequacy against EU border regulations.
            </p>
          </div>

          {/* Quick Scenario Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={loadTrapScenario}
              className="px-2.5 py-1 rounded bg-red-950/70 border border-red-800 text-red-300 text-xs hover:bg-red-900 transition-colors"
            >
              Trigger Trap (LOQ 50 µg/kg)
            </button>
            <button
              onClick={loadPassScenario}
              className="px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs hover:bg-emerald-900 transition-colors"
            >
              Sensitive Lab (LOQ 5 µg/kg)
            </button>
          </div>
        </div>

        <form onSubmit={handleEvaluateTrap} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-muted text-[11px] mb-1">Substance</label>
            <input
              type="text"
              value={compound}
              onChange={(e) => setCompound(e.target.value)}
              className="w-full bg-paper-well border border-rule rounded px-3 py-1.5 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-muted text-[11px] mb-1">Lab Reported Status</label>
            <select
              value={labStatus}
              onChange={(e) => setLabStatus(e.target.value)}
              className="w-full bg-paper-well border border-rule rounded px-3 py-1.5 text-xs text-white"
            >
              <option value="BLQ">BLQ (Below Limit of Quantification)</option>
              <option value="ND">ND (Not Detected)</option>
              <option value="DETECTED">Detected Value</option>
            </select>
          </div>

          <div>
            <label className="block text-muted text-[11px] mb-1">Lab Instrument LOQ</label>
            <div className="flex space-x-1">
              <input
                type="number"
                step="any"
                value={labLoqVal}
                onChange={(e) => setLabLoqVal(e.target.value)}
                className="w-2/3 bg-paper-well border border-rule rounded px-2.5 py-1.5 text-xs text-white font-mono"
              />
              <select
                value={labLoqUnit}
                onChange={(e) => setLabLoqUnit(e.target.value)}
                className="w-1/3 bg-paper-well border border-rule rounded px-1 text-[11px] text-white"
              >
                <option value="ug/kg">µg/kg</option>
                <option value="ppb">ppb</option>
                <option value="ppm">ppm</option>
                <option value="mg/kg">mg/kg</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-muted text-[11px] mb-1">EU Statutory MRL (mg/kg)</label>
            <input
              type="number"
              step="any"
              value={mrlVal}
              onChange={(e) => setMrlVal(e.target.value)}
              className="w-full bg-paper-well border border-rule rounded px-3 py-1.5 text-xs text-white font-mono"
            />
          </div>

          <div className="sm:col-span-4 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full keycap-btn keycap-btn-primary py-2 text-xs font-semibold flex items-center justify-center space-x-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{loading ? 'Evaluating Sensitivity...' : 'Simulate Regulatory Verdict'}</span>
            </button>
          </div>
        </form>

        {evalResult && (
          <div className="space-y-4 pt-2">
            <div
              className={`p-4 rounded-lg border ${
                evalResult.verdict === 'PASS'
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  : 'bg-red-950/40 border-red-800/80 text-red-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {evalResult.verdict === 'PASS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                  )}
                  <span className="font-display font-bold text-sm">
                    Verdict: {evalResult.verdict}
                  </span>
                </div>

                <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40 border border-white/10">
                  BLQ Trap Triggered: <strong>{evalResult.blq_trap_triggered ? 'YES (CRITICAL)' : 'NO'}</strong>
                </span>
              </div>

              <p className="text-xs leading-relaxed">{evalResult.reason}</p>
            </div>

            {/* Visual Sensitivity Comparison Scale */}
            <div className="bg-paper-well p-4 rounded-lg border border-rule space-y-3">
              <h4 className="text-xs font-display font-semibold text-white">Visual Instrument Sensitivity Scale:</h4>

              <div className="space-y-2 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted">Statutory EU MRL Ceiling:</span>
                    <span className="text-emerald-400 font-bold">{evalResult.max_limit_mg_kg} mg/kg</span>
                  </div>
                  <div className="w-full h-3 bg-paper-3 rounded overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded" style={{ width: '40%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted">Lab Instrument LOQ (Converted):</span>
                    <span className={`font-bold ${evalResult.blq_trap_triggered ? 'text-red-400' : 'text-emerald-400'}`}>
                      {evalResult.lab_loq_canonical_mg_kg} mg/kg
                    </span>
                  </div>
                  <div className="w-full h-3 bg-paper-3 rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${evalResult.blq_trap_triggered ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{
                        width: evalResult.blq_trap_triggered ? '85%' : '25%',
                      }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted/90 pt-1">
                {evalResult.blq_trap_triggered
                  ? '⚠️ The testing machine had a limit of quantification (LOQ) higher than the EU maximum residue limit. Even though no substance was detected, EU customs rejects this report because the instrument was too coarse to prove compliance.'
                  : '✅ The testing machine had an LOQ strictly below the statutory MRL threshold. The BLQ reading reliably proves statutory compliance.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
