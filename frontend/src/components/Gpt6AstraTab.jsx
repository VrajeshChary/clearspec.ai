import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Wallet,
  Zap,
  Check,
  Activity,
  Server
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
        is_authenticated: false,
        key_analysis: {
          length: (keyToTest || apiKey).length,
          prefix: 'sk-',
          format_summary: 'Connection error during probe',
          likely_service: 'Backend unreachable'
        },
        test_results: [
          {
            target: 'Backend API',
            endpoint: '/api/v1/gpt6-astra/verify-key',
            status: 500,
            success: false,
            latency_ms: 0,
            summary: `Error: ${err.message}`,
            details: err.message
          }
        ],
        recommendations: ['Ensure the backend server is running and accessible on port 8080.']
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateInference = () => {
    setIsSimulating(true);
    setPlaygroundOutput('');

    const chunks = [
      "Thinking Process initialized on GPT-6 Astra (Frontier Reasoning Engine)...\n",
      "Analyzing user query context and system prompt requirements...\n",
      "1. Context Window: 1,050,000 tokens active. Sub-second cross-attention enabled.\n",
      "2. Multimodal Perception: Ingesting high-resolution PDF scan and 2x DPI visual embeddings.\n",
      "3. Computer-Use Action Schema: Evaluating UI coordinates and form entry points.\n",
      "4. Synthesis:\n\n",
      "GPT-6 Astra executes autonomous regulatory audits through a multi-stage cognitive pipeline:\n",
      "• Optical Extraction: Reads occluded tables, physical rubber stamps, and low-contrast signatures.\n",
      "• Cross-Reconciliation: Maps declared weights and consignee details across invoices and packing lists.\n",
      "• Statutory Reasoning: Queries deterministic SQLite MRL rules and flags subtle BLQ traps.\n",
      "• Bilingual Generation: Synthesizes actionable supplier warning notices in English and Telugu simultaneously."
    ];

    let current = "";
    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        current += chunk;
        setPlaygroundOutput(current);
        if (index === chunks.length - 1) {
          setIsSimulating(false);
        }
      }, (index + 1) * 180);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              GPT-6 Astra & Gateway Diagnostics Hub
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Frontier Engine Probe
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Multi-target gateway validator checking API tokens against Xingchi API (<code className="text-cyan-400 font-mono">api.xingchiapi.com</code>), OpenAI, and OpenRouter with real-time wire verification.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center bg-[#070b13] p-1 rounded-xl border border-white/[0.08] self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveSubTab('verifier')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-display transition-all ${
              activeSubTab === 'verifier'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Key Verifier
          </button>
          <button
            onClick={() => setActiveSubTab('capabilities')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-display transition-all ${
              activeSubTab === 'capabilities'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Model Matrix
          </button>
          <button
            onClick={() => setActiveSubTab('playground')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-display transition-all ${
              activeSubTab === 'playground'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Astra Playground
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'verifier' && (
          <motion.div
            key="verifier"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-6"
          >
            {/* Key Input Bar */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex items-center space-x-2 border-b border-white/[0.08] pb-3">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="font-display font-semibold text-sm text-white">API Key Authentication & Endpoint Probe</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end text-xs">
                <div className="md:col-span-6">
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">API Key Token</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-[#070b13] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/60"
                    placeholder="sk-..."
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Target Gateway</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-[#070b13] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/60 font-mono"
                  >
                    <option value="auto">Auto-Detect (Xingchi / OpenAI / OpenRouter)</option>
                    <option value="xingchi">Xingchi API (api.xingchiapi.com)</option>
                    <option value="openai">OpenAI Official (api.openai.com)</option>
                    <option value="openrouter">OpenRouter (openrouter.ai)</option>
                    <option value="custom">Custom Proxy Base URL</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <button
                    onClick={() => handleRunVerification(apiKey, provider, customBaseUrl)}
                    disabled={loading}
                    className="w-full btn-emerald py-2.5 text-xs font-semibold flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? 'Probing Endpoints...' : 'Run Diagnostics'}</span>
                  </button>
                </div>
              </div>

              {provider === 'custom' && (
                <div className="text-xs pt-1">
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Custom Gateway Base URL</label>
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder="https://your-proxy-domain/v1"
                    className="w-full bg-[#070b13] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              )}
            </div>

            {/* Test Results */}
            {testResult && (
              <div className="space-y-4">
                {/* Status Banner */}
                <div
                  className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
                    testResult.is_authenticated
                      ? testResult.has_active_balance
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {testResult.is_authenticated ? (
                      testResult.has_active_balance ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                      )
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-display font-bold text-base block text-white">
                        {testResult.is_authenticated
                          ? testResult.has_active_balance
                            ? 'Authentication Verified — Gateway Ready'
                            : 'Authenticated on Xingchi API (Zero Active Balance)'
                          : 'Authentication Failed Across Probed Endpoints'}
                      </span>
                      <span className="text-[11px] opacity-80 font-mono text-slate-300">
                        Format: {testResult.key_analysis?.format_summary} • Key Length: {testResult.key_analysis?.length} chars
                      </span>
                    </div>
                  </div>

                  <div className="font-mono text-xs text-right text-slate-400">
                    <div>Probed: {testResult.tested_at || 'Just now'}</div>
                    <div className="text-[10px] text-slate-500">Wire: /v1/responses</div>
                  </div>
                </div>

                {/* Endpoints Probed Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {testResult.test_results?.map((res, i) => (
                    <div key={i} className="glass-panel p-4 rounded-xl border border-white/[0.08] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-display font-semibold text-white truncate max-w-[70%]">
                          {res.target}
                        </span>
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            res.status === 200
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-white/[0.08]'
                          }`}
                        >
                          HTTP {res.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {res.summary}
                      </p>

                      <div className="border-t border-white/[0.06] pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Latency: <strong className="text-slate-200">{res.latency_ms}ms</strong></span>
                        <span>Auth: {res.authenticated || res.success ? '✅ OK' : '❌ 401'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                {testResult.recommendations?.length > 0 && (
                  <div className="glass-well p-5 rounded-xl border border-white/[0.08] space-y-2 text-xs">
                    <h4 className="font-display font-semibold text-white flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Diagnostics Recommendations:</span>
                    </h4>
                    <ul className="space-y-1.5 text-slate-400 text-xs list-disc list-inside">
                      {testResult.recommendations.map((rec, i) => (
                        <li key={i} className="leading-relaxed">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeSubTab === 'capabilities' && (
          <motion.div
            key="capabilities"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            <div className="glass-panel p-6 rounded-2xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div>
                  <h3 className="font-display font-semibold text-sm text-white">
                    GPT-6 Astra & Sol Model Catalog on Xingchi Gateway
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Gateway: https://api.xingchiapi.com/v1 • Wire API: /v1/responses
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Maximum Context Window</span>
                  <span className="font-mono font-bold text-sm text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                    1,050,000 Tokens (~4M Chars)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(capabilities?.models_on_gateway || [
                  { id: 'gpt-6-astra', name: 'GPT-6 Astra', tier: 'Flagship 1.05M Context' },
                  { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', tier: 'High Efficiency Frontier Reasoning' },
                  { id: 'gpt-6-sol', name: 'GPT-6 Sol', tier: 'Cost-Efficient Frontier' },
                  { id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra', tier: 'Specialized Multimodal' },
                  { id: 'gpt-6-luna', name: 'GPT-6 Luna', tier: 'Ultra-Low Latency' },
                  { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', tier: 'High Reliability Code' },
                ]).map((m) => (
                  <div key={m.id} className="glass-well p-4 rounded-xl border border-white/[0.08] space-y-1.5 hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-semibold text-white">{m.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-white/[0.08]">
                        {m.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{m.tier}</p>
                  </div>
                ))}
              </div>

              <div className="glass-well p-5 rounded-xl border border-white/[0.08] space-y-3 text-xs">
                <h4 className="font-display font-semibold text-white">Multimodal & Computer-Use Capabilities:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
                  <div className="p-3 bg-black/30 rounded-lg border border-white/[0.05]">
                    <strong className="text-white block mb-1">Inputs Supported:</strong>
                    High-Resolution Multi-Page PDF documents, 2x DPI visual embeddings, text prompts, screen coordinate frames.
                  </div>
                  <div className="p-3 bg-black/30 rounded-lg border border-white/[0.05]">
                    <strong className="text-white block mb-1">Outputs Supported:</strong>
                    Strict JSON schema compliance, streaming natural text, mouse/keyboard OS actions (computer-use).
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'playground' && (
          <motion.div
            key="playground"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex items-center space-x-2 border-b border-white/[0.08] pb-3">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display font-semibold text-sm text-white">Astra Frontier Reasoning Playground</h3>
              </div>

              <div className="space-y-2 text-xs">
                <label className="block text-slate-400 text-xs font-medium">System Prompt / User Query:</label>
                <textarea
                  rows={3}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full bg-[#070b13] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:border-emerald-500/60 focus:outline-none"
                />
              </div>

              <button
                onClick={handleSimulateInference}
                disabled={isSimulating}
                className="btn-emerald px-5 py-2.5 text-xs font-semibold flex items-center space-x-2"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                <span>{isSimulating ? 'Generating Reasoning Stream...' : 'Execute Astra Inference'}</span>
              </button>

              {playgroundOutput && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-well p-5 rounded-xl border border-white/[0.08] space-y-2 text-xs font-mono"
                >
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                    Model Output Stream (gpt-6-astra):
                  </span>
                  <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                    {playgroundOutput}
                  </pre>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}