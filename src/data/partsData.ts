/**
 * HICOM Engineering Sdn Bhd - Automotive Stamping Part Catalog
 * Data accurately transcribed from PHN In-House Stamping Part List (PART_LIST_bd767044.pdf)
 * 
 * Naming requirement: Full part names and expanded manufacturing operation names
 * wherever reliable terminology is available.
 */

export interface PartOperation {
  opCode: string; // e.g. "OP05", "OP10", "OP20", "OP30", "OP40", "PROGRESSIVE"
  name: string; // original raw name e.g. "BLANK", "DRAW", "TRIM", "RESTRIKE", etc.
  fullName: string; // expanded standard name e.g. "Blanking Operation"
  description: string;
  pressLine: string; // e.g. "MED-BLK", "MED-B", "SP15", "SP20B", "MED-C"
  pressTonnage: number; // e.g. 300, 400, 150, 800, 1300
  pressLineFullName: string;
  toolingAction: 'blank' | 'draw' | 'trim' | 'restrike' | 'pierce' | 'bend' | 'flange' | 'separate' | 'progressive';
}

export interface StampingPart {
  id: number;
  partNumber: string;
  name: string; // Full expanded part name
  codeName: string; // Raw name from list
  lengthMm: number | null; // L (mm)
  widthMm: number | null; // W (mm)
  heightMm: number | null; // H (mm)
  devType: 'Medium Line' | 'Small Line';
  devTypeCode: 'ML' | 'SL';
  diesType: 'Cast Iron Die' | 'Tool Steel Die';
  diesTypeCode: 'CAST' | 'STEEL';
  blankDiesCount: number;
  formingDiesCount: number;
  totalDiesCount: number;
  pressLineSummary: string;
  pressTonnageRange: string;
  materialSpec: string;
  category: 'Body Structure' | 'Chassis & Engine Mounting' | 'Closure & Reinforcement' | 'Underbody & Floor';
  operations: PartOperation[];
  shapeProfile: 'panel_flat' | 'panel_flanged' | 'bracket_angular' | 'rail_longitudinal' | 'brace_structural' | 'beam_reinforcement';
}

// Helper to expand operation abbreviations into technical engineering terminology
export function expandOperationName(raw: string): { fullName: string; description: string; action: PartOperation['toolingAction'] } {
  const upper = raw.trim().toUpperCase();

  if (upper.includes('BLANK') && upper.includes('PIE')) {
    return {
      fullName: 'Blanking and Initial Piercing',
      description: 'Cuts outer perimeter blank profile and pierces primary tooling pilot holes.',
      action: 'blank'
    };
  }
  if (upper.startsWith('BLANK')) {
    return {
      fullName: 'Blanking Operation',
      description: 'Shears sheet metal blank from uncoiled strip to predetermined outer perimeter geometry.',
      action: 'blank'
    };
  }
  if (upper === 'PROGRESSIVE') {
    return {
      fullName: 'Continuous Progressive Die Stamping',
      description: 'Multi-station progressive feeding performing sequential notching, piercing, forming and cutoff.',
      action: 'progressive'
    };
  }
  if (upper === 'DRAW') {
    return {
      fullName: 'Deep Drawing Operation',
      description: 'Hydraulic/mechanical punch draws blank into die cavity forming 3D contoured shell with controlled binder force.',
      action: 'draw'
    };
  }
  if (upper === 'FORM' || upper === 'FORM, FLG') {
    return {
      fullName: upper.includes('FLG') ? 'Forming and Flanging Operation' : 'Forming Operation',
      description: 'Forms structural profile contours, steps, and perimeter flange profiles.',
      action: 'draw'
    };
  }
  if (upper === 'RE-DRAW') {
    return {
      fullName: 'Secondary Redrawing Operation',
      description: 'Deepens drawn cavity and refines stepped sidewalls to final engineering depth.',
      action: 'draw'
    };
  }
  if (upper === 'TRIM') {
    return {
      fullName: 'Perimeter Trimming Operation',
      description: 'Shears away perimeter addendum and excess binder scrap along trim line.',
      action: 'trim'
    };
  }
  if (upper === 'TRIM, PIE' || upper === 'TRIM , C-TRIM, PIE') {
    return {
      fullName: upper.includes('C-TRIM') ? 'Trimming, Cam Trimming and Piercing' : 'Trimming and Piercing Operation',
      description: 'Trims peripheral scrap line and punches internal clearance mounting holes simultaneously.',
      action: 'trim'
    };
  }
  if (upper === 'TRIM, C-PIE') {
    return {
      fullName: 'Trimming and Cam Piercing Operation',
      description: 'Trims excess flange material and utilizes angled cam drivers to pierce horizontal side holes.',
      action: 'trim'
    };
  }
  if (upper === 'RESTRIKE' || upper === 'RES' || upper === 'REST') {
    return {
      fullName: 'Restriking and Calibration Operation',
      description: 'Applies high tonnage coining pressure to eliminate springback, sharpen radii, and set final dimensional tolerances.',
      action: 'restrike'
    };
  }
  if (upper === 'PIE, PAD-RST') {
    return {
      fullName: 'Piercing and Pressure Pad Restrike',
      description: 'Punches precision holes while pressurized nitrogen pad restrikes embossments for flatness.',
      action: 'restrike'
    };
  }
  if (upper === 'BEND') {
    return {
      fullName: 'Angular Bending Operation',
      description: 'Bends flanges and reinforcing tabs along specified bend axes using wiper punch.',
      action: 'bend'
    };
  }
  if (upper === 'FLG-UP') {
    return {
      fullName: 'Upward Flanging Operation (Flange-Up)',
      description: 'Wipes perimeter sheet metal upwards 90 degrees to produce stiffening flange.',
      action: 'flange'
    };
  }
  if (upper === 'FLG-UP, FLG-DO' || upper === 'FLG, RES' || upper === 'RES, FLG-UP') {
    return {
      fullName: 'Bidirectional Flanging and Restrike Calibration',
      description: 'Wipes upper and downward flanges while setting coining datum pads.',
      action: 'flange'
    };
  }
  if (upper.includes('CUT') || upper.includes('SEP')) {
    return {
      fullName: 'Parting, Cam Piercing, Trimming and Separation',
      description: 'Divides LH/RH paired components, trims terminal edges, and executes cam piercing.',
      action: 'separate'
    };
  }
  if (upper.includes('PIERCE') || upper.includes('PIE')) {
    return {
      fullName: 'Multi-Hole Piercing Operation',
      description: 'Punches fastener holes, datum locators, and drainage slots with tungsten carbide punches.',
      action: 'pierce'
    };
  }

  return {
    fullName: raw,
    description: `Automotive stamping sequence: ${raw}.`,
    action: 'draw'
  };
}

export function expandPressLineName(code: string): string {
  switch (code.trim().toUpperCase()) {
    case 'MED-BLK': return 'Medium Tandem Blanking Line';
    case 'MED-A': return 'Medium Tandem Press Line A';
    case 'MED-B': return 'Medium Tandem Press Line B';
    case 'MED-C': return 'Medium Tandem Press Line C';
    case 'MED-D': return 'Medium Heavy Tandem Press Line D';
    case 'SP15': return 'Small Press Line 150-Ton';
    case 'SP20A': return 'Small Press Line 200-Ton (Line A)';
    case 'SP20B': return 'Small Press Line 200-Ton (Line B)';
    case 'SP20C': return 'Small Press Line 200-Ton (Line C)';
    case 'SP25': return 'Small Press Line 250-Ton';
    default: return code;
  }
}

export const STAMPING_PARTS: StampingPart[] = [
  {
    id: 1,
    partNumber: "HICOM-SMP-001",
    name: "Front Floor Reinforcement Patch (PATCH FRONT FLOOR)",
    codeName: "PATCH FRONT FLOOR",
    lengthMm: 610,
    widthMm: 155,
    heightMm: 114,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 1,
    formingDiesCount: 4,
    totalDiesCount: 5,
    pressLineSummary: "MED-BLK / MED-B",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPCC / High-Strength Galvannealed Steel (1.4 mm)",
    category: "Underbody & Floor",
    shapeProfile: "panel_flanged",
    operations: [
      {
        opCode: "OP05",
        name: "BLANK",
        fullName: "Blanking Operation",
        description: "Shears rectangular blank from coil stock with contoured perimeter.",
        pressLine: "MED-BLK",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-BLK"),
        toolingAction: "blank"
      },
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation",
        description: "Forms deep 3D floor contour, step channels, and primary reinforcing ribs.",
        pressLine: "MED-B",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM",
        fullName: "Perimeter Trimming Operation",
        description: "Trims peripheral draw addendum and cutouts around chassis mounting areas.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "RESTRIKE",
        fullName: "Restriking and Calibration Operation",
        description: "Coins high-stress step flanges and eliminates springback for exact vehicle frame fit.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "restrike"
      },
      {
        opCode: "OP40",
        name: "CUT, PIE, C-CUT, C-PIE",
        fullName: "Cut, Piercing, Cam Cutting and Cam Piercing",
        description: "Simultaneously punches datum pin holes, drainage cutouts, and side-action fastener slots.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "pierce"
      }
    ]
  },
  {
    id: 2,
    partNumber: "HICOM-SMP-002",
    name: "ISOFIX Child Seat Anchor Bracket Left Hand (ISOFIX BRACKET LH)",
    codeName: "ISOFIX BRACKET LH",
    lengthMm: 172,
    widthMm: 79,
    heightMm: 92,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 1,
    formingDiesCount: 4,
    totalDiesCount: 5,
    pressLineSummary: "SP25 / SP15",
    pressTonnageRange: "150T - 250T",
    materialSpec: "SAPH440 High-Yield Automotive Structural Steel (2.0 mm)",
    category: "Chassis & Engine Mounting",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP05",
        name: "BLANK",
        fullName: "Blanking Operation",
        description: "Cuts perimeter bracket outline on 250T small blanking press.",
        pressLine: "SP25",
        pressTonnage: 250,
        pressLineFullName: expandPressLineName("SP25"),
        toolingAction: "blank"
      },
      {
        opCode: "OP10",
        name: "FORM",
        fullName: "Forming Operation",
        description: "Initial U-channel form and anchor loop radius bending.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "FLG-UP",
        fullName: "Primary Upward Flanging Operation",
        description: "Flanges upper mounting tabs upwards at 90 degrees.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "flange"
      },
      {
        opCode: "OP30",
        name: "FLG-UP",
        fullName: "Secondary Upward Flanging and Calibration",
        description: "Secondary upward flanging for side anchor ears.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "flange"
      },
      {
        opCode: "OP40",
        name: "PIE, C-PIE",
        fullName: "Piercing and Cam Piercing Operation",
        description: "Punches vertical safety latch holes and angled weld nut locators via cam slide.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "pierce"
      }
    ]
  },
  {
    id: 3,
    partNumber: "HICOM-SMP-003",
    name: "ISOFIX Child Seat Anchor Bracket Right Hand (ISOFIX BRACKET RH)",
    codeName: "ISOFIX BRACKET RH",
    lengthMm: 172,
    widthMm: 79,
    heightMm: 92,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "SP15",
    pressTonnageRange: "150T",
    materialSpec: "SAPH440 High-Yield Automotive Structural Steel (2.0 mm)",
    category: "Chassis & Engine Mounting",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP10",
        name: "FORM",
        fullName: "Forming Operation",
        description: "Forms RH symmetrical channel and restraint anchor radius.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "FLG-UP",
        fullName: "Primary Upward Flanging",
        description: "Flanges right-hand mounting brackets upwards.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "flange"
      },
      {
        opCode: "OP30",
        name: "FLG-UP",
        fullName: "Secondary Upward Flanging and Restrike",
        description: "Completes bracket enclosure flanging and stiffening coins.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "flange"
      },
      {
        opCode: "OP40",
        name: "PIE, C-PIE",
        fullName: "Piercing and Cam Piercing Operation",
        description: "Punches restraint bar fastener clearance and cam-driven side holes.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "pierce"
      }
    ]
  },
  {
    id: 4,
    partNumber: "HICOM-SMP-004",
    name: "Transmission Support Member (SUPT TRANSMISSION)",
    codeName: "SUPT TRANSMISSION",
    lengthMm: 226,
    widthMm: 126,
    heightMm: 78,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "SP20B",
    pressTonnageRange: "200T",
    materialSpec: "SPFH590 Heavy-Duty High Tensile Steel (2.3 mm)",
    category: "Chassis & Engine Mounting",
    shapeProfile: "brace_structural",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation",
        description: "Draws structural transmission cradle cup and cross-gusset pockets.",
        pressLine: "SP20B",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM",
        fullName: "Perimeter Trimming Operation",
        description: "Trims draw perimeter and chassis frame mounting notches.",
        pressLine: "SP20B",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "FLG, RES",
        fullName: "Flanging and Restrike Calibration",
        description: "Wipes downward reinforcing lip and restrikes mounting pad faces.",
        pressLine: "SP20B",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20B"),
        toolingAction: "flange"
      },
      {
        opCode: "OP40",
        name: "PIERCE",
        fullName: "Precision Hole Piercing",
        description: "Punches transmission bushing bolt holes and alignment dowels.",
        pressLine: "SP20B",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20B"),
        toolingAction: "pierce"
      }
    ]
  },
  {
    id: 5,
    partNumber: "HICOM-SMP-005",
    name: "Engine Upper Support Bracket (SUPT ENGINE UPPER)",
    codeName: "SUPT ENGINE UPPER",
    lengthMm: 133,
    widthMm: 93,
    heightMm: 99,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 1,
    formingDiesCount: 4,
    totalDiesCount: 5,
    pressLineSummary: "SP25 / SP15",
    pressTonnageRange: "150T - 250T",
    materialSpec: "SAPH440 High Strength Hot-Rolled Plate (2.5 mm)",
    category: "Chassis & Engine Mounting",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP05",
        name: "BLANK",
        fullName: "Blanking Operation",
        description: "Shears bracket blank profile with locating notches.",
        pressLine: "SP25",
        pressTonnage: 250,
        pressLineFullName: expandPressLineName("SP25"),
        toolingAction: "blank"
      },
      {
        opCode: "OP10",
        name: "FORM",
        fullName: "Forming Operation",
        description: "Bends central rib and forms motor mount clearance contour.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "BEND",
        fullName: "Primary Bending Operation",
        description: "Bends side flange wing 45 degrees.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "bend"
      },
      {
        opCode: "OP30",
        name: "BEND",
        fullName: "Secondary Bending and Restrike",
        description: "Completes 90 degree return bend and coins engine bolt seat.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "bend"
      },
      {
        opCode: "OP40",
        name: "PIERCE",
        fullName: "Hole Piercing Operation",
        description: "Pierces heavy M12 engine mount bolt through-holes.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "pierce"
      }
    ]
  },
  {
    id: 6,
    partNumber: "HICOM-SMP-006",
    name: "Engine Lower Support Bracket (SUPT ENGINE LOWER)",
    codeName: "SUPT ENGINE LOWER",
    lengthMm: 226,
    widthMm: 95,
    heightMm: 73,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "SP20B",
    pressTonnageRange: "200T",
    materialSpec: "SAPH440 Structural Steel (2.0 mm)",
    category: "Chassis & Engine Mounting",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation",
        description: "Forms lower engine torque mount well.",
        pressLine: "SP20B",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM",
        fullName: "Perimeter Trimming Operation",
        description: "Trims outer perimeter addendum.",
        pressLine: "SP20B",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "CUT, PIE",
        fullName: "Parting Cut and Hole Piercing",
        description: "Cuts scrap relief slots and pierces chassis mount holes.",
        pressLine: "SP20B",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20B"),
        toolingAction: "pierce"
      },
      {
        opCode: "OP40",
        name: "FLG-UP, FLG-DO",
        fullName: "Upward and Downward Flanging",
        description: "Dual action flanging creates bidirectional stiffening lips.",
        pressLine: "SP20B",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20B"),
        toolingAction: "flange"
      }
    ]
  },
  {
    id: 7,
    partNumber: "HICOM-SMP-007",
    name: "Engine Support Reinforcement (REINF SUPT ENGINE)",
    codeName: "REINF SUPT ENGINE",
    lengthMm: 138,
    widthMm: 116,
    heightMm: 89,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "SP20A",
    pressTonnageRange: "200T",
    materialSpec: "SPFC590 High Strength Cold Rolled Steel (1.8 mm)",
    category: "Chassis & Engine Mounting",
    shapeProfile: "brace_structural",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Drawing Operation",
        description: "Draws reinforcement hat-channel profile.",
        pressLine: "SP20A",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20A"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM",
        fullName: "Perimeter Trimming",
        description: "Shears perimeter scrap line.",
        pressLine: "SP20A",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20A"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "CUT",
        fullName: "End Parting and Relief Cut",
        description: "Shears end notch tabs and clearances.",
        pressLine: "SP20A",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20A"),
        toolingAction: "separate"
      },
      {
        opCode: "OP40",
        name: "FLG, RES",
        fullName: "Flanging and Restrike Calibration",
        description: "Wipes outer flanges and restrikes weld surfaces.",
        pressLine: "SP20A",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20A"),
        toolingAction: "restrike"
      }
    ]
  },
  {
    id: 8,
    partNumber: "HICOM-SMP-008",
    name: "Hood Hinge Support Bracket Left Hand (SUPT HOOD HINGE LH)",
    codeName: "SUPT HOOD HINGE LH",
    lengthMm: 195,
    widthMm: 71,
    heightMm: 57,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "SP20C",
    pressTonnageRange: "200T",
    materialSpec: "SPCC Commercial Cold Rolled Sheet (1.6 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Primary Deep Drawing",
        description: "Forms LH hinge pivot cradle and bulkhead flange recess.",
        pressLine: "SP20C",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "RE-DRAW",
        fullName: "Secondary Redrawing Operation",
        description: "Deepens hinge socket recess to final coordinate depth.",
        pressLine: "SP20C",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP30",
        name: "TRIM, PIE",
        fullName: "Trimming and Hole Piercing",
        description: "Trims perimeter flanges and pierces hinge pivot pin holes.",
        pressLine: "SP20C",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP40",
        name: "FLG, SEP",
        fullName: "Flanging and Die Separation",
        description: "Wipes perimeter sealing flange and separates stamped part from carrier strip.",
        pressLine: "SP20C",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 9,
    partNumber: "HICOM-SMP-009",
    name: "Hood Hinge Support Bracket Right Hand (SUPT HOOD HINGE RH)",
    codeName: "SUPT HOOD HINGE RH",
    lengthMm: 195,
    widthMm: 71,
    heightMm: 57,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "SP20C",
    pressTonnageRange: "200T",
    materialSpec: "SPCC Commercial Cold Rolled Sheet (1.6 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Primary Deep Drawing (Paired Tooling)",
        description: "Draws RH symmetrical hinge pivot pocket in shared tandem tool.",
        pressLine: "SP20C",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "RE-DRAW",
        fullName: "Secondary Redrawing Operation",
        description: "Deepens RH hinge pivot step.",
        pressLine: "SP20C",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP30",
        name: "TRIM, PIE",
        fullName: "Trimming and Hole Piercing",
        description: "Trims RH outer perimeter and pierces fastener clearance holes.",
        pressLine: "SP20C",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP40",
        name: "FLG, SEP",
        fullName: "Flanging and Final Separation",
        description: "Forms attachment flanges and separates finished RH part.",
        pressLine: "SP20C",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 10,
    partNumber: "HICOM-SMP-010",
    name: "Roof Side Rail Inner Left Hand (RAIL ROOF SIDE INR LH)",
    codeName: "RAIL ROOF SIDE INR LH",
    lengthMm: 1001,
    widthMm: 134,
    heightMm: 95,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "400T - 800T",
    materialSpec: "SPFC590 High Tensile Steel (1.2 mm)",
    category: "Body Structure",
    shapeProfile: "rail_longitudinal",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "High-Tonnage Deep Drawing Operation",
        description: "Draws longitudinal 1000mm roof rail arch and side pillar header curve on 800-ton press.",
        pressLine: "MED-C",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims upper windshield header flange and pierces curtain airbag mounting slots.",
        pressLine: "MED-C",
        pressTonnage: 500,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "TRIM, C-PIE",
        fullName: "Trimming and Cam Piercing",
        description: "Trims lower door aperture curve and executes angled cam piercing for headliner clips.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP40",
        name: "PIE, SEP",
        fullName: "Piercing and Part Separation",
        description: "Pierces rear pillar locator datum holes and separates part from run-off tabs.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 11,
    partNumber: "HICOM-SMP-011",
    name: "Roof Side Rail Inner Right Hand (RAIL ROOF SIDE INR RH)",
    codeName: "RAIL ROOF SIDE INR RH",
    lengthMm: 1001,
    widthMm: 134,
    heightMm: 95,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "400T - 800T",
    materialSpec: "SPFC590 High Tensile Steel (1.2 mm)",
    category: "Body Structure",
    shapeProfile: "rail_longitudinal",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "High-Tonnage Deep Drawing (Symmetrical Die)",
        description: "Draws 1001mm longitudinal RH side roof header profile on MED-C 800T line.",
        pressLine: "MED-C",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims RH roof rail addendum and pierces roof bow attachment holes.",
        pressLine: "MED-C",
        pressTonnage: 500,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "TRIM, C-PIE",
        fullName: "Trimming and Cam Piercing",
        description: "Angled cam punches side door weatherstrip retaining holes.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP40",
        name: "PIE, SEP",
        fullName: "Piercing and Final Separation",
        description: "Final datum hole piercing and strip detachment.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 12,
    partNumber: "HICOM-SMP-012",
    name: "Side Outer Lower Extension Left Hand (EXTN SIDE OTR LWR LH)",
    codeName: "EXTN SIDE OTR LWR LH",
    lengthMm: 353,
    widthMm: 290,
    heightMm: 205,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "400T - 800T",
    materialSpec: "SPCD Deep Drawing Automotive Steel (0.9 mm)",
    category: "Body Structure",
    shapeProfile: "panel_flanged",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation",
        description: "Deep draws 205mm contoured sill extension and lower rocker transition.",
        pressLine: "MED-C",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims sill flange scrap line and punches weld tab clearances.",
        pressLine: "MED-C",
        pressTonnage: 500,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "RES, FLG-UP",
        fullName: "Restrike and Upward Flanging",
        description: "Restrikes door seal channel and flanges bottom hem upward.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "flange"
      },
      {
        opCode: "OP40",
        name: "PIE, SEP, C-PIE",
        fullName: "Pierce, Separate and Cam Pierce",
        description: "Multi-direction piercing, side-cam action for rocker clips and part separation.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 13,
    partNumber: "HICOM-SMP-013",
    name: "Side Outer Lower Extension Right Hand (EXTN SIDE OTR LWR RH)",
    codeName: "EXTN SIDE OTR LWR RH",
    lengthMm: 353,
    widthMm: 290,
    heightMm: 205,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "400T - 800T",
    materialSpec: "SPCD Deep Drawing Automotive Steel (0.9 mm)",
    category: "Body Structure",
    shapeProfile: "panel_flanged",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation (RH Tooling)",
        description: "Draws 205mm deep RH lower rocker corner shell on 800T press.",
        pressLine: "MED-C",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims RH outer perimeter and punches rocker weld clearances.",
        pressLine: "MED-C",
        pressTonnage: 500,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "RES, FLG-UP",
        fullName: "Restrike and Upward Flanging",
        description: "Restrikes sealing radius and forms rocker upward flange.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "flange"
      },
      {
        opCode: "OP40",
        name: "PIE, SEP, C-PIE",
        fullName: "Pierce, Separate and Cam Pierce",
        description: "Cam punches side retention holes and completes part separation.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 14,
    partNumber: "HICOM-SMP-014",
    name: "Back Upper Side Panel Left Hand (PANEL BACK UPPER SIDE LH)",
    codeName: "PANEL BACK UPPER SIDE LH",
    lengthMm: 303,
    widthMm: 241,
    heightMm: 116,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "MED-A",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPCC Commercial Grade Cold Rolled Steel (1.0 mm)",
    category: "Body Structure",
    shapeProfile: "panel_flanged",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation",
        description: "Draws back upper C-pillar junction and tailgate seal gutter recess.",
        pressLine: "MED-A",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-A"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims upper window flange and pierces wiring harness holes.",
        pressLine: "MED-A",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-A"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "CUT, SEP, PIE, FLG, C-PIE",
        fullName: "Multi-Action Cut, Separate, Pierce, Flange & Cam Pierce",
        description: "Complex tooling station cutting scrap, separating LH part, wiping perimeter flanges and cam-piercing gas stay bracket holes.",
        pressLine: "MED-A",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-A"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 15,
    partNumber: "HICOM-SMP-015",
    name: "Back Upper Side Panel Right Hand (PANEL BACK UPPER SIDE RH)",
    codeName: "PANEL BACK UPPER SIDE RH",
    lengthMm: 303,
    widthMm: 241,
    heightMm: 116,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "MED-A",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPCC Commercial Grade Cold Rolled Steel (1.0 mm)",
    category: "Body Structure",
    shapeProfile: "panel_flanged",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation (RH Paired)",
        description: "Draws symmetrical RH rear corner tailgate jamb.",
        pressLine: "MED-A",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-A"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims RH outer perimeter and pierces harness routing holes.",
        pressLine: "MED-A",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-A"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "CUT, SEP, PIE, FLG, C-PIE",
        fullName: "Multi-Action Compound Stamping Station",
        description: "Cuts scrap, flanging sealing channel, cam piercing strut mount holes, and part detachment.",
        pressLine: "MED-A",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-A"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 16,
    partNumber: "HICOM-SMP-016",
    name: "Wheelhouse Inner Brace Left Hand (BRACE W/HSE INR LH)",
    codeName: "BRACE W/HSE INR LH",
    lengthMm: 385,
    widthMm: 287,
    heightMm: 178,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPFC440 High-Strength Steel (1.4 mm)",
    category: "Underbody & Floor",
    shapeProfile: "brace_structural",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation",
        description: "Draws 178mm deep wheel arch archway and strut dome connection socket.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM , C-TRIM, PIE",
        fullName: "Trimming, Cam Trimming and Piercing",
        description: "Trims wheelhouse arch flange and uses angled cam trimmer on vertical sidewall.",
        pressLine: "MED-C",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "PIE, TRIM, C-PIE",
        fullName: "Piercing, Secondary Trim and Cam Pierce",
        description: "Punches shock absorber mount clearance and side-action splash guard holes.",
        pressLine: "MED-C",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "pierce"
      },
      {
        opCode: "OP40",
        name: "C-PIE, C-RES, SEP",
        fullName: "Cam Pierce, Cam Restrike and Separation",
        description: "Cam restrikes critical arch datum, pierces brake line clip holes, and parts LH component.",
        pressLine: "MED-C",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 17,
    partNumber: "HICOM-SMP-017",
    name: "Wheelhouse Inner Brace Right Hand (BRACE W/HSE INR RH)",
    codeName: "BRACE W/HSE INR RH",
    lengthMm: 385,
    widthMm: 287,
    heightMm: 178,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPFC440 High-Strength Steel (1.4 mm)",
    category: "Underbody & Floor",
    shapeProfile: "brace_structural",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation (RH Paired)",
        description: "Draws symmetrical 178mm RH wheelhouse dome.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM , C-TRIM, PIE",
        fullName: "Trimming, Cam Trimming and Piercing",
        description: "Trims RH perimeter and pierces fastener positions.",
        pressLine: "MED-C",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "PIE, TRIM, C-PIE",
        fullName: "Piercing, Secondary Trim and Cam Pierce",
        description: "Secondary edge trimming and cam piercing.",
        pressLine: "MED-C",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "pierce"
      },
      {
        opCode: "OP40",
        name: "C-PIE, C-RES, SEP",
        fullName: "Cam Pierce, Cam Restrike and Separation",
        description: "Final cam restrike for arch geometry and detachment.",
        pressLine: "MED-C",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 18,
    partNumber: "HICOM-SMP-018",
    name: "Wheelhouse Inner Brace Reinforcement Left Hand (REINF BRACE W/HSE INR LH)",
    codeName: "REINF BRACE W/HSE INR LH",
    lengthMm: 550,
    widthMm: 403,
    heightMm: 478,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "400T - 800T",
    materialSpec: "SPFC590 Heavy Gauge Structural Steel (1.8 mm)",
    category: "Underbody & Floor",
    shapeProfile: "brace_structural",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Extra-Deep Drawing Operation",
        description: "Massive 800-ton draw forming 478mm deep structural suspension tower reinforcement bell.",
        pressLine: "MED-C",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Heavy Trimming and Piercing",
        description: "Trims heavy gauge outer flange and pierces strut guide holes.",
        pressLine: "MED-C",
        pressTonnage: 500,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "FLG-UP, RES",
        fullName: "Upward Flanging and Restrike Calibration",
        description: "Forms 90-degree suspension tower mating flange and restrikes seat face.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "flange"
      },
      {
        opCode: "OP40",
        name: "PIE, C-PIE, C-RES, SEP",
        fullName: "Pierce, Cam Pierce, Cam Restrike & Part Separation",
        description: "Punches chassis bolt pattern, side cam holes, coins weld pads, and parts component.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 19,
    partNumber: "HICOM-SMP-019",
    name: "Wheelhouse Inner Brace Reinforcement Right Hand (REINF BRACE W/HSE INR RH)",
    codeName: "REINF BRACE W/HSE INR RH",
    lengthMm: 550,
    widthMm: 403,
    heightMm: 478,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "400T - 800T",
    materialSpec: "SPFC590 Heavy Gauge Structural Steel (1.8 mm)",
    category: "Underbody & Floor",
    shapeProfile: "brace_structural",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Extra-Deep Drawing Operation (RH Paired)",
        description: "Forms 478mm deep RH suspension reinforcement on 800-ton press.",
        pressLine: "MED-C",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Heavy Trimming and Piercing",
        description: "Trims RH outer perimeter and punches tower locators.",
        pressLine: "MED-C",
        pressTonnage: 500,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "FLG-UP, RES",
        fullName: "Upward Flanging and Restrike Calibration",
        description: "Flanges upper reinforcement edge and coins contact pad.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "flange"
      },
      {
        opCode: "OP40",
        name: "PIE, C-PIE, C-RES, SEP",
        fullName: "Compound Piercing, Cam Action & Separation",
        description: "Final cam piercing, coining, and scrap separation.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 20,
    partNumber: "HICOM-SMP-020",
    name: "Rear Roof Rail Crossmember (RAIL ROOF RR)",
    codeName: "RAIL ROOF RR",
    lengthMm: 973,
    widthMm: 243,
    heightMm: 90,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "MED-B",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPFC440 High Strength Steel (1.2 mm)",
    category: "Body Structure",
    shapeProfile: "rail_longitudinal",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Crossmember Deep Drawing Operation",
        description: "Draws 973mm rear roof transverse bow and tailgate header frame contour.",
        pressLine: "MED-B",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims tailgate weatherstrip channel and pierces interior lamp harness holes.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "PIE, C-PIE, C-CUT",
        fullName: "Piercing, Cam Piercing and Cam Cutting",
        description: "Simultaneously cam-pierces hinge fastener holes and cuts end clearance notches.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "pierce"
      }
    ]
  },
  {
    id: 21,
    partNumber: "HICOM-SMP-021",
    name: "Front Roof Rail Windshield Header (RAIL ROOF FRT)",
    codeName: "RAIL ROOF FRT",
    lengthMm: 973,
    widthMm: 243,
    heightMm: 90,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "MED-B",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPFC440 High Strength Steel (1.2 mm)",
    category: "Body Structure",
    shapeProfile: "rail_longitudinal",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation",
        description: "Draws 973mm windshield bonding flange recess and front roof bow arch.",
        pressLine: "MED-B",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims windshield perimeter glass lip and pierces sunvisor mounting holes.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "CUT, PIE, C-PIE",
        fullName: "Cut, Piercing and Cam Piercing",
        description: "Cuts side pillar overlap tabs and executes angled cam piercing for rearview mirror mount.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "pierce"
      }
    ]
  },
  {
    id: 22,
    partNumber: "HICOM-SMP-022",
    name: "Rear Shelf Rear Reinforcement (REINF REAR SHELF REAR)",
    codeName: "REINF REAR SHELF REAR",
    lengthMm: 832,
    widthMm: 162,
    heightMm: 63,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "MED-B",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPCC Commercial Cold Rolled Sheet (0.9 mm)",
    category: "Body Structure",
    shapeProfile: "panel_flanged",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Drawing Operation",
        description: "Draws 832mm rear parcel shelf acoustic speaker recesses and stiffening channels.",
        pressLine: "MED-B",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims back glass sealing flange and pierces seat belt retractor openings.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "PIE, PAD-RST",
        fullName: "Piercing and Pressure Pad Restrike",
        description: "Punches child anchor holes while nitrogen pressure pad coins flat datum pads.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "restrike"
      }
    ]
  },
  {
    id: 23,
    partNumber: "HICOM-SMP-023",
    name: "Rear Shelf Extension Panel (EXT PANEL RR SHELF)",
    codeName: "EXT PANEL RR SHELF",
    lengthMm: 1000,
    widthMm: 312,
    heightMm: 67,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "400T - 800T",
    materialSpec: "SPCD Deep Drawing Automotive Sheet (0.8 mm)",
    category: "Body Structure",
    shapeProfile: "panel_flanged",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "High-Tonnage Drawing Operation",
        description: "Draws expansive 1000mm parcel shelf surface with trunk bulkhead transition on 800T press.",
        pressLine: "MED-C",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims front and side welding margins and pierces audio speaker apertures.",
        pressLine: "MED-C",
        pressTonnage: 500,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "TRIM, PIE",
        fullName: "Secondary Trimming and Piercing",
        description: "Trims rear luggage compartment interface and pierces trim panel retainer holes.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP40",
        name: "FLG-UP",
        fullName: "Upward Flanging Operation",
        description: "Forms continuous 1000mm upward spot-welding flange for rear window glass frame.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "flange"
      }
    ]
  },
  {
    id: 24,
    partNumber: "HICOM-SMP-024",
    name: "Rear Seat Striker Reinforcement (REINF RR SEAT STRIKER)",
    codeName: "REINF RR SEAT STRIKER",
    lengthMm: null, // Spec in Excel is Not Available
    widthMm: null,
    heightMm: null,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 1,
    formingDiesCount: 0,
    totalDiesCount: 1,
    pressLineSummary: "SP25",
    pressTonnageRange: "250T",
    materialSpec: "SAPH440 High Strength Automotive Structural Steel (2.6 mm)",
    category: "Chassis & Engine Mounting",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "PROG",
        name: "PROGRESSIVE",
        fullName: "High-Speed Progressive Die Stamping",
        description: "Continuous progressive die executing strip decoiling, pilot piercing, blank notching, high-tonnage striker embossing, and cutoff in one automated die block.",
        pressLine: "SP25",
        pressTonnage: 250,
        pressLineFullName: expandPressLineName("SP25"),
        toolingAction: "progressive"
      }
    ]
  },
  {
    id: 25,
    partNumber: "HICOM-SMP-025",
    name: "Rear End Panel Upper Brace Left Hand (BRACE RR END PNL UPR LH)",
    codeName: "BRACE RR END PNL UPR LH",
    lengthMm: 316,
    widthMm: 285,
    heightMm: 122,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 1,
    formingDiesCount: 4,
    totalDiesCount: 5,
    pressLineSummary: "MED-BLK / MED-B",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPFC440 High Strength Steel (1.4 mm)",
    category: "Body Structure",
    shapeProfile: "brace_structural",
    operations: [
      {
        opCode: "OP05",
        name: "BLANK, PIE",
        fullName: "Blanking and Initial Piercing",
        description: "Shears shaped sheet blank with pilot registration holes on blanking press.",
        pressLine: "MED-BLK",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-BLK"),
        toolingAction: "blank"
      },
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation",
        description: "Draws 122mm tail lamp pocket and tailgate hinge corner support.",
        pressLine: "MED-B",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims outer perimeter addendum and pierces wiring harness pass-through.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "FLG-UP, FLG-DO",
        fullName: "Bidirectional Flanging (Up and Down)",
        description: "Wipes upper sealing lip upward and lower quarter panel joint downward.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "flange"
      },
      {
        opCode: "OP40",
        name: "C-RES, PIE, C-PIE, SEP",
        fullName: "Cam Restrike, Pierce, Cam Pierce & Separation",
        description: "Cam restrikes light cluster seat, pierces tail lamp studs, and parts finished LH panel.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 26,
    partNumber: "HICOM-SMP-026",
    name: "Rear End Panel Upper Brace Right Hand (BRACE RR END PNL UPR RH)",
    codeName: "BRACE RR END PNL UPR RH",
    lengthMm: 316,
    widthMm: 285,
    heightMm: 122,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-B",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPFC440 High Strength Steel (1.4 mm)",
    category: "Body Structure",
    shapeProfile: "brace_structural",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation (RH Paired)",
        description: "Draws symmetrical 122mm RH rear end corner and tail lamp recess.",
        pressLine: "MED-B",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims RH outer perimeter and pierces harness routing holes.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "FLG-UP, FLG-DO",
        fullName: "Bidirectional Flanging",
        description: "Wipes upper and lower flanges for RH body quarter panel weld.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "flange"
      },
      {
        opCode: "OP40",
        name: "C-RES, PIE, C-PIE, SEP",
        fullName: "Cam Restrike, Compound Piercing & Separation",
        description: "Restrikes lamp sealing flange and executes part separation.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 27,
    partNumber: "HICOM-SMP-027",
    name: "Front Door Beltline Outer Reinforcement LH (REINF FR DR BELTLINE OTR LH)",
    codeName: "REINF FR DR BELTLINE OTR LH",
    lengthMm: 968,
    widthMm: 164,
    heightMm: 73,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "MED-B",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPFC590 High Tensile Steel (1.4 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "beam_reinforcement",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation",
        description: "Draws 968mm door sash beltline stiffener with window regulator glass drop channel.",
        pressLine: "MED-B",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims outer perimeter addendum and punches door glass weatherstrip clip slots.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "PIE, SEP, CUT, P-RES",
        fullName: "Pierce, Separate, Cut and Pad Restrike",
        description: "Punches mirror reinforcement holes, parts component, and coins flat door skin mating pads.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "restrike"
      }
    ]
  },
  {
    id: 28,
    partNumber: "HICOM-SMP-028",
    name: "Front Door Beltline Outer Reinforcement RH (REINF FR DR BELTLINE OTR RH)",
    codeName: "REINF FR DR BELTLINE OTR RH",
    lengthMm: 968,
    widthMm: 164,
    heightMm: 73,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "MED-B",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPFC590 High Tensile Steel (1.4 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "beam_reinforcement",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation (RH Paired)",
        description: "Draws 968mm RH front door beltline sash stiffener.",
        pressLine: "MED-B",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims RH perimeter and pierces beltline weatherstrip clips.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "PIE, SEP, CUT, P-RES",
        fullName: "Compound Pierce, Separate and Pad Restrike",
        description: "Punches mirror attachment holes, parts RH component, and pad-restrikes datum flange.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "restrike"
      }
    ]
  },
  {
    id: 29,
    partNumber: "HICOM-SMP-029",
    name: "Front Door Side Impact Beam LH (REINF SIDE IMPACT FR DR LH)",
    codeName: "REINF SIDE IMPACT FR DR LH",
    lengthMm: 944,
    widthMm: 108,
    heightMm: 43,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "400T - 800T",
    materialSpec: "Ultra High Strength Steel SPFC980 (1.8 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "beam_reinforcement",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "High-Tonnage Crash Beam Draw",
        description: "Forms 944mm double-hat ultra-high strength side impact beam on 800-ton press.",
        pressLine: "MED-C",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Shears high tensile steel flanges and punches door hinge anchor holes.",
        pressLine: "MED-C",
        pressTonnage: 500,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "CUT",
        fullName: "Terminal Cut and Scrap Separation",
        description: "Cuts end mounting brackets to net length.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      },
      {
        opCode: "OP40",
        name: "RESTRIKE",
        fullName: "High-Tonnage Calibration Restrike",
        description: "Eliminates springback across 944mm span to ensure door frame collision intrusion limits.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "restrike"
      }
    ]
  },
  {
    id: 30,
    partNumber: "HICOM-SMP-030",
    name: "Front Door Side Impact Beam RH (REINF SIDE IMPACT FR DR RH)",
    codeName: "REINF SIDE IMPACT FR DR RH",
    lengthMm: 944,
    widthMm: 108,
    heightMm: 43,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "400T - 800T",
    materialSpec: "Ultra High Strength Steel SPFC980 (1.8 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "beam_reinforcement",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "High-Tonnage Crash Beam Draw (RH Paired)",
        description: "Forms 944mm double-hat RH door side impact beam on 800T press.",
        pressLine: "MED-C",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims RH flanges and pierces door lock striker anchor holes.",
        pressLine: "MED-C",
        pressTonnage: 500,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "CUT",
        fullName: "Terminal End Cut",
        description: "Cuts RH beam end mounting brackets.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      },
      {
        opCode: "OP40",
        name: "RESTRIKE",
        fullName: "High-Tonnage Calibration Restrike",
        description: "Sets final straightness and coining profiles against springback.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "restrike"
      }
    ]
  },
  {
    id: 31,
    partNumber: "HICOM-SMP-031",
    name: "Front Door Beltline Inner Reinforcement LH (REINF FR DR B LINE INR LH)",
    codeName: "REINF FR DR B LINE INR LH",
    lengthMm: 846,
    widthMm: 87,
    heightMm: 26,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "400T - 800T",
    materialSpec: "SPFC590 High Strength Steel (1.2 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "beam_reinforcement",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Drawing Operation",
        description: "Draws 846mm inner door beltline channel on 800T press.",
        pressLine: "MED-C",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "REST",
        fullName: "Restriking Calibration",
        description: "Coins glass weatherstrip channel for uniform cross-section.",
        pressLine: "MED-C",
        pressTonnage: 500,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "restrike"
      },
      {
        opCode: "OP30",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims perimeter flanges and pierces door trim clip holes.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP40",
        name: "CUT, SEP",
        fullName: "End Parting and Component Separation",
        description: "Cuts end tabs to finished geometry and detaches LH part from die carrier.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 32,
    partNumber: "HICOM-SMP-032",
    name: "Front Door Beltline Inner Reinforcement RH (REINF FR DR B LINE INR RH)",
    codeName: "REINF FR DR B LINE INR RH",
    lengthMm: 846,
    widthMm: 87,
    heightMm: 26,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-C",
    pressTonnageRange: "400T - 800T",
    materialSpec: "SPFC590 High Strength Steel (1.2 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "beam_reinforcement",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Drawing Operation (RH Paired)",
        description: "Draws 846mm RH inner beltline reinforcement channel.",
        pressLine: "MED-C",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "REST",
        fullName: "Restriking Calibration",
        description: "Coins RH glass guide channel.",
        pressLine: "MED-C",
        pressTonnage: 500,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "restrike"
      },
      {
        opCode: "OP30",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims RH margins and punches door card locators.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "trim"
      },
      {
        opCode: "OP40",
        name: "CUT, SEP",
        fullName: "End Parting and Separation",
        description: "Separates finished RH inner beltline reinforcement.",
        pressLine: "MED-C",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-C"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 33,
    partNumber: "HICOM-SMP-033",
    name: "Rear Door Beltline Outer Reinforcement LH (REINF RR/DR B/LINE OTR LH)",
    codeName: "REINF RR/DR B/LINE OTR LH",
    lengthMm: 1037,
    widthMm: 151,
    heightMm: 67,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "MED-B",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPFC590 High Tensile Steel (1.4 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "beam_reinforcement",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation",
        description: "Draws 1037mm rear door beltline glass run channel and quarter glass header.",
        pressLine: "MED-B",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims outer perimeter scrap and pierces weatherstrip retainer clips.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "PIE, SEP, CUT",
        fullName: "Piercing, Separation and Terminal Cut",
        description: "Punches door glass guide bolt holes, cuts end clearances, and separates LH part.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 34,
    partNumber: "HICOM-SMP-034",
    name: "Rear Door Beltline Outer Reinforcement RH (REINF RR/DR B/LINE OTR RH)",
    codeName: "REINF RR/DR B/LINE OTR RH",
    lengthMm: 1037,
    widthMm: 151,
    heightMm: 67,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "MED-B",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPFC590 High Tensile Steel (1.4 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "beam_reinforcement",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Deep Drawing Operation (RH Paired)",
        description: "Draws 1037mm RH rear door outer beltline reinforcement.",
        pressLine: "MED-B",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims RH outer perimeter and pierces seal retainer slots.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "PIE, SEP, CUT",
        fullName: "Piercing, Separation and Cut",
        description: "Final bolt hole piercing, end trimming, and part separation.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 35,
    partNumber: "HICOM-SMP-035",
    name: "Rear Door Side Impact Beam LH (REINF RR/DR S/IMPACT LH)",
    codeName: "REINF RR/DR S/IMPACT LH",
    lengthMm: 963,
    widthMm: 219,
    heightMm: 59,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-D",
    pressTonnageRange: "800T - 1300T",
    materialSpec: "Ultra High Strength Steel SPFC980 (2.0 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "beam_reinforcement",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Extra-High Tonnage Drawing Operation",
        description: "Massive 1300-ton draw forming 963mm ultra-high strength side impact intrusion beam on Heavy Line MED-D.",
        pressLine: "MED-D",
        pressTonnage: 1300,
        pressLineFullName: expandPressLineName("MED-D"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Heavy Trimming and Piercing",
        description: "800-ton shear trimming 2.0mm high-yield perimeter addendum and piercing anchor holes.",
        pressLine: "MED-D",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-D"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "TRIM",
        fullName: "Secondary Perimeter Trimming",
        description: "1300-ton secondary trimming of door latch pillar attachment tabs.",
        pressLine: "MED-D",
        pressTonnage: 1300,
        pressLineFullName: expandPressLineName("MED-D"),
        toolingAction: "trim"
      },
      {
        opCode: "OP40",
        name: "RES",
        fullName: "Restrike and Straightness Calibration",
        description: "800-ton coining to calibrate straightness and eliminate high-tensile springback.",
        pressLine: "MED-D",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-D"),
        toolingAction: "restrike"
      }
    ]
  },
  {
    id: 36,
    partNumber: "HICOM-SMP-036",
    name: "Rear Door Side Impact Beam RH (REINF RR/DR S/IMPACT RH)",
    codeName: "REINF RR/DR S/IMPACT RH",
    lengthMm: 963,
    widthMm: 219,
    heightMm: 59,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 4,
    totalDiesCount: 4,
    pressLineSummary: "MED-D",
    pressTonnageRange: "800T - 1300T",
    materialSpec: "Ultra High Strength Steel SPFC980 (2.0 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "beam_reinforcement",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Extra-High Tonnage Drawing Operation (RH)",
        description: "1300-ton deep draw of RH ultra-high strength beam on MED-D line.",
        pressLine: "MED-D",
        pressTonnage: 1300,
        pressLineFullName: expandPressLineName("MED-D"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Heavy Trimming and Piercing",
        description: "Trims RH crash beam margins and pierces mounting pads on 800T press.",
        pressLine: "MED-D",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-D"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "TRIM",
        fullName: "Secondary Perimeter Trimming",
        description: "1300-ton finish trim of door frame attachment joints.",
        pressLine: "MED-D",
        pressTonnage: 1300,
        pressLineFullName: expandPressLineName("MED-D"),
        toolingAction: "trim"
      },
      {
        opCode: "OP40",
        name: "RES",
        fullName: "Restrike and Straightness Calibration",
        description: "Coins crash beam flanges to zero-springback tolerance.",
        pressLine: "MED-D",
        pressTonnage: 800,
        pressLineFullName: expandPressLineName("MED-D"),
        toolingAction: "restrike"
      }
    ]
  },
  {
    id: 37,
    partNumber: "HICOM-SMP-037",
    name: "Hood Lock Outer Reinforcement (REINF HOOD LOCK OUTER)",
    codeName: "REINF HOOD LOCK OUTER",
    lengthMm: 500,
    widthMm: 123,
    heightMm: 33,
    devType: "Medium Line",
    devTypeCode: "ML",
    diesType: "Cast Iron Die",
    diesTypeCode: "CAST",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "MED-B",
    pressTonnageRange: "300T - 400T",
    materialSpec: "SPFC440 High Tensile Steel (1.4 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "brace_structural",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Drawing Operation",
        description: "Draws 500mm hood latch striker pocket and radiator upper support channel.",
        pressLine: "MED-B",
        pressTonnage: 400,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM",
        fullName: "Perimeter Trimming Operation",
        description: "Trims perimeter flanges and radiator clearance notches.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "TRIM, PIE",
        fullName: "Secondary Trim and Latch Piercing",
        description: "Trims mounting tabs and pierces hood latch striker fastener pattern.",
        pressLine: "MED-B",
        pressTonnage: 300,
        pressLineFullName: expandPressLineName("MED-B"),
        toolingAction: "pierce"
      }
    ]
  },
  {
    id: 38,
    partNumber: "HICOM-SMP-038",
    name: "Trunk Lid Hinge Reinforcement Left Hand (REINF TRUNK LID HINGE LH)",
    codeName: "REINF TRUNK LID HINGE LH",
    lengthMm: 148,
    widthMm: 104,
    heightMm: 39,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "SP15",
    pressTonnageRange: "150T",
    materialSpec: "SAPH440 High Yield Plate (2.0 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Drawing Operation",
        description: "Draws trunk hinge gooseneck attachment recess.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims bracket perimeter and pierces trunk torsion spring anchor hole.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "SEP, PIE",
        fullName: "Part Separation and Hinge Bolt Piercing",
        description: "Pierces M8 trunk lid hinge bolt holes and separates part from carrier strip.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 39,
    partNumber: "HICOM-SMP-039",
    name: "Trunk Lid Hinge Reinforcement Right Hand (REINF TRUNK LID HINGE RH)",
    codeName: "REINF TRUNK LID HINGE RH",
    lengthMm: 148,
    widthMm: 104,
    heightMm: 39,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "SP15",
    pressTonnageRange: "150T",
    materialSpec: "SAPH440 High Yield Plate (2.0 mm)",
    category: "Closure & Reinforcement",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP10",
        name: "DRAW",
        fullName: "Drawing Operation (RH Paired)",
        description: "Draws symmetrical RH trunk hinge reinforcement pocket on 150T line.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "TRIM, PIE",
        fullName: "Trimming and Piercing Operation",
        description: "Trims perimeter and pierces RH torsion spring locator.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "trim"
      },
      {
        opCode: "OP30",
        name: "SEP, PIE",
        fullName: "Part Separation and Hinge Bolt Piercing",
        description: "Final M8 bolt piercing and component separation.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 40,
    partNumber: "HICOM-SMP-040",
    name: "Impact Beam Adapter Left Hand (ADAPTER IMPACT BEAM LH)",
    codeName: "ADAPTER IMPACT BEAM LH",
    lengthMm: 157,
    widthMm: 95,
    heightMm: 62,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 1,
    formingDiesCount: 4,
    totalDiesCount: 5,
    pressLineSummary: "SP25 / SP15",
    pressTonnageRange: "150T - 250T",
    materialSpec: "SAPH440 Heavy Gauge Structural Steel (2.3 mm)",
    category: "Chassis & Engine Mounting",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP05",
        name: "BLANK",
        fullName: "Blanking Operation",
        description: "Cuts adapter blank with tooling register ears on 250T blanking press.",
        pressLine: "SP25",
        pressTonnage: 250,
        pressLineFullName: expandPressLineName("SP25"),
        toolingAction: "blank"
      },
      {
        opCode: "OP10",
        name: "FORM, FLG",
        fullName: "Forming and Flanging Operation",
        description: "Forms adapter mounting channel and wipes lower frame flange.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "BEND",
        fullName: "Primary Bending Operation",
        description: "Bends impact beam attachment ear 45 degrees.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "bend"
      },
      {
        opCode: "OP30",
        name: "BEND",
        fullName: "Secondary Bending and Restrike",
        description: "Bends to 90 degrees and restrikes crash-box contact faces.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "bend"
      },
      {
        opCode: "OP40",
        name: "PIERCE",
        fullName: "Precision Hole Piercing",
        description: "Punches high-grade structural bumper bolt pattern.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "pierce"
      }
    ]
  },
  {
    id: 41,
    partNumber: "HICOM-SMP-041",
    name: "Impact Beam Adapter Right Hand (ADAPTER IMPACT BEAM RH)",
    codeName: "ADAPTER IMPACT BEAM RH",
    lengthMm: 157,
    widthMm: 95,
    heightMm: 62,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 0,
    formingDiesCount: 1,
    totalDiesCount: 1,
    pressLineSummary: "SP15",
    pressTonnageRange: "150T",
    materialSpec: "SAPH440 Heavy Gauge Structural Steel (2.3 mm)",
    category: "Chassis & Engine Mounting",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP10-OP30 SHARE",
        name: "#OP10 SHARE, #OP20 SHARE, #OP30 SHARE",
        fullName: "Shared Multi-Cavity Tooling (Forming, Bending)",
        description: "Shares multi-cavity forming and bending die block simultaneously with LH partner.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "draw"
      },
      {
        opCode: "PIERCE",
        name: "PIERCE",
        fullName: "Dedicated RH Piercing Operation",
        description: "Punches dedicated right-hand crash beam bolt holes and alignment pin.",
        pressLine: "SP15",
        pressTonnage: 150,
        pressLineFullName: expandPressLineName("SP15"),
        toolingAction: "pierce"
      }
    ]
  },
  {
    id: 42,
    partNumber: "HICOM-SMP-042",
    name: "Suspension Strut Tower House Plate Left Hand (PLATE STRUT HOUSE LH)",
    codeName: "PLATE STRUT HOUSE LH",
    lengthMm: 147,
    widthMm: 128,
    heightMm: 73,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 1,
    formingDiesCount: 3,
    totalDiesCount: 4,
    pressLineSummary: "SP25 / SP20A",
    pressTonnageRange: "200T - 250T",
    materialSpec: "SAPH440 Structural Steel Plate (2.5 mm)",
    category: "Chassis & Engine Mounting",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP05",
        name: "BLANK",
        fullName: "Blanking Operation",
        description: "Cuts heavy plate blank on 250T blanking press.",
        pressLine: "SP25",
        pressTonnage: 250,
        pressLineFullName: expandPressLineName("SP25"),
        toolingAction: "blank"
      },
      {
        opCode: "OP10",
        name: "FORM",
        fullName: "Forming Operation",
        description: "Forms strut dome crown radius and reinforcing perimeter step on 200T press.",
        pressLine: "SP20A",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20A"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "PIE, C-PIE",
        fullName: "Piercing and Cam Piercing Operation",
        description: "Punches central suspension strut mount hole and angled shock bolt holes.",
        pressLine: "SP20A",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20A"),
        toolingAction: "pierce"
      },
      {
        opCode: "OP30",
        name: "SEP, CUT",
        fullName: "Separation and Finish Cut",
        description: "Shears carrier lugs and separates finished LH strut house plate.",
        pressLine: "SP20A",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20A"),
        toolingAction: "separate"
      }
    ]
  },
  {
    id: 43,
    partNumber: "HICOM-SMP-043",
    name: "Suspension Strut Tower House Plate Right Hand (PLATE STRUT HOUSE RH)",
    codeName: "PLATE STRUT HOUSE RH",
    lengthMm: 147,
    widthMm: 128,
    heightMm: 73,
    devType: "Small Line",
    devTypeCode: "SL",
    diesType: "Tool Steel Die",
    diesTypeCode: "STEEL",
    blankDiesCount: 0,
    formingDiesCount: 3,
    totalDiesCount: 3,
    pressLineSummary: "SP20A",
    pressTonnageRange: "200T",
    materialSpec: "SAPH440 Structural Steel Plate (2.5 mm)",
    category: "Chassis & Engine Mounting",
    shapeProfile: "bracket_angular",
    operations: [
      {
        opCode: "OP10",
        name: "FORM",
        fullName: "Forming Operation (RH Paired)",
        description: "Forms symmetrical RH suspension strut dome and flange contour.",
        pressLine: "SP20A",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20A"),
        toolingAction: "draw"
      },
      {
        opCode: "OP20",
        name: "PIE, C-PIE",
        fullName: "Piercing and Cam Piercing Operation",
        description: "Punches RH strut through-hole and cam-punches angled flange holes.",
        pressLine: "SP20A",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20A"),
        toolingAction: "pierce"
      },
      {
        opCode: "OP30",
        name: "SEP, CUT",
        fullName: "Separation and Cut",
        description: "Trims runner scrap and detaches completed RH strut plate.",
        pressLine: "SP20A",
        pressTonnage: 200,
        pressLineFullName: expandPressLineName("SP20A"),
        toolingAction: "separate"
      }
    ]
  }
];
