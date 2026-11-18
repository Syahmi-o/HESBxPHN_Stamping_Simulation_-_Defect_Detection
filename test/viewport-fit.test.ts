import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFittedViewportDimensions } from '../src/utils/viewportFit';

test('computeFittedViewportDimensions scales small preset landscape images up to fit stage while preserving aspect ratio', () => {
  // e.g. Burrs_3d385000.jpg (235x145) and Warping (234x129) inside 680x428 stage
  const burrFit = computeFittedViewportDimensions(680, 428, 235, 145);
  assert.ok(burrFit);
  assert.equal(burrFit.width, 680);
  assert.ok(burrFit.height <= 428);
  assert.ok(Math.abs(burrFit.width / burrFit.height - 235 / 145) < 0.001);

  const warpFit = computeFittedViewportDimensions(680, 428, 234, 129);
  assert.ok(warpFit);
  assert.equal(warpFit.width, 680);
  assert.ok(warpFit.height <= 428);
  assert.ok(Math.abs(warpFit.width / warpFit.height - 234 / 129) < 0.001);
});

test('computeFittedViewportDimensions fits large 1:1 square uploads and 4:3 SVGs completely inside stage without cropping', () => {
  // e.g. 1280x1280 BRACE W/HSE INR RH upload inside 680x428 stage
  const squareFit = computeFittedViewportDimensions(680, 428, 1280, 1280);
  assert.ok(squareFit);
  assert.equal(squareFit.width, 428);
  assert.equal(squareFit.height, 428);

  // e.g. 1285x723 Nominal (Pass) replacement asset inside 680x428 stage and 125x80 preset box
  const nominalStageFit = computeFittedViewportDimensions(680, 428, 1285, 723);
  assert.ok(nominalStageFit);
  assert.ok(nominalStageFit.width <= 680 && nominalStageFit.width >= 679.9);
  assert.ok(nominalStageFit.height <= 428);
  assert.ok(Math.abs(nominalStageFit.width / nominalStageFit.height - 1285 / 723) < 0.01);

  const nominalThumbFit = computeFittedViewportDimensions(125, 80, 1285, 723);
  assert.ok(nominalThumbFit);
  assert.ok(nominalThumbFit.width <= 125 && nominalThumbFit.width >= 124.9);
  assert.ok(nominalThumbFit.height <= 80);
  assert.ok(Math.abs(nominalThumbFit.width / nominalThumbFit.height - 1285 / 723) < 0.01);

  // e.g. 800x600 SVG inside 680x428 stage
  const svgFit = computeFittedViewportDimensions(680, 428, 800, 600);
  assert.ok(svgFit);
  assert.equal(svgFit.height, 428);
  assert.ok(svgFit.width <= 680);
  assert.ok(Math.abs(svgFit.width / svgFit.height - 4 / 3) < 0.001);
});

test('computeFittedViewportDimensions fits tall portrait images inside stage without stretching', () => {
  const portraitFit = computeFittedViewportDimensions(680, 428, 600, 1200);
  assert.ok(portraitFit);
  assert.equal(portraitFit.height, 428);
  assert.equal(portraitFit.width, 214);
});

test('computeFittedViewportDimensions rejects invalid or zero dimensions', () => {
  assert.equal(computeFittedViewportDimensions(0, 428, 800, 600), null);
  assert.equal(computeFittedViewportDimensions(680, 428, 0, 600), null);
  assert.equal(computeFittedViewportDimensions(680, 428, -10, 600), null);
});
