/**
 * HICOM Engineering Sdn Bhd - Defect Detection Tab
 * Hosts Sub-Tab 1: Defect Detection
 * Hosts Sub-Tab 2: History
 */

import React, { useState, useEffect } from 'react';
import { Scan, History, RefreshCcw } from 'lucide-react';
import { DefectDetectionInspector } from './DefectDetectionInspector';
import { InspectionHistoryView } from './InspectionHistoryView';
import {
  InspectionRecord
} from '../../data/defectCategories';
import {
  loadInspectionHistory,
  addInspectionRecord,
  clearInspectionHistory
} from '../../data/seedHistory';

export const DefectDetectionTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'inspect' | 'history'>('inspect');
  const [historyRecords, setHistoryRecords] = useState<InspectionRecord[]>([]);

  // Load persistent history on mount
  useEffect(() => {
    const loaded = loadInspectionHistory();
    setHistoryRecords(loaded);
  }, []);

  const handleRecordCreated = (record: InspectionRecord) => {
    const updated = addInspectionRecord(record);
    setHistoryRecords(updated);
  };

  const handleResetSeed = () => {
    const reseeded = clearInspectionHistory();
    setHistoryRecords(reseeded);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Sub-tab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('inspect')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'inspect'
                ? 'bg-[#0754A6] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0B2340] hover:bg-[#F3F5F8]'
            }`}
          >
            <Scan className="w-4 h-4" />
            1. Automated Defect Detection
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all relative ${
              activeSubTab === 'history'
                ? 'bg-[#0754A6] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0B2340] hover:bg-[#F3F5F8]'
            }`}
          >
            <History className="w-4 h-4" />
            2. Inspection History
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeSubTab === 'history'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#F3F5F8] text-[#0754A6]'
              }`}
            >
              {historyRecords.length}
            </span>
          </button>
        </div>

        {/* Action utility: Reset default demo data */}
        {activeSubTab === 'history' && (
          <button
            onClick={handleResetSeed}
            className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#0754A6] transition-colors self-end sm:self-center"
            title="Reset history with production batch seed"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset Sample Batch
          </button>
        )}
      </div>

      {/* Sub-tab Body */}
      {activeSubTab === 'inspect' ? (
        <DefectDetectionInspector
          onRecordCreated={handleRecordCreated}
          onNavigateToHistory={() => setActiveSubTab('history')}
        />
      ) : (
        <InspectionHistoryView
          historyRecords={historyRecords}
          onResetSeedHistory={handleResetSeed}
        />
      )}
    </div>
  );
};
