import test from 'node:test';
import assert from 'node:assert/strict';
import { STAMPING_PARTS } from '../src/data/partsData.ts';
import {
  generateProductionLineStations,
  generateRobotArmStations
} from '../src/data/productionLine.ts';

test('Material Feeding Station uses uniform title and identical description across all 43 parts', () => {
  const descriptions = new Set<string>();

  STAMPING_PARTS.forEach((part) => {
    const stations = generateProductionLineStations(part);
    const feeding = stations[0];
    assert.equal(feeding.type, 'feeding');
    assert.equal(feeding.title, 'Material Feeding Station');
    assert.ok(!feeding.title.includes('1.'));
    assert.ok(!feeding.description.includes('→'));
    descriptions.add(feeding.description);
  });

  assert.equal(descriptions.size, 1, 'All 43 parts must share the exact same Material Feeding Station description');
});

test('Stamping OP stations remove Operation N prefix and OP Stage badge across all 43 parts', () => {
  STAMPING_PARTS.forEach((part) => {
    const stations = generateProductionLineStations(part);
    const opStations = stations.filter((s) => s.type === 'stamping_op');

    opStations.forEach((opSt, idx) => {
      const op = part.operations[idx];
      if (!op) return;
      assert.equal(opSt.title, `${op.opCode} – ${op.name}`);
      assert.ok(!opSt.title.startsWith('Operation '), `Title "${opSt.title}" must not start with Operation`);
      const opCodeParam = opSt.parameters.find((p) => p.label === 'Operation Code');
      assert.ok(opCodeParam, 'Has Operation Code parameter');
      assert.equal(opCodeParam.badge, undefined, 'OP Stage badge is removed');
    });
  });
});

test('QC, OK Bin, and NG Bin stations remove specified titles, badges, and parameters across all 43 parts', () => {
  STAMPING_PARTS.forEach((part) => {
    const stations = generateProductionLineStations(part);

    const qc = stations.find((s) => s.type === 'qc_inspection');
    assert.ok(qc);
    assert.equal(qc.title, 'QC Defect Detection Station');
    assert.ok(!qc.parameters.some((p) => p.label === 'Defect Coverage'));
    assert.ok(!qc.parameters.some((p) => p.label === 'Quality Threshold'));

    const okBin = stations.find((s) => s.type === 'sorting_ok');
    assert.ok(okBin);
    assert.equal(okBin.title, 'OK Parts Bin');
    assert.ok(!okBin.title.includes('(Conforming)'));
    const okAction = okBin.parameters.find((p) => p.label === 'Sorting Action');
    assert.ok(okAction);
    assert.equal(okAction.badge, undefined);
    assert.ok(!okBin.parameters.some((p) => p.label === 'Target Destination'));

    const ngBin = stations.find((s) => s.type === 'sorting_ng');
    assert.ok(ngBin);
    assert.equal(ngBin.title, 'NG Parts Bin');
    assert.ok(!ngBin.title.includes('Non-Conforming'));
    const ngAction = ngBin.parameters.find((p) => p.label === 'Sorting Action');
    assert.ok(ngAction);
    assert.equal(ngAction.badge, undefined);
    assert.ok(!ngBin.parameters.some((p) => p.label === 'Target Destination'));
  });
});

test('All Robot Arms replace arrow symbols, remove route/gripper badges and Payload prefix, and provide Reach/Lift/Swing', () => {
  STAMPING_PARTS.forEach((part) => {
    const arms = generateRobotArmStations(part);
    assert.ok(arms.length >= 3);

    arms.forEach((arm) => {
      assert.ok(!arm.title.includes('→'), `Robot title "${arm.title}" must not contain →`);
      assert.ok(!arm.description.includes('→'), `Robot description must not contain →`);

      const route = arm.parameters.find((p) => p.label === 'Transfer Route');
      assert.ok(route, 'Has Transfer Route parameter');
      assert.ok(!route.value.includes('→'), `Route "${route.value}" must use "to" instead of →`);
      assert.ok(route.value.includes(' to '), `Route "${route.value}" contains "to"`);
      assert.equal(route.badge, undefined, 'Transfer Route badge removed');

      const gripper = arm.parameters.find((p) => p.label === 'Gripper Tooling');
      assert.ok(gripper, 'Has Gripper Tooling parameter');
      assert.equal(gripper.badge, undefined, 'Gripper Tooling badge removed');

      assert.ok(!arm.specifications.tonnage.includes('Payload'), `Tonnage "${arm.specifications.tonnage}" removes Payload prefix`);
      assert.ok(arm.specifications.horizontalReach, 'Has Horizontal Reach');
      assert.ok(arm.specifications.verticalLift, 'Has Vertical Lift');
      assert.ok(arm.specifications.swingAngle, 'Has Swing Angle');
    });
  });
});

test('REINF RR SEAT STRIKER uses PROG operation code and PROG – PROGRESSIVE ribbon title', () => {
  const striker = STAMPING_PARTS.find((p) => p.codeName === 'REINF RR SEAT STRIKER');
  assert.ok(striker, 'REINF RR SEAT STRIKER part exists');
  assert.equal(striker.operations[0]?.opCode, 'PROG');
  assert.equal(striker.operations[0]?.name, 'PROGRESSIVE');

  const stations = generateProductionLineStations(striker);
  const opStation = stations.find((s) => s.type === 'stamping_op');
  assert.ok(opStation);
  assert.equal(opStation.title, 'PROG – PROGRESSIVE');
  const opCodeParam = opStation.parameters.find((p) => p.label === 'Operation Code');
  assert.equal(opCodeParam?.value, 'PROG');
});

