import React, { useState } from 'react';
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
  FileText
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
      <div>
        <div className="flex items-center space-x-2">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            EU MRL & CAS Substance Intelligence Registry
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            Reg (EC) 396/2005
          </span>
        </div>
        <p className="text-xs text-muted mt-1">
          Normalizes 8-digit Indian ITC-HS codes into 4-digit EU chapters and resolves active chemical substances using{' '}
          <strong className="text-emerald-400">Tier 1 CAS Registry Numbers</strong> first, falling back to{' '}
          <strong className="text-amber-300">Tier 2 Synonyms & Aliases</strong> against the official statutory SQLite database.
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="reg-card p-3 bg-paper-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-display font-semibold text-muted uppercase tracking-wider mr-1">
          Quick Lookups:
        </span>
        {QUICK_LOOKUPS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => applyPreset(q)}
            className="px-3 py-1.5 rounded-lg text-xs font-display bg-paper-well text-ink-2 hover:text-white border border-rule hover:border-emerald-500/50 transition-colors flex items-center space-x-1.5"
          >
            <span>{q.label}</span>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form (Cols 1-5) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleLookup} className="reg-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm text-white hairline-b pb-2 flex items-center space-x-2">
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Query Substance & Commodity</span>
            </h3>

            <div>
              <label className="block text-muted text-[11px] mb-1">
                Indian 8-Digit ITC-HS Code (e.g. 09042211 Crushed Chilli)
              </label>
              <input
                type="text"
                value={hsInput}
                onChange={(e) => setHsInput(e.target.value)}
                placeholder="e.g. 09042211"
                className="w-full bg-paper-well border border-rule rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-muted mt-1 block">
                Normalized automatically to 4-digit EU chapter prefix (e.g. 0904)
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-muted text-[11px]">Tier 1: CAS Registry Number</label>
                <span className="text-[10px] text-emerald-400 font-mono">Priority Checksum</span>
              </div>
              <input
                type="text"
                value={casInput}
                onChange={(e) => setCasInput(e.target.value)}
                placeholder="e.g. 75-21-8"
                className="w-full bg-paper-well border border-rule rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-muted text-[11px]">Tier 2: Chemical Alias / Trade Name Fallback</label>
                <span className="text-[10px] text-amber-300 font-mono">Synonym Match</span>
              </div>
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="e.g. Ethylene oxide, dursban, tricyclazole"
                className="w-full bg-paper-well border border-rule rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full keycap-btn keycap-btn-primary py-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{loading ? 'Querying Statutory DB...' : 'Query Maximum Residue Limit'}</span>
            </button>
          </form>
        </div>

        {/* Results Console (Cols 6-12) */}
        <div className="lg:col-span-7 space-y-4">
          {error && (
            <div className="reg-card p-4 bg-red-950/40 border-red-800 text-red-300 text-xs">
              <strong>Lookup Error:</strong> {error}
            </div>
          )}

          {lookupResult ? (
            <div className="reg-card p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between hairline-b pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm text-white">
                      {lookupResult.chemical_name || 'Substance Found'}
                    </h3>
                    <p className="text-[11px] text-muted font-mono">
                      CAS: {lookupResult.cas_number || 'N/A'} &bull; Match Tier:{' '}
                      <strong className="text-emerald-400">{lookupResult.match_tier || 'Tier 1 (CAS)'}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-muted block uppercase">Statutory EU MRL</span>
                  <span className="font-mono font-bold text-lg text-emerald-400">
                    {lookupResult.max_limit_mg_kg !== null ? `${lookupResult.max_limit_mg_kg} mg/kg` : '0.01 mg/kg (Default)'}
                  </span>
                </div>
              </div>

              {/* Metadata Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-paper-well p-3 rounded border border-rule">
                  <span className="text-[10px] text-muted block">Normalized HS Code</span>
                  <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                    {lookupResult.normalized_hs_prefix || hsInput.substring(0, 4)}
                  </span>
                  <span className="text-[10px] text-muted">
                    Chapter: {lookupResult.commodity_description || 'Edible Spices / Grains'}
                  </span>
                </div>

                <div className="bg-paper-well p-3 rounded border border-rule">
                  <span className="text-[10px] text-muted block">Legal Framework</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block">
                    {lookupResult.regulation_reference || 'Regulation (EC) 396/2005'}
                  </span>
                  <span className="text-[10px] text-muted">European Union Statutory Limit</span>
                </div>
              </div>

              {/* Regulatory Guidance */}
              <div className="bg-paper-3 p-3.5 rounded-lg border border-rule text-xs space-y-1.5">
                <div className="flex items-center space-x-1.5 text-white font-semibold">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enforcement Guidance for Exporters:</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Laboratory analytical instruments used for pre-shipment inspection must achieve an accredited Limit of Quantification (LOQ) equal to or lower than{' '}
                  <strong className="text-emerald-400">{lookupResult.max_limit_mg_kg || 0.01} mg/kg</strong>. Any report stating "BLQ" with an LOQ higher than this threshold constitutes an immediate non-compliance trap under EU border inspection regulations.
                </p>
              </div>
            </div>
          ) : (
            <div className="reg-card p-12 flex flex-col items-center justify-center text-center space-y-3 bg-paper-well border-dashed">
              <Database className="w-10 h-10 text-muted" />
              <h4 className="font-display font-semibold text-white">No Substance Queried Yet</h4>
              <p className="text-xs text-muted max-w-sm">
                Select a quick lookup preset above or enter an Indian HS code and CAS number to view statutory EU limits.
              </p>
              <button
                onClick={() => handleLookup()}
                className="keycap-btn keycap-btn-primary px-4 py-2 text-xs font-semibold"
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
