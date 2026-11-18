/**
 * Export Utility for HICOM Engineering Inspection History & QA Reports
 * Supports Microsoft Excel (.xlsx), CSV (.csv), and PDF (.pdf) QA Inspection Reports
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { InspectionRecord } from '../data/defectCategories';

export function exportToCsv(records: InspectionRecord[], filename: string = 'HICOM_Inspection_History'): void {
  const headers = [
    'Record ID',
    'Timestamp',
    'Part ID',
    'Part Name',
    'Length (mm)',
    'Width (mm)',
    'Height (mm)',
    'Development Type',
    'Die Type',
    'Press Line',
    'Status',
    'Defect Category',
    'Defect Location',
    'Defect Description',
    'Severity (%)',
    'Confidence (%)',
    'Verdict',
    'Inspector',
    'Detection Engine'
  ];

  const rows = records.map(r => [
    `"${r.id}"`,
    `"${new Date(r.timestamp).toLocaleString()}"`,
    r.partId,
    `"${(r.partName || '').replace(/"/g, '""')}"`,
    r.partSize.lengthMm ?? 'N/A',
    r.partSize.widthMm ?? 'N/A',
    r.partSize.heightMm ?? 'N/A',
    `"${r.devType}"`,
    `"${r.diesType}"`,
    `"${r.pressLine}"`,
    `"${r.status}"`,
    `"${(r.defectCategory || 'None').replace(/"/g, '""')}"`,
    `"${(r.defectLocation || 'N/A').replace(/"/g, '""')}"`,
    `"${(r.defectDescription || '').replace(/"/g, '""')}"`,
    r.severityPercentage !== null ? r.severityPercentage.toFixed(1) : 'N/A',
    r.confidencePercentage.toFixed(1),
    `"${r.verdict}"`,
    `"Quality Assurance Lead"`,
    `"${r.detectionEngine}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToExcel(records: InspectionRecord[], filename: string = 'HICOM_Inspection_History'): void {
  const formattedData = records.map(r => ({
    'Record ID': r.id,
    'Timestamp': new Date(r.timestamp).toLocaleString(),
    'Part ID': r.partId,
    'Part Name': r.partName,
    'Length (mm)': r.partSize.lengthMm ?? 'Not Available',
    'Width (mm)': r.partSize.widthMm ?? 'Not Available',
    'Height (mm)': r.partSize.heightMm ?? 'Not Available',
    'Development Line': r.devType,
    'Tooling Die Type': r.diesType,
    'Press Line': r.pressLine,
    'Inspection Status': r.status,
    'Defect Category': r.defectCategory || 'None (Pass)',
    'Defect Location': r.defectLocation || 'N/A',
    'Defect Description': r.defectDescription || 'Conforms to specifications',
    'Severity (%)': r.severityPercentage !== null ? Number(r.severityPercentage.toFixed(1)) : 0,
    'Confidence (%)': Number(r.confidencePercentage.toFixed(1)),
    'Quality Verdict': r.verdict,
    'Inspector': 'Quality Assurance Lead',
    'Detection Engine': r.detectionEngine
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 22 }, // Record ID
    { wch: 22 }, // Timestamp
    { wch: 8 },  // Part ID
    { wch: 45 }, // Part Name
    { wch: 14 }, // Length
    { wch: 14 }, // Width
    { wch: 14 }, // Height
    { wch: 18 }, // Dev Line
    { wch: 18 }, // Die Type
    { wch: 16 }, // Press Line
    { wch: 16 }, // Status
    { wch: 26 }, // Defect Category
    { wch: 30 }, // Defect Location
    { wch: 45 }, // Description
    { wch: 14 }, // Severity
    { wch: 16 }, // Confidence
    { wch: 16 }, // Verdict
    { wch: 22 }, // Inspector
    { wch: 30 }  // Engine
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspection Records');

  // Summary statistics sheet
  const total = records.length;
  const passed = records.filter(r => r.verdict === 'PASS').length;
  const rework = records.filter(r => r.verdict === 'REWORK').length;
  const failed = records.filter(r => r.verdict === 'FAIL').length;

  const summaryData = [
    { Metric: 'Company', Value: 'HICOM Engineering Sdn Bhd' },
    { Metric: 'Division', Value: 'Stamping Quality Assurance' },
    { Metric: 'Report Generated', Value: new Date().toLocaleString() },
    { Metric: 'Total Inspected Parts', Value: total },
    { Metric: 'Total Passed (PASS)', Value: `${passed} (${total ? ((passed/total)*100).toFixed(1) : 0}%)` },
    { Metric: 'Total Rework (REWORK)', Value: `${rework} (${total ? ((rework/total)*100).toFixed(1) : 0}%)` },
    { Metric: 'Total Failed (FAIL)', Value: `${failed} (${total ? ((failed/total)*100).toFixed(1) : 0}%)` },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'QA Summary');

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Generates a formal textual QA Quality Inspection Certificate & Engineering Report
 */
export function generateInspectionReportText(record: InspectionRecord): string {
  const lineDivider = "================================================================================";
  const subDivider = "--------------------------------------------------------------------------------";

  return `${lineDivider}
HICOM ENGINEERING SDN BHD - QUALITY ASSURANCE & DEFECT INSPECTION REPORT
Automotive Stamping Division // Process Quality Engineering System
${lineDivider}

REPORT IDENTIFIER:    ${record.id}
INSPECTION TIMESTAMP: ${new Date(record.timestamp).toUTCString()}
INSPECTION OFFICER:   Quality Assurance Lead
DETECTION ENGINE:     ${record.detectionEngine}

${subDivider}
1. AUTOMOTIVE PART IDENTIFICATION & SPECIFICATIONS
${subDivider}
Part Catalog Number:  #${record.partId}
Complete Part Name:   ${record.partName}
Part Dimensions:      ${record.partSize.formatted}
  - Length (L):       ${record.partSize.lengthMm !== null ? `${record.partSize.lengthMm} mm` : 'Not Available'}
  - Width (W):        ${record.partSize.widthMm !== null ? `${record.partSize.widthMm} mm` : 'Not Available'}
  - Height (H):       ${record.partSize.heightMm !== null ? `${record.partSize.heightMm} mm` : 'Not Available'}
Development Line:     ${record.devType}
Tooling Die Type:     ${record.diesType}
Press Line Summary:   ${record.pressLine}

${subDivider}
2. AUTOMATED OPTICAL & SURFACE DEFECT ANALYSIS
${subDivider}
Inspection Status:    ${record.status === 'OK' ? 'OK [CONFORMING / WITHIN SPEC]' : 'NG [DEFECTIVE / NON-CONFORMING]'}
Quality Verdict:      ${record.verdict}
Defect Classification:${record.defectCategory || 'None Detected (Nominal Conformance)'}
Defect ID Code:       ${record.defectCategoryId ? record.defectCategoryId.toUpperCase() : 'N/A'}
Defect Severity:      ${record.severityPercentage !== null ? `${record.severityPercentage.toFixed(1)}%` : '0.0%'}
Inspection Confidence:${record.confidencePercentage.toFixed(1)}%

Defect Location:
  ${record.defectLocation || 'All surface inspection coordinates nominal.'}

Detailed Engineering Description:
  ${record.defectDescription || 'Part surface topography and cut boundaries conform to standard tolerances.'}

${record.reworkActionNotes ? `Authorized Rework Disposition:
  ${record.reworkActionNotes}
` : ''}
${record.boundingBox ? `Optical Bounding Coordinates:
  X: ${record.boundingBox.x}% | Y: ${record.boundingBox.y}% | Width: ${record.boundingBox.width}% | Height: ${record.boundingBox.height}%
  Annotation: [${record.boundingBox.label}]
` : ''}

${subDivider}
3. FINAL QUALITY DISPOSITION & SIGN-OFF
${subDivider}
Verdict Determination: ${record.verdict === 'PASS' ? 'APPROVED FOR NEXT MANUFACTURING STAGE / FINAL ASSEMBLY' : record.verdict === 'REWORK' ? 'ROUTED TO OFFLINE REWORK BENCH FOR REMEDIAL DRESSING' : 'REJECTED - SCRAP DISPOSITION (CRITICAL NON-CONFORMANCE)'}

Signed: ____________________________________
        Quality Assurance Lead
        HICOM Engineering Sdn Bhd QA Division
${lineDivider}
`;
}

function sanitizePdfText(value: string): string {
  return value
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022/g, '*')
    .replace(/\u0394/g, 'Delta ')
    .replace(/[^\x20-\xFF]/g, ' ');
}

export interface InspectionPdfSections {
  reportId: string;
  timestampUtc: string;
  inspector: string;
  detectionEngine: string;
  verdict: 'PASS' | 'REWORK' | 'FAIL';
  statusText: string;
  confidenceText: string;
  severityText: string;
  partSpecs: Array<{ label: string; value: string }>;
  defectSpecs: Array<{ label: string; value: string }>;
  locationText: string;
  descriptionText: string;
  manufacturingCauses: string[];
  reworkNotes?: string;
  boundingBoxText?: string;
  dispositionText: string;
}

export function buildInspectionPdfSections(record: InspectionRecord): InspectionPdfSections {
  const dispositionText =
    record.verdict === 'PASS'
      ? 'APPROVED FOR NEXT MANUFACTURING STAGE / FINAL ASSEMBLY'
      : record.verdict === 'REWORK'
      ? 'ROUTED TO OFFLINE REWORK BENCH FOR REMEDIAL DRESSING'
      : 'REJECTED - SCRAP DISPOSITION (CRITICAL NON-CONFORMANCE)';

  return {
    reportId: sanitizePdfText(record.id),
    timestampUtc: sanitizePdfText(new Date(record.timestamp).toUTCString()),
    inspector: 'Quality Assurance Lead',
    detectionEngine: sanitizePdfText(record.detectionEngine),
    verdict: record.verdict,
    statusText:
      record.status === 'OK'
        ? 'OK [CONFORMING / WITHIN SPEC]'
        : 'NG [DEFECTIVE / NON-CONFORMING]',
    confidenceText: `${record.confidencePercentage.toFixed(1)}%`,
    severityText:
      record.severityPercentage !== null ? `${record.severityPercentage.toFixed(1)}%` : '0.0%',
    partSpecs: [
      { label: 'Part Catalog Number', value: `#${record.partId}` },
      { label: 'Complete Part Name', value: sanitizePdfText(record.partName) },
      { label: 'Part Dimensions (L x W x H)', value: sanitizePdfText(record.partSize.formatted) },
      {
        label: 'Length / Width / Height',
        value: `L: ${record.partSize.lengthMm !== null ? `${record.partSize.lengthMm} mm` : 'N/A'}  |  W: ${
          record.partSize.widthMm !== null ? `${record.partSize.widthMm} mm` : 'N/A'
        }  |  H: ${record.partSize.heightMm !== null ? `${record.partSize.heightMm} mm` : 'N/A'}`
      },
      { label: 'Development Line', value: sanitizePdfText(record.devType) },
      { label: 'Tooling Die Type', value: sanitizePdfText(record.diesType) },
      { label: 'Press Line Summary', value: sanitizePdfText(record.pressLine) }
    ],
    defectSpecs: [
      {
        label: 'Inspection Status',
        value:
          record.status === 'OK'
            ? 'OK [CONFORMING / WITHIN SPEC]'
            : 'NG [DEFECTIVE / NON-CONFORMING]'
      },
      { label: 'Quality Verdict', value: record.verdict },
      {
        label: 'Defect Classification',
        value: sanitizePdfText(record.defectCategory || 'None Detected (Nominal Conformance)')
      },
      {
        label: 'Defect ID Code',
        value: record.defectCategoryId ? record.defectCategoryId.toUpperCase() : 'N/A'
      },
      {
        label: 'Defect Severity',
        value:
          record.severityPercentage !== null ? `${record.severityPercentage.toFixed(1)}%` : '0.0%'
      },
      { label: 'Inspection Confidence', value: `${record.confidencePercentage.toFixed(1)}%` }
    ],
    locationText: sanitizePdfText(
      record.defectLocation || 'All surface inspection coordinates nominal.'
    ),
    descriptionText: sanitizePdfText(
      record.defectDescription ||
        'Part surface topography and cut boundaries conform to standard tolerances.'
    ),
    manufacturingCauses: (record.manufacturingCauses || []).map(sanitizePdfText),
    reworkNotes: record.reworkActionNotes ? sanitizePdfText(record.reworkActionNotes) : undefined,
    boundingBoxText: record.boundingBox
      ? sanitizePdfText(
          `X: ${record.boundingBox.x}% | Y: ${record.boundingBox.y}% | Width: ${record.boundingBox.width}% | Height: ${record.boundingBox.height}% | Annotation: [${record.boundingBox.label}]`
        )
      : undefined,
    dispositionText
  };
}

/**
 * Generates a formatted A4 PDF QA Quality Inspection Certificate & Engineering Report
 */
export function createInspectionReportPdf(record: InspectionRecord): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const data = buildInspectionPdfSections(record);

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 18;
  let y = 0;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage();
      y = 18;
    }
  };

  // Top Engineering Header Banner
  doc.setFillColor(11, 35, 64); // #0B2340
  doc.rect(0, 0, pageWidth, 27, 'F');
  doc.setFillColor(7, 84, 166); // #0754A6 accent stripe
  doc.rect(0, 27, pageWidth, 1.8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('HICOM ENGINEERING SDN BHD', marginX, 11);

  doc.setFontSize(10);
  doc.text('QUALITY ASSURANCE & DEFECT INSPECTION REPORT', marginX, 17.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Automotive Stamping Division // Process Quality Engineering System', marginX, 23);

  y = 35;

  // Report Metadata Box + Verdict Badge
  const metaBoxW = 122;
  const verdictBoxX = marginX + metaBoxW + 4;
  const verdictBoxW = contentWidth - metaBoxW - 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, y, metaBoxW, 24, 1.5, 1.5, 'FD');

  const metaRows: Array<[string, string]> = [
    ['REPORT IDENTIFIER:', data.reportId],
    ['INSPECTION TIMESTAMP:', data.timestampUtc],
    ['INSPECTION OFFICER:', data.inspector],
    ['DETECTION ENGINE:', data.detectionEngine]
  ];

  let metaY = y + 5.5;
  for (const [k, v] of metaRows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(k, marginX + 3, metaY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(11, 35, 64);
    const valClipped = doc.splitTextToSize(v, metaBoxW - 42)[0] || v;
    doc.text(valClipped, marginX + 39, metaY);
    metaY += 4.8;
  }

  const verdictStyle =
    data.verdict === 'PASS'
      ? { bg: [236, 253, 245] as const, border: [16, 185, 129] as const, text: [5, 150, 105] as const }
      : data.verdict === 'REWORK'
      ? { bg: [255, 251, 235] as const, border: [245, 158, 11] as const, text: [180, 83, 9] as const }
      : { bg: [254, 242, 242] as const, border: [239, 68, 68] as const, text: [185, 28, 28] as const };

  doc.setFillColor(verdictStyle.bg[0], verdictStyle.bg[1], verdictStyle.bg[2]);
  doc.setDrawColor(verdictStyle.border[0], verdictStyle.border[1], verdictStyle.border[2]);
  doc.roundedRect(verdictBoxX, y, verdictBoxW, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('QUALITY VERDICT', verdictBoxX + verdictBoxW / 2, y + 6, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(verdictStyle.text[0], verdictStyle.text[1], verdictStyle.text[2]);
  doc.text(data.verdict, verdictBoxX + verdictBoxW / 2, y + 13.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Confidence: ${data.confidenceText}`, verdictBoxX + verdictBoxW / 2, y + 19.8, {
    align: 'center'
  });

  y += 30;

  const drawSectionHeader = (title: string) => {
    ensureSpace(12);
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, y, contentWidth, 7.5, 'F');
    doc.setFillColor(7, 84, 166);
    doc.rect(marginX, y, 2, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(11, 35, 64);
    doc.text(title, marginX + 4.5, y + 5.1);
    y += 9.5;
  };

  const drawKeyValueTable = (rows: Array<{ label: string; value: string }>) => {
    const labelColW = 54;
    const valueColW = contentWidth - labelColW;

    rows.forEach((row, idx) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const wrappedVal = doc.splitTextToSize(row.value, valueColW - 6);
      const rowH = Math.max(6.8, wrappedVal.length * 4.2 + 2.6);

      ensureSpace(rowH + 1);

      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252);
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(marginX, y, contentWidth, rowH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(row.label, marginX + 3, y + 4.6);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(wrappedVal, marginX + labelColW + 2, y + 4.6);

      y += rowH;
    });
    y += 4;
  };

  const drawDetailBlock = (
    heading: string,
    lines: string[],
    accent?: { fill: readonly [number, number, number]; border: readonly [number, number, number]; text: readonly [number, number, number] }
  ) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const wrappedLines: string[] = [];
    for (const line of lines) {
      const split = doc.splitTextToSize(line, contentWidth - 8);
      wrappedLines.push(...split);
    }
    const blockH = Math.max(11, 7 + wrappedLines.length * 4.2 + 2);
    ensureSpace(blockH + 2);

    const fillColor = accent ? accent.fill : ([248, 250, 252] as const);
    const borderColor = accent ? accent.border : ([203, 213, 225] as const);
    const headingColor = accent ? accent.text : ([11, 35, 64] as const);

    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(marginX, y, contentWidth, blockH, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
    doc.text(heading, marginX + 3.5, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(39, 52, 68);
    doc.text(wrappedLines, marginX + 3.5, y + 9.8);

    y += blockH + 3;
  };

  // Section 1
  drawSectionHeader('1. AUTOMOTIVE PART IDENTIFICATION & SPECIFICATIONS');
  drawKeyValueTable(data.partSpecs);

  // Section 2
  drawSectionHeader('2. AUTOMATED OPTICAL & SURFACE DEFECT ANALYSIS');
  drawKeyValueTable(data.defectSpecs);

  drawDetailBlock('Defect Location:', [data.locationText]);
  drawDetailBlock('Detailed Engineering Description:', [data.descriptionText]);

  if (data.manufacturingCauses.length > 0) {
    drawDetailBlock(
      'Primary Manufacturing Causes:',
      data.manufacturingCauses.map((cause) => `- ${cause}`)
    );
  }

  if (data.reworkNotes) {
    drawDetailBlock('Authorized Rework Disposition:', [data.reworkNotes], {
      fill: [255, 251, 235],
      border: [245, 158, 11],
      text: [180, 83, 9]
    });
  }

  if (data.boundingBoxText) {
    drawDetailBlock('Optical Bounding Coordinates:', [data.boundingBoxText]);
  }

  // Section 3
  drawSectionHeader('3. FINAL QUALITY DISPOSITION & SIGN-OFF');
  drawDetailBlock('Verdict Determination:', [data.dispositionText], {
    fill: verdictStyle.bg,
    border: verdictStyle.border,
    text: verdictStyle.text
  });

  ensureSpace(22);
  y += 2;
  doc.setDrawColor(148, 163, 184);
  doc.line(marginX, y + 9, marginX + 75, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(11, 35, 64);
  doc.text('Authorized QA Sign-Off:', marginX, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Quality Assurance Lead', marginX, y + 13.5);
  doc.text('HICOM Engineering Sdn Bhd QA Division', marginX, y + 17.8);

  // Document Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `HICOM Engineering Sdn Bhd | QA Inspection Report ${data.reportId}`,
      marginX,
      pageHeight - 8.5
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 8.5, {
      align: 'right'
    });
  }

  return doc;
}

export function generateInspectionReportPdfBytes(record: InspectionRecord): ArrayBuffer {
  const doc = createInspectionReportPdf(record);
  return doc.output('arraybuffer');
}

export function downloadInspectionReport(record: InspectionRecord): void {
  const pdfBytes = generateInspectionReportPdfBytes(record);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${record.id}_QA_REPORT.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

