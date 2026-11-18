import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialInspectionProcessState,
  startInspectionProcess,
  completeInspectionProcess,
  failInspectionProcess,
  restartInspectionProcess,
  shouldCommitInspectionRun,
  isRestartInspectionAvailable,
  isClearImageVisible,
  isInitiateInspectionVisible
} from '../src/utils/defectInspectionState.ts';
import type { InspectionRecord } from '../src/data/defectCategories.ts';

function makeMockRecord(id: string): InspectionRecord {
  return {
    id,
    timestamp: '2026-11-13T10:00:00.000Z',
    partId: 1,
    partName: '1. PATCH FRONT FLOOR',
    partSize: { lengthMm: 610, widthMm: 155, heightMm: 114, formatted: '610 × 155 × 114 mm' },
    devType: 'Material Line',
    diesType: 'Cast Die',
    pressLine: 'Line A',
    status: 'NG',
    defectCategory: 'Burr',
    defectCategoryId: 'burr',
    defectLocation: 'Lower edge',
    defectDescription: 'Raised edge burr',
    severityPercentage: 28.5,
    confidencePercentage: 97.4,
    verdict: 'REWORK',
    imageUrl: 'data:image/svg+xml;utf8,<svg/>',
    annotatedImageUrl: 'data:image/svg+xml;utf8,<svg/>',
    boundingBox: { x: 60, y: 70, width: 20, height: 10, label: 'Burr' },
    inspectorName: 'Quality Assurance Lead',
    detectionEngine: 'Calibrated High-Speed Vision Benchmark',
    isLiveAi: false
  };
}

test('Restart Inspection is unavailable initially and becomes available once initiated', () => {
  const initial = createInitialInspectionProcessState();
  assert.equal(isRestartInspectionAvailable(initial), false);
  assert.equal(initial.isInspecting, false);
  assert.equal(initial.inspectionResult, null);
  assert.equal(initial.showAnnotationOverlay, true);

  const started = startInspectionProcess(initial);
  assert.equal(isRestartInspectionAvailable(started.state), true);
  assert.equal(started.state.hasInspectionStarted, true);
  assert.equal(started.state.isInspecting, true);
  assert.equal(started.state.inspectionResult, null);
  assert.equal(started.runId, 1);
});

test('Restart Inspection clears progress, overlays, status messages, and results back to initial state', () => {
  const initial = createInitialInspectionProcessState();
  const started = startInspectionProcess(initial);
  const completed = completeInspectionProcess(
    { ...started.state, showAnnotationOverlay: false, statusMessage: 'Temp status' },
    started.runId,
    makeMockRecord('HICOM-INS-001')
  );

  assert.ok(completed.inspectionResult);
  assert.equal(isRestartInspectionAvailable(completed), true);

  const restarted = restartInspectionProcess(completed);
  assert.equal(restarted.hasInspectionStarted, false);
  assert.equal(restarted.isInspecting, false);
  assert.equal(restarted.inspectionResult, null);
  assert.equal(restarted.showAnnotationOverlay, true);
  assert.equal(restarted.statusMessage, null);
  assert.equal(isRestartInspectionAvailable(restarted), false);
  assert.ok(restarted.activeRunId > completed.activeRunId);
});

test('Stale or aborted inspection runs cannot overwrite state after Restart Inspection', () => {
  const initial = createInitialInspectionProcessState();
  const firstRun = startInspectionProcess(initial);

  // User clicks Restart Inspection while firstRun is still in flight
  const restarted = restartInspectionProcess(firstRun.state);
  assert.equal(
    shouldCommitInspectionRun(restarted.activeRunId, firstRun.runId, false),
    false
  );
  assert.equal(
    shouldCommitInspectionRun(firstRun.runId, firstRun.runId, true),
    false
  );

  // Late completion or failure from firstRun must be ignored
  const afterLateComplete = completeInspectionProcess(
    restarted,
    firstRun.runId,
    makeMockRecord('STALE-RUN')
  );
  assert.equal(afterLateComplete.inspectionResult, null);
  assert.equal(afterLateComplete.hasInspectionStarted, false);

  const afterLateFail = failInspectionProcess(restarted, firstRun.runId, 'Late error');
  assert.equal(afterLateFail.statusMessage, null);

  // User starts a fresh second run
  const secondRun = startInspectionProcess(restarted);
  assert.equal(
    shouldCommitInspectionRun(secondRun.runId, secondRun.runId, false),
    true
  );

  // Stale firstRun completion still cannot interfere with active secondRun
  const duringSecondWithLateFirst = completeInspectionProcess(
    secondRun.state,
    firstRun.runId,
    makeMockRecord('STALE-RUN')
  );
  assert.equal(duringSecondWithLateFirst.isInspecting, true);
  assert.equal(duringSecondWithLateFirst.inspectionResult, null);

  // Valid secondRun completion commits cleanly
  const validSecond = completeInspectionProcess(
    duringSecondWithLateFirst,
    secondRun.runId,
    makeMockRecord('FRESH-RUN')
  );
  assert.equal(validSecond.isInspecting, false);
  assert.equal(validSecond.inspectionResult?.id, 'FRESH-RUN');
});

test('Initial viewport selection state starts completely empty with no preselected image or filename', async () => {
  const { createInitialViewportSelectionState } = await import('../src/utils/defectInspectionState.ts');
  const initialSelection = createInitialViewportSelectionState();
  assert.equal(initialSelection.selectedImage, null);
  assert.equal(initialSelection.imageFileName, '');
  assert.equal(initialSelection.selectedSampleId, null);
  assert.equal(initialSelection.manualPartId, 1);
});

test('clearViewportOverlayState clears temporary overlay and status indicators without restarting inspection', async () => {
  const { clearViewportOverlayState } = await import('../src/utils/defectInspectionState.ts');
  const started = startInspectionProcess(createInitialInspectionProcessState());
  const completed = completeInspectionProcess(
    { ...started.state, showAnnotationOverlay: false, statusMessage: 'Temp notice' },
    started.runId,
    makeMockRecord('HICOM-INS-CLEAR')
  );

  const afterClear = clearViewportOverlayState(completed);
  assert.equal(afterClear.showAnnotationOverlay, true);
  assert.equal(afterClear.statusMessage, null);
  assert.equal(afterClear.hasInspectionStarted, true);
  assert.equal(afterClear.isInspecting, false);
  assert.equal(afterClear.activeRunId, completed.activeRunId);
  assert.equal(afterClear.inspectionResult?.id, 'HICOM-INS-CLEAR');
});

test('Clear Image and Restart Inspection visibility are strictly mutually exclusive across the inspection lifecycle', () => {
  const initial = createInitialInspectionProcessState();
  // 1. Empty viewport: neither button is visible
  assert.equal(isClearImageVisible(null, initial), false);
  assert.equal(isRestartInspectionAvailable(initial), false);

  // 2. Image loaded (upload/drop/preset) before inspection: Clear Image shown, Restart hidden
  const sampleImage = '/assets/aistudio/Nominal__Pass__f90b06df.jpg';
  assert.equal(isClearImageVisible(sampleImage, initial), true);
  assert.equal(isRestartInspectionAvailable(initial), false);

  // 3. Inspection started (in progress): Clear Image hidden, Restart shown
  const started = startInspectionProcess(initial);
  assert.equal(isClearImageVisible(sampleImage, started.state), false);
  assert.equal(isRestartInspectionAvailable(started.state), true);

  // 4. Inspection completed: Clear Image remains hidden, Restart shown
  const completed = completeInspectionProcess(
    started.state,
    started.runId,
    makeMockRecord('HICOM-INS-VIS')
  );
  assert.equal(isClearImageVisible(sampleImage, completed), false);
  assert.equal(isRestartInspectionAvailable(completed), true);

  // 5. After clicking Restart Inspection (empty viewport + reset state): both hidden until new image
  const restarted = restartInspectionProcess(completed);
  assert.equal(isClearImageVisible(null, restarted), false);
  assert.equal(isRestartInspectionAvailable(restarted), false);

  // 6. Invariant check across combinations: never true simultaneously
  for (const img of [null, sampleImage]) {
    for (const st of [initial, started.state, completed, restarted]) {
      assert.equal(isClearImageVisible(img, st) && isRestartInspectionAvailable(st), false);
    }
  }
});

test('Initiate Automated Defect Inspection and Restart Inspection are never visible simultaneously', () => {
  const initial = createInitialInspectionProcessState();
  const sampleImage = '/assets/aistudio/Nominal__Pass__f90b06df.jpg';

  // Before image is loaded: neither button is shown
  assert.equal(isInitiateInspectionVisible(null, initial), false);
  assert.equal(isRestartInspectionAvailable(initial), false);

  // Image uploaded or sample/preset selected: only Initiate Automated Defect Inspection is shown
  assert.equal(isInitiateInspectionVisible(sampleImage, initial), true);
  assert.equal(isRestartInspectionAvailable(initial), false);

  // Inspection initiated (in-flight): Initiate hides immediately, only Restart Inspection is shown
  const started = startInspectionProcess(initial);
  assert.equal(isInitiateInspectionVisible(sampleImage, started.state), false);
  assert.equal(isRestartInspectionAvailable(started.state), true);

  // Inspection completed: only Restart Inspection remains shown
  const completed = completeInspectionProcess(
    started.state,
    started.runId,
    makeMockRecord('HICOM-INS-MUTEX')
  );
  assert.equal(isInitiateInspectionVisible(sampleImage, completed), false);
  assert.equal(isRestartInspectionAvailable(completed), true);

  // After Restart Inspection: if image is cleared, neither button is shown; if image remains available, Initiate is restored
  const restarted = restartInspectionProcess(completed);
  assert.equal(isRestartInspectionAvailable(restarted), false);
  assert.equal(isInitiateInspectionVisible(null, restarted), false);
  assert.equal(isInitiateInspectionVisible(sampleImage, restarted), true);

  // Strict mutual-exclusion invariant across all states
  for (const img of [null, sampleImage]) {
    for (const st of [initial, started.state, completed, restarted]) {
      assert.equal(isInitiateInspectionVisible(img, st) && isRestartInspectionAvailable(st), false);
    }
  }
});
