import test from 'node:test';
import assert from 'node:assert/strict';
import { STAMPING_PARTS } from '../src/data/partsData.ts';
import { calculateLineLayout, generateRobotArmStations, generateProductionLineStations } from '../src/data/productionLine.ts';

test('Multi-Machine line layout calculates distinct physical positions for all operations', () => {
  STAMPING_PARTS.forEach((part) => {
    const layout = calculateLineLayout(part);
    const numOps = Math.max(1, part.operations.length);

    assert.equal(layout.numOps, numOps, `Part #${part.id} numOps matches`);
    assert.equal(layout.pressPositionsX.length, numOps, `Part #${part.id} has dedicated press positions`);

    // Verify all presses have distinct X positions with minimum clearance for robot arms
    for (let i = 0; i < layout.pressPositionsX.length - 1; i++) {
      const dist = layout.pressPositionsX[i + 1] - layout.pressPositionsX[i];
      assert.ok(dist >= 3.0, `Part #${part.id} presses ${i} and ${i+1} have adequate clearance (got ${dist})`);
    }

    // Verify feeding is before press 0 and QC is after last press
    assert.ok(layout.feedingX < layout.pressPositionsX[0], 'Feeding station is to the left of first press');
    assert.ok(layout.qcX > layout.pressPositionsX[numOps - 1], 'QC station is to the right of last press');
    assert.ok(layout.binsX > layout.qcX, 'Bins are downstream of QC station');
  });
});

test('Pick-and-place robot arms are generated between all consecutive stamping machines', () => {
  // Test PATCH FRONT FLOOR (Part #1)
  const part1 = STAMPING_PARTS[0];
  assert.equal(part1.codeName, 'PATCH FRONT FLOOR', 'Part 1 is PATCH FRONT FLOOR');
  assert.equal(part1.operations.length, 5, 'PATCH FRONT FLOOR has 5 operations');

  const arms1 = generateRobotArmStations(part1);
  // Infeed + 4 Inter-Press + Outfeed + Sorting = 7 arms
  assert.equal(arms1.length, 7, 'PATCH FRONT FLOOR should have 7 pick-and-place robot stations');

  const infeed = arms1.find(a => a.id === 'station-robot-infeed');
  assert.ok(infeed, 'Has Infeed Robot');
  assert.ok(infeed.title.includes('Feeding'), 'Infeed robot connects feeding to first OP');

  const arm1to2 = arms1.find(a => a.id === 'station-robot-1');
  assert.ok(arm1to2, 'Has Robot Arm 1');
  assert.ok(arm1to2.title.includes('OP05') && arm1to2.title.includes('OP10'), 'Robot 1 transfers OP05 to OP10');

  const arm2to3 = arms1.find(a => a.id === 'station-robot-2');
  assert.ok(arm2to3, 'Has Robot Arm 2');
  assert.ok(arm2to3.title.includes('OP10') && arm2to3.title.includes('OP20'), 'Robot 2 transfers OP10 to OP20');

  const arm3to4 = arms1.find(a => a.id === 'station-robot-3');
  assert.ok(arm3to4, 'Has Robot Arm 3');
  assert.ok(arm3to4.title.includes('OP20') && arm3to4.title.includes('OP30'), 'Robot 3 transfers OP20 to OP30');

  const arm4to5 = arms1.find(a => a.id === 'station-robot-4');
  assert.ok(arm4to5, 'Has Robot Arm 4');
  assert.ok(arm4to5.title.includes('OP30') && arm4to5.title.includes('OP40'), 'Robot 4 transfers OP30 to OP40');

  const outfeed = arms1.find(a => a.id === 'station-robot-outfeed');
  assert.ok(outfeed, 'Has Outfeed Robot');
  assert.ok(outfeed.title.includes('QC Inspection'), 'Outfeed robot connects to QC');

  const sorting = arms1.find(a => a.id === 'station-robot-sorting');
  assert.ok(sorting, 'Has Sorting Robot');
  assert.ok(sorting.title.includes('OK / NG Bin'), 'Sorting robot routes to bins');
});

test('Every robot arm station specifies vacuum suction tooling specifications', () => {
  STAMPING_PARTS.forEach((part) => {
    const arms = generateRobotArmStations(part);
    arms.forEach((arm) => {
      assert.equal(arm.type, 'robot_arm', 'Station type is robot_arm');
      assert.ok(arm.specifications.toolingType.toLowerCase().includes('vacuum'), 'Has vacuum tooling specification');
      assert.ok(arm.specifications.machineModel.length > 5, 'Has realistic robot machine model');
      assert.ok(arm.parameters.some(p => p.label.includes('Vacuum') || p.label.includes('Gripper')), 'Has vacuum parameter');
    });
  });
});

test('Robot transfer angles, forward positioning (Z = 2.00m), and pick-and-place kinematics maintain clearance and reachability', async () => {
  const { calculateRobotTransferAngles, setRobotArmMotion, createRobotMaterials, buildRobotArmMesh } = await import('../src/components/3d/robotArmBuilder.ts');

  const part1 = STAMPING_PARTS[0];
  const layout = calculateLineLayout(part1);
  assert.equal(layout.robotZ, 2.00, 'Robot arms are positioned further forward in front of stamping machines at Z = 2.00m');
  assert.ok(layout.sortingRobotZ > 1.0, 'Sorting robot is positioned comfortably in front of QC gantry');

  // Verify angle calculations for front-mounted robot at Z = 2.00m
  const robotX = 0;
  const robotZ = layout.robotZ;
  const pickX = -1.9;
  const pickZ = 0;
  const placeX = 1.9;
  const placeZ = 0;

  const angles = calculateRobotTransferAngles(robotX, robotZ, pickX, pickZ, placeX, placeZ);
  assert.ok(angles.pickAngleY > 0, 'Pick angle correctly points toward front-to-back left bolster');
  assert.ok(angles.placeAngleY > 0, 'Place angle correctly points toward front-to-back right bolster');
  assert.equal(angles.homeAngleY, -Math.PI / 2, 'Home angle folds forward into service aisle away from press line');

  // Verify motion states across all 7 stages from Z = 2.00m
  const mats = createRobotMaterials();
  const arm = buildRobotArmMesh(0, 0, robotZ, 'TestArm', mats);
  const pickPos = { x: pickX, y: 0.92, z: pickZ };
  const placePos = { x: placeX, y: 0.92, z: placeZ };

  // 1. Approach (progress 0.05): not gripping, vacuum inactive
  const sApproach = setRobotArmMotion(arm, 0.05, pickPos, placePos, true, mats);
  assert.equal(sApproach.phaseName, 'approach');
  assert.equal(sApproach.isGripping, false);
  assert.equal(sApproach.suctionActive, false);
  assert.ok(Math.abs(arm.toolingFrame.rotation.y + arm.baseTurret.rotation.y) < 1e-5, 'Tool counter-rotates with base');

  // 2. Grip contact (progress 0.239): TCP touches exact bolster (x = -1.9, y = 0.92, z = 0)
  const sGrip = setRobotArmMotion(arm, 0.239, pickPos, placePos, true, mats);
  assert.equal(sGrip.phaseName, 'grip');
  assert.equal(sGrip.isGripping, true);
  assert.equal(sGrip.suctionActive, true);
  arm.rootGroup.updateMatrixWorld(true);
  const tcpX = arm.toolCenterPoint.matrixWorld.elements[12];
  const tcpY = arm.toolCenterPoint.matrixWorld.elements[13];
  const tcpZ = arm.toolCenterPoint.matrixWorld.elements[14];
  assert.ok(Math.abs(tcpX - pickX) < 0.01, `Grip TCP reaches exact pick X (${tcpX} vs ${pickX})`);
  assert.ok(Math.abs(tcpY - 0.92) < 0.01, `Grip TCP reaches exact bolster Y (${tcpY} vs 0.92)`);
  assert.ok(Math.abs(tcpZ - pickZ) < 0.01, `Grip TCP reaches exact pick Z (${tcpZ} vs ${pickZ})`);

  // 3. Lift vertically (progress 0.30): lifting, holding part
  const sLift = setRobotArmMotion(arm, 0.30, pickPos, placePos, true, mats);
  assert.equal(sLift.phaseName, 'lift');
  assert.equal(sLift.isGripping, true);

  // 4. Swing (progress 0.51 -> midpoint): arcs forward well clear of press columns (Z > 0.80m) and robot pedestal (Z < 1.35m)
  const sSwing = setRobotArmMotion(arm, 0.51, pickPos, placePos, true, mats);
  assert.equal(sSwing.phaseName, 'swing');
  assert.equal(sSwing.isGripping, true);
  arm.rootGroup.updateMatrixWorld(true);
  const midZ = arm.toolCenterPoint.matrixWorld.elements[14];
  assert.ok(midZ > 0.85 && midZ < 1.40, `Mid-swing Z (${midZ.toFixed(2)}m) clears press uprights and robot base`);

  // 5. Place: part lowers (holding) then settles on die bolster (suction releases)
  const sLowering = setRobotArmMotion(arm, 0.74, pickPos, placePos, true, mats);
  assert.equal(sLowering.phaseName, 'place');
  assert.equal(sLowering.isGripping, true);

  const sPlace = setRobotArmMotion(arm, 0.78, pickPos, placePos, true, mats);
  assert.equal(sPlace.phaseName, 'place');
  assert.equal(sPlace.isGripping, false);
  assert.equal(sPlace.suctionActive, false);

  // 6. Retract (progress 0.85)
  const sRetract = setRobotArmMotion(arm, 0.85, pickPos, placePos, true, mats);
  assert.equal(sRetract.phaseName, 'retract');
  assert.equal(sRetract.isGripping, false);

  // 7. Standby (progress 0.95)
  const sStandby = setRobotArmMotion(arm, 0.95, pickPos, placePos, true, mats);
  assert.equal(sStandby.phaseName, 'standby');
  assert.equal(sStandby.isGripping, false);
});

test('solveRobotArmIK computes exact joint angles for comfortable 3.10m reach at Z = 2.00m', async () => {
  const { solveRobotArmIK } = await import('../src/components/3d/robotArmBuilder.ts');

  const targets = [
    { name: 'Inter-press die bolster from Z=2.0m', R: 2.76, Y: 0.92 },
    { name: 'Inter-press lifted hover from Z=2.0m', R: 2.76, Y: 1.32 },
    { name: 'Destacker table from Z=2.0m', R: 2.62, Y: 0.54 },
    { name: 'QC fixture plate from Z=2.0m', R: 2.62, Y: 0.82 },
    { name: 'OK bin container from sorting robot', R: 2.28, Y: 0.38 }
  ];

  targets.forEach(({ name, R, Y }) => {
    const ik = solveRobotArmIK(R, Y); // Uses default L1=1.60, L2=1.50
    assert.ok(!Number.isNaN(ik.shoulder), `${name}: shoulder is valid number`);
    assert.ok(!Number.isNaN(ik.elbow), `${name}: elbow is valid number`);
    assert.ok(!Number.isNaN(ik.wrist), `${name}: wrist is valid number`);

    const levelSum = ik.shoulder + ik.elbow + ik.wrist;
    assert.ok(Math.abs(levelSum) < 1e-10, `${name}: suction tool frame remains level and facing down`);

    // Forward kinematics check with L1 = 1.60, L2 = 1.50
    const rFwd = -1.60 * Math.sin(ik.shoulder) - 1.50 * Math.sin(ik.shoulder + ik.elbow);
    const yFwd = 0.74 + 1.60 * Math.cos(ik.shoulder) + 1.50 * Math.cos(ik.shoulder + ik.elbow);
    assert.ok(Math.abs(rFwd - R) < 0.001, `${name}: reaches exact target radius R (err=${Math.abs(rFwd - R)})`);
    assert.ok(Math.abs(yFwd - Y) < 0.001, `${name}: reaches exact target height Y (err=${Math.abs(yFwd - Y)})`);
  });
});

test('QC Randomisation Engine generates independent random PASS/DEFECT results strictly at QC stage for every cycle', async () => {
  const {
    createInitialQcCycleState,
    changeQcMode,
    getQcTimelinePhase,
    triggerQcInspectionForPart,
    advanceToNextQcCycle,
    getSortingDestinationForVerdict
  } = await import('../src/utils/qcInspectionEngine.ts');

  // 1. Enabling RANDOM mode before QC does NOT prematurely generate a result
  let state = createInitialQcCycleState('PASS');
  assert.equal(state.currentPartVerdict, null);

  state = changeQcMode(state, 'RANDOM', false, false);
  assert.equal(state.mode, 'RANDOM');
  assert.equal(state.currentPartVerdict, null, 'No premature result generated when enabling RANDOM before QC');
  assert.equal(state.hasInspectedCurrentPart, false);

  // 2. Timeline check: upstream stages (Feeding, Presses, Outfeed) do not trigger QC decision
  const numOps = 5; // 13 total steps; QC is step 11 (11/13 = 0.84615)
  const upstreamPhase = getQcTimelinePhase(0.50, numOps);
  assert.equal(upstreamPhase.hasReachedQcDecision, false, 'Mid-line stamping has not reached QC');

  const scanSweepPhase = getQcTimelinePhase(11.1 / 13, numOps);
  assert.equal(scanSweepPhase.isAtQcScanSweep, true);
  assert.equal(scanSweepPhase.hasReachedQcDecision, false, 'Initial laser sweep precedes QC verdict');

  const qcDecisionPhase = getQcTimelinePhase(11.6 / 13, numOps);
  assert.equal(qcDecisionPhase.hasReachedQcDecision, true, 'Reaching QC optical capture triggers QC decision');

  // 3. Multi-cycle automatic randomisation: each cycle generates a fresh independent result at QC
  const cycleVerdicts: ('PASS' | 'DEFECT')[] = [];
  for (let c = 0; c < 80; c++) {
    // At start of each cycle, currentPartVerdict must be null (pending QC)
    assert.equal(state.currentPartVerdict, null, `Cycle ${c + 1} starts with no premature verdict`);

    // Part reaches QC inspection stage -> generates new independent random verdict
    state = triggerQcInspectionForPart(state);
    assert.ok(state.currentPartVerdict === 'PASS' || state.currentPartVerdict === 'DEFECT');
    cycleVerdicts.push(state.currentPartVerdict!);

    // Sorting destination matches generated verdict
    const dest = getSortingDestinationForVerdict(state.currentPartVerdict!);
    if (state.currentPartVerdict === 'PASS') {
      assert.equal(dest.binLabel, 'OK Bin');
      assert.equal(dest.targetZ, -0.65);
    } else {
      assert.equal(dest.binLabel, 'NG Bin');
      assert.equal(dest.targetZ, 0.65);
    }

    // Complete cycle and loop to next part
    state = advanceToNextQcCycle(state);
  }

  assert.ok(cycleVerdicts.includes('PASS'), 'Random QC mode generates PASS across production loops');
  assert.ok(cycleVerdicts.includes('DEFECT'), 'Random QC mode generates DEFECT across production loops');
  assert.equal(state.passCount + state.defectCount, 80, 'Every completed cycle increments OK or NG bin count');

  // Verify non-alternating, genuinely random sequence (must contain both consecutive repeats and transitions)
  let repeats = 0;
  let transitions = 0;
  for (let i = 1; i < cycleVerdicts.length; i++) {
    if (cycleVerdicts[i] === cycleVerdicts[i - 1]) repeats++;
    else transitions++;
  }
  assert.ok(repeats > 5 && transitions > 5, 'Sequence is genuinely random (neither constant nor strictly alternating)');
});


