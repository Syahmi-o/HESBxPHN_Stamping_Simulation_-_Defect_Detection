/**
 * Inspection History Persistence and Seed Database for HICOM Engineering Sdn Bhd
 */

import { InspectionRecord } from './defectCategories';
import { PRESET_INSPECTION_SAMPLES, generateAnnotatedSvg } from '../utils/imageGenerators';
import { STAMPING_PARTS } from './partsData';

const STORAGE_KEY = 'hicom_stamping_inspection_history_v2';

export function getInitialSeedHistory(): InspectionRecord[] {
  const records: InspectionRecord[] = [];

  const baseDates = [
    "2026-11-06T05:45:10Z",
    "2026-11-06T04:22:30Z",
    "2026-11-05T16:30:15Z",
    "2026-11-05T14:15:00Z",
    "2026-11-05T11:05:40Z",
    "2026-11-05T09:40:22Z",
    "2026-11-04T17:10:05Z",
    "2026-11-04T13:25:33Z",
    "2026-11-04T10:12:18Z",
    "2026-11-03T15:50:45Z",
    "2026-11-03T11:34:00Z",
    "2026-11-02T16:20:10Z"
  ];

  // Build seed records using preset samples and parts catalog
  PRESET_INSPECTION_SAMPLES.forEach((sample, idx) => {
    const part = STAMPING_PARTS.find(p => p.id === sample.partId) || STAMPING_PARTS[0];
    const status = sample.hasDefect ? 'NG' : 'OK';
    const verdict = !sample.hasDefect
      ? 'PASS'
      : (sample.severity && sample.severity > (sample.defectId === 'crack' ? 20 : sample.defectId === 'splitting_tearing' ? 0 : 45))
        ? 'FAIL'
        : 'REWORK';

    const annotatedUrl = sample.hasDefect && sample.box
      ? generateAnnotatedSvg(sample.svgDataUrl, sample.box, verdict)
      : sample.svgDataUrl;

    records.push({
      id: `HICOM-INS-202611-${String(1001 + idx).padStart(4, '0')}`,
      timestamp: baseDates[idx % baseDates.length],
      partId: part.id,
      partName: part.name,
      partSize: {
        lengthMm: part.lengthMm,
        widthMm: part.widthMm,
        heightMm: part.heightMm,
        formatted: part.lengthMm ? `${part.lengthMm} × ${part.widthMm} × ${part.heightMm} mm` : 'Not Available'
      },
      devType: part.devType,
      diesType: part.diesType,
      pressLine: part.pressLineSummary,
      status,
      defectCategory: sample.defectName || null,
      defectCategoryId: sample.defectId || null,
      defectLocation: sample.locationText,
      defectDescription: sample.description,
      severityPercentage: sample.severity ?? null,
      confidencePercentage: sample.confidence,
      verdict,
      imageUrl: sample.svgDataUrl,
      annotatedImageUrl: annotatedUrl,
      boundingBox: sample.box,
      reworkActionNotes: verdict === 'REWORK' ? 'Scheduled for offline edge deburring and manual bench planishing.' : undefined,
      inspectorName: "Quality Assurance Lead",
      detectionEngine: "Gemini Vision 2.5 Industrial Model",
      isLiveAi: false
    });
  });

  return records;
}

export function loadInspectionHistory(): InspectionRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((record) => ({
          ...record,
          inspectorName: 'Quality Assurance Lead'
        }));
      }
    }
  } catch (err) {
    console.warn("Failed to read local inspection history, seeding defaults", err);
  }

  const initial = getInitialSeedHistory();
  saveInspectionHistory(initial);
  return initial;
}

export function saveInspectionHistory(records: InspectionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("Failed to persist inspection history to localStorage", err);
  }
}

export function addInspectionRecord(record: InspectionRecord): InspectionRecord[] {
  const current = loadInspectionHistory();
  const updated = [record, ...current];
  saveInspectionHistory(updated);
  return updated;
}

export function clearInspectionHistory(): InspectionRecord[] {
  const initial = getInitialSeedHistory();
  saveInspectionHistory(initial);
  return initial;
}
