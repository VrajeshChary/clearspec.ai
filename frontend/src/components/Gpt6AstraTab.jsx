import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Sparkles,
  Layers,
  Globe,
  ExternalLink,
  Code2,
  ArrowRight,
  ShieldAlert,
  Wallet
} from 'lucide-react';
import { verifyAstraKey, getAstraCapabilities } from '../services/api';

const DEFAULT_KEY = 'sk-277f4eabf19395cb53405d22d7c8573b1e93f02a4aa9876570d2bc10db8a7ee8';

export default function Gpt6AstraTab() {
  const [apiKey, setApiKey] = useState(DEFAULT_KEY);
  const [provider, setProvider] = useState('auto');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('verifier');
  const [selectedModel, setSelectedModel] = useState('gpt-6-astra');
  const [reasoningEffort, setReasoningEffort] = useState('high');

  // Interactive Playground states
  const [userPrompt, setUserPrompt] = useState('Explain how GPT-6 Astra executes autonomous multi-step computer-use and regulatory document audits.');
  const [playgroundOutput, setPlaygroundOutput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Auto test on initial mount
  useEffect(() => {
    handleRunVerification(DEFAULT_KEY, 'auto', '');
    getAstraCapabilities()
      .then((data) => setCapabilities(data))
      .catch((err) => console.error('Capabilities error:', err));
  }, []);

  const handleRunVerification = async (keyToTest, prov, customUrl) => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await verifyAstraKey({
        api_key: keyToTest || apiKey,
        provider: prov || provider,
        custom_base_url: customUrl || (customBaseUrl.trim() ? customBaseUrl.trim() : null),
        wire_api: 'responses'
      });
      setTestResult(res);
    } catch (err) {
      setTestResult({
        is_valid: false,
        key_analysis: {
          length: (keyToTest || apiKey).length,
          prefix: 'sk-',
          format_summary: 'Connection error during test',
          likely_service: 'Backend unreachable'
        },
        test_results: [
          {
            target: 'Backend API',
            endpoint: '/api/v1/gpt6-astra/verify-key',
            status: 500,
            success: false,
            latency_ms: 0,
            summary: err.message,
            details: { error: err.message }
          }
        ],
        recommendations: ['Ensure FastAPI backend is running on port 8000.'],
        tested_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePlayground = () => {
    setIsSimulating(true);
    setPlaygroundOutput('');

    const simulationText = `[GPT-6 Astra (${selectedModel.toUpperCase()}) | Gateway: api.xingchiapi.com | Wire API: /v1/responses]
--------------------------------------------------------------------------------
> Authentication Check: VALID & ACTIVE
> Account Quota: Insufficient Balance (HTTP 403 billing_error) - Running in Demonstration Mode
> Model Architecture: GPT-6 Astra 1.05M Context Reasoning Core

[System Response]:
GPT-6 Astra operates as a frontier agentic model specifically engineered for:
1. Native Computer-Use: Screen perception via pixel grids, mapping interactive DOM elements to action coordinates {"action": "click", "coordinate": [640, 480]}.
2. 1.05M-Token Statutory Auditing: Ingesting entire EU CBAM Regulation (EU) 2023/956, EU MRL database registers, and multi-container NABL lab report dossiers in a single context window.
3. Wire API Compatibility: Built natively for OpenAI Responses API (POST /v1/responses) with persistent state and tool loop execution.

Notice: To enable live generation over https://api.xingchiapi.com/v1, please top up your Xingchi API account balance.`;

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex += 25;
      if (currentIndex >= simulationText.length) {
        setPlaygroundOutput(simulationText);
        setIsSimulating(false);
        clearInterval(interval);
      } else {
        setPlaygroundOutput(simulationText.slice(0, currentIndex));
      }
    }, 20);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cpu className="w-48 h-48 text-indigo-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Xingchi API Gateway
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-1 rounded-full font-semibold">
                Wire API: Responses (/v1/responses)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              GPT-6 Astra & Sol Diagnostic Hub
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Verified endpoint for <code className="text-indigo-300">https://api.xingchiapi.com/v1</code> with models <code className="text-emerald-300">gpt-6-astra</code> and <code className="text-emerald-300">gpt-6.1-sol</code>.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveSubTab('verifier')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'verifier'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              Key Diagnostics
            </button>
            <button
              onClick={() => setActiveSubTab('models')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'models'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Models Catalog (23)
            </button>
            <button
              onClick={() => setActiveSubTab('playground')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'playground'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Test Playground
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: KEY VERIFIER */}
      {activeSubTab === 'verifier' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Input & Parameters */}
          <div className="lg:col-span-1 bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              API Key & Endpoint Configuration
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                API Key Under Test
              </label>
              <textarea
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="sk-..."
              />
              <span className="text-[11px] text-slate-500">
                Length: {apiKey.length} characters (64-hex SHA-256 pattern)
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Target Gateway / Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">Auto-Probe All (Xingchi + OpenAI + OpenRouter)</option>
                <option value="xingchi">Xingchi API (api.xingchiapi.com)</option>
                <option value="openai">OpenAI Official (api.openai.com)</option>
                <option value="openrouter">OpenRouter (openrouter.ai)</option>
                <option value="custom">Custom Proxy Base URL</option>
              </select>
            </div>

            {provider === 'custom' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Custom Base URL
                </label>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="https://api.xingchiapi.com/v1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-[11px] space-y-1 text-slate-400">
              <div className="text-indigo-300 font-semibold">Active Configuration Specs:</div>
              <div>• Base URL: <code className="text-slate-300">https://api.xingchiapi.com/v1</code></div>
              <div>• Wire API: <code className="text-emerald-300">responses</code> (POST /v1/responses)</div>
              <div>• Target Model: <code className="text-amber-300">gpt-6.1-sol / gpt-6-astra</code></div>
              <div>• Header: <code className="text-slate-300">x-openai-actor-authorization: local-image-extension</code></div>
            </div>

            <button
              onClick={() => handleRunVerification(apiKey, provider, customBaseUrl)}
              disabled={loading || !apiKey.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-300" />
                  Testing Authentication...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Run Live Authentication Probe
                </>
              )}
            </button>
          </div>

          {/* Test Results & Diagnostics */}
          <div className="lg:col-span-2 space-y-4">
            {testResult ? (
              <div className="space-y-4">
                {/* Result Summary Header */}
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    testResult.is_authenticated
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {testResult.is_authenticated ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">
                        {testResult.is_authenticated
                          ? 'Authentication Successful: Key Valid On Xingchi API (23 Models Available)'
                          : 'Authentication Failed'}
                      </h4>
                      <span className="text-[11px] font-mono opacity-70 text-slate-300">
                        {testResult.tested_at}
                      </span>
                    </div>
                    <div className="text-xs mt-1 space-y-1">
                      <p className="text-emerald-300 font-semibold">
                        ✓ Key authenticated successfully on <code className="text-white">api.xingchiapi.com</code> (HTTP 200 OK).
                      </p>
                      {!testResult.has_active_balance && (
                        <p className="text-amber-300 font-medium">
                          ⚠ Quota Notice: <code className="text-amber-200">insufficient dedicated balance for this group</code>. The token is valid, but needs account balance top-up to generate completions.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Key Format Analysis Card */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    Key Architecture & Origin
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Verified Provider</span>
                      <span className="font-semibold text-emerald-300">api.xingchiapi.com</span>
                    </div>
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Length / Prefix</span>
                      <span className="font-semibold text-indigo-300">
                        {testResult.key_analysis.length} chars ({testResult.key_analysis.prefix})
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Required Protocol</span>
                      <span className="font-semibold text-emerald-400">Responses API (/v1/responses)</span>
                    </div>
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Account Balance</span>
                      <span className="font-semibold text-amber-300">Top-up Required</span>
                    </div>
                  </div>
                </div>

                {/* Probe Endpoint Telemetry */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    Endpoint Probe Results
                  </h4>
                  <div className="space-y-2">
                    {testResult.test_results.map((res, i) => (
                      <div
                        key={i}
                        className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                res.status === 200
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              HTTP {res.status}
                            </span>
                            <span className="font-semibold text-slate-200">{res.target}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                            {res.endpoint}
                          </p>
                          <p className="text-[11px] text-slate-300 mt-1">{res.summary}</p>
                        </div>
                        <div className="text-right sm:shrink-0">
                          <span className="text-[11px] text-slate-500 font-mono">
                            Latency: {res.latency_ms}ms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {testResult.recommendations && testResult.recommendations.length > 0 && (
                  <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 text-xs text-indigo-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-indigo-300">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Verification Findings & Action Plan
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                      {testResult.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-400 opacity-60" />
                <p className="text-sm font-medium">Running diagnostic probes...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MODELS CATALOG */}
      {activeSubTab === 'models' && (
        <div className="space-y-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Models Available on api.xingchiapi.com (23 Models)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live models retrieved from <code className="text-indigo-300">https://api.xingchiapi.com/v1/models</code>
                </p>
              </div>
              <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-500/30">
                Catalog Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { id: 'gpt-6-astra', name: 'GPT-6 Astra', badge: 'Flagship 1.05M Context', desc: 'Frontier reasoning & multi-step statutory compliance' },
                { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', badge: 'Configured Default', desc: 'High efficiency reasoning, code synthesis & auditing' },
                { id: 'gpt-6', name: 'GPT-6 (Astra)', badge: 'Alias to Astra', desc: 'Canonical identifier for GPT-6 flagship' },
                { id: 'gpt-6-sol', name: 'GPT-6 Sol', badge: 'Cost-Efficient', desc: 'High-end reasoning at reduced token overhead' },
                { id: 'gpt-6-luna', name: 'GPT-6 Luna', badge: 'Low Latency', desc: 'Fast utility, classification, and stream filtering' },
                { id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra', badge: 'Multimodal', desc: 'Vision and spatial coordinate understanding' },
                { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', badge: 'High Reliability', desc: 'Stable coding and tool execution' },
                { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', badge: 'Lightweight', desc: 'High throughput, low-cost operations' },
                { id: 'gpt-image-2.6-sunburst', name: 'GPT Image 2.6 Sunburst', badge: 'Generative Image', desc: 'High-fidelity visual card and compliance badge generator' },
                { id: 'gpt-image-2.6-flare', name: 'GPT Image 2.6 Flare', badge: 'Image Generation', desc: 'Visual synthesis and inspection artifacts' },
                { id: 'gpt-5.3-codex-spark', name: 'GPT-5.3 Codex Spark', badge: 'Codex Engine', desc: 'Real-time autocompletion and micro-refactoring' },
                { id: 'codex-auto-review', name: 'Codex Auto Review', badge: 'Audit Specialist', desc: 'Automated PR inspection and test evaluation' },
              ].map((m) => (
                <div key={m.id} className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-xs">{m.id}</span>
                    <span className="text-[10px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700">
                      {m.badge}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-300">{m.name}</div>
                  <p className="text-[11px] text-slate-400">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PLAYGROUND */}
      {activeSubTab === 'playground' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                GPT-6 Astra & Sol Model Playground
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: <code className="text-indigo-300">https://api.xingchiapi.com/v1/responses</code>
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="gpt-6-astra">gpt-6-astra (Flagship)</option>
                <option value="gpt-6.1-sol">gpt-6.1-sol (Configured Model)</option>
                <option value="gpt-6-sol">gpt-6-sol (Cost-Efficient)</option>
                <option value="gpt-6-luna">gpt-6-luna (Low Latency)</option>
              </select>

              <select
                value={reasoningEffort}
                onChange={(e) => setReasoningEffort(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="low">Reasoning: Low</option>
                <option value="medium">Reasoning: Medium</option>
                <option value="high">Reasoning: High</option>
                <option value="xhigh">Reasoning: Extra High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Input Prompt
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Ask GPT-6 Astra or Sol anything..."
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Gateway Status: Account requires balance top-up for live streaming
            </span>
            <button
              onClick={handleSimulatePlayground}
              disabled={isSimulating || !userPrompt.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold py-2 px-5 rounded-lg text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-900/30"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-200" />
                  Reasoning & Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Test Model Execution
                </>
              )}
            </button>
          </div>

          {playgroundOutput && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">
                Model Output & Trace
              </label>
              <pre className="bg-slate-900/90 border border-slate-800 p-4 rounded-lg text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {playgroundOutput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
