import test from 'node:test';
import assert from 'node:assert/strict';
import { STAMPING_PARTS } from '../src/data/partsData.ts';
import {
  formatCompletePartName,
  getProcessSequence,
  getProcessIndexFromLineProgress,
  getActiveStationIndexForProcess,
  clampProcessIndex,
  getResultBinLabel,
  computeClampedZoomDistance
} from '../src/utils/processStepNavigation.ts';
import {
  createInitialQcCycleState,
  applyQcStageUpdate,
  completeQcCycleIfInspected,
  resetCurrentPartQcState
} from '../src/utils/qcInspectionEngine.ts';

test('formatCompletePartName strips all bracketed text cleanly without truncation for all 43 parts', () => {
  assert.equal(STAMPING_PARTS.length, 43);

  STAMPING_PARTS.forEach((part) => {
    const formatted = formatCompletePartName(part.name);
    assert.ok(formatted.length > 0, `Part #${part.id} formatted name must be non-empty`);
    assert.ok(!formatted.includes('('), `Part #${part.id} formatted name "${formatted}" must not contain "("`);
    assert.ok(!formatted.includes(')'), `Part #${part.id} formatted name "${formatted}" must not contain ")"`);
    assert.ok(!formatted.includes('...'), `Part #${part.id} formatted name "${formatted}" must not contain "..."`);
  });

  // Spot-check representative parts
  assert.equal(formatCompletePartName(STAMPING_PARTS[0].name), 'Front Floor Reinforcement Patch');
  assert.equal(formatCompletePartName(STAMPING_PARTS[1].name), 'ISOFIX Child Seat Anchor Bracket Left Hand');
  assert.equal(formatCompletePartName(STAMPING_PARTS[2].name), 'ISOFIX Child Seat Anchor Bracket Right Hand');
  assert.equal(formatCompletePartName('Panel Rear Floor Cross Member (REAR CROSS) (TEST)'), 'Panel Rear Floor Cross Member');
});

test('Part selection dropdown labels preserve all 43 parts in order without # or numbering', () => {
  assert.equal(STAMPING_PARTS.length, 43);

  STAMPING_PARTS.forEach((part, idx) => {
    assert.equal(part.id, idx + 1, `Part #${part.id} stays in original order`);
    assert.ok(part.codeName.length > 0, `Part #${part.id} has non-empty codeName`);
    assert.ok(!part.codeName.startsWith('#'), `Part #${part.id} codeName "${part.codeName}" has no leading "#"`);
    assert.ok(!/^\d+\s/.test(part.codeName), `Part #${part.id} codeName "${part.codeName}" has no leading numbering`);
  });

  assert.equal(STAMPING_PARTS[0].codeName, 'PATCH FRONT FLOOR');
  assert.equal(STAMPING_PARTS[1].codeName, 'ISOFIX BRACKET LH');
  assert.equal(STAMPING_PARTS[2].codeName, 'ISOFIX BRACKET RH');
});

test('getProcessSequence produces exact 8-step sequence for PATCH FRONT FLOOR', () => {
  const patchPart = STAMPING_PARTS[0];
  const sequence = getProcessSequence(patchPart);

  assert.equal(sequence.length, 8);
  assert.deepEqual(
    sequence.map((s) => s.label),
    [
      'FEED',
      'OP05 (BLANK)',
      'OP10 (DRAW)',
      'OP20 (TRIM)',
      'OP30 (RESTRIKE)',
      'OP40 (CUT, PIE, C-CUT, C-PIE)',
      'QC INSPECTION',
      'OK / NG BIN'
    ]
  );

  // Every targetLineProgress maps deterministically back to the same processIndex
  sequence.forEach((step) => {
    const resolvedIdx = getProcessIndexFromLineProgress(
      step.targetLineProgress,
      patchPart.operations.length
    );
    assert.equal(resolvedIdx, step.processIndex, `Step ${step.label} round-trips accurately`);
  });
});

test('getProcessSequence and station mapping work dynamically across all 43 parts', () => {
  const distinctOpCounts = new Set<number>();

  STAMPING_PARTS.forEach((part) => {
    const numOps = Math.max(1, part.operations.length);
    distinctOpCounts.add(part.operations.length);

    const sequence = getProcessSequence(part);
    assert.equal(sequence.length, numOps + 3, `Part #${part.id} sequence length = FEED + ${numOps} OPs + QC + BIN`);
    assert.equal(sequence[0].kind, 'feed');
    assert.equal(sequence[sequence.length - 2].kind, 'qc');
    assert.equal(sequence[sequence.length - 1].kind, 'bin');

    // Boundary clamping
    assert.equal(clampProcessIndex(-1, sequence.length), 0);
    assert.equal(clampProcessIndex(0, sequence.length), 0);
    assert.equal(clampProcessIndex(sequence.length, sequence.length), sequence.length - 1);

    // Station highlight mapping for PASS vs FAIL
    assert.equal(getActiveStationIndexForProcess(0, numOps, 'PASS'), 0);
    assert.equal(getActiveStationIndexForProcess(1, numOps, 'PASS'), 1);
    assert.equal(getActiveStationIndexForProcess(numOps + 1, numOps, 'PASS'), numOps + 1);
    assert.equal(getActiveStationIndexForProcess(numOps + 2, numOps, 'PASS'), numOps + 2);
    assert.equal(getActiveStationIndexForProcess(numOps + 2, numOps, 'DEFECT'), numOps + 3);
  });

  // Verify dataset actually covers multiple operation counts
  assert.ok(distinctOpCounts.size >= 3, 'Dataset includes multiple distinct OP counts');
});

test('getResultBinLabel returns RESULT BIN initially and updates dynamically for PASS and DEFECT', () => {
  assert.equal(getResultBinLabel(null), 'RESULT BIN');
  assert.equal(getResultBinLabel('PASS'), 'OK BIN');
  assert.equal(getResultBinLabel('DEFECT'), 'NG BIN');
});

test('computeClampedZoomDistance respects minDistance and maxDistance boundaries', () => {
  assert.ok(computeClampedZoomDistance(15, 'in', 2.8, 38) < 15);
  assert.ok(computeClampedZoomDistance(15, 'out', 2.8, 38) > 15);
  assert.equal(computeClampedZoomDistance(2.9, 'in', 2.8, 38), 2.8);
  assert.equal(computeClampedZoomDistance(37, 'out', 2.8, 38), 38);
});

test('resetCurrentPartQcState with fullReset clears QC counters and status while keeping selected mode', () => {
  const populated = {
    mode: 'RANDOM' as const,
    stageStatus: 'INSPECTED' as const,
    cycleNumber: 5,
    hasInspectedCurrentPart: true,
    currentPartVerdict: 'DEFECT' as const,
    lastCompletedVerdict: 'DEFECT' as const,
    passCount: 3,
    defectCount: 1
  };
  const reset = resetCurrentPartQcState(populated, true);
  assert.equal(reset.mode, 'RANDOM');
  assert.equal(reset.cycleNumber, 1);
  assert.equal(reset.passCount, 0);
  assert.equal(reset.defectCount, 0);
  assert.equal(reset.lastCompletedVerdict, null);
  assert.equal(reset.currentPartVerdict, null);
  assert.equal(reset.stageStatus, 'AWAITING');
  assert.equal(reset.hasInspectedCurrentPart, false);
});

test('Overwrite navigation mode prevents QC inspection triggers, counter increments, LAST QC changes, and cycle advances', () => {
  // 1. Fresh state during < / > navigation
  const initial = createInitialQcCycleState('PASS');
  const afterNavInspect = applyQcStageUpdate(initial, 'INSPECTED', 'PASS', true);
  assert.deepEqual(afterNavInspect, initial, 'Overwrite mode ignores INSPECTED transition');
  const afterNavComplete = completeQcCycleIfInspected(afterNavInspect, true, true);
  assert.deepEqual(afterNavComplete, initial, 'Overwrite mode prevents cycle increment');

  // 2. Actual QC inspection updates counters and advances cycle once
  let active = applyQcStageUpdate(initial, 'SCANNING', null, false);
  assert.equal(active.stageStatus, 'SCANNING');
  active = applyQcStageUpdate(active, 'INSPECTED', 'PASS', false);
  assert.equal(active.passCount, 1);
  assert.equal(active.defectCount, 0);
  assert.equal(active.lastCompletedVerdict, 'PASS');
  assert.equal(active.hasInspectedCurrentPart, true);

  active = completeQcCycleIfInspected(active, active.hasInspectedCurrentPart, false);
  assert.equal(active.cycleNumber, 2);
  assert.equal(active.passCount, 1);
  assert.equal(active.lastCompletedVerdict, 'PASS');
  assert.equal(active.hasInspectedCurrentPart, false);

  // 3. Subsequent < / > navigation preserves recorded Cycle #2, OK BIN: 1, NG BIN: 0, LAST QC: PASS
  const navBack = applyQcStageUpdate(active, 'AWAITING', null, true);
  const navForwardToQc = applyQcStageUpdate(navBack, 'INSPECTED', 'DEFECT', true);
  const navCycleSkip = completeQcCycleIfInspected(navForwardToQc, false, false);
  assert.equal(navCycleSkip.cycleNumber, 2);
  assert.equal(navCycleSkip.passCount, 1);
  assert.equal(navCycleSkip.defectCount, 0);
  assert.equal(navCycleSkip.lastCompletedVerdict, 'PASS');
  assert.equal(navCycleSkip.currentPartVerdict, null);
  assert.equal(navCycleSkip.stageStatus, 'AWAITING');
});



