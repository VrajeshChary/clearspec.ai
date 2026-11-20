import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import ConsignmentAuditTab from './components/ConsignmentAuditTab';
import CbamCalculatorTab from './components/CbamCalculatorTab';
import MrlLookupTab from './components/MrlLookupTab';
import UnitNormalizerTab from './components/UnitNormalizerTab';
import LiveVoiceWidget from './components/LiveVoiceWidget';

export default function App() {
  const [activeTab, setActiveTab] = useState('consignment-audit');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [demoTrigger, setDemoTrigger] = useState(0);

  const handleRunDemo = () => {
    setActiveTab('consignment-audit');
    setDemoTrigger((d) => d + 1);
  };

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      {/* Ambient Cyber Aura Gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="fixed -bottom-40 -right-40 w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] pointer-events-none -z-10" />

      {/* Top Floating Glass Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRunDemo={handleRunDemo}
        onToggleVoice={() => setIsVoiceOpen((v) => !v)}
        isVoiceActive={isVoiceOpen}
      />

      {/* Main Responsive Cockpit */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + demoTrigger}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {activeTab === 'consignment-audit' && (
              <ConsignmentAuditTab key={demoTrigger} onAuditLoaded={(data) => setAuditResult(data)} />
            )}
            {activeTab === 'cbam-calculator' && <CbamCalculatorTab />}
            {activeTab === 'mrl-lookup' && <MrlLookupTab />}
            {activeTab === 'unit-normalizer' && <UnitNormalizerTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Omnipresent Floating Gemini 3.8 Live Voice Assistant */}
      <LiveVoiceWidget
        auditResult={auditResult}
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
      />

      {/* Executive Glass Footer */}
      <footer className="border-t border-white/[0.08] bg-slate-950/80 backdrop-blur-xl py-6 text-xs text-slate-400">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <p className="font-display font-bold text-slate-200 tracking-tight">
              ClearSpec AI &bull; Cross-Border Regulatory Enforcement Engine
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Statutory EU Frameworks: Regulation (EU) 2023/956 (CBAM) &bull; Regulation (EC) 396/2005 (MRL) &bull; Regulation (EU) 2023/915 &bull; Customs Act 1962 § 111/112
            </p>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span>Gemini 3.8 Flash • Online</span>
            </span>
            <span className="text-white/20">&bull;</span>
            <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">Rotterdam Corridor Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
