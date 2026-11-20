import React from 'react';
import { ShieldCheck, Scale, Database, Flame, FileSearch, Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const manualTools = [
    { id: 'unit-normalizer', label: 'Unit Normalizer', icon: Scale },
    { id: 'mrl-lookup',      label: 'EU MRL Lookup',   icon: Database },
    { id: 'cbam-calculator', label: 'CBAM 2026',       icon: Flame },
    { id: 'gpt6-astra',      label: 'GPT-6 Astra Hub', icon: Sparkles },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white">ClearSpec AI</span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              v1.0 (2026 Ready)
            </span>
          </div>
        </div>

        <nav className="flex items-center space-x-1 sm:space-x-2">
          {/* Primary: Consignment Audit */}
          <button
            onClick={() => setActiveTab('consignment-audit')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'consignment-audit'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'text-emerald-400 hover:text-white hover:bg-emerald-700/40 border border-emerald-700/40'
            }`}
          >
            <FileSearch className="w-4 h-4" />
            <span>Consignment Audit</span>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-700 mx-1" />

          {/* Manual Tools label */}
          <span className="text-xs text-slate-600 hidden lg:inline">Manual Tools:</span>

          {/* Calculator tabs */}
          {manualTools.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-slate-100 border border-slate-600'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
