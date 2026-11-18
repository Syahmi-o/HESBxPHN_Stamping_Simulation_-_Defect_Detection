import test from 'node:test';
import assert from 'node:assert/strict';
import { STAMPING_PARTS, expandOperationName } from '../src/data/partsData.ts';
import {
  DEFECT_CATEGORIES,
  calculateInspectionVerdict
} from '../src/data/defectCategories.ts';

test('Stamping Parts Catalog contains all 43 specified parts', () => {
  assert.equal(STAMPING_PARTS.length, 43, 'Should have exactly 43 parts from the Excel Part List');

  // Verify part #1
  const part1 = STAMPING_PARTS[0];
  assert.equal(part1.id, 1);
  assert.equal(part1.codeName, 'PATCH FRONT FLOOR');
  assert.equal(part1.lengthMm, 610);
  assert.equal(part1.widthMm, 155);
  assert.equal(part1.heightMm, 114);
  assert.equal(part1.devTypeCode, 'ML');
  assert.equal(part1.diesTypeCode, 'CAST');
  assert.equal(part1.operations.length, 5);

  // Check last part #43
  const part43 = STAMPING_PARTS[42];
  assert.equal(part43.id, 43);
  assert.equal(part43.codeName, 'PLATE STRUT HOUSE RH');
  assert.equal(part43.lengthMm, 147);
  assert.equal(part43.widthMm, 128);
  assert.equal(part43.heightMm, 73);
});

test('Operation Name expansion accurately identifies manufacturing processes', () => {
  const blankExp = expandOperationName('BLANK');
  assert.equal(blankExp.action, 'blank');
  assert.ok(blankExp.fullName.includes('Blanking'));

  const drawExp = expandOperationName('DRAW');
  assert.equal(drawExp.action, 'draw');
  assert.ok(drawExp.fullName.includes('Drawing'));

  const trimExp = expandOperationName('TRIM, PIE');
  assert.equal(trimExp.action, 'trim');
  assert.ok(trimExp.fullName.includes('Trimming'));

  const restrikeExp = expandOperationName('RESTRIKE');
  assert.equal(restrikeExp.action, 'restrike');
  assert.ok(restrikeExp.fullName.includes('Restriking'));
});

test('Defect Categories contains all 15 automotive stamping categories', () => {
  assert.equal(DEFECT_CATEGORIES.length, 15, 'Should support exactly 15 standard defect categories');

  const burr = DEFECT_CATEGORIES.find(d => d.id === 'burr');
  assert.ok(burr, 'Burr defect category exists');
  assert.equal(burr?.code, 'DEF-01');

  const crack = DEFECT_CATEGORIES.find(d => d.id === 'crack');
  assert.ok(crack, 'Crack defect category exists');

  const splitting = DEFECT_CATEGORIES.find(d => d.id === 'splitting_tearing');
  assert.ok(splitting, 'Splitting/Tearing defect category exists');
});

test('Quality Verdict calculation applies defined engineering thresholds', () => {
  // Case 1: OK part should always yield PASS
  const passVerdict = calculateInspectionVerdict('OK', null, 0);
  assert.equal(passVerdict.verdict, 'PASS');

  // Case 2: Burr at 25% severity (reworkable)
  const reworkBurr = calculateInspectionVerdict('NG', 'burr', 25);
  assert.equal(reworkBurr.verdict, 'REWORK');

  // Case 3: Burr at 80% severity (excessive)
  const failBurr = calculateInspectionVerdict('NG', 'burr', 80);
  assert.equal(failBurr.verdict, 'FAIL');

  // Case 4: Splitting or Tearing is unconditional FAIL
  const failSplit = calculateInspectionVerdict('NG', 'splitting_tearing', 15);
  assert.equal(failSplit.verdict, 'FAIL');

  // Case 5: Crack > 20% is unconditional safety FAIL
  const failCrack = calculateInspectionVerdict('NG', 'crack', 25);
  assert.equal(failCrack.verdict, 'FAIL');
});

test('Inspection seed history and generated QA reports contain only Quality Assurance Lead with no personal names', async () => {
  const { getInitialSeedHistory } = await import('../src/data/seedHistory.ts');
  const { generateInspectionReportText } = await import('../src/utils/exportUtils.ts');

  const records = getInitialSeedHistory();
  assert.ok(records.length > 0);
  records.forEach((record) => {
    assert.equal(record.inspectorName, 'Quality Assurance Lead');
    const reportText = generateInspectionReportText(record);
    assert.ok(reportText.includes('Quality Assurance Lead'));
    assert.ok(!reportText.includes('Mohd Azlan'));
    assert.ok(!reportText.includes('Siti Nurhaliza'));
  });
});

test('Nominal (Pass) preset sample uses the exact attached replacement image without altering other samples', async () => {
  const { PRESET_INSPECTION_SAMPLES } = await import('../src/utils/imageGenerators.ts');
  const { NOMINAL_PASS_IMAGE_PATH } = await import('../src/data/defectImages.ts');

  assert.equal(PRESET_INSPECTION_SAMPLES.length, 16);
  const nominalPass = PRESET_INSPECTION_SAMPLES[0];
  assert.equal(nominalPass.id, 'SAMPLE-00-PASS');
  assert.equal(nominalPass.partId, 1);
  assert.equal(nominalPass.partName, 'Front Floor Reinforcement Patch (PATCH FRONT FLOOR)');
  assert.equal(nominalPass.hasDefect, false);
  assert.equal(nominalPass.svgDataUrl, '/assets/aistudio/Nominal__Pass__f90b06df.jpg');
  assert.equal(nominalPass.svgDataUrl, NOMINAL_PASS_IMAGE_PATH);

  // Confirm the 15 defective preset images remain intact
  const defectiveSamples = PRESET_INSPECTION_SAMPLES.slice(1);
  assert.equal(defectiveSamples.length, 15);
  assert.ok(defectiveSamples.every((s) => s.hasDefect && s.svgDataUrl !== NOMINAL_PASS_IMAGE_PATH));
});


