/**
 * HICOM Engineering Sdn Bhd - Process Step Navigation & Part Display Formatting
 * Pure utilities for discrete process navigation (< / >) across all 43 parts
 * and clean part name formatting for Part Technical Specifications.
 */

import { StampingPart } from '../data/partsData';
import { getQcTimelinePhase, QcVerdict } from './qcInspectionEngine';

export type ProcessStepKind = 'feed' | 'operation' | 'qc' | 'bin';

export interface ProcessStepDescriptor {
  processIndex: number;
  kind: ProcessStepKind;
  opIndex: number | null;
  label: string;
  targetLineProgress: number;
}

/**
 * Formats the Complete Part Name for Part Technical Specifications:
 * - Removes all opening/closing brackets and text inside them
 * - Preserves the complete part name outside the brackets without truncation
 */
export function formatCompletePartName(rawName: string): string {
  return rawName
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Generates the discrete sequential process list for any stamping part:
 * [FEED, ...part.operations, QC INSPECTION, OK / NG BIN]
 */
export function getProcessSequence(part: StampingPart): ProcessStepDescriptor[] {
  const ops = part.operations && part.operations.length > 0 ? part.operations : [];
  const numOps = Math.max(1, ops.length);
  const totalSteps = 2 * numOps + 3;

  const sequence: ProcessStepDescriptor[] = [
    {
      processIndex: 0,
      kind: 'feed',
      opIndex: null,
      label: 'FEED',
      targetLineProgress: 0
    }
  ];

  for (let i = 0; i < numOps; i++) {
    const op = ops[i];
    const label = op
      ? op.opCode.toUpperCase() === op.name.toUpperCase()
        ? op.opCode
        : `${op.opCode} (${op.name})`
      : `OP${i + 1}`;
    const targetStep = 2 * i + 1;
    sequence.push({
      processIndex: i + 1,
      kind: 'operation',
      opIndex: i,
      label,
      targetLineProgress: (targetStep + 0.5) / totalSteps
    });
  }

  const qcStep = 2 * numOps + 1;
  sequence.push({
    processIndex: numOps + 1,
    kind: 'qc',
    opIndex: null,
    label: 'QC INSPECTION',
    targetLineProgress: (qcStep + 0.62) / totalSteps
  });

  const binStep = 2 * numOps + 2;
  sequence.push({
    processIndex: numOps + 2,
    kind: 'bin',
    opIndex: null,
    label: 'OK / NG BIN',
    targetLineProgress: (binStep + 0.9) / totalSteps
  });

  return sequence;
}

/**
 * Maps continuous lineProgress (0..1) to the discrete process index (0..numOps+2)
 */
export function getProcessIndexFromLineProgress(
  lineProgress: number,
  numOps: number
): number {
  const ops = Math.max(1, numOps);
  const phase = getQcTimelinePhase(lineProgress, ops);

  if (phase.currentStep === 0) {
    return 0; // FEED
  }
  if (phase.currentStep < 2 * ops) {
    const opIdx = Math.min(ops - 1, Math.floor((phase.currentStep - 1) / 2));
    return 1 + opIdx;
  }
  if (phase.currentStep === 2 * ops || phase.currentStep === phase.qcStepIndex) {
    return ops + 1; // QC INSPECTION
  }
  return ops + 2; // OK / NG BIN
}

/**
 * Maps discrete process index (0..numOps+2) to the corresponding station index
 * in generateProductionLineStations(part)
 */
export function getActiveStationIndexForProcess(
  processIndex: number,
  numOps: number,
  verdict: QcVerdict | null
): number {
  const ops = Math.max(1, numOps);
  if (processIndex <= 0) return 0; // FEED
  if (processIndex <= ops) return processIndex; // OP stations (1..ops)
  if (processIndex === ops + 1) return ops + 1; // QC SCAN
  const activeVerdict = verdict ?? 'PASS';
  return activeVerdict === 'PASS' ? ops + 2 : ops + 3; // OK BIN or NG BIN
}

/**
 * Computes the clamped next/previous process index
 */
export function clampProcessIndex(index: number, totalProcesses: number): number {
  return Math.max(0, Math.min(totalProcesses - 1, index));
}

/**
 * Resolves the combined Result Bin pill label in Stamping Process Flow
 * based on the current QC inspection verdict.
 */
export function getResultBinLabel(verdict: QcVerdict | null): 'RESULT BIN' | 'OK BIN' | 'NG BIN' {
  if (verdict === 'PASS') return 'OK BIN';
  if (verdict === 'DEFECT') return 'NG BIN';
  return 'RESULT BIN';
}

/**
 * Computes the next camera-to-target distance for discrete Zoom In / Zoom Out buttons,
 * strictly clamped within OrbitControls minDistance and maxDistance bounds.
 */
export function computeClampedZoomDistance(
  currentDistance: number,
  direction: 'in' | 'out',
  minDistance: number,
  maxDistance: number
): number {
  const safeCurrent = Math.max(minDistance, Number.isFinite(currentDistance) ? currentDistance : minDistance);
  const scaleFactor = direction === 'in' ? 0.78 : 1 / 0.78;
  return Math.max(minDistance, Math.min(maxDistance, safeCurrent * scaleFactor));
}

