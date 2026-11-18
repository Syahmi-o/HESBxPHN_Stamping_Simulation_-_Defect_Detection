import { InspectionRecord } from '../data/defectCategories';

export interface DefectInspectionProcessState {
  hasInspectionStarted: boolean;
  isInspecting: boolean;
  inspectionResult: InspectionRecord | null;
  showAnnotationOverlay: boolean;
  statusMessage: string | null;
  activeRunId: number;
}

export interface ViewportSelectionState {
  selectedImage: string | null;
  imageFileName: string;
  selectedSampleId: string | null;
  manualPartId: number;
}

export function createInitialViewportSelectionState(): ViewportSelectionState {
  return {
    selectedImage: null,
    imageFileName: '',
    selectedSampleId: null,
    manualPartId: 1
  };
}

export function createInitialInspectionProcessState(
  activeRunId = 0
): DefectInspectionProcessState {
  return {
    hasInspectionStarted: false,
    isInspecting: false,
    inspectionResult: null,
    showAnnotationOverlay: true,
    statusMessage: null,
    activeRunId
  };
}

export function startInspectionProcess(
  prev: DefectInspectionProcessState
): { state: DefectInspectionProcessState; runId: number } {
  const runId = prev.activeRunId + 1;
  return {
    runId,
    state: {
      hasInspectionStarted: true,
      isInspecting: true,
      inspectionResult: null,
      showAnnotationOverlay: true,
      statusMessage: null,
      activeRunId: runId
    }
  };
}

export function completeInspectionProcess(
  prev: DefectInspectionProcessState,
  runId: number,
  record: InspectionRecord
): DefectInspectionProcessState {
  if (prev.activeRunId !== runId || !prev.isInspecting) {
    return prev;
  }
  return {
    ...prev,
    isInspecting: false,
    inspectionResult: record,
    statusMessage: null
  };
}

export function failInspectionProcess(
  prev: DefectInspectionProcessState,
  runId: number,
  message: string
): DefectInspectionProcessState {
  if (prev.activeRunId !== runId || !prev.isInspecting) {
    return prev;
  }
  return {
    ...prev,
    isInspecting: false,
    inspectionResult: null,
    statusMessage: message
  };
}

export function restartInspectionProcess(
  prev: DefectInspectionProcessState
): DefectInspectionProcessState {
  return createInitialInspectionProcessState(prev.activeRunId + 1);
}

export function clearViewportOverlayState(
  prev: DefectInspectionProcessState
): DefectInspectionProcessState {
  return {
    ...prev,
    showAnnotationOverlay: true,
    statusMessage: null
  };
}

export function shouldCommitInspectionRun(
  currentRunId: number,
  expectedRunId: number,
  aborted: boolean
): boolean {
  return !aborted && currentRunId === expectedRunId;
}

export function isRestartInspectionAvailable(
  state: Pick<
    DefectInspectionProcessState,
    'hasInspectionStarted' | 'isInspecting' | 'inspectionResult'
  >
): boolean {
  return (
    state.hasInspectionStarted ||
    state.isInspecting ||
    state.inspectionResult !== null
  );
}

export function isClearImageVisible(
  selectedImage: string | null,
  state: Pick<
    DefectInspectionProcessState,
    'hasInspectionStarted' | 'isInspecting' | 'inspectionResult'
  >
): boolean {
  return Boolean(selectedImage) && !isRestartInspectionAvailable(state);
}

export function isInitiateInspectionVisible(
  selectedImage: string | null,
  state: Pick<
    DefectInspectionProcessState,
    'hasInspectionStarted' | 'isInspecting' | 'inspectionResult'
  >
): boolean {
  return Boolean(selectedImage) && !isRestartInspectionAvailable(state);
}
