import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureJpegFilename, extractSvgDimensions } from '../src/utils/imageExport.ts';
import {
  buildInspectionPdfSections,
  generateInspectionReportPdfBytes
} from '../src/utils/exportUtils.ts';
import { generateAnnotatedSvg } from '../src/utils/imageGenerators.ts';
import { InspectionRecord } from '../src/data/defectCategories.ts';

const SAMPLE_NG_RECORD: InspectionRecord = {
  id: 'HICOM-INS-20261115-4821',
  timestamp: '2026-11-15T08:30:00Z',
  partId: 17,
  partName: 'Wheelhouse Inner Brace Right Hand (BRACE W/HSE INR RH)',
  partSize: {
    lengthMm: 420,
    widthMm: 185,
    heightMm: 92,
    formatted: '420 × 185 × 92 mm'
  },
  devType: 'Medium Line (ML)',
  diesType: 'Cast Iron',
  pressLine: '250T Press Line 2',
  status: 'NG',
  defectCategory: 'Burrs',
  defectCategoryId: 'burr',
  defectLocation: 'Lower sheared flange contour edge of Wheelhouse Inner Brace RH',
  defectDescription:
    'Raised edge burr ridge detected along the trimmed sheet-metal perimeter exceeding nominal edge tolerance.',
  severityPercentage: 24.5,
  confidencePercentage: 98.2,
  verdict: 'REWORK',
  reworkActionNotes: 'Scheduled for offline edge deburring and manual bench planishing.',
  manufacturingCauses: ['Dull trimming punch edge', 'Incorrect die cutting clearance'],
  imageUrl: '/assets/aistudio/Burrs_3d385000.jpg',
  annotatedImageUrl: '/assets/aistudio/Burrs_3d385000.jpg',
  boundingBox: {
    x: 41,
    y: 44,
    width: 22,
    height: 18,
    label: 'Burr // DEF-01 (24.5%)'
  },
  inspectorName: 'Quality Assurance Lead',
  detectionEngine: 'Calibrated High-Speed Vision Benchmark',
  isLiveAi: false
};

const SAMPLE_OK_RECORD: InspectionRecord = {
  id: 'HICOM-INS-20261115-1002',
  timestamp: '2026-11-15T08:35:00Z',
  partId: 1,
  partName: 'Front Floor Reinforcement Patch (PATCH FRONT FLOOR)',
  partSize: {
    lengthMm: null,
    widthMm: null,
    heightMm: null,
    formatted: 'Not Available'
  },
  devType: 'Medium Line (ML)',
  diesType: 'Cast Iron',
  pressLine: '160T Press Line 1',
  status: 'OK',
  defectCategory: null,
  defectCategoryId: null,
  defectLocation: 'All surface coordinates nominal',
  defectDescription: 'No geometric surface defects or micro-fractures detected.',
  severityPercentage: 0,
  confidencePercentage: 99.4,
  verdict: 'PASS',
  imageUrl: '/assets/aistudio/Nominal__Pass__f90b06df.jpg',
  annotatedImageUrl: '/assets/aistudio/Nominal__Pass__f90b06df.jpg',
  inspectorName: 'Quality Assurance Lead',
  detectionEngine: 'Calibrated High-Speed Vision Benchmark',
  isLiveAi: false
};

test('ensureJpegFilename normalizes all image and extensionless filenames to .jpg', () => {
  assert.equal(ensureJpegFilename('HICOM-INS-1001_ORIGINAL.svg'), 'HICOM-INS-1001_ORIGINAL.jpg');
  assert.equal(ensureJpegFilename('HICOM-INS-1001_ANNOTATED.svg'), 'HICOM-INS-1001_ANNOTATED.jpg');
  assert.equal(ensureJpegFilename('RAW_photo_upload.png'), 'RAW_photo_upload.jpg');
  assert.equal(ensureJpegFilename('RAW_part.v2.webp'), 'RAW_part.v2.jpg');
  assert.equal(ensureJpegFilename('RAW_Nominal__Pass__f90b06df.jpeg'), 'RAW_Nominal__Pass__f90b06df.jpg');
  assert.equal(ensureJpegFilename('RAW_CUSTOM.JPG'), 'RAW_CUSTOM.jpg');
  assert.equal(ensureJpegFilename('captured_frame'), 'captured_frame.jpg');
  assert.equal(ensureJpegFilename('   '), 'inspection_image.jpg');
});

test('extractSvgDimensions parses viewBox and fallback dimensions cleanly', () => {
  assert.deepEqual(
    extractSvgDimensions('<svg viewBox="0 0 800 495" width="800" height="495"></svg>'),
    { width: 800, height: 495 }
  );
  assert.deepEqual(
    extractSvgDimensions('<svg width="1024px" height="768px"></svg>'),
    { width: 1024, height: 768 }
  );
  assert.deepEqual(extractSvgDimensions('<svg></svg>'), { width: 800, height: 600 });
});

test('generateAnnotatedSvg escapes ampersands inside label text for valid SVG XML parsing', () => {
  const annotatedUrl = generateAnnotatedSvg(
    '/assets/aistudio/Scratches_and_Galling_b39dddf9.jpg',
    { x: 28, y: 34, width: 48, height: 46, label: 'Scratches & Galling // DEF-09 (32.0%)' },
    'REWORK',
    { width: 1280, height: 720 }
  );
  const svgMarkup = decodeURIComponent(annotatedUrl.replace(/^data:image\/svg\+xml;utf8,/, ''));
  assert.ok(svgMarkup.includes('SCRATCHES &amp; GALLING // DEF-09 (32.0%)'));
  assert.ok(!svgMarkup.includes('SCRATCHES & GALLING'));
  assert.deepEqual(extractSvgDimensions(svgMarkup), { width: 800, height: 450 });
});

test('buildInspectionPdfSections and generateInspectionReportPdfBytes produce valid PDF documents', () => {
  const ngSections = buildInspectionPdfSections(SAMPLE_NG_RECORD);
  assert.equal(ngSections.reportId, 'HICOM-INS-20261115-4821');
  assert.equal(ngSections.verdict, 'REWORK');
  assert.equal(ngSections.manufacturingCauses.length, 2);
  assert.ok(ngSections.boundingBoxText?.includes('Burr // DEF-01 (24.5%)'));

  const ngBytes = new Uint8Array(generateInspectionReportPdfBytes(SAMPLE_NG_RECORD));
  const ngHeader = String.fromCharCode(...ngBytes.slice(0, 5));
  assert.equal(ngHeader, '%PDF-', 'Generated QA report must start with %PDF- signature');
  assert.ok(ngBytes.byteLength > 1500, 'Generated NG PDF should contain substantive content');

  const ngPdfAscii = Buffer.from(ngBytes).toString('latin1');
  assert.ok(ngPdfAscii.includes('HICOM ENGINEERING SDN BHD'));
  assert.ok(ngPdfAscii.includes('HICOM-INS-20261115-4821'));
  assert.ok(ngPdfAscii.includes('Wheelhouse Inner Brace Right Hand'));
  assert.ok(ngPdfAscii.includes('REWORK'));
  assert.ok(ngPdfAscii.includes('Quality Assurance Lead'));

  const okBytes = new Uint8Array(generateInspectionReportPdfBytes(SAMPLE_OK_RECORD));
  const okHeader = String.fromCharCode(...okBytes.slice(0, 5));
  assert.equal(okHeader, '%PDF-', 'PASS QA report must start with %PDF- signature');
  const okPdfAscii = Buffer.from(okBytes).toString('latin1');
  assert.ok(okPdfAscii.includes('HICOM-INS-20261115-1002'));
  assert.ok(okPdfAscii.includes('PASS'));
});
