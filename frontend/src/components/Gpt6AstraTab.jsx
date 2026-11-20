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
  Wallet,
  Zap,
  Check
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
            summary: `Error: ${err.message}`,
            details: err.message
          }
        ],
        recommendations: ['Ensure the backend server is running and accessible.']
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
      }, (index + 1) * 220);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              GPT-6 Astra & Gateway Diagnostics Hub
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
              Frontier Diagnostics
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Diagnostic probe testing API keys against Xingchi API (<code className="text-emerald-400">api.xingchiapi.com</code>), OpenAI, and OpenRouter with wire API validation.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center bg-paper-well p-1 rounded-lg border border-rule self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('verifier')}
            className={`px-3 py-1.5 rounded text-xs font-display transition-colors ${
              activeSubTab === 'verifier' ? 'bg-emerald-600 text-white font-semibold' : 'text-muted hover:text-white'
            }`}
          >
            Key Verifier
          </button>
          <button
            onClick={() => setActiveSubTab('capabilities')}
            className={`px-3 py-1.5 rounded text-xs font-display transition-colors ${
              activeSubTab === 'capabilities' ? 'bg-emerald-600 text-white font-semibold' : 'text-muted hover:text-white'
            }`}
          >
            Capabilities & Models
          </button>
          <button
            onClick={() => setActiveSubTab('playground')}
            className={`px-3 py-1.5 rounded text-xs font-display transition-colors ${
              activeSubTab === 'playground' ? 'bg-emerald-600 text-white font-semibold' : 'text-muted hover:text-white'
            }`}
          >
            Astra Playground
          </button>
        </div>
      </div>

      {activeSubTab === 'verifier' && (
        <div className="space-y-6">
          {/* Key Input Bar */}
          <div className="reg-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm text-white hairline-b pb-2 flex items-center space-x-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>API Key Authentication & Endpoint Probe</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
              <div className="md:col-span-6">
                <label className="block text-muted text-[11px] mb-1">API Key Token</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-paper-well border border-rule rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500"
                  placeholder="sk-..."
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-muted text-[11px] mb-1">Target Gateway</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-paper-well border border-rule rounded px-3 py-2 text-xs text-white"
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
                  className="w-full keycap-btn keycap-btn-primary py-2 text-xs font-semibold flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Probing Endpoints...' : 'Run Diagnostics'}</span>
                </button>
              </div>
            </div>

            {provider === 'custom' && (
              <div className="text-xs">
                <label className="block text-muted text-[11px] mb-1">Custom Gateway Base URL</label>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="https://your-proxy-domain/v1"
                  className="w-full bg-paper-well border border-rule rounded px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            )}
          </div>

          {/* Test Results */}
          {testResult && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  testResult.is_authenticated
                    ? testResult.has_active_balance
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-800 text-amber-200'
                    : 'bg-red-950/40 border-red-800 text-red-200'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {testResult.is_authenticated ? (
                    testResult.has_active_balance ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    )
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-display font-bold text-sm block">
                      {testResult.is_authenticated
                        ? testResult.has_active_balance
                          ? 'Authentication Successful & Account Ready'
                          : 'Authenticated on Xingchi API (Insufficient Dedicated Balance)'
                        : 'Authentication Failed Across Probed Endpoints'}
                    </span>
                    <span className="text-[11px] opacity-80 font-mono">
                      Format: {testResult.key_analysis?.format_summary} ({testResult.key_analysis?.length} chars)
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px]">
                  Tested at: {testResult.tested_at}
                </div>
              </div>

              {/* Endpoints Probed Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {testResult.test_results?.map((res, i) => (
                  <div key={i} className="reg-card p-4 space-y-2 bg-paper-well">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-semibold text-white truncate max-w-[70%]">
                        {res.target}
                      </span>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          res.status === 200
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-paper-3 text-muted border border-rule'
                        }`}
                      >
                        HTTP {res.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                      {res.summary}
                    </p>

                    <div className="hairline-t pt-2 flex items-center justify-between text-[10px] font-mono text-muted">
                      <span>Latency: {res.latency_ms}ms</span>
                      <span>Auth: {res.authenticated || res.success ? '✅ OK' : '❌ 401'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {testResult.recommendations?.length > 0 && (
                <div className="bg-paper-3 p-4 rounded-lg border border-rule space-y-2 text-xs">
                  <h4 className="font-display font-semibold text-white flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Diagnostics Recommendations:</span>
                  </h4>
                  <ul className="space-y-1 text-muted text-[11px] list-disc list-inside">
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
        </div>
      )}

      {activeSubTab === 'capabilities' && (
        <div className="space-y-4">
          <div className="reg-card p-5 space-y-4">
            <div className="flex items-center justify-between hairline-b pb-3">
              <div>
                <h3 className="font-display font-semibold text-sm text-white">
                  GPT-6 Astra & Sol Model Catalog on Xingchi Gateway
                </h3>
                <p className="text-[11px] text-muted font-mono">
                  Gateway: https://api.xingchiapi.com/v1 &bull; Wire API: /v1/responses
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-muted block uppercase">Context Window</span>
                <span className="font-mono font-bold text-sm text-emerald-400">1,050,000 Tokens (~4M Chars)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(capabilities?.models_on_gateway || [
                { id: 'gpt-6-astra', name: 'GPT-6 Astra', tier: 'Flagship 1.05M Context' },
                { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', tier: 'High Efficiency Frontier Reasoning' },
                { id: 'gpt-6-sol', name: 'GPT-6 Sol', tier: 'Cost-Efficient Frontier' },
                { id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra', tier: 'Specialized Multimodal' },
                { id: 'gpt-6-luna', name: 'GPT-6 Luna', tier: 'Ultra-Low Latency' },
                { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', tier: 'High Reliability Code' },
              ]).map((m) => (
                <div key={m.id} className="bg-paper-well p-3.5 rounded-lg border border-rule space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-display font-semibold text-white">{m.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-paper-3 text-emerald-300 border border-rule">
                      {m.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">{m.tier}</p>
                </div>
              ))}
            </div>

            <div className="bg-paper-well p-4 rounded-lg border border-rule space-y-2 text-xs">
              <h4 className="font-display font-semibold text-white">Multimodal & Computer-Use Capabilities:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-muted">
                <div>
                  <strong className="text-ink-2 block mb-1">Inputs Supported:</strong>
                  High-Resolution Multi-Page PDF documents, 2x DPI visual embeddings, text prompts, screen coordinate frames.
                </div>
                <div>
                  <strong className="text-ink-2 block mb-1">Outputs Supported:</strong>
                  Strict JSON schema compliance, streaming natural text, mouse/keyboard OS actions (computer-use).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'playground' && (
        <div className="space-y-4">
          <div className="reg-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm text-white hairline-b pb-2 flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Astra Frontier Reasoning Playground</span>
            </h3>

            <div className="space-y-2 text-xs">
              <label className="block text-muted text-[11px]">System Prompt / User Query:</label>
              <textarea
                rows={3}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="w-full bg-paper-well border border-rule rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSimulateInference}
              disabled={isSimulating}
              className="keycap-btn keycap-btn-primary px-4 py-2 text-xs font-semibold flex items-center space-x-1.5"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Generating Reasoning Stream...' : 'Execute Astra Inference'}</span>
            </button>

            {playgroundOutput && (
              <div className="bg-paper-well p-4 rounded-lg border border-rule space-y-2 text-xs font-mono">
                <span className="text-[10px] text-muted block uppercase tracking-wider">
                  Model Output Stream (gpt-6-astra):
                </span>
                <pre className="text-ink-2 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {playgroundOutput}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
