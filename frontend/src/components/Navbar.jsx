import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Scale,
  Database,
  Flame,
  FileSearch,
  Sparkles,
  Mic,
  Zap,
  Activity,
  Layers
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onRunDemo,
  onToggleVoice,
  isVoiceActive,
  isAuditing
}) {
  const manualTools = [
    { id: 'cbam-calculator', label: 'CBAM 2026', icon: Flame, badge: 'Reg 2023/956' },
    { id: 'mrl-lookup', label: 'EU MRL & CAS', icon: Database, badge: 'SQLite DB' },
    { id: 'unit-normalizer', label: 'Unit Normalizer', icon: Scale, badge: 'BLQ Trap' },
    { id: 'gpt6-astra', label: 'GPT-6 Astra Hub', icon: Sparkles, badge: 'Frontier' },
  ];

  return (
    <header className="border-b border-rule bg-paper-2/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand & Authority Stamp */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display text-lg font-bold tracking-tight text-white">ClearSpec AI</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                2026 Ready
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-muted">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>EU Regs (EU) 2023/956 & (EC) 396/2005</span>
            </div>
          </div>
        </div>

        {/* Central Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          {/* Primary Flagship Tab: Consignment Audit */}
          <button
            onClick={() => setActiveTab('consignment-audit')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-display font-medium transition-colors ${
              activeTab === 'consignment-audit'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 border border-emerald-500/40'
                : 'text-ink-2 hover:text-white hover:bg-paper-3 border border-transparent'
            }`}
          >
            <FileSearch className="w-4 h-4 text-emerald-400" />
            <span>Consignment Auditor</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200">
              Multi-PDF
            </span>
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-rule mx-1.5" />

          {/* Manual Tools */}
          {manualTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTab === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTab(tool.id)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-paper-3 text-white border border-rule-strong shadow-sm'
                    : 'text-muted hover:text-ink hover:bg-paper-well border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-muted" />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Controls & Fast Demos */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* 1-Click Rotterdam Demo Button */}
          <button
            onClick={() => {
              setActiveTab('consignment-audit');
              if (onRunDemo) onRunDemo();
            }}
            disabled={isAuditing}
            title="Pre-loads Packet A (Rotterdam Chilli Consignment) with verified violations"
            className="keycap-btn keycap-btn-primary px-3 py-1.5 text-xs font-display flex items-center space-x-1.5"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-300 ${isAuditing ? 'animate-spin' : ''}`} />
            <span className="font-semibold hidden sm:inline">1-Click Rotterdam Demo</span>
            <span className="sm:hidden">Demo</span>
          </button>

          {/* Live Voice Assistant Trigger */}
          <button
            onClick={onToggleVoice}
            title="Toggle ClearSpec Live Voice Assistant (Gemini 3.8 Live)"
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-display flex items-center space-x-1.5 transition-colors ${
              isVoiceActive
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-lg shadow-emerald-950/50'
                : 'bg-paper-3 text-muted hover:text-ink border-rule hover:border-rule-strong'
            }`}
          >
            <Mic className={`w-3.5 h-3.5 ${isVoiceActive ? 'text-emerald-400 animate-pulse' : 'text-muted'}`} />
            <span className="hidden xl:inline">{isVoiceActive ? 'Voice Live' : 'Live Voice'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-rule space-x-1.5 bg-paper-well text-xs">
        <button
          onClick={() => setActiveTab('consignment-audit')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'consignment-audit' ? 'bg-emerald-600 text-white font-semibold' : 'text-muted'
          }`}
        >
          Consignment Auditor
        </button>
        {manualTools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === t.id ? 'bg-paper-3 text-white font-semibold' : 'text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  );
}
