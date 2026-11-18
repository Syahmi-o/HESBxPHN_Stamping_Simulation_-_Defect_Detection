/**
 * Utility to generate high-fidelity industrial automotive stamping part SVG data URLs
 * for testing and demonstration, and to composite bounding box annotations on uploaded images.
 */

import { DEFECT_IMAGE_PATHS, DEFECT_IMAGE_DATA_URLS, NOMINAL_PASS_IMAGE_PATH } from '../data/defectImages';

export interface PartImagePreset {
  id: string;
  partId: number;
  partName: string;
  hasDefect: boolean;
  defectId?: string;
  defectName?: string;
  severity?: number;
  confidence: number;
  box?: { x: number; y: number; width: number; height: number; label: string };
  locationText: string;
  description: string;
  svgDataUrl: string;
}

export function generateStampingPartSvg(
  partName: string,
  defectType?: string,
  severity: number = 30
): string {
  const isOk = !defectType || defectType === 'none';
  
  // Create an SVG representation of an automotive stamped sheet metal panel
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <!-- Industrial metal linear gradient -->
    <linearGradient id="sheetMetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E2E8F0" />
      <stop offset="25%" stop-color="#CBD5E1" />
      <stop offset="50%" stop-color="#94A3B8" />
      <stop offset="75%" stop-color="#CBD5E1" />
      <stop offset="100%" stop-color="#64748B" />
    </linearGradient>

    <!-- Brushed metal texture filter -->
    <filter id="brushedMetal" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04 0.95" numOctaves="3" result="noise" />
      <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0.15 0" in="noise" result="coloredNoise"/>
      <feComposite operator="in" in2="SourceGraphic"/>
      <feBlend mode="multiply" in="SourceGraphic" result="blend"/>
    </filter>

    <!-- Drop shadow for stamped relief -->
    <filter id="stampedRelief" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="3" dy="4" stdDeviation="3" flood-color="#0F172A" flood-opacity="0.35"/>
    </filter>

    <radialGradient id="highlightGlow" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6"/>
      <stop offset="70%" stop-color="#CBD5E1" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.3"/>
    </radialGradient>
  </defs>

  <!-- Inspection station workbench background -->
  <rect width="800" height="600" fill="#1E293B"/>
  
  <!-- Optical calibration grid on workstation -->
  <g stroke="#334155" stroke-width="1" opacity="0.6">
    <line x1="50" y1="0" x2="50" y2="600" stroke-dasharray="4 4" />
    <line x1="150" y1="0" x2="150" y2="600" stroke-dasharray="4 4" />
    <line x1="250" y1="0" x2="250" y2="600" stroke-dasharray="4 4" />
    <line x1="350" y1="0" x2="350" y2="600" stroke-dasharray="4 4" />
    <line x1="450" y1="0" x2="450" y2="600" stroke-dasharray="4 4" />
    <line x1="550" y1="0" x2="550" y2="600" stroke-dasharray="4 4" />
    <line x1="650" y1="0" x2="650" y2="600" stroke-dasharray="4 4" />
    <line x1="750" y1="0" x2="750" y2="600" stroke-dasharray="4 4" />
    
    <line x1="0" y1="50" x2="800" y2="50" stroke-dasharray="4 4" />
    <line x1="0" y1="150" x2="800" y2="150" stroke-dasharray="4 4" />
    <line x1="0" y1="250" x2="800" y2="250" stroke-dasharray="4 4" />
    <line x1="0" y1="350" x2="800" y2="350" stroke-dasharray="4 4" />
    <line x1="0" y1="450" x2="800" y2="450" stroke-dasharray="4 4" />
    <line x1="0" y1="550" x2="800" y2="550" stroke-dasharray="4 4" />
  </g>

  <!-- Inspection station scale rulers & optical target marks -->
  <g fill="#94A3B8" font-family="'JetBrains Mono', monospace" font-size="11">
    <text x="20" y="30">HICOM VISION STATION #04 // CAM-A</text>
    <text x="620" y="30">SCALE: 1 px = 0.5 mm</text>
    <circle cx="40" cy="560" r="12" fill="none" stroke="#0284C7" stroke-width="2"/>
    <line x1="40" y1="540" x2="40" y2="580" stroke="#0284C7" stroke-width="1.5"/>
    <line x1="20" y1="560" x2="60" y2="560" stroke="#0284C7" stroke-width="1.5"/>
  </g>

  <!-- Stamped Automotive Component Base Silhouette -->
  <g id="stamped_part" filter="url(#stampedRelief)">
    <!-- Main Stamped Sheet Profile -->
    <path d="M 120 160 L 680 140 L 720 440 L 650 490 L 170 480 L 100 420 Z" 
          fill="url(#sheetMetalGrad)" 
          stroke="#475569" 
          stroke-width="2" />
    
    <!-- Surface highlight glow overlay -->
    <path d="M 120 160 L 680 140 L 720 440 L 650 490 L 170 480 L 100 420 Z" 
          fill="url(#highlightGlow)" />

    <!-- Stamped Deep Draw Recess / Reinforcing Ribs -->
    <path d="M 180 210 L 620 190 L 650 400 L 220 420 Z" 
          fill="#64748B" 
          stroke="#334155" 
          stroke-width="3" 
          opacity="0.85" />
    
    <path d="M 210 240 L 590 220 L 620 370 L 250 390 Z" 
          fill="#475569" 
          stroke="#1E293B" 
          stroke-width="2" />

    <!-- Longitudinal stiffening ribs -->
    <path d="M 260 270 L 540 255 L 540 280 L 260 295 Z" fill="#334155" />
    <path d="M 260 320 L 540 305 L 540 330 L 260 345 Z" fill="#334155" />

    <!-- Punched Mounting Holes -->
    <circle cx="150" cy="200" r="14" fill="#1E293B" stroke="#CBD5E1" stroke-width="2"/>
    <circle cx="150" cy="380" r="14" fill="#1E293B" stroke="#CBD5E1" stroke-width="2"/>
    <circle cx="660" cy="180" r="14" fill="#1E293B" stroke="#CBD5E1" stroke-width="2"/>
    <circle cx="680" cy="420" r="14" fill="#1E293B" stroke="#CBD5E1" stroke-width="2"/>
    
    <!-- Center locator datum slot -->
    <rect x="380" y="290" width="40" height="18" rx="8" fill="#1E293B" stroke="#94A3B8" stroke-width="2" />

    <!-- Flange Bend Lines (Dashed) -->
    <line x1="140" y1="180" x2="660" y2="160" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="6 3"/>
    <line x1="130" y1="440" x2="680" y2="455" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="6 3"/>

    <!-- Part Information Stamp in Metal -->
    <text x="280" y="235" fill="#CBD5E1" opacity="0.6" font-family="'JetBrains Mono', monospace" font-size="12" letter-spacing="1">
      HICOM // ${partName.slice(0, 24)}
    </text>
  </g>

  <!-- DEFECT VISUALIZATION LAYER -->
  ${defectType === 'burr' ? `
    <!-- Burr on bottom right trim edge -->
    <path d="M 520 468 L 540 464 L 560 472 L 580 463 L 600 471 L 620 464 L 640 472" 
          stroke="#E11D48" stroke-width="4" stroke-linecap="round" fill="none" />
    <path d="M 520 468 L 540 464 L 560 472 L 580 463 L 600 471 L 620 464 L 640 472" 
          stroke="#FDA4AF" stroke-width="1.5" stroke-dasharray="2 2" fill="none" />
  ` : ''}

  ${defectType === 'missed_cut' ? `
    <!-- Missed Cut / Incomplete Cut: Hanging unsevered slug on outer flange -->
    <path d="M 580 475 L 630 475 L 620 520 L 590 515 Z" fill="#64748B" stroke="#E11D48" stroke-width="2.5" />
    <line x1="580" y1="475" x2="630" y2="475" stroke="#EF4444" stroke-width="3" stroke-dasharray="3 3"/>
  ` : ''}

  ${defectType === 'poor_cut_edge' ? `
    <!-- Poor Cut Edge Quality: Jagged shear face with severe rollover and micro-tears -->
    <path d="M 120 160 L 150 168 L 180 156 L 210 165 L 240 155 L 270 166 L 300 157 L 330 165" 
          stroke="#F59E0B" stroke-width="4" stroke-linecap="square" fill="none" />
    <path d="M 120 160 L 150 168 L 180 156 L 210 165 L 240 155 L 270 166 L 300 157 L 330 165" 
          stroke="#FEF08A" stroke-width="1.5" stroke-dasharray="2 2" fill="none" />
  ` : ''}

  ${defectType === 'crack' ? `
    <!-- Crack on high-stress draw corner -->
    <path d="M 210 240 Q 225 255 220 270 T 235 295" 
          stroke="#000000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M 210 240 Q 225 255 220 270 T 235 295" 
          stroke="#EF4444" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  ` : ''}

  ${defectType === 'splitting_tearing' ? `
    <!-- Severe metal tear with gaping void -->
    <polygon points="610,215 625,245 615,260 635,275 620,290 605,270 595,240" fill="#0F172A" stroke="#EF4444" stroke-width="3"/>
  ` : ''}

  ${defectType === 'wrinkling' ? `
    <!-- Wrinkling ripples across draw flange -->
    <path d="M 130 240 Q 145 250 130 260 T 130 280 T 130 300 T 130 320 T 130 340" 
          stroke="#334155" stroke-width="6" fill="none" opacity="0.8"/>
    <path d="M 130 240 Q 145 250 130 260 T 130 280 T 130 300 T 130 320 T 130 340" 
          stroke="#F59E0B" stroke-width="2" stroke-dasharray="3 3" fill="none"/>
  ` : ''}

  ${defectType === 'material_thinning' ? `
    <!-- Material Thinning: Necked zone across tight pocket radius with gradient translucency -->
    <ellipse cx="230" cy="250" rx="35" ry="25" fill="#EF4444" fill-opacity="0.25" stroke="#DC2626" stroke-width="2" stroke-dasharray="4 2"/>
    <text x="205" y="254" fill="#FEF2F2" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="bold">-34% t</text>
  ` : ''}

  ${defectType === 'springback' ? `
    <!-- Flange springback angular deviation line -->
    <line x1="680" y1="140" x2="740" y2="120" stroke="#E11D48" stroke-width="3" stroke-dasharray="4 2"/>
    <line x1="680" y1="140" x2="720" y2="155" stroke="#38BDF8" stroke-width="2" stroke-dasharray="2 2"/>
    <path d="M 720 155 Q 735 135 740 120" fill="none" stroke="#F43F5E" stroke-width="1.5" />
  ` : ''}

  ${defectType === 'scratches_galling' ? `
    <!-- Galling score lines on sidewall -->
    <line x1="320" y1="200" x2="315" y2="410" stroke="#334155" stroke-width="3"/>
    <line x1="328" y1="202" x2="323" y2="412" stroke="#F97316" stroke-width="2"/>
    <line x1="334" y1="205" x2="330" y2="408" stroke="#F97316" stroke-width="1.5"/>
  ` : ''}

  ${defectType === 'dent_impression' ? `
    <!-- Slug dent impression with halo -->
    <ellipse cx="480" cy="340" rx="22" ry="16" fill="#1E293B" stroke="#F59E0B" stroke-width="3" opacity="0.85"/>
    <ellipse cx="480" cy="340" rx="30" ry="22" fill="none" stroke="#FBBF24" stroke-width="1.5" stroke-dasharray="3 3"/>
  ` : ''}

  ${defectType === 'warping_distortion' ? `
    <!-- Warping / Twisting: Out of plane twisted corner camber lines -->
    <path d="M 680 140 L 760 115 L 750 170" fill="none" stroke="#E11D48" stroke-width="2.5" stroke-dasharray="5 3"/>
    <text x="690" y="105" fill="#EF4444" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="bold">+3.8mm Twist</text>
  ` : ''}

  ${defectType === 'poor_flatness' ? `
    <!-- Poor Flatness: Oil-canning wavy contour rings across center pan -->
    <ellipse cx="410" cy="320" rx="70" ry="35" fill="none" stroke="#F59E0B" stroke-width="2" stroke-dasharray="6 3"/>
    <ellipse cx="410" cy="320" rx="45" ry="20" fill="none" stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="4 2"/>
    <ellipse cx="410" cy="320" rx="20" ry="10" fill="#F59E0B" fill-opacity="0.3" stroke="#D97706" stroke-width="1"/>
  ` : ''}

  ${defectType === 'dimensional_inaccuracy' ? `
    <!-- Dimensional Inaccuracies: Flange width out of tolerance gauge -->
    <line x1="120" y1="130" x2="680" y2="110" stroke="#E11D48" stroke-width="2" stroke-dasharray="4 4"/>
    <line x1="120" y1="160" x2="680" y2="140" stroke="#38BDF8" stroke-width="1.5"/>
    <text x="360" y="100" fill="#EF4444" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="bold">Δ = +4.2mm (OUT OF SPEC)</text>
  ` : ''}

  ${defectType === 'misaligned_hole' ? `
    <!-- Misaligned hole shifted out of datum circle -->
    <circle cx="660" cy="180" r="14" fill="none" stroke="#60A5FA" stroke-width="1.5" stroke-dasharray="3 3"/>
    <circle cx="678" cy="190" r="14" fill="#E11D48" stroke="#FDA4AF" stroke-width="2.5"/>
  ` : ''}

  ${defectType === 'part_shift' ? `
    <!-- Part Shift / Feed Shift: Shifted asymmetric blank outline with narrow margin -->
    <path d="M 140 160 L 700 140 L 740 440 L 670 490 L 190 480 L 120 420 Z" 
          fill="none" stroke="#E11D48" stroke-width="2" stroke-dasharray="5 3"/>
    <line x1="100" y1="420" x2="120" y2="420" stroke="#EF4444" stroke-width="2"/>
    <text x="75" y="445" fill="#EF4444" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="bold">Shift: 6.5mm</text>
  ` : ''}
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateAnnotatedSvg(
  baseSvg: string,
  box: { x: number; y: number; width: number; height: number; label: string },
  verdict: 'PASS' | 'REWORK' | 'FAIL',
  naturalDimensions?: { width: number; height: number } | null
): string {
  const isSvg = baseSvg.startsWith('data:image/svg+xml');
  const canvasW = 800;
  const canvasH = isSvg
    ? 600
    : naturalDimensions && naturalDimensions.width > 0 && naturalDimensions.height > 0
    ? Math.max(1, Math.round((canvasW * naturalDimensions.height) / naturalDimensions.width))
    : 495;

  // Convert percentage coordinates (0-100) to SVG pixel canvas coordinates
  const svgX = (box.x / 100) * canvasW;
  const svgY = (box.y / 100) * canvasH;
  const svgW = (box.width / 100) * canvasW;
  const svgH = (box.height / 100) * canvasH;

  const color = verdict === 'FAIL' ? '#EF4444' : verdict === 'REWORK' ? '#F59E0B' : '#10B981';

  const safeLabel = box.label
    .toUpperCase()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const overlay = `
  <!-- AI INSPECTION ANNOTATION OVERLAY -->
  <g id="ai_annotation_overlay">
    <!-- Semi-transparent defect region highlight -->
    <rect x="${svgX}" y="${svgY}" width="${svgW}" height="${svgH}" 
          fill="${color}" fill-opacity="0.18" 
          stroke="${color}" stroke-width="2.5" rx="4" />
    
    <!-- High-contrast corner brackets -->
    <path d="M ${svgX} ${svgY + 12} L ${svgX} ${svgY} L ${svgX + 12} ${svgY}" fill="none" stroke="${color}" stroke-width="3"/>
    <path d="M ${svgX + svgW - 12} ${svgY} L ${svgX + svgW} ${svgY} L ${svgX + svgW} ${svgY + 12}" fill="none" stroke="${color}" stroke-width="3"/>
    <path d="M ${svgX} ${svgY + svgH - 12} L ${svgX} ${svgY + svgH} L ${svgX + 12} ${svgY + svgH}" fill="none" stroke="${color}" stroke-width="3"/>
    <path d="M ${svgX + svgW - 12} ${svgY + svgH} L ${svgX + svgW} ${svgY + svgH} L ${svgX + svgW} ${svgY + svgH - 12}" fill="none" stroke="${color}" stroke-width="3"/>

    <!-- Target Crosshair Marker -->
    <circle cx="${svgX + svgW/2}" cy="${svgY + svgH/2}" r="6" fill="none" stroke="${color}" stroke-width="2"/>
    <line x1="${svgX + svgW/2 - 10}" y1="${svgY + svgH/2}" x2="${svgX + svgW/2 + 10}" y2="${svgY + svgH/2}" stroke="${color}" stroke-width="1.5"/>
    <line x1="${svgX + svgW/2}" y1="${svgY + svgH/2 - 10}" x2="${svgX + svgW/2}" y2="${svgY + svgH/2 + 10}" stroke="${color}" stroke-width="1.5"/>

    <!-- Annotation Badge -->
    <rect x="${Math.max(10, svgX)}" y="${Math.max(10, svgY - 26)}" width="${Math.max(150, box.label.length * 8.5)}" height="22" rx="3" fill="#0F172A" stroke="${color}" stroke-width="1.5"/>
    <text x="${Math.max(15, svgX + 6)}" y="${Math.max(25, svgY - 11)}" fill="#FFFFFF" font-family="'Inter', sans-serif" font-weight="600" font-size="11">
      ${safeLabel}
    </text>
  </g>
  `;

  // Case 1: Base image is an SVG data URL
  if (isSvg) {
    const decoded = decodeURIComponent(baseSvg.replace(/^data:image\/svg\+xml;utf8,/, ''));
    const annotated = decoded.replace('</svg>', overlay + '</svg>');
    return `data:image/svg+xml;utf8,${encodeURIComponent(annotated)}`;
  }

  // Case 2: Base image is a raster photo path or data URL
  let imageHref = baseSvg;
  for (const [key, path] of Object.entries(DEFECT_IMAGE_PATHS)) {
    if (baseSvg.includes(path) || path.includes(baseSvg)) {
      imageHref = DEFECT_IMAGE_DATA_URLS[key] || baseSvg;
      break;
    }
  }

  const svgCanvas = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}" width="${canvasW}" height="${canvasH}">
  <rect width="${canvasW}" height="${canvasH}" fill="#0F172A" />
  <image href="${imageHref}" x="0" y="0" width="${canvasW}" height="${canvasH}" preserveAspectRatio="none" />
  ${overlay}
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgCanvas)}`;
}

// Preset samples using user-provided authentic photographic defect records
export const PRESET_INSPECTION_SAMPLES: PartImagePreset[] = [
  {
    id: "SAMPLE-00-PASS",
    partId: 1,
    partName: "Front Floor Reinforcement Patch (PATCH FRONT FLOOR)",
    hasDefect: false,
    confidence: 99.4,
    locationText: "All inspection zones verified nominal",
    description: "Surface geometry, sheared trim edges, and pierced holes strictly conform to engineering CAD drawing. No burr or micro-cracks detected.",
    svgDataUrl: NOMINAL_PASS_IMAGE_PATH
  },
  {
    id: "SAMPLE-01-BURR",
    partId: 1,
    partName: "Front Floor Reinforcement Patch (PATCH FRONT FLOOR)",
    hasDefect: true,
    defectId: "burr",
    defectName: "Burrs",
    severity: 28.5,
    confidence: 98.4,
    box: { x: 50, y: 28, width: 44, height: 46, label: "Burrs // DEF-01 (28.5%)" },
    locationText: "Outer trimmed cut edge along lower shear perimeter",
    description: "Raised sharp burr ridge measured along sheared contour exceeding allowable 0.12mm specification. Suitable for mechanical edge deburring.",
    svgDataUrl: DEFECT_IMAGE_PATHS.burrs
  },
  {
    id: "SAMPLE-02-MISSEDCUT",
    partId: 8,
    partName: "Hood Hinge Support Left Hand (SUPT HOOD HINGE LH)",
    hasDefect: true,
    defectId: "missed_cut",
    defectName: "Missed Cuts or Incomplete Cutting",
    severity: 42.0,
    confidence: 97.8,
    box: { x: 38, y: 32, width: 50, height: 46, label: "Missed Cut // DEF-02 (42.0%)" },
    locationText: "Outer mounting flange addendum cutout notch",
    description: "Chipped shearing die block failed to sever scrap trim slug along designed cutout boundary. Requires offline hydraulic nibbling shear.",
    svgDataUrl: DEFECT_IMAGE_PATHS.missed_cuts
  },
  {
    id: "SAMPLE-03-POORCUT",
    partId: 14,
    partName: "Back Upper Side Panel LH (PANEL BACK UPPER SIDE LH)",
    hasDefect: true,
    defectId: "poor_cut_edge",
    defectName: "Poor Cut Edge Quality",
    severity: 36.0,
    confidence: 96.9,
    box: { x: 5, y: 24, width: 85, height: 55, label: "Poor Cut Edge // DEF-03 (36.0%)" },
    locationText: "Primary outer edge trim contour and flange perimeter",
    description: "Excessive shear rollover and jagged granular double-shear finish along cut edge due to uneven die clearance. Reworkable via precision hand stone dressing.",
    svgDataUrl: DEFECT_IMAGE_PATHS.poor_cut_edge
  },
  {
    id: "SAMPLE-04-CRACK",
    partId: 4,
    partName: "Transmission Support Member (SUPT TRANSMISSION)",
    hasDefect: true,
    defectId: "crack",
    defectName: "Cracks",
    severity: 64.2,
    confidence: 99.1,
    box: { x: 32, y: 36, width: 35, height: 50, label: "Crack // DEF-04 (64.2%)" },
    locationText: "Upper draw step radius corner (Zone B2)",
    description: "Deep tensile through-thickness fissure propagating across high-stress transmission cradle radius. Unacceptable safety hazard. Immediate scrap disposition.",
    svgDataUrl: DEFECT_IMAGE_PATHS.cracks
  },
  {
    id: "SAMPLE-05-SPLIT",
    partId: 12,
    partName: "Side Outer Lower Extension Left Hand (EXTN SIDE OTR LWR LH)",
    hasDefect: true,
    defectId: "splitting_tearing",
    defectName: "Splitting or Tearing",
    severity: 85.0,
    confidence: 99.6,
    box: { x: 26, y: 50, width: 28, height: 38, label: "Splitting Tear // DEF-05 (85.0%)" },
    locationText: "Deep drawn embossed cup bottom radius",
    description: "Severe macro-fracture with complete material parting across drawn rocker cup. Tensile limit exceeded due to insufficient lubricant draw oil. Part scrapped.",
    svgDataUrl: DEFECT_IMAGE_PATHS.splitting_tearing
  },
  {
    id: "SAMPLE-06-WRINKLING",
    partId: 10,
    partName: "Roof Side Rail Inner Left Hand (RAIL ROOF SIDE INR LH)",
    hasDefect: true,
    defectId: "wrinkling",
    defectName: "Wrinkling",
    severity: 34.0,
    confidence: 96.5,
    box: { x: 8, y: 48, width: 85, height: 42, label: "Wrinkling // DEF-06 (34.0%)" },
    locationText: "Flange curvature transition and drawn cup sidewall",
    description: "Compressive buckling waves formed along unsupported drawn sidewall due to low blankholder cushion pressure. Within allowable rework threshold using hydraulic planishing press.",
    svgDataUrl: DEFECT_IMAGE_PATHS.wrinkling
  },
  {
    id: "SAMPLE-07-THINNING",
    partId: 6,
    partName: "Engine Support Lower (SUPT ENGINE LWR)",
    hasDefect: true,
    defectId: "material_thinning",
    defectName: "Material Thinning",
    severity: 38.0,
    confidence: 95.8,
    box: { x: 32, y: 46, width: 60, height: 38, label: "Material Thinning // DEF-07 (38.0%)" },
    locationText: "Deep drawn cradle pocket transition fillet",
    description: "Sheet metal thickness necked from nominal 2.0mm down to 1.32mm (-34% reduction), exceeding 25% thinning limit. Non-conforming scrap.",
    svgDataUrl: DEFECT_IMAGE_PATHS.material_thinning
  },
  {
    id: "SAMPLE-08-SPRINGBACK",
    partId: 21,
    partName: "Front Roof Rail Crossmember (RAIL ROOF FRT)",
    hasDefect: true,
    defectId: "springback",
    defectName: "Springback",
    severity: 30.0,
    confidence: 97.4,
    box: { x: 10, y: 18, width: 65, height: 74, label: "Springback // DEF-08 (30.0%)" },
    locationText: "U-channel profile flange return angle",
    description: "Flange bend angle opened up +2.4 degrees past nominal 90 deg design angle upon die release due to high elastic strain energy. Reworkable via restrike calibration pass.",
    svgDataUrl: DEFECT_IMAGE_PATHS.springback
  },
  {
    id: "SAMPLE-09-GALLING",
    partId: 29,
    partName: "Front Door Side Impact Beam LH (REINF SIDE IMPACT FR DR LH)",
    hasDefect: true,
    defectId: "scratches_galling",
    defectName: "Scratches and Galling",
    severity: 32.0,
    confidence: 96.8,
    box: { x: 28, y: 34, width: 48, height: 46, label: "Scratches & Galling // DEF-09 (32.0%)" },
    locationText: "High-pressure draw contact land surface",
    description: "Severe adhesive galling score streaks and abrasions caused by zinc pickup on cast iron draw radius. Reworkable via stoning and scotch-brite surface polishing.",
    svgDataUrl: DEFECT_IMAGE_PATHS.scratches_galling
  },
  {
    id: "SAMPLE-10-DENT",
    partId: 20,
    partName: "Rear Roof Rail Crossmember (RAIL ROOF RR)",
    hasDefect: true,
    defectId: "dent_impression",
    defectName: "Dents, Impressions and Die Marks",
    severity: 38.0,
    confidence: 96.1,
    box: { x: 26, y: 22, width: 48, height: 56, label: "Slug Dent // DEF-10 (38.0%)" },
    locationText: "Center crossmember skin mating flat",
    description: "Surface depression and localized impression created by loose scrap slug trapped between punch and workpiece. Authorized for spoon leveling and surface dress.",
    svgDataUrl: DEFECT_IMAGE_PATHS.dents_impressions
  },
  {
    id: "SAMPLE-11-WARPING",
    partId: 22,
    partName: "Rear Shelf Reinforcement (REINF REAR SHELF REAR)",
    hasDefect: true,
    defectId: "warping_distortion",
    defectName: "Warping, Twisting and Distortion",
    severity: 45.0,
    confidence: 97.2,
    box: { x: 12, y: 16, width: 78, height: 70, label: "Warping & Twist // DEF-11 (45.0%)" },
    locationText: "Longitudinal member end corner and span",
    description: "Out-of-plane twist and helical distortion across datum plane resulting from unbalanced residual stresses after trimming. Non-conforming scrap.",
    svgDataUrl: DEFECT_IMAGE_PATHS.warping_distortion
  },
  {
    id: "SAMPLE-12-FLATNESS",
    partId: 23,
    partName: "Rear Shelf Extension Panel (EXT PANEL RR SHELF)",
    hasDefect: true,
    defectId: "poor_flatness",
    defectName: "Poor Flatness",
    severity: 35.0,
    confidence: 95.7,
    box: { x: 28, y: 46, width: 44, height: 46, label: "Poor Flatness // DEF-12 (35.0%)" },
    locationText: "Wide flat parcel shelf center skin",
    description: "Wavy surface oil-canning contour deflection failing 1.0mm planar tolerance. Can be leveled using hydraulic nitrogen cushion restrike pass.",
    svgDataUrl: DEFECT_IMAGE_PATHS.poor_flatness
  },
  {
    id: "SAMPLE-13-DIMENSION",
    partId: 27,
    partName: "Front Door Beltline Outer LH (REINF FR DR BELTLINE OTR LH)",
    hasDefect: true,
    defectId: "dimensional_inaccuracy",
    defectName: "Dimensional Inaccuracies",
    severity: 42.0,
    confidence: 98.0,
    box: { x: 8, y: 18, width: 84, height: 60, label: "CAD Deviation // DEF-13 (42.0%)" },
    locationText: "Glass channel opening width dimension",
    description: "Overall trim width measured +4.2mm wider than CAD specification on CMM checking fixture due to press ram thermal expansion. Rejected.",
    svgDataUrl: DEFECT_IMAGE_PATHS.dimensional_inaccuracies
  },
  {
    id: "SAMPLE-14-MISALIGNED",
    partId: 2,
    partName: "ISOFIX Child Seat Anchor Bracket Left Hand (ISOFIX BRACKET LH)",
    hasDefect: true,
    defectId: "misaligned_hole",
    defectName: "Misaligned Holes or Features",
    severity: 48.0,
    confidence: 98.6,
    box: { x: 34, y: 22, width: 60, height: 62, label: "Misaligned Hole // DEF-14 (48.0%)" },
    locationText: "Safety anchor pierced hole datum",
    description: "Punched mounting hole true position shifted 2.4mm off nominal CAD center axis due to worn pilot pin. Exceeds safety tolerance. Scrap.",
    svgDataUrl: DEFECT_IMAGE_PATHS.misaligned_holes
  },
  {
    id: "SAMPLE-15-PARTSHIFT",
    partId: 40,
    partName: "Impact Beam Adapter Left Hand (ADAPTER IMPACT BEAM LH)",
    hasDefect: true,
    defectId: "part_shift",
    defectName: "Part Shift or Feed Shift",
    severity: 55.0,
    confidence: 98.9,
    box: { x: 6, y: 10, width: 42, height: 82, label: "Feed Shift // DEF-15 (55.0%)" },
    locationText: "Lower die workpiece nest and datum margin",
    description: "Blank was misfed into die cavity by transfer gripper, cutting into datum holes on one edge and leaving excess margin on opposite edge. Scrap.",
    svgDataUrl: DEFECT_IMAGE_PATHS.part_shift
  }
];

