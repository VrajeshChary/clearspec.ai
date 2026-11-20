import React, { useState } from 'react';
import { Database, Search, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { normalizeHsCode, lookupChemicalMrl } from '../services/api';

export default function MrlLookupTab() {
  const [hsInput, setHsInput] = useState('09042211');
  const [casInput, setCasInput] = useState('75-21-8');
  const [aliasInput, setAliasInput] = useState('Ethylene oxide');
  const [lookupResult, setLookupResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await lookupChemicalMrl({
        hs_code: hsInput,
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

  const setDemo1 = () => {
    setHsInput('09042211'); // Red chili 8-digit
    setCasInput('75-21-8');  // CAS Tier 1
    setAliasInput('Ethylene oxide');
    setLookupResult(null);
  };

  const setDemo2 = () => {
    setHsInput('09042211'); // Red chili 8-digit
    setCasInput('');        // No CAS
    setAliasInput('dursban'); // Alias Tier 2
    setLookupResult(null);
  };

  const setDemo3 = () => {
    setHsInput('10063010'); // Basmati rice 8-digit
    setCasInput('41814-78-2'); // Tricyclazole CAS
    setAliasInput('');
    setLookupResult(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">EU MRL & CAS Registry Lookup</h2>
        <p className="text-slate-400 mt-1">
          Normalizes 8-digit Indian ITC-HS codes into 4-digit EU chapters and resolves active chemical substances using <span className="text-emerald-400 font-semibold">Tier 1 CAS Registry Numbers</span> first, falling back to <span className="text-indigo-400 font-semibold">Tier 2 Aliases</span>.
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
            <Database className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-slate-200">Query EU Maximum Residue Limit</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={setDemo1}
              className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded"
            >
              Demo: Chili (09042211) + CAS 75-21-8
            </button>
            <button
              onClick={setDemo2}
              className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded"
            >
              Demo: Chili + Alias "dursban"
            </button>
            <button
              onClick={setDemo3}
              className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded"
            >
              Demo: Rice (10063010) + Tricyclazole
            </button>
          </div>
        </div>

        <form onSubmit={handleLookup} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Indian 8-Digit ITC-HS Code
              </label>
              <input
                type="text"
                value={hsInput}
                onChange={(e) => setHsInput(e.target.value)}
                placeholder="e.g. 09042211"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                required
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Normalized to 4-digit prefix automatically (e.g. 0904)
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                CAS Registry Number (Tier 1 Priority)
              </label>
              <input
                type="text"
                value={casInput}
                onChange={(e) => setCasInput(e.target.value)}
                placeholder="e.g. 75-21-8"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Checksum validated; highest matching priority
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Chemical Alias / Trade Name (Tier 2 Fallback)
              </label>
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="e.g. Dursban, Acetamiprid"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Used when CAS is omitted or unindexed
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Querying MRL Schedule...' : 'Perform Database Lookup'}
          </button>
        </form>

        {lookupResult && (
          <div className="mt-8 border border-slate-800 rounded-xl p-5 bg-slate-900/50 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Substance</span>
                <h4 className="text-lg font-bold text-white">{lookupResult.substance_name || 'Not Found'}</h4>
              </div>
              <div className="flex items-center gap-2">
                {lookupResult.match_tier && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    <Tag className="w-3 h-3" />
                    Tier: {lookupResult.match_tier}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  HS4: {lookupResult.commodity_hs4}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                <div className="text-xs text-slate-400">CAS Registry Number</div>
                <div className="text-base font-mono font-semibold text-white mt-1">
                  {lookupResult.cas_number || 'N/A'}
                </div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                <div className="text-xs text-slate-400">Commodity Classification</div>
                <div className="text-xs font-medium text-slate-200 mt-1 line-clamp-2">
                  {lookupResult.commodity_name}
                </div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                <div className="text-xs text-slate-400">Statutory EU MRL</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {lookupResult.max_limit_mg_kg !== null ? `${lookupResult.max_limit_mg_kg} mg/kg` : '0.01 mg/kg (Default)'}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="font-semibold text-slate-300">Regulation Reference: </span>
              {lookupResult.regulation_reference || 'Regulation (EC) No 396/2005 Article 18(1)(b)'}
              <div className="mt-1 text-slate-500">{lookupResult.notes}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
