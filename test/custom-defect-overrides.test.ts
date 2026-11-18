import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { matchSpecifiedUploadedInspection } from '../src/utils/customDefectOverrides.ts';
import { STAMPING_PARTS } from '../src/data/partsData.ts';
import { DEFECT_CATEGORIES, calculateInspectionVerdict } from '../src/data/defectCategories.ts';

async function loadAssetAsDataUrl(fileName: string): Promise<string> {
  const filePath = path.resolve(process.cwd(), 'public/assets/aistudio', fileName);
  const buffer = await fs.readFile(filePath);
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

test('Specified BRACE W/HSE INR RH uploaded images resolve to BRACE W/HSE INR RH, BURR, and REWORK even when renamed', async () => {
  const targetFiles = [
    'photo_6316545992517424548_y_7693c6a5.jpg',
    'photo_6316545992517424549_y_6c32b07b.jpg'
  ];

  for (const fileName of targetFiles) {
    const dataUrl = await loadAssetAsDataUrl(fileName);
    const match = await matchSpecifiedUploadedInspection(dataUrl, 'renamed_upload_sample.jpg');
    assert.ok(match, `Expected match for ${fileName}`);

    const part = STAMPING_PARTS.find((p) => p.id === match.partId);
    assert.equal(part?.name, 'Wheelhouse Inner Brace Right Hand (BRACE W/HSE INR RH)');

    const defect = DEFECT_CATEGORIES.find((d) => d.id === match.defectId);
    assert.equal(defect?.name, 'Burr');

    const verdict = calculateInspectionVerdict('NG', match.defectId, match.severity);
    assert.equal(verdict.verdict, 'REWORK');
  }
});

test('Specified original uploaded filenames resolve to BRACE W/HSE INR RH, BURR, and REWORK even if re-encoded', async () => {
  for (const originalName of ['photo_6316545992517424548_y.jpg', 'photo_6316545992517424549_y.jpg']) {
    const match = await matchSpecifiedUploadedInspection('data:image/jpeg;base64,AQID', originalName);
    assert.ok(match, `Expected filename match for ${originalName}`);
    assert.equal(match.hasDefect, true);

    const part = STAMPING_PARTS.find((p) => p.id === match.partId);
    assert.equal(part?.name, 'Wheelhouse Inner Brace Right Hand (BRACE W/HSE INR RH)');

    const defect = DEFECT_CATEGORIES.find((d) => d.id === match.defectId);
    assert.equal(defect?.name, 'Burr');

    const verdict = calculateInspectionVerdict('NG', match.defectId, match.severity);
    assert.equal(verdict.verdict, 'REWORK');
  }
});

test('Specified conforming BRACE W/HSE INR RH uploaded images resolve to BRACE W/HSE INR RH and PASS even when renamed', async () => {
  const passFiles = [
    'photo_6316545992517424556_y_9a14bdb0.jpg',
    'photo_6316545992517424555_y_96867a61.jpg'
  ];

  for (const fileName of passFiles) {
    const dataUrl = await loadAssetAsDataUrl(fileName);
    const match = await matchSpecifiedUploadedInspection(dataUrl, 'renamed_pass_sample.jpg');
    assert.ok(match, `Expected match for ${fileName}`);
    assert.equal(match.hasDefect, false);
    assert.equal(match.defectId, null);

    const part = STAMPING_PARTS.find((p) => p.id === match.partId);
    assert.equal(part?.name, 'Wheelhouse Inner Brace Right Hand (BRACE W/HSE INR RH)');

    const verdict = calculateInspectionVerdict('OK', match.defectId, match.severity);
    assert.equal(verdict.verdict, 'PASS');
  }

  for (const originalName of ['photo_6316545992517424556_y.jpg', 'photo_6316545992517424555_y.jpg']) {
    const match = await matchSpecifiedUploadedInspection('data:image/jpeg;base64,AQID', originalName);
    assert.ok(match, `Expected filename match for ${originalName}`);
    assert.equal(match.hasDefect, false);
    const verdict = calculateInspectionVerdict('OK', match.defectId, match.severity);
    assert.equal(verdict.verdict, 'PASS');
  }
});

test('Other uploaded images do not match the BRACE W/HSE INR RH custom override', async () => {
  const otherFiles = ['Burrs_3d385000.jpg', 'Cracks_ae2ab4e3.jpg'];

  for (const fileName of otherFiles) {
    const dataUrl = await loadAssetAsDataUrl(fileName);
    const match = await matchSpecifiedUploadedInspection(dataUrl, fileName);
    assert.equal(match, null, `Did not expect custom override match for ${fileName}`);
  }
});
