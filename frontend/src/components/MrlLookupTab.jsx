import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  ArrowRight,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Zap,
  Layers,
  FileText,
  Sparkles
} from 'lucide-react';
import { normalizeHsCode, lookupChemicalMrl } from '../services/api';

const QUICK_LOOKUPS = [
  {
    label: '🌶️ Ethylene oxide in Red Chilli',
    hs: '09042211',
    cas: '75-21-8',
    alias: 'Ethylene oxide',
    desc: 'Tier 1 CAS priority lookup'
  },
  {
    label: '🌾 Tricyclazole in Basmati Rice',
    hs: '10063010',
    cas: '41814-78-2',
    alias: 'Tricyclazole',
    desc: 'Strict 0.01 mg/kg default MRL'
  },
  {
    label: '🦐 Fipronil in Frozen Shrimp',
    hs: '03061700',
    cas: '120068-37-3',
    alias: 'Fipronil',
    desc: 'Marine aquaculture standard (0.005 mg/kg)'
  },
  {
    label: '🧄 Chlorpyrifos (Alias Fallback)',
    hs: '09042211',
    cas: '',
    alias: 'dursban',
    desc: 'Tier 2 trade name / alias resolution'
  }
];

export default function MrlLookupTab() {
  const [hsInput, setHsInput] = useState('09042211');
  const [casInput, setCasInput] = useState('75-21-8');
  const [aliasInput, setAliasInput] = useState('Ethylene oxide');
  const [lookupResult, setLookupResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-run lookup on mount so the tab is never empty
  useEffect(() => {
    handleLookup();
  }, []);

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await lookupChemicalMrl({
        raw_hs_code: hsInput,
        cas_number: casInput.trim() || null,
        chemical_alias: aliasInput.trim() || null,
      });
      setLookupResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset) => {
    setHsInput(preset.hs);
    setCasInput(preset.cas);
    setAliasInput(preset.alias);
    setLookupResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              EU MRL & CAS Substance Intelligence Registry
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Reg (EC) 396/2005
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Normalizes 8-digit Indian ITC-HS codes into 4-digit EU chapters and resolves active chemical substances using{' '}
            <strong className="text-emerald-400">Tier 1 CAS Registry Numbers</strong> first, falling back to{' '}
            <strong className="text-amber-300">Tier 2 Synonyms & Aliases</strong> against the official statutory SQLite database.
          </p>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="glass-panel p-3.5 flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider mr-1">
          Quick Lookups:
        </span>
        {QUICK_LOOKUPS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => applyPreset(q)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-display bg-slate-900/60 text-slate-300 hover:text-white border border-white/10 hover:border-emerald-500/40 transition-all flex items-center space-x-1.5"
          >
            <span>{q.label}</span>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form (Cols 1-5) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleLookup} className="glass-panel p-6 space-y-4">
            <h3 className="font-display font-bold text-sm text-white hairline-b pb-3 flex items-center space-x-2">
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Query Substance & Commodity</span>
            </h3>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1 font-mono">
                Indian 8-Digit ITC-HS Code (e.g. 09042211 Crushed Chilli)
              </label>
              <input
                type="text"
                value={hsInput}
                onChange={(e) => setHsInput(e.target.value)}
                placeholder="e.g. 09042211"
                className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3.5 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Normalized automatically to 4-digit EU chapter prefix (e.g. 0904)
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 text-[11px] font-mono">Tier 1: CAS Registry Number</label>
                <span className="text-[10px] text-emerald-400 font-mono">Priority Checksum</span>
              </div>
              <input
                type="text"
                value={casInput}
                onChange={(e) => setCasInput(e.target.value)}
                placeholder="e.g. 75-21-8"
                className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3.5 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 text-[11px] font-mono">Tier 2: Chemical Alias / Trade Name Fallback</label>
                <span className="text-[10px] text-amber-300 font-mono">Synonym Match</span>
              </div>
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="e.g. Ethylene oxide, dursban, tricyclazole"
                className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3.5 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-emerald py-3 text-xs font-bold flex items-center justify-center space-x-2 shadow-lg"
            >
              <Zap className="w-4 h-4" />
              <span>{loading ? 'Querying Statutory DB...' : 'Query Maximum Residue Limit'}</span>
            </button>
          </form>
        </div>

        {/* Results Console (Cols 6-12) */}
        <div className="lg:col-span-7 space-y-4">
          {error && (
            <div className="glass-panel p-4 bg-rose-950/40 border-rose-800 text-rose-300 text-xs">
              <strong>Lookup Error:</strong> {error}
            </div>
          )}

          {lookupResult ? (
            <div className="glass-panel p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between hairline-b pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">
                      {lookupResult.substance_name || lookupResult.chemical_name || 'Substance Found'}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      CAS: <strong className="text-white">{lookupResult.cas_number || 'N/A'}</strong> &bull; Match Tier:{' '}
                      <strong className="text-emerald-400">{lookupResult.match_tier || 'Tier 1 (CAS)'}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Statutory EU MRL</span>
                  <span className="font-mono font-bold text-2xl text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                    {lookupResult.max_limit_mg_kg !== null ? `${lookupResult.max_limit_mg_kg} mg/kg` : '0.01 mg/kg (Default)'}
                  </span>
                </div>
              </div>

              {/* Metadata Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="glass-well p-3.5 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-mono">Normalized HS Code</span>
                  <span className="font-mono font-bold text-white text-base block">
                    {lookupResult.commodity_hs4 || lookupResult.normalized_hs_prefix || hsInput.substring(0, 4)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {lookupResult.commodity_name || lookupResult.commodity_description || 'Spices & Agricultural Products'}
                  </span>
                </div>

                <div className="glass-well p-3.5 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-mono">Legal Citation & Framework</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs block leading-snug">
                    {lookupResult.regulation_reference || 'Regulation (EC) 396/2005'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">European Union Statutory Ceiling</span>
                </div>
              </div>

              {/* Regulatory Guidance */}
              <div className="glass-well p-4 rounded-xl border border-white/10 text-xs space-y-2">
                <div className="flex items-center space-x-2 text-white font-semibold">
                  <Info className="w-4 h-4 text-emerald-400" />
                  <span>Enforcement Guidance for Exporters:</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  Laboratory analytical instruments used for pre-shipment inspection must achieve an accredited Limit of Quantification (LOQ) equal to or lower than{' '}
                  <strong className="text-emerald-400 font-bold">{lookupResult.max_limit_mg_kg || 0.01} mg/kg</strong>. Any report stating "BLQ" with an LOQ higher than this threshold constitutes an immediate non-compliance trap under EU border inspection regulations.
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-center space-y-3 border-dashed">
              <Database className="w-10 h-10 text-slate-500" />
              <h4 className="font-display font-bold text-white">No Substance Queried Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Select a quick lookup preset above or enter an Indian HS code and CAS number to view statutory EU limits.
              </p>
              <button
                onClick={() => handleLookup()}
                className="btn-emerald px-5 py-2.5 text-xs"
              >
                Run Default Substance Lookup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
