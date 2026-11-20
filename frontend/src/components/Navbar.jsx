import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Scale,
  Database,
  Flame,
  FileSearch,
  Sparkles,
  Mic,
  Zap,
  Activity,
  Globe2,
  Cpu
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
    <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-slate-950/80 border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Authority Stamp */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="relative group cursor-pointer" onClick={() => setActiveTab('consignment-audit')}>
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-40 blur-md group-hover:opacity-80 transition duration-300" />
            <div className="relative w-10 h-10 rounded-xl bg-slate-900 border border-white/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <ShieldCheck className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display text-lg font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                ClearSpec<span className="text-emerald-400">.AI</span>
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                2026 Ready
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>Reg (EU) 2023/956 &bull; (EC) 396/2005</span>
            </div>
          </div>
        </div>

        {/* Central Luxury Navigation Tabs */}
        <nav className="hidden lg:flex items-center bg-slate-900/60 p-1 rounded-xl border border-white/[0.08] shadow-inner">
          {/* Primary Flagship Tab: Consignment Audit */}
          <button
            onClick={() => setActiveTab('consignment-audit')}
            className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'consignment-audit'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {activeTab === 'consignment-audit' && (
              <motion.div
                layoutId="activeTabBadge"
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.4)] border border-emerald-400/40"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              />
            )}
            <FileSearch className={`relative z-10 w-4 h-4 ${activeTab === 'consignment-audit' ? 'text-white' : 'text-emerald-400'}`} />
            <span className="relative z-10">Consignment Auditor</span>
            <span className={`relative z-10 ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
              activeTab === 'consignment-audit' ? 'bg-black/30 text-emerald-200' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              Multi-PDF
            </span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1.5" />

          {/* Manual Tools */}
          {manualTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTab === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTab(tool.id)}
                className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBadge"
                    className="absolute inset-0 rounded-lg bg-slate-800 border border-white/20 shadow-sm"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <Icon className={`relative z-10 w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="relative z-10">{tool.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Controls & Fast Demos */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* 1-Click Rotterdam Demo Button */}
          <button
            onClick={() => {
              setActiveTab('consignment-audit');
              if (onRunDemo) onRunDemo();
            }}
            disabled={isAuditing}
            title="Pre-loads Packet A (Rotterdam Chilli Consignment) with verified statutory violations"
            className="group relative inline-flex items-center justify-center p-0.5 overflow-hidden rounded-xl font-medium transition-all duration-300 focus:outline-none"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 group-hover:from-emerald-300 group-hover:to-cyan-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
            <span className="relative px-3.5 py-1.5 transition-all ease-out bg-slate-950/80 rounded-[10px] group-hover:bg-opacity-0 flex items-center space-x-2 text-xs font-semibold text-white">
              <Zap className={`w-3.5 h-3.5 text-amber-300 ${isAuditing ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
              <span className="hidden sm:inline">1-Click Rotterdam Demo</span>
              <span className="sm:hidden">Demo</span>
            </span>
          </button>

          {/* Live Voice Assistant Trigger */}
          <button
            onClick={onToggleVoice}
            title="Toggle ClearSpec Live Voice Assistant (Gemini 3.8 Live)"
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center space-x-2 transition-all duration-200 ${
              isVoiceActive
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:border-white/20'
            }`}
          >
            <Mic className={`w-3.5 h-3.5 ${isVoiceActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="hidden xl:inline">{isVoiceActive ? 'Voice Live' : 'Live Voice'}</span>
            {isVoiceActive && (
              <span className="flex space-x-0.5 items-end h-3">
                <span className="w-0.5 bg-emerald-400 rounded-full audio-bar-1 h-3" />
                <span className="w-0.5 bg-emerald-400 rounded-full audio-bar-2 h-3" />
                <span className="w-0.5 bg-emerald-400 rounded-full audio-bar-3 h-3" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-white/[0.08] space-x-2 bg-slate-950/90 text-xs">
        <button
          onClick={() => setActiveTab('consignment-audit')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${
            activeTab === 'consignment-audit'
              ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Consignment Auditor
        </button>
        {manualTools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${
              activeTab === t.id ? 'bg-slate-800 text-white border border-white/20' : 'text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  );
}
