/**
 * HICOM Engineering Sdn Bhd - Inspection History View
 * Features:
 * - Summary statistics cards with KPI percentages
 * - Performance distribution charts (Donut breakdown of verdict + Defect category frequency)
 * - Multi-criteria filter bar (Part name, Status OK/NG, Verdict PASS/REWORK/FAIL, Date range, Search)
 * - Interactive data table with sorting and quick detail modal view
 * - Detailed Record Modal with side-by-side original and annotated images + download options
 * - Export to Microsoft Excel (.xlsx) and CSV (.csv) retaining active filters
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  X,
  Layers,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';
import { InspectionRecord } from '../../data/defectCategories';
import { STAMPING_PARTS } from '../../data/partsData';
import { exportToExcel, exportToCsv, downloadInspectionReport } from '../../utils/exportUtils';
import { downloadImageAsJpeg } from '../../utils/imageExport';

interface InspectionHistoryViewProps {
  historyRecords: InspectionRecord[];
  onResetSeedHistory: () => void;
}

export const InspectionHistoryView: React.FC<InspectionHistoryViewProps> = ({
  historyRecords,
  onResetSeedHistory
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [partFilter, setPartFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OK' | 'NG'>('ALL');
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | 'PASS' | 'REWORK' | 'FAIL'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD

  // Sort State
  const [sortField, setSortField] = useState<keyof InspectionRecord>('timestamp');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Selected Record Modal State
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return historyRecords.filter((record) => {
      // Search text matches ID, Part Name, or Defect
      const matchesSearch =
        searchQuery === '' ||
        record.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.defectCategory && record.defectCategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (record.defectLocation && record.defectLocation.toLowerCase().includes(searchQuery.toLowerCase()));

      // Part Filter
      const matchesPart = partFilter === 'ALL' || record.partName.includes(partFilter);

      // Status Filter
      const matchesStatus = statusFilter === 'ALL' || record.status === statusFilter;

      // Verdict Filter
      const matchesVerdict = verdictFilter === 'ALL' || record.verdict === verdictFilter;

      // Date Filter
      const matchesDate =
        dateFilter === '' || record.timestamp.startsWith(dateFilter);

      return matchesSearch && matchesPart && matchesStatus && matchesVerdict && matchesDate;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [historyRecords, searchQuery, partFilter, statusFilter, verdictFilter, dateFilter, sortField, sortAsc]);

  // Summary KPI Calculations
  const totalCount = historyRecords.length;
  const passCount = historyRecords.filter(r => r.verdict === 'PASS').length;
  const reworkCount = historyRecords.filter(r => r.verdict === 'REWORK').length;
  const failCount = historyRecords.filter(r => r.verdict === 'FAIL').length;

  const passPct = totalCount > 0 ? (passCount / totalCount) * 100 : 0;
  const reworkPct = totalCount > 0 ? (reworkCount / totalCount) * 100 : 0;
  const failPct = totalCount > 0 ? (failCount / totalCount) * 100 : 0;

  // Defect Category Breakdown for chart
  const defectBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    historyRecords.forEach(r => {
      if (r.defectCategory) {
        counts[r.defectCategory] = (counts[r.defectCategory] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [historyRecords]);

  // Handlers for sorting
  const handleSort = (field: keyof InspectionRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    exportToExcel(filteredRecords, 'HICOM_Stamping_Quality_Report');
  };

  const handleExportCsv = () => {
    exportToCsv(filteredRecords, 'HICOM_Stamping_Quality_Report');
  };

  const downloadImage = (url: string, filename: string) => {
    void downloadImageAsJpeg(url, filename).catch((err) => {
      console.error('Failed to export inspection history image as JPEG:', err);
    });
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Dashboard Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inspected Parts */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-semibold uppercase">
            <span>Total Inspected Parts</span>
            <Layers className="w-4 h-4 text-[#0754A6]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#0B2340]">
              {totalCount}
            </span>
            <span className="text-xs text-[#64748B]">Units</span>
          </div>
          <div className="mt-2 text-xs text-[#64748B]">
            100% of recorded production lots
          </div>
        </div>

        {/* Total Passed Parts */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#059669] font-semibold uppercase">
            <span>Conforming Parts (PASS)</span>
            <CheckCircle className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#059669]">
              {passCount}
            </span>
            <span className="text-sm font-semibold font-mono text-[#059669]">
              ({passPct.toFixed(1)}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-[#64748B]">
            Meets automotive CAD & Class A/B specs
          </div>
        </div>

        {/* Total Rework Parts */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#D97706] font-semibold uppercase">
            <span>Reworkable Parts (REWORK)</span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#D97706]">
              {reworkCount}
            </span>
            <span className="text-sm font-semibold font-mono text-[#D97706]">
              ({reworkPct.toFixed(1)}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-[#64748B]">
            Correctable burrs, light dents, springback
          </div>
        </div>

        {/* Total Failed Parts */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#DC2626] font-semibold uppercase">
            <span>Scrap Defective (FAIL)</span>
            <XCircle className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#DC2626]">
              {failCount}
            </span>
            <span className="text-sm font-semibold font-mono text-[#DC2626]">
              ({failPct.toFixed(1)}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-[#64748B]">
            Severe cracks, ruptures, unrecoverable scrap
          </div>
        </div>
      </div>

      {/* Visual Quality Performance Bar & Charts */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2340]">
            Batch Quality Distribution & Yield Rate
          </h3>
          <span className="text-xs font-mono text-[#64748B]">
            Overall Pass Yield: <strong>{passPct.toFixed(1)}%</strong>
          </span>
        </div>

        {/* Segmented Yield Progress Bar */}
        <div className="w-full h-4 bg-[#F1F5F9] rounded-full overflow-hidden flex shadow-inner">
          <div
            className="h-full bg-[#10B981] transition-all"
            style={{ width: `${passPct}%` }}
            title={`PASS: ${passCount} (${passPct.toFixed(1)}%)`}
          />
          <div
            className="h-full bg-[#F59E0B] transition-all"
            style={{ width: `${reworkPct}%` }}
            title={`REWORK: ${reworkCount} (${reworkPct.toFixed(1)}%)`}
          />
          <div
            className="h-full bg-[#EF4444] transition-all"
            style={{ width: `${failPct}%` }}
            title={`FAIL: ${failCount} (${failPct.toFixed(1)}%)`}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-[#64748B]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#10B981]" />
            <span>Pass ({passPct.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
            <span>Rework ({reworkPct.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
            <span>Fail / Scrap ({failPct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* 2. Search, Filter Bar and Export Buttons */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Record ID, Part Name, Defect..."
              className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#273444] focus:outline-none focus:ring-2 focus:ring-[#0754A6]"
            />
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold shadow-xs transition-colors"
              title="Export filtered records to Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel (.xlsx)
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F3F5F8] hover:bg-[#E2E8F0] text-[#273444] text-xs font-semibold border border-[#CBD5E1] transition-colors"
              title="Export filtered records to CSV (.csv)"
            >
              <FileText className="w-4 h-4 text-[#0754A6]" /> Export CSV
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E2E8F0] text-xs">
          <span className="text-[#64748B] font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#0754A6]" /> Filters:
          </span>

          {/* Part Filter */}
          <select
            aria-label="Filter by Part"
            value={partFilter}
            onChange={(e) => setPartFilter(e.target.value)}
            className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#273444] font-medium"
          >
            <option value="ALL">All Automotive Parts</option>
            {STAMPING_PARTS.map((p) => (
              <option key={p.id} value={p.codeName}>
                {p.codeName}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'OK' | 'NG')}
            className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#273444] font-medium"
          >
            <option value="ALL">Status: All (OK & NG)</option>
            <option value="OK">OK (Conforming)</option>
            <option value="NG">NG (Defect Detected)</option>
          </select>

          {/* Verdict Filter */}
          <select
            aria-label="Filter by Verdict"
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value as 'ALL' | 'PASS' | 'REWORK' | 'FAIL')}
            className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#273444] font-medium"
          >
            <option value="ALL">Verdict: All Categories</option>
            <option value="PASS">PASS Only</option>
            <option value="REWORK">REWORK Only</option>
            <option value="FAIL">FAIL (Scrap) Only</option>
          </select>

          {/* Date Picker */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
            <input
              type="date"
              aria-label="Filter by Date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-[#273444] focus:outline-none"
            />
          </div>

          {/* Clear Filters */}
          {(searchQuery || partFilter !== 'ALL' || statusFilter !== 'ALL' || verdictFilter !== 'ALL' || dateFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setPartFilter('ALL');
                setStatusFilter('ALL');
                setVerdictFilter('ALL');
                setDateFilter('');
              }}
              className="px-2 py-1 text-xs text-[#0754A6] hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-xs text-[#64748B]">
            Showing <strong>{filteredRecords.length}</strong> of <strong>{totalCount}</strong> records
          </div>
        </div>
      </div>

      {/* 3. Inspection History Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0] uppercase tracking-wider select-none">
              <tr>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:text-[#0754A6]"
                >
                  <div className="flex items-center gap-1">
                    Record ID <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('timestamp')}
                  className="py-3 px-4 cursor-pointer hover:text-[#0754A6]"
                >
                  <div className="flex items-center gap-1">
                    Timestamp <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('partName')}
                  className="py-3 px-4 cursor-pointer hover:text-[#0754A6]"
                >
                  <div className="flex items-center gap-1">
                    Part Name <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Part Size (L×W×H)</th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:text-[#0754A6]"
                >
                  <div className="flex items-center gap-1">
                    Status <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Defect Type</th>
                <th
                  onClick={() => handleSort('severityPercentage')}
                  className="py-3 px-4 cursor-pointer hover:text-[#0754A6]"
                >
                  <div className="flex items-center gap-1">
                    Severity <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('verdict')}
                  className="py-3 px-4 cursor-pointer hover:text-[#0754A6]"
                >
                  <div className="flex items-center gap-1">
                    Verdict <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                  >
                    {/* Record ID */}
                    <td className="py-3 px-4 font-mono font-semibold text-[#0754A6]">
                      {r.id}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                      {new Date(r.timestamp).toLocaleString()}
                    </td>

                    {/* Part Name */}
                    <td className="py-3 px-4 font-medium text-[#0B2340] max-w-[220px] truncate" title={r.partName}>
                      {r.partName}
                    </td>

                    {/* Part Size */}
                    <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">
                      {r.partSize.formatted}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] ${
                          r.status === 'OK'
                            ? 'bg-[#10B981]/15 text-[#059669]'
                            : 'bg-[#EF4444]/15 text-[#DC2626]'
                        }`}
                      >
                        {r.status === 'OK' ? 'OK (Pass)' : 'NG (Defect)'}
                      </span>
                    </td>

                    {/* Defect Type */}
                    <td className="py-3 px-4 font-medium text-[#273444]">
                      {r.defectCategory || <span className="text-[#94A3B8]">None</span>}
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-4 font-mono">
                      {r.severityPercentage !== null ? (
                        <span
                          className={`font-semibold ${
                            r.severityPercentage > 40
                              ? 'text-[#DC2626]'
                              : r.severityPercentage > 20
                              ? 'text-[#D97706]'
                              : 'text-[#059669]'
                          }`}
                        >
                          {r.severityPercentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">-</span>
                      )}
                    </td>

                    {/* Verdict */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[11px] ${
                          r.verdict === 'PASS'
                            ? 'bg-[#10B981]/15 text-[#059669] border border-[#10B981]/30'
                            : r.verdict === 'REWORK'
                            ? 'bg-[#F59E0B]/15 text-[#D97706] border border-[#F59E0B]/30'
                            : 'bg-[#EF4444]/15 text-[#DC2626] border border-[#EF4444]/30'
                        }`}
                      >
                        {r.verdict}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(r);
                        }}
                        className="p-1 rounded hover:bg-[#E2E8F0] text-[#0754A6]"
                        title="View Full Inspection Record Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#64748B]">
                    No inspection records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Detailed Inspection Record Modal View */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-[#0B2340]">
                  Inspection Record Details
                </span>
                <span className="font-mono text-xs px-2.5 py-1 bg-[#0754A6]/10 text-[#0754A6] rounded-md font-semibold">
                  {selectedRecord.id}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                    selectedRecord.verdict === 'PASS'
                      ? 'bg-[#10B981]/15 text-[#059669]'
                      : selectedRecord.verdict === 'REWORK'
                      ? 'bg-[#F59E0B]/15 text-[#D97706]'
                      : 'bg-[#EF4444]/15 text-[#DC2626]'
                  }`}
                >
                  VERDICT: {selectedRecord.verdict}
                </span>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0B2340] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex flex-col gap-5">
              {/* Image Comparison: Original vs Annotated */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Inspected Image */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                    <span>Original Inspected Image</span>
                    <button
                      onClick={() => downloadImage(selectedRecord.imageUrl, `${selectedRecord.id}_ORIGINAL.jpg`)}
                      className="text-[#0754A6] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Original
                    </button>
                  </div>
                  <div className="h-64 bg-[#1E293B] rounded-lg border border-[#334155] p-2 flex items-center justify-center overflow-hidden">
                    <img
                      src={selectedRecord.imageUrl}
                      alt="Original Inspected Stamped Part"
                      className="w-full h-full object-contain select-none"
                    />
                  </div>
                </div>

                {/* Detected Defect / Annotated Image */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                    <span>Detected Defect Annotated Image</span>
                    <button
                      onClick={() => downloadImage(selectedRecord.annotatedImageUrl, `${selectedRecord.id}_ANNOTATED.jpg`)}
                      className="text-[#0754A6] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Annotated
                    </button>
                  </div>
                  <div className="h-64 bg-[#1E293B] rounded-lg border border-[#334155] p-2 flex items-center justify-center overflow-hidden">
                    <img
                      src={selectedRecord.annotatedImageUrl}
                      alt="Annotated Defect Region"
                      className="w-full h-full object-contain select-none"
                    />
                  </div>
                </div>
              </div>

              {/* Technical Inspection Specifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Part Name:</span>
                    <span className="font-semibold text-[#0B2340] text-right">
                      {selectedRecord.partName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Dimensions (L × W × H):</span>
                    <span className="font-mono font-semibold text-[#0B2340]">
                      {selectedRecord.partSize.formatted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Development Line:</span>
                    <span className="font-medium text-[#0B2340]">
                      {selectedRecord.devType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Tooling Die Type:</span>
                    <span className="font-medium text-[#0B2340]">
                      {selectedRecord.diesType}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Inspection Timestamp:</span>
                    <span className="font-mono text-[#0B2340]">
                      {new Date(selectedRecord.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Status:</span>
                    <span
                      className={`font-bold ${
                        selectedRecord.status === 'OK' ? 'text-[#059669]' : 'text-[#DC2626]'
                      }`}
                    >
                      {selectedRecord.status === 'OK' ? 'OK (Pass)' : 'NG (Defective)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Defect Category:</span>
                    <span className="font-semibold text-[#0B2340]">
                      {selectedRecord.defectCategory || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Severity Score:</span>
                    <span className="font-mono font-bold text-[#0754A6]">
                      {selectedRecord.severityPercentage !== null
                        ? `${selectedRecord.severityPercentage.toFixed(1)}%`
                        : '0.0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Defect Description & Rework Notes */}
              {selectedRecord.defectDescription && (
                <div className="border border-[#CBD5E1] rounded-lg p-3 bg-white text-xs space-y-1">
                  <div className="font-bold text-[#0B2340]">
                    Defect Analysis & Location:
                  </div>
                  <p className="text-[#64748B]">
                    {selectedRecord.defectLocation} — {selectedRecord.defectDescription}
                  </p>
                  {selectedRecord.reworkActionNotes && (
                    <p className="text-[#D97706] font-medium pt-1">
                      Remedial Disposition: {selectedRecord.reworkActionNotes}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <button
                onClick={() => downloadInspectionReport(selectedRecord)}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#273444] text-xs font-semibold border border-[#CBD5E1] flex items-center gap-1.5 transition-colors shadow-xs"
                title="Download Official Engineering Inspection Certificate (.pdf)"
              >
                <FileText className="w-4 h-4 text-[#0754A6]" /> Download QA Report (.pdf)
              </button>

              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-lg bg-[#0754A6] hover:bg-[#064487] text-white text-xs font-semibold shadow-xs"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
