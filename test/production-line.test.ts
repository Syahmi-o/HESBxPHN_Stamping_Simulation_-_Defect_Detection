import test from 'node:test';
import assert from 'node:assert/strict';
import { STAMPING_PARTS } from '../src/data/partsData.ts';
import { generateProductionLineStations } from '../src/data/productionLine.ts';

test('Dynamic Production Line generator produces valid sequence for all 43 parts', () => {
  assert.equal(STAMPING_PARTS.length, 43, 'Should have all 43 parts');

  STAMPING_PARTS.forEach((part) => {
    const stations = generateProductionLineStations(part);

    // 1. First station must always be Material Feeding
    assert.equal(stations[0].type, 'feeding', `Part #${part.id} ${part.codeName} must begin with Material Feeding`);
    assert.ok(stations[0].title.includes('Feeding'), 'Feeding station title check');

    // 2. Second-to-last station must be QC Defect Detection
    const qcStation = stations[stations.length - 3];
    assert.equal(qcStation.type, 'qc_inspection', `Part #${part.id} must include QC Defect Detection station`);

    // 3. Last two stations must be OK and NG Bins
    const okBin = stations[stations.length - 2];
    assert.equal(okBin.type, 'sorting_ok', `Part #${part.id} must include OK Bin`);
    const ngBin = stations[stations.length - 1];
    assert.equal(ngBin.type, 'sorting_ng', `Part #${part.id} must include NG Bin`);

    // 4. Stamping operations must match part operations count
    const opStations = stations.filter(s => s.type === 'stamping_op');
    assert.equal(opStations.length, part.operations.length, `Part #${part.id} OP count match`);

    // 5. Check that all op stations have valid specifications
    opStations.forEach((opSt, idx) => {
      assert.ok(opSt.opCode, `OP station ${idx} has opCode`);
      assert.ok(opSt.specifications.tonnage, `OP station ${idx} has tonnage spec`);
      assert.ok(opSt.specifications.dieMaterial, `OP station ${idx} has die material`);
    });
  });
});

test('Missing process information is explicitly identified without guessing', () => {
  const dummyPart = {
    ...STAMPING_PARTS[0],
    id: 999,
    name: 'CUSTOM UNKNOWN TEST PART',
    codeName: 'UNKNOWN TEST',
    operations: []
  };

  const stations = generateProductionLineStations(dummyPart);
  const pendingStation = stations.find(s => s.id === 'station-pending-data');
  assert.ok(pendingStation, 'Should generate pending process data station when operations are empty');
  assert.ok(pendingStation.description.includes('awaiting engineering documentation'), 'Contains clear missing info statement');
});
