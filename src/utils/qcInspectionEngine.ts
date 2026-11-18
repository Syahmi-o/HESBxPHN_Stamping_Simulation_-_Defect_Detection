/**
 * HICOM Engineering Sdn Bhd - QC Inspection & Per-Cycle Randomisation Engine
 *
 * Manages QC inspection outcome modes (PASS, DEFECT, RANDOM) and ensures that:
 * 1. In RANDOM mode, a genuinely random PASS or DEFECT verdict is generated
 *    independently for EVERY production cycle (loop).
 * 2. A new random verdict is generated ONLY when a new part reaches the QC
 *    inspection stage—never prematurely when toggling RANDOM or during upstream stamping.
 * 3. Each verdict deterministically routes the downstream sorting robot arm:
 *    - PASS   -> OK Bin (Z = -0.65)
 *    - DEFECT -> NG Bin (Z = +0.65)
 */

export type QcMode = 'PASS' | 'DEFECT' | 'RANDOM';
export type QcVerdict = 'PASS' | 'DEFECT';
export type QcStageStatus = 'AWAITING' | 'SCANNING' | 'INSPECTED';

export interface QcCycleState {
  mode: QcMode;
  stageStatus: QcStageStatus;
  cycleNumber: number;
  hasInspectedCurrentPart: boolean;
  currentPartVerdict: QcVerdict | null;
  lastCompletedVerdict: QcVerdict | null;
  passCount: number;
  defectCount: number;
}

/**
 * Generates an independent, non-deterministic PASS or DEFECT verdict
 */
export function resolveQcVerdict(mode: QcMode, rng: () => number = Math.random): QcVerdict {
  if (mode === 'PASS') return 'PASS';
  if (mode === 'DEFECT') return 'DEFECT';
  return rng() < 0.5 ? 'PASS' : 'DEFECT';
}

/**
 * Maps a QC verdict to its physical sorting bin destination
 */
export function getSortingDestinationForVerdict(verdict: QcVerdict): {
  binCode: 'OK' | 'NG';
  binLabel: 'OK Bin' | 'NG Bin';
  targetZ: number;
} {
  if (verdict === 'PASS') {
    return { binCode: 'OK', binLabel: 'OK Bin', targetZ: -0.65 };
  }
  return { binCode: 'NG', binLabel: 'NG Bin', targetZ: 0.65 };
}

/**
 * Computes whether the production line progress has reached the QC inspection stage
 */
export function getQcTimelinePhase(
  lineProgress: number,
  numOps: number
): {
  currentStep: number;
  stepProgress: number;
  qcStepIndex: number;
  sortingStepIndex: number;
  isAtQcScanSweep: boolean;
  hasReachedQcDecision: boolean;
  isSortingStep: boolean;
} {
  const ops = Math.max(1, numOps);
  const totalSteps = 2 * ops + 3;
  const stepDuration = 1.0 / totalSteps;
  const clamped = Math.max(0, Math.min(0.999999, lineProgress));
  const currentStep = Math.min(totalSteps - 1, Math.floor(clamped / stepDuration));
  const stepProgress = (clamped - currentStep * stepDuration) / stepDuration;

  const qcStepIndex = 2 * ops + 1;
  const sortingStepIndex = 2 * ops + 2;

  const isAtQcScanSweep = currentStep === qcStepIndex && stepProgress < 0.45;
  const hasReachedQcDecision =
    (currentStep === qcStepIndex && stepProgress >= 0.45) || currentStep === sortingStepIndex;
  const isSortingStep = currentStep === sortingStepIndex;

  return {
    currentStep,
    stepProgress,
    qcStepIndex,
    sortingStepIndex,
    isAtQcScanSweep,
    hasReachedQcDecision,
    isSortingStep
  };
}

/**
 * Creates initial QC cycle state
 */
export function createInitialQcCycleState(mode: QcMode = 'PASS'): QcCycleState {
  return {
    mode,
    stageStatus: 'AWAITING',
    cycleNumber: 1,
    hasInspectedCurrentPart: false,
    currentPartVerdict: null,
    lastCompletedVerdict: null,
    passCount: 0,
    defectCount: 0
  };
}

/**
 * Updates the QC mode when user clicks PASS, DEFECT, or RANDOM.
 * Does NOT generate a premature random result if the current part has not yet reached QC.
 */
export function changeQcMode(
  state: QcCycleState,
  newMode: QcMode,
  isAtQcDecisionNow: boolean = false,
  isSortingNow: boolean = false,
  rng: () => number = Math.random
): QcCycleState {
  // If part is currently at the QC station (after scan sweep, before sorting transfer),
  // apply the newly chosen mode to the part currently being inspected at QC.
  if (isAtQcDecisionNow && !isSortingNow) {
    const verdict = resolveQcVerdict(newMode, rng);
    const prevVerdict = state.hasInspectedCurrentPart ? state.currentPartVerdict : null;
    let passCount = state.passCount;
    let defectCount = state.defectCount;

    if (prevVerdict === 'PASS') passCount = Math.max(0, passCount - 1);
    if (prevVerdict === 'DEFECT') defectCount = Math.max(0, defectCount - 1);

    if (verdict === 'PASS') passCount += 1;
    else defectCount += 1;

    return {
      ...state,
      mode: newMode,
      stageStatus: 'INSPECTED',
      hasInspectedCurrentPart: true,
      currentPartVerdict: verdict,
      lastCompletedVerdict: verdict,
      passCount,
      defectCount
    };
  }

  return {
    ...state,
    mode: newMode
  };
}

/**
 * Triggered once per production cycle when the active part reaches the QC inspection stage.
 */
export function triggerQcInspectionForPart(
  state: QcCycleState,
  rng: () => number = Math.random
): QcCycleState {
  if (state.hasInspectedCurrentPart && state.currentPartVerdict !== null) {
    return state;
  }

  const verdict = resolveQcVerdict(state.mode, rng);
  return {
    ...state,
    stageStatus: 'INSPECTED',
    hasInspectedCurrentPart: true,
    currentPartVerdict: verdict,
    lastCompletedVerdict: verdict,
    passCount: state.passCount + (verdict === 'PASS' ? 1 : 0),
    defectCount: state.defectCount + (verdict === 'DEFECT' ? 1 : 0)
  };
}

/**
 * Advances to the next production cycle when a completed part has been sorted into OK/NG bin
 * and the next raw sheet blank enters Material Feeding.
 */
export function advanceToNextQcCycle(state: QcCycleState): QcCycleState {
  return {
    ...state,
    stageStatus: 'AWAITING',
    cycleNumber: state.cycleNumber + 1,
    hasInspectedCurrentPart: false,
    currentPartVerdict: null
  };
}

/**
 * Resets current part inspection state (e.g. on Restart, Part Switch, or scrubbing backward before QC)
 * while preserving the user's selected QC mode (PASS / DEFECT / RANDOM).
 */
export function resetCurrentPartQcState(state: QcCycleState, resetCounts: boolean = false): QcCycleState {
  return {
    ...state,
    stageStatus: 'AWAITING',
    cycleNumber: resetCounts ? 1 : state.cycleNumber,
    hasInspectedCurrentPart: false,
    currentPartVerdict: null,
    lastCompletedVerdict: resetCounts ? null : state.lastCompletedVerdict,
    passCount: resetCounts ? 0 : state.passCount,
    defectCount: resetCounts ? 0 : state.defectCount
  };
}

/**
 * Applies a QC stage update from the 3D scene while respecting process-navigation overwrite mode.
 * When isOverwriteNavigation is true (user is stepping with Previous/Next Process),
 * QC inspection state, counters, and lastCompletedVerdict remain completely untouched.
 */
export function applyQcStageUpdate(
  state: QcCycleState,
  status: QcStageStatus,
  verdict: QcVerdict | null,
  isOverwriteNavigation: boolean = false
): QcCycleState {
  if (isOverwriteNavigation) {
    return state;
  }

  if (status === 'INSPECTED' && verdict !== null) {
    if (!state.hasInspectedCurrentPart) {
      return {
        ...state,
        stageStatus: 'INSPECTED',
        hasInspectedCurrentPart: true,
        currentPartVerdict: verdict,
        lastCompletedVerdict: verdict,
        passCount: state.passCount + (verdict === 'PASS' ? 1 : 0),
        defectCount: state.defectCount + (verdict === 'DEFECT' ? 1 : 0)
      };
    }

    if (state.currentPartVerdict !== verdict) {
      const prevPassAdj = state.currentPartVerdict === 'PASS' ? -1 : 0;
      const prevDefectAdj = state.currentPartVerdict === 'DEFECT' ? -1 : 0;
      return {
        ...state,
        stageStatus: 'INSPECTED',
        currentPartVerdict: verdict,
        lastCompletedVerdict: verdict,
        passCount: Math.max(0, state.passCount + prevPassAdj + (verdict === 'PASS' ? 1 : 0)),
        defectCount: Math.max(0, state.defectCount + prevDefectAdj + (verdict === 'DEFECT' ? 1 : 0))
      };
    }

    return state;
  }

  if (state.stageStatus === status && !state.hasInspectedCurrentPart && state.currentPartVerdict === null) {
    return state;
  }

  return {
    ...state,
    stageStatus: status,
    hasInspectedCurrentPart: false,
    currentPartVerdict: null
  };
}

/**
 * Advances the QC cycle counter only when a part completed actual QC inspection
 * and the simulation is not operating in overwrite navigation mode.
 */
export function completeQcCycleIfInspected(
  state: QcCycleState,
  hasCompletedActualQcInCycle: boolean,
  isOverwriteNavigation: boolean = false
): QcCycleState {
  if (isOverwriteNavigation || !hasCompletedActualQcInCycle) {
    return state;
  }
  return advanceToNextQcCycle(state);
}

