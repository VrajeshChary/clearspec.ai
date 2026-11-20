import React, { useState } from 'react';
import Navbar from './components/Navbar';
import UnitNormalizerTab from './components/UnitNormalizerTab';
import ConsignmentAuditTab from './components/ConsignmentAuditTab';
import MrlLookupTab from './components/MrlLookupTab';
import CbamCalculatorTab from './components/CbamCalculatorTab';
import Gpt6AstraTab from './components/Gpt6AstraTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('consignment-audit');
  const isAudit = activeTab === 'consignment-audit';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main
        className={`flex-1 w-full mx-auto py-6 ${
          isAudit
            ? 'max-w-screen-2xl px-4 sm:px-6'
            : 'max-w-7xl px-4 sm:px-6 lg:px-8'
        }`}
      >
        {activeTab === 'unit-normalizer'   && <UnitNormalizerTab />}
        {activeTab === 'mrl-lookup'        && <MrlLookupTab />}
        {activeTab === 'cbam-calculator'   && <CbamCalculatorTab />}
        {activeTab === 'gpt6-astra'        && <Gpt6AstraTab />}
        {activeTab === 'consignment-audit' && <ConsignmentAuditTab />}
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        ClearSpec AI &bull; Regulatory Compliance &bull; EU MRL &bull; 2026 CBAM Regulation (EU) 2023/956
      </footer>
    </div>
  );
}
