/**
 * HICOM Engineering Sdn Bhd - Application Header
 * Corporate Identity: #0754A6 Brand Blue, #0B2340 Deep Navy, #FFFFFF White
 */

import React, { useState, useEffect } from 'react';
import { Box, Scan, Activity, Clock } from 'lucide-react';

interface HeaderProps {
  activeTab: 'simulation' | 'defects';
  onTabChange: (tab: 'simulation' | 'defects') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }) + ' ' + now.toLocaleTimeString('en-GB')
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-40 shadow-xs">
      {/* Top Utility Line */}
      <div className="bg-[#0B2340] text-white text-[11px] px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-3">
          <span className="text-[#8DBEFF] font-bold">HICOM ENGINEERING SDN BHD X PHN INDUSTRY SDN BHD</span>
        </div>
        <div className="flex items-center gap-3 text-white/80">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="text-white">PRESS LINES: OPERATIONAL</span>
          </span>
          <span className="text-white/40">|</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#8DBEFF]" />
            <span>{currentTime || '2026-11-06'}</span>
          </span>
        </div>
      </div>

      {/* Main Corporate Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand Logos & Application Title */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3.5">
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/assets/aistudio/Logo_HICOM_Engineering_Sdn_Bhd_4a1690a3.jpg"
              alt="HICOM Engineering Sdn Bhd Logo"
              className="h-8 sm:h-10 w-auto object-contain rounded"
            />
            <img
              src="/assets/aistudio/Logo_PHN_Industry_Sdn_Bhd_fd16593a.jpg"
              alt="PHN Industry Sdn Bhd Logo"
              className="h-8 sm:h-10 w-auto object-contain rounded"
            />
          </div>
          <div className="h-8 w-[1px] bg-[#E2E8F0] hidden sm:block shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-[#0B2340] tracking-tight leading-snug">
              Stamping Simulation & Defect Detection Dashboard
            </h1>
            <p className="text-[11px] sm:text-xs text-[#64748B] font-medium leading-tight">
              PHN In-House Stamping Process Simulation & Automated Quality Inspection
            </p>
          </div>
        </div>

        {/* Primary Dashboard Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-[#F3F5F8] p-1.5 rounded-xl border border-[#E2E8F0] self-start md:self-auto">
          {/* Tab 1: Stamping Simulation */}
          <button
            onClick={() => onTabChange('simulation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'simulation'
                ? 'bg-[#0754A6] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0B2340] hover:bg-white'
            }`}
          >
            <Box className="w-4 h-4" />
            Stamping Simulation
          </button>

          {/* Tab 2: Defect Detection */}
          <button
            onClick={() => onTabChange('defects')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'defects'
                ? 'bg-[#0754A6] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0B2340] hover:bg-white'
            }`}
          >
            <Scan className="w-4 h-4" />
            Defect Detection
          </button>
        </nav>
      </div>
    </header>
  );
};
