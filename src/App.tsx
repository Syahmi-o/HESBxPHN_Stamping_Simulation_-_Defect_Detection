/**
 * HICOM Engineering Sdn Bhd - Stamping Simulation & Defect Detection Dashboard
 * Main Application Component
 */

import React, { useState } from 'react';
import { Header } from './components/common/Header';
import { StampingSimulationView } from './components/stamping/StampingSimulationView';
import { DefectDetectionTab } from './components/defects/DefectDetectionTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulation' | 'defects'>('simulation');

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F5F8] text-[#273444] antialiased">
      {/* Top Corporate Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {activeTab === 'simulation' ? (
          <StampingSimulationView />
        ) : (
          <DefectDetectionTab />
        )}
      </main>

      {/* Industrial Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0B2340]">HICOM Engineering Sdn Bhd</span>
            <span>•</span>
            <span className="font-bold text-[#0B2340]">PHN Industry Sdn Bhd</span>
          </div>
          <div className="font-mono text-[11px] text-[#64748B]">
            Automotive Metal Stamping Process Simulator & Vision QC v2.4
          </div>
        </div>
      </footer>
    </div>
  );
}
