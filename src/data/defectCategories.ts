/**
 * Defect Categories and Quality Inspection Specifications
 * Supported Defect Categories for Automotive Metal Stamping at HICOM Engineering Sdn Bhd
 */

export type QualityVerdict = 'PASS' | 'REWORK' | 'FAIL';
export type InspectionStatus = 'OK' | 'NG';

export interface DefectCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  manufacturingCauses: string[];
  severityFormula: string;
  defaultVerdictThresholds: {
    reworkableMaxSeverity: number; // e.g. <= 40% can be reworked
    failMinSeverity: number; // > 40% is non-conforming scrap
  };
  reworkAction: string | null;
  sampleLocation: string;
  visualCue: string;
}

export const DEFECT_CATEGORIES: DefectCategory[] = [
  {
    id: "burr",
    name: "Burr",
    code: "DEF-01",
    description: "Sharp raised ridge or excess metal sliver protruding along sheared edges or punched hole rims due to excessive cutting die clearance or worn punch blades.",
    manufacturingCauses: [
      "Worn cutting punch / die steel clearance exceeded standard 10% sheet thickness",
      "Punch corner rounding or edge chipping",
      "Insufficient die lubrication causing edge micro-welding"
    ],
    severityFormula: "Measured burr height / sheet thickness ratio * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 35,
      failMinSeverity: 36
    },
    reworkAction: "Deburring station with mechanical abrasive belt or rotary nylon-wire brush deburrer.",
    sampleLocation: "Outer trim perimeter and flange cutoff edges",
    visualCue: "Jagged metallic ridge or bright reflection fringe along cut contour"
  },
  {
    id: "missed_cut",
    name: "Missed Cut or Incomplete Cut",
    code: "DEF-02",
    description: "Portion of scrap trim remains attached or feature slug was not fully severed from the workpiece due to broken punch tip, improper stroke depth or slug jamming.",
    manufacturingCauses: [
      "Broken or chipped shearing blade tip",
      "Insufficient press stroke depth (ram shut height misadjusted)",
      "Slug accumulation in lower die cavity impeding blade penetration"
    ],
    severityFormula: "Uncut perimeter length / total feature cut length * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 50,
      failMinSeverity: 51
    },
    reworkAction: "Manual plasma trim or offline hydraulic nibbling shear with edge dress.",
    sampleLocation: "Access cutout window or corner addendum trim line",
    visualCue: "Hanging slug or bridged metal strip across designed cutout boundary"
  },
  {
    id: "poor_cut_edge",
    name: "Poor Cut Edge Quality",
    code: "DEF-03",
    description: "Excessive shear fracture zone, rollover deformity, double shear or tearing along the trimmed edge causing rough jagged finish.",
    manufacturingCauses: [
      "Uneven die clearance between punch and die matrix",
      "Die bolster misalignment under press tonnage load",
      "Shear speed too high or dull blade radius"
    ],
    severityFormula: "Surface roughness (Ra / Rz) deviation from class standard * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 45,
      failMinSeverity: 46
    },
    reworkAction: "Hand stone edge dressing or edge sanding on dedicated rework fixture.",
    sampleLocation: "Primary outer edge and glass frame flange trim",
    visualCue: "Coarse granular texture, micro-steps or tearing along shear face"
  },
  {
    id: "crack",
    name: "Crack",
    code: "DEF-04",
    description: "Localized fracture or micro-fissure propagating through sheet thickness at high-stress tight radii, drawn corners or embossed step edges.",
    manufacturingCauses: [
      "Exceeded material forming limit curve (FLC) during deep drawing",
      "Draw die corner radius too tight or polished improperly",
      "Excessive blankholder binder pressure restricting metal flow into die cavity"
    ],
    severityFormula: "Crack length and depth penetration ratio across critical stress zone * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 20, // Cracks have strict safety criteria
      failMinSeverity: 21
    },
    reworkAction: "Non-structural cosmetic parts may allow micro-weld repair with engineer sign-off; structural safety members FAIL unconditionally.",
    sampleLocation: "Deep drawn corner transitions, draw bead apex, and punched hole rims",
    visualCue: "Dark irregular hairline fissure or visible fracture through metal grain"
  },
  {
    id: "splitting_tearing",
    name: "Splitting or Tearing",
    code: "DEF-05",
    description: "Severe macro-fracture with complete separation of metal during draw stroke, opening an irregular rupture void.",
    manufacturingCauses: [
      "Inadequate draw lubricant causing friction galling lock",
      "Binder clamp pressure too high preventing sheet material inflow",
      "Defective raw coil tensile ductility or localized inclusion"
    ],
    severityFormula: "Rupture gap opening width and length / allowable threshold * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 0, // Splitting is non-reworkable fatal scrap
      failMinSeverity: 1
    },
    reworkAction: null,
    sampleLocation: "High stretch wall areas and pocket bottom radii",
    visualCue: "Open gaping tear with necked thinned jagged edges"
  },
  {
    id: "wrinkling",
    name: "Wrinkling",
    code: "DEF-06",
    description: "Compressive buckling or wave-like corrugations formed on flanges or unsupported drawn walls due to insufficient binder restraining force.",
    manufacturingCauses: [
      "Low blankholder cushion pressure allowing excessive compressive hoop stress",
      "Uneven nitrogen gas spring cushion wear across press bed",
      "Incorrect blank shape or binder surface gap taper"
    ],
    severityFormula: "Peak-to-valley wave amplitude (mm) / nominal thickness * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 40,
      failMinSeverity: 41
    },
    reworkAction: "Hydraulic planishing press or pneumatic hammer flattening on contoured mandrel.",
    sampleLocation: "Drawing flange margins, cup sidewalls, and curved saddle profiles",
    visualCue: "Rhythmic undulating ripples or accordion fold ridges on sheet surface"
  },
  {
    id: "material_thinning",
    name: "Material Thinning",
    code: "DEF-07",
    description: "Excessive local reduction in sheet metal gauge thickness beyond maximum allowable automotive tolerance (typically > 20% - 25% reduction).",
    manufacturingCauses: [
      "Severe localized biaxial tensile elongation during deep draw",
      "High die friction from insufficient lubrication or worn tool coating",
      "Sharp punch radius causing localized strain concentration"
    ],
    severityFormula: "((Nominal Gauge - Measured Gauge) / (Nominal Gauge * Max Allowable Thinning %)) * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 25,
      failMinSeverity: 26
    },
    reworkAction: "Non-reworkable if below minimum crash requirement; monitor ultrasonic gauge.",
    sampleLocation: "Embossed punch nose radii, corner fillets, and deep pocket floors",
    visualCue: "Visible necking depression, dull finish and localized gauge constriction"
  },
  {
    id: "springback",
    name: "Springback",
    code: "DEF-08",
    description: "Elastic recovery of metal sheet upon die release causing open bend angle, sidewall curl, or twist deviation from specified CAD geometry.",
    manufacturingCauses: [
      "High yield strength material (e.g. 590MPa / 980MPa) having large elastic strain energy",
      "Insufficient restrike coining pressure or inadequate bottom dead center dwell",
      "Under-compensated die punch angle in die design"
    ],
    severityFormula: "Angular deviation |θ_actual - θ_nominal| / allowable tolerance limit * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 60,
      failMinSeverity: 61
    },
    reworkAction: "Manual or hydraulic restrike press pass with over-bending calibration die.",
    sampleLocation: "90-degree flanged edges, channel sidewalls, and longitudinal rail spans",
    visualCue: "Flange angle opened past 90 degrees or relaxed arch curvature"
  },
  {
    id: "scratches_galling",
    name: "Scratches and Galling",
    code: "DEF-09",
    description: "Surface abrasions, gouges, or pickup streaks caused by microscopic metal transfer from sheet to die punch due to adhesive wear.",
    manufacturingCauses: [
      "Zinc pickup on cast iron draw radius during galvannealed steel stamping",
      "Die surface polishing breakdown or loss of TD/PVD chromium nitride coating",
      "Contamination with metallic chips or airborne particulate in die lubricants"
    ],
    severityFormula: "Galling scratch depth (microns) and surface area percentage * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 50,
      failMinSeverity: 51
    },
    reworkAction: "Stoning and scotch-brite surface polishing of workpiece; clean and polish die steel.",
    sampleLocation: "Vertical drawn sidewalls and high-pressure contact land areas",
    visualCue: "Score lines, burnished streaks, and roughened adhesive wear trails"
  },
  {
    id: "dent_impression",
    name: "Dent, Impression and Die Mark",
    code: "DEF-10",
    description: "Surface depression or localized indentation created when stray metal slug, chip, or loose screw is trapped between punch and workpiece.",
    manufacturingCauses: [
      "Slug pulled back by vacuum into upper die and stamped into subsequent part",
      "Dirt, weld spatter, or grit trapped on lower bolster die pad",
      "Handling impact damage during robotic destacking or parts transfer"
    ],
    severityFormula: "Dent depth (mm) / sheet thickness * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 45,
      failMinSeverity: 46
    },
    reworkAction: "Metal finishing dolly and spoon leveling for outer cosmetic panels.",
    sampleLocation: "Flat visual exterior surfaces, floor pan ribs, and mating flanges",
    visualCue: "Circular or irregular depression with shadow ring and halo ring around mark"
  },
  {
    id: "warping_distortion",
    name: "Warping, Twisting and Distortion",
    code: "DEF-11",
    description: "Out-of-plane twist or asymmetric deformation along the longitudinal axis caused by non-uniform residual stress release.",
    manufacturingCauses: [
      "Asymmetric draw geometry releasing unbalanced internal tensile stresses",
      "Thermal expansion variations or unbalanced trimming sequence",
      "Rough ejector pin force or pneumatic lifter sticking"
    ],
    severityFormula: "Coordinate torsion angle deviation / tolerance envelope * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 55,
      failMinSeverity: 56
    },
    reworkAction: "Straightening fixture with pneumatic clamping pressure or torsional restrike.",
    sampleLocation: "Longitudinal roof rails, door beltline beams, and sill reinforcements",
    visualCue: "Corner lift when resting on datum checking fixture or helical skew"
  },
  {
    id: "poor_flatness",
    name: "Poor Flatness",
    code: "DEF-12",
    description: "Wavy unconstrained surface deviation (oil-canning or camber) across large flat sheet areas failing planar tolerance.",
    manufacturingCauses: [
      "Uneven residual compressive stresses across panel center",
      "Insufficient stretch during draw stroke leaving center sheet loose",
      "Nitrogen cushion pressure pad uneven deflection"
    ],
    severityFormula: "Maximum surface bow height (mm) across 500mm baseline / allowable limit * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 50,
      failMinSeverity: 51
    },
    reworkAction: "Nitrogen pad restrike pass or tension leveling roller bench.",
    sampleLocation: "Parcel shelf panel, trunk floor patch, and front floor pan flat zones",
    visualCue: "Center canning snap (oil-can) or dish-like sag"
  },
  {
    id: "dimensional_inaccuracy",
    name: "Dimensional Inaccuracies",
    code: "DEF-13",
    description: "Overall part dimensions (Length, Width, Height or flange coordinates) out of defined engineering blueprint CAD tolerance limits.",
    manufacturingCauses: [
      "Thermal die drift during extended press production runs",
      "Guide pillar clearance play or gib clearance wear on press ram",
      "Coil thickness variation (e.g. +0.08mm out of spec)"
    ],
    severityFormula: "Mean absolute deviation from 3D CAD nominal / Cpk 1.33 limit * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 40,
      failMinSeverity: 41
    },
    reworkAction: "CMM report review; adjust press shut height or shim locating die inserts.",
    sampleLocation: "Overall part perimeter, datum pin coordinates, and trim margins",
    visualCue: "Checking fixture flush & gap pin misalignment or go/no-go gauge interference"
  },
  {
    id: "misaligned_hole",
    name: "Misaligned Hole or Feature",
    code: "DEF-14",
    description: "Punched mounting holes, locator holes or embossed brackets shifted in X or Y position relative to primary 3-2-1 tooling datum pins.",
    manufacturingCauses: [
      "Punch retainer plate pin loose or shifted under side thrust load",
      "Pilot locating pin worn or sheared in piercing die station",
      "Feed finger slippage on automated transfer press bar"
    ],
    severityFormula: "True position error (mm) / maximum allowable true position tolerance * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 30,
      failMinSeverity: 31
    },
    reworkAction: "Slotting or reaming on precision CNC drill jig with oversize washer approval.",
    sampleLocation: "Chassis bolt patterns, seat striker latch holes, and hinge clearance holes",
    visualCue: "Hole center shifted toward flange edge or ovalized profile"
  },
  {
    id: "part_shift",
    name: "Part Shift or Feed Shift",
    code: "DEF-15",
    description: "Entire blank or intermediate stamped preform entered the die cavity misaligned, causing asymmetric margins, cut-in on one side, and short trim on the opposite.",
    manufacturingCauses: [
      "Automated robotic transfer unloader / gripper misorientation",
      "Worn blank nest locator guides on lower die bed",
      "Coil strip feeder pitch timing error or optical sensor misread"
    ],
    severityFormula: "Shift offset distance (mm) / maximum allowable edge margin * 100",
    defaultVerdictThresholds: {
      reworkableMaxSeverity: 35,
      failMinSeverity: 36
    },
    reworkAction: "If trim margin exists, re-index on checking fixture; otherwise reject.",
    sampleLocation: "All die stations from OP10 to OP40",
    visualCue: "Uneven border margins, trimmed away datum holes on one edge and excess scrap on opposite"
  }
];

export interface InspectionRecord {
  id: string; // e.g. "INS-202611-0084"
  timestamp: string; // ISO string e.g. "2026-11-06T09:14:32Z"
  partId: number;
  partName: string;
  partSize: {
    lengthMm: number | null;
    widthMm: number | null;
    heightMm: number | null;
    formatted: string;
  };
  devType: string;
  diesType: string;
  pressLine: string;
  status: InspectionStatus; // OK or NG
  defectCategory: string | null; // Defect name if NG
  defectCategoryId: string | null;
  defectLocation: string | null;
  defectDescription: string | null;
  severityPercentage: number | null; // 0 - 100%
  confidencePercentage: number; // e.g. 98.4%
  verdict: QualityVerdict; // PASS, REWORK, FAIL
  imageUrl: string;
  annotatedImageUrl: string;
  boundingBox?: {
    x: number; // % from left 0 - 100
    y: number; // % from top 0 - 100
    width: number; // % width
    height: number; // % height
    label: string;
  };
  reworkActionNotes?: string;
  manufacturingCauses?: string[];
  inspectorName: string;
  detectionEngine: string; // e.g. "Gemini Vision 2.5 Industrial Model" or "Calibrated High-Speed Vision Benchmark"
  isLiveAi: boolean;
}

// Consistent engineering methodology for calculating quality verdict & severity percentage
export function calculateInspectionVerdict(
  status: InspectionStatus,
  defectId: string | null,
  severityPercentage: number | null
): { verdict: QualityVerdict; explanation: string } {
  if (status === 'OK' || !defectId || severityPercentage === null || severityPercentage === 0) {
    return {
      verdict: 'PASS',
      explanation: 'Part meets all HICOM Engineering Class A/B stamping quality standards and dimensional geometric tolerances. No critical surface defects detected.'
    };
  }

  const defectDef = DEFECT_CATEGORIES.find(d => d.id === defectId);
  if (!defectDef) {
    return {
      verdict: severityPercentage > 40 ? 'FAIL' : 'REWORK',
      explanation: `Automotive defect detected with computed severity of ${severityPercentage.toFixed(1)}%.`
    };
  }

  // Splitting is zero-tolerance safety failure
  if (defectId === 'splitting_tearing') {
    return {
      verdict: 'FAIL',
      explanation: 'Fatal metal splitting defect detected. Material forming limit exceeded with complete rupture void. Non-reworkable; part rejected for scrap recycling.'
    };
  }

  // Deep structural cracks
  if (defectId === 'crack' && severityPercentage > 20) {
    return {
      verdict: 'FAIL',
      explanation: 'Structural stress crack detected exceeding 20% threshold. Violates automotive crash safety integrity. Immediate scrap disposition.'
    };
  }

  if (severityPercentage <= defectDef.defaultVerdictThresholds.reworkableMaxSeverity) {
    return {
      verdict: 'REWORK',
      explanation: `Defect severity is ${severityPercentage.toFixed(1)}%, within authorized rework threshold (≤ ${defectDef.defaultVerdictThresholds.reworkableMaxSeverity}%). Remedial action: ${defectDef.reworkAction || 'Engineering bench rework'}.`
    };
  }

  return {
    verdict: 'FAIL',
    explanation: `Defect severity (${severityPercentage.toFixed(1)}%) exceeds maximum reworkable limit (${defectDef.defaultVerdictThresholds.reworkableMaxSeverity}%). Reject part to prevent assembly line stoppage.`
  };
}
