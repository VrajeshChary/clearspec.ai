import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ConsignmentAuditTab from './components/ConsignmentAuditTab';
import CbamCalculatorTab from './components/CbamCalculatorTab';
import MrlLookupTab from './components/MrlLookupTab';
import UnitNormalizerTab from './components/UnitNormalizerTab';
import Gpt6AstraTab from './components/Gpt6AstraTab';
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
    <div className="min-h-screen bg-paper text-ink flex flex-col font-body selection:bg-emerald-600 selection:text-white">
      {/* Top Hallmark Sticky Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRunDemo={handleRunDemo}
        onToggleVoice={() => setIsVoiceOpen((v) => !v)}
        isVoiceActive={isVoiceOpen}
      />

      {/* Main Responsive Cockpit Measure (Capped at 1536px, centered) */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'consignment-audit' && (
          <ConsignmentAuditTab key={demoTrigger} onAuditLoaded={(data) => setAuditResult(data)} />
        )}
        {activeTab === 'cbam-calculator' && <CbamCalculatorTab />}
        {activeTab === 'mrl-lookup' && <MrlLookupTab />}
        {activeTab === 'unit-normalizer' && <UnitNormalizerTab />}
        {activeTab === 'gpt6-astra' && <Gpt6AstraTab />}
      </main>

      {/* Omnipresent Floating Gemini 3.8 Live Voice Assistant */}
      <LiveVoiceWidget
        auditResult={auditResult}
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
      />

      {/* Hallmark Exact Footer: No invented metrics, real statutory citations */}
      <footer className="hairline-t bg-paper-2 py-6 text-xs text-muted">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="space-y-1">
            <p className="font-display font-semibold text-ink-2">
              ClearSpec AI &bull; Cross-Border Regulatory Enforcement Engine
            </p>
            <p className="text-[11px] text-muted">
              Statutory EU Regulations: Regulation (EU) 2023/956 (CBAM) &bull; Regulation (EC) 396/2005 (MRL) &bull; Regulation (EU) 2023/915 &bull; Customs Act 1962 § 111/112
            </p>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Gemini 3.8 Flash • Online</span>
            </span>
            <span className="text-rule">&bull;</span>
            <span className="text-emerald-400">Rotterdam Corridor Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
