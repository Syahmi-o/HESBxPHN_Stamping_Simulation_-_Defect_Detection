/**
 * HICOM Engineering Sdn Bhd - Station & Operation Specifications Drawer
 * Displays detailed technical parameters and machine specifications for any
 * selected stage of the stamping production line without resetting or interrupting simulation playback.
 */

import React from 'react';
import {
  X,
  Gauge,
  Sliders,
  Info,
  Play,
  Compass
} from 'lucide-react';
import { ProductionStation } from '../../data/productionLine';
import { StampingPart } from '../../data/partsData';
import { QcMode, QcStageStatus, QcVerdict } from '../../utils/qcInspectionEngine';

interface StationSpecDrawerProps {
  station: ProductionStation | null;
  part: StampingPart;
  onClose: () => void;
  onFocusCamera: (stationType: 'feeding' | 'machine' | 'qc' | 'sorting') => void;
  onSelectOperation?: (opIndex: number) => void;
  isActive: boolean;
  qcMode?: QcMode;
  qcStageStatus?: QcStageStatus;
  currentQcVerdict?: QcVerdict | null;
  lastCompletedVerdict?: QcVerdict | null;
}

export const StationSpecDrawer: React.FC<StationSpecDrawerProps> = ({
  station,
  part,
  onClose,
  onFocusCamera,
  onSelectOperation,
  isActive,
  qcMode = 'PASS',
  qcStageStatus = 'AWAITING',
  currentQcVerdict = null,
  lastCompletedVerdict = null
}) => {
  if (!station) return null;

  const isStampingOp = station.type === 'stamping_op';
  const isRobotArm = station.type === 'robot_arm';
  const isFeeding = station.type === 'feeding';
  const showParametersSection = !isFeeding;
  const showMachineSpecsSection = isStampingOp || isRobotArm;

  return (
    <div
      data-testid="station-spec-drawer"
      className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-[#CBD5E1] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200 font-['Inter',sans-serif]"
    >
      {/* Header */}
      <div className="p-4 bg-[#0B2340] text-white flex items-start justify-between gap-3 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#0754A6] text-white">
              {(station.opCode === 'PROGRESSIVE' ? 'PROG' : station.opCode) || station.type.toUpperCase()}
            </span>
            {isActive && (
              <span className="flex items-center gap-1 text-[11px] text-[#10B981] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                ACTIVE IN SIMULATION
              </span>
            )}
          </div>
          <h2 className="text-base font-bold tracking-tight text-white leading-snug">
            {station.title}
          </h2>
          <p className="text-xs text-[#8DBEFF] mt-0.5">
            {station.subtitle}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Close Specifications Drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-[#273444]">
        {/* QC Inspection Verdict Banner */}
        {station.type === 'qc_inspection' && (
          <div
            className={`p-3 rounded-lg border flex items-center justify-between shadow-2xs ${
              currentQcVerdict === 'PASS'
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                : currentQcVerdict === 'DEFECT'
                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                : qcStageStatus === 'SCANNING'
                ? 'bg-[#ECFEFF] border-[#A5F3FC] text-[#155E75]'
                : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#334155]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${
                  currentQcVerdict === 'PASS'
                    ? 'bg-[#10B981] animate-pulse'
                    : currentQcVerdict === 'DEFECT'
                    ? 'bg-[#EF4444] animate-pulse'
                    : qcStageStatus === 'SCANNING'
                    ? 'bg-[#06B6D4] animate-pulse'
                    : 'bg-[#94A3B8]'
                }`}
              />
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5 flex-wrap">
                  <span>Actual QC Inspection Result:</span>
                  <span className="font-bold">
                    {currentQcVerdict
                      ? currentQcVerdict
                      : qcStageStatus === 'SCANNING'
                      ? 'SCANNING...'
                      : 'AWAITING PART'}
                  </span>
                </div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  {currentQcVerdict === 'PASS'
                    ? 'Part passed optical inspection: sorting robot transfers part to OK Bin'
                    : currentQcVerdict === 'DEFECT'
                    ? 'Defect detected: sorting robot transfers part to NG Bin'
                    : qcStageStatus === 'SCANNING'
                    ? 'Laser triangulation sweep in progress prior to verdict generation'
                    : `Mode: ${qcMode === 'RANDOM' ? 'Random per cycle (generates upon QC arrival)' : `Manual (${qcMode})`}${
                        lastCompletedVerdict ? ` • Previous cycle: ${lastCompletedVerdict}` : ''
                      }`}
                </div>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                currentQcVerdict === 'PASS'
                  ? 'bg-[#10B981] text-white'
                  : currentQcVerdict === 'DEFECT'
                  ? 'bg-[#EF4444] text-white'
                  : qcStageStatus === 'SCANNING'
                  ? 'bg-[#06B6D4] text-white'
                  : 'bg-[#E2E8F0] text-[#475569]'
              }`}
            >
              {currentQcVerdict || (qcStageStatus === 'SCANNING' ? 'SCANNING' : 'PENDING')}
            </span>
          </div>
        )}

        {/* Process Description Box */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
          <div className="flex items-center gap-1.5 font-bold text-[#0B2340] mb-1">
            <Info className="w-3.5 h-3.5 text-[#0754A6]" />
            <span>Process Description & Engineering Purpose</span>
          </div>
          <p className="text-[#475569] leading-relaxed">
            {station.description}
          </p>
          {station.toolingNotes && (
            <div className="mt-2.5 p-2 bg-[#FEF3C7] border border-[#FCD34D] rounded text-[#92400E] font-medium text-[11px]">
              ⚠️ <strong>Tooling Note:</strong> {station.toolingNotes}
            </div>
          )}
        </div>

        {/* Current Part Under Processing */}
        <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg space-y-1.5">
          <div className="flex items-center justify-between text-[#64748B] text-[11px]">
            <span>Automotive Component</span>
            <span className="text-[#0754A6] font-bold">Part #{part.id}</span>
          </div>
          <div className="font-bold text-[#0B2340] text-sm">
            {part.name}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div>
              <span className="text-[#64748B]">Material:</span>
              <div className="font-medium text-[#1E293B]">{part.materialSpec}</div>
            </div>
            <div>
              <span className="text-[#64748B]">Dimensions:</span>
              <div className="font-medium text-[#1E293B]">
                {part.lengthMm && part.widthMm && part.heightMm
                  ? `${part.lengthMm} × ${part.widthMm} × ${part.heightMm} mm`
                  : 'Pending CAD Dimensions'}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Station Parameters */}
        {showParametersSection && (
          <div data-testid="station-parameters-section">
            <div className="flex items-center gap-1.5 font-bold text-[#0B2340] mb-2 uppercase text-[11px] tracking-wide">
              <Sliders className="w-3.5 h-3.5 text-[#0754A6]" />
              <span>Station Parameters & Process Controls</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {station.parameters.map((param, pIdx) => (
                <div
                  key={pIdx}
                  className="flex items-center justify-between p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                >
                  <span className="text-[#64748B] font-medium">{param.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0B2340] text-right">{param.value}</span>
                    {param.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0754A6]/10 text-[#0754A6]">
                        {param.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Machine & Stamping Specifications */}
        {showMachineSpecsSection && (
          <div data-testid="machine-specs-section">
            <div className="flex items-center gap-1.5 font-bold text-[#0B2340] mb-2 uppercase text-[11px] tracking-wide">
              <Gauge className="w-3.5 h-3.5 text-[#0754A6]" />
              <span>Machine & Tooling Specifications</span>
            </div>
            <div className="border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0] bg-white">
              {isRobotArm && (
                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-[#64748B]">Assigned Press Line:</span>
                  <span className="font-bold text-[#0754A6]">{station.specifications.assignedLine}</span>
                </div>
              )}

              {!isRobotArm && (
                <>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-[#64748B]">Die Tooling Type:</span>
                    <span className="font-medium text-[#0B2340] text-right">{station.specifications.toolingType}</span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-[#64748B]">Die Material:</span>
                    <span className="font-medium text-[#0B2340] text-right">{station.specifications.dieMaterial}</span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-[#64748B]">Stroke Length:</span>
                    <span className="text-[#0B2340]">{station.specifications.strokeLength}</span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-[#64748B]">Die Shut Height:</span>
                    <span className="text-[#0B2340]">{station.specifications.shutHeight}</span>
                  </div>
                </>
              )}

              {isRobotArm && (
                <>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-[#64748B]">Horizontal Reach:</span>
                    <span className="font-medium text-[#0B2340]">{station.specifications.horizontalReach || station.specifications.strokeLength}</span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-[#64748B]">Vertical Lift:</span>
                    <span className="font-medium text-[#0B2340]">{station.specifications.verticalLift || '850 mm'}</span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-[#64748B]">Swing Angle:</span>
                    <span className="font-medium text-[#0B2340]">{station.specifications.swingAngle || '90°'}</span>
                  </div>
                </>
              )}

              <div className="p-2.5 flex justify-between items-center">
                <span className="text-[#64748B]">Line Speed / SPM:</span>
                <span className="font-medium text-[#0B2340] text-right">{station.specifications.spmRating}</span>
              </div>

              {!isRobotArm && (
                <>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-[#64748B]">Die Cushion / Nitrogen:</span>
                    <span className="font-medium text-[#0B2340] text-right">{station.specifications.cushionPressure}</span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-[#64748B]">Cutting Clearance:</span>
                    <span className="text-[#0B2340]">{station.specifications.cuttingClearance}</span>
                  </div>
                </>
              )}

              <div className="p-2.5 flex justify-between items-center">
                <span className="text-[#64748B]">Lubricant Specification:</span>
                <span className="text-[#0B2340] text-right">{station.specifications.lubrication}</span>
              </div>
              <div className="p-2.5 flex justify-between items-center">
                <span className="text-[#64748B]">Safety & Guarding:</span>
                <span className="text-[#0B2340] text-right text-[11px]">{station.specifications.safetyStandard}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {!isRobotArm && (
        <div className="p-3 bg-[#F1F5F9] border-t border-[#CBD5E1] flex items-center justify-between gap-2">
          <button
            type="button"
            data-testid="btn-focus-3d-camera"
            onClick={() => {
              if (station.type === 'feeding') onFocusCamera('feeding');
              else if (station.type === 'stamping_op') onFocusCamera('machine');
              else if (station.type === 'qc_inspection') onFocusCamera('qc');
              else onFocusCamera('sorting');
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0B2340] hover:bg-[#E2E8F0] transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#0754A6]" />
            Focus 3D Camera Here
          </button>

          {isStampingOp && station.opIndex !== undefined && onSelectOperation && (
            <button
              type="button"
              data-testid="btn-single-op-analysis"
              onClick={() => onSelectOperation(station.opIndex!)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0754A6] text-white rounded-lg text-xs font-bold hover:bg-[#064282] transition-colors shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Single OP Analysis
            </button>
          )}
        </div>
      )}
    </div>
  );
};
