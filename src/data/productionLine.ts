/**
 * HICOM Engineering Sdn Bhd - Stamping Production Line Dynamic Engine
 * Supports all 43 automotive parts with exact manufacturing process flows:
 * Material Feeding -> OP05 -> OP10 -> OP20 -> OP30 -> ... -> QC Defect Detection -> OK / NG Bin
 */

import { StampingPart, PartOperation } from './partsData';

export type ProductionStationType =
  | 'feeding'
  | 'stamping_op'
  | 'robot_arm'
  | 'conveyor'
  | 'qc_inspection'
  | 'sorting_ok'
  | 'sorting_ng';

export interface ProductionStation {
  id: string;
  type: ProductionStationType;
  title: string;
  subtitle: string;
  opCode?: string;
  opName?: string;
  opIndex?: number;
  robotIndex?: number;
  description: string;
  stationPositionX: number; // 3D X coordinate for camera focus and placement
  stationPositionZ: number;
  parameters: {
    label: string;
    value: string;
    badge?: string;
  }[];
  specifications: {
    machineModel: string;
    assignedLine: string;
    tonnage: string;
    toolingType: string;
    dieMaterial: string;
    strokeLength: string;
    horizontalReach?: string;
    verticalLift?: string;
    swingAngle?: string;
    shutHeight: string;
    spmRating: string;
    cushionPressure: string;
    cuttingClearance: string;
    lubrication: string;
    safetyStandard: string;
  };
  toolingNotes?: string;
}

/**
 * Calculate multi-machine production line layout coordinates
 */
export function calculateLineLayout(part: StampingPart) {
  const numOps = Math.max(1, part.operations?.length || 1);
  const spacing = 3.8; // Spacing between consecutive stamping presses
  const centerOffset = ((numOps - 1) * spacing) / 2;

  // Stamping press X positions
  const pressPositionsX = Array.from({ length: numOps }, (_, i) => i * spacing - centerOffset);

  // Material feeding station
  const feedingX = -centerOffset - 3.4;

  // Infeed robot arm (between Feeding and Press 0)
  const infeedRobotX = -centerOffset - 1.7;

  // Inter-press robot arms (between Press i-1 and Press i)
  const interPressRobotX = Array.from({ length: Math.max(0, numOps - 1) }, (_, i) => (i + 0.5) * spacing - centerOffset);

  // Outfeed transfer robot arm (between last Press and QC)
  const outfeedRobotX = (numOps - 1) * spacing - centerOffset + 1.7;

  // QC inspection gantry
  const qcX = (numOps - 1) * spacing - centerOffset + 3.4;

  // Sorting robot arm
  const sortingRobotX = (numOps - 1) * spacing - centerOffset + 4.9;

  // OK and NG Bins
  const binsX = (numOps - 1) * spacing - centerOffset + 6.3;

  // Positioned further forward in front of the stamping machines (~4 grid boxes / 2.0m clearance)
  const robotZ = 2.00;
  const sortingRobotZ = 1.15;

  return {
    numOps,
    spacing,
    centerOffset,
    feedingX,
    infeedRobotX,
    pressPositionsX,
    interPressRobotX,
    outfeedRobotX,
    qcX,
    sortingRobotX,
    binsX,
    robotZ,
    sortingRobotZ,
    totalSpan: binsX - feedingX
  };
}

/**
 * Generate the dynamic production line stations for any of the 43 parts
 */
export function generateProductionLineStations(part: StampingPart): ProductionStation[] {
  const stations: ProductionStation[] = [];
  const layout = calculateLineLayout(part);

  // 1. Material Feeding Station (Station 0)
  const isDirectBlank = part.operations.some(op => op.opCode.toUpperCase().includes('OP05') || op.name.toUpperCase().includes('BLANK'));
  stations.push({
    id: 'station-feeding',
    type: 'feeding',
    title: 'Material Feeding Station',
    subtitle: isDirectBlank ? 'Coil De-Coiler & Strip Feeder' : 'Pre-Cut Sheet Blank Destacker',
    description: 'Feeds raw automotive sheet metal strip or pre-sheared blank into the primary stamping station with automated alignment and forming lubrication.',
    stationPositionX: layout.feedingX,
    stationPositionZ: 0,
    parameters: [
      { label: 'Feed Material', value: part.materialSpec, badge: 'Raw Material' },
      { label: 'Sheet Thickness', value: part.materialSpec.includes('mm') ? part.materialSpec.match(/\(([^)]+)\)/)?.[1] || '1.4 mm' : '1.4 mm' },
      { label: 'Blank Dimensions', value: `${part.lengthMm || 400} × ${part.widthMm || 200} mm` },
      { label: 'Feeder Type', value: isDirectBlank ? 'Pneumatic Roller Feeder' : 'Vacuum Suction Destacker' },
      { label: 'Feeding Speed', value: '18 - 24 strokes/min' }
    ],
    specifications: {
      machineModel: 'HICOM Automated Destacker & Coil Uncoiler Feed Unit DS-450',
      assignedLine: part.pressLineSummary || 'MED-BLK',
      tonnage: 'N/A (Material Infeed Unit)',
      toolingType: 'Pneumatic Gripper Arm & Magnetic Separator',
      dieMaterial: 'High-Durability Polyurethane Cups & Ground Steel Rollers',
      strokeLength: 'Horizontal Feed Stroke: 650 mm',
      shutHeight: 'Adjustable Passline: 950 mm',
      spmRating: 'Max 28 SPM synchronized with press line',
      cushionPressure: 'Pneumatic Vacuum: -85 kPa',
      cuttingClearance: 'N/A',
      lubrication: 'Automated Electrostatic Oil Mist Coater',
      safetyStandard: 'ISO 12100 & OSHA Optical Light Curtain Safety Cage'
    }
  });

  // 2. Sequential Stamping Operations (Dedicated Physical Machine for each OP)
  if (!part.operations || part.operations.length === 0) {
    // If process information is missing for any part, clearly identify it as requiring process data
    stations.push({
      id: 'station-pending-data',
      type: 'stamping_op',
      title: 'Stamping Operations (Pending Process Data)',
      subtitle: 'Process Data Required',
      description: `Detailed tooling and operation data for part ${part.codeName} is currently awaiting engineering documentation sign-off from HICOM Tooling Department.`,
      stationPositionX: 0,
      stationPositionZ: 0,
      parameters: [
        { label: 'Status', value: 'Pending Process Data', badge: 'Action Required' },
        { label: 'Assigned Press Line', value: part.pressLineSummary || 'To Be Assigned' }
      ],
      specifications: {
        machineModel: 'HICOM Stamping Press Line',
        assignedLine: part.pressLineSummary || 'Pending Verification',
        tonnage: part.pressTonnageRange || '300T - 800T',
        toolingType: part.diesType,
        dieMaterial: part.diesTypeCode === 'CAST' ? 'FCD500 Ductile Cast Iron' : 'SKD11 / D2 Tool Steel',
        strokeLength: '350 mm Standard',
        shutHeight: '680 mm',
        spmRating: '18 - 24 SPM',
        cushionPressure: '450 kN',
        cuttingClearance: '8 - 10% sheet thickness',
        lubrication: 'Boundary High-Pressure Stamping Fluid',
        safetyStandard: 'JIS B 6402 Stamping Safety Regulation'
      },
      toolingNotes: 'Process documentation verification requested.'
    });
  } else {
    part.operations.forEach((op: PartOperation, idx: number) => {
      // Calculate realistic engineering parameters based on operation type and tonnage
      const isBlanking = op.toolingAction === 'blank';
      const isDrawing = op.toolingAction === 'draw';
      const isTrimming = op.toolingAction === 'trim';
      const isRestrike = op.toolingAction === 'restrike';
      const isPierce = op.toolingAction === 'pierce';
      const isProgressive = op.toolingAction === 'progressive';

      let cushionForce = '350 kN (Nitrogen Cylinders)';
      if (isDrawing) cushionForce = '550 - 750 kN (Controlled Blank Holder Force)';
      if (isBlanking) cushionForce = '200 kN (Stripper Spring Pad)';

      let dieMaterial = part.diesTypeCode === 'CAST' ? 'FCD500 / FCD600 Nodular Cast Iron' : 'JIS SKD11 / AISI D2 Cold Work Die Steel';
      if (isRestrike) dieMaterial = 'High-Strength Cr-Mo Alloy Steel with Hard Chrome Plate';

      const pressX = layout.pressPositionsX[idx] ?? 0;

      stations.push({
        id: `station-op-${idx}`,
        type: 'stamping_op',
        title: `${op.opCode} – ${op.name}`,
        subtitle: `${op.fullName} (${op.pressTonnage}T on ${op.pressLine})`,
        opCode: op.opCode,
        opName: op.name,
        opIndex: idx,
        description: op.description,
        stationPositionX: pressX, // Dedicated position for each physical stamping machine
        stationPositionZ: 0,
        parameters: [
          { label: 'Operation Code', value: op.opCode },
          { label: 'Process Name', value: op.name },
          { label: 'Assigned Press Line', value: op.pressLine, badge: op.pressLineFullName },
          { label: 'Nominal Press Force', value: `${op.pressTonnage} Metric Tons` },
          { label: 'Tooling Classification', value: part.diesType }
        ],
        specifications: {
          machineModel: `HICOM Heavy Automotive Stamping Press ${op.pressLine} (Station OP${idx + 1})`,
          assignedLine: `${op.pressLine} (${op.pressLineFullName})`,
          tonnage: `${op.pressTonnage} Metric Tons (${(op.pressTonnage * 9.80665).toFixed(0)} kN)`,
          toolingType: `${part.diesType} [${op.opCode} Tooling Set]`,
          dieMaterial: dieMaterial,
          strokeLength: isDrawing ? '380 mm Long Stroke' : '300 mm Standard Stroke',
          shutHeight: isDrawing ? '720 mm (Deep Cavity)' : '650 mm',
          spmRating: `${op.pressTonnage > 600 ? '16 - 20' : '20 - 26'} SPM Continuous`,
          cushionPressure: cushionForce,
          cuttingClearance: (isBlanking || isTrimming || isPierce) ? '9.0% Sheet Thickness (0.126 mm)' : 'N/A (Forming Surface)',
          lubrication: isDrawing ? 'Extreme Pressure Draw Lubricant (Viscosity 150 cSt)' : 'Synthetic Water-Soluble Stamping Mist',
          safetyStandard: 'Category 4 Optical Safety Curtains with Dual Monitored Hydraulic Valves'
        },
        toolingNotes: isProgressive
          ? 'Continuous Progressive Die: Combines multi-station piercing, forming and parting in a single synchronized die set.'
          : op.name.includes('SHARE')
          ? 'Shared Die Tooling: This operation utilizes common die components shared with the opposite-hand automotive part.'
          : undefined
      });
    });
  }

  // 3. QC Defect Detection Station
  stations.push({
    id: 'station-qc',
    type: 'qc_inspection',
    title: 'QC Defect Detection Station',
    subtitle: 'Automated Optical Machine Vision & Laser Triangulation',
    description: `Full surface and perimeter dimensional scanning. Automated AI vision checks the stamped part against 15 automotive stamping defect categories (Burr, Crack, Wrinkling, Thinning, Springback, etc.).`,
    stationPositionX: layout.qcX,
    stationPositionZ: 0,
    parameters: [
      { label: 'Inspection System', value: 'High-Resolution 3-Camera Optical Matrix', badge: 'AI Vision QC' },
      { label: 'Scan Cycle Time', value: '1.2 seconds / component' },
      { label: 'Defect Resolution', value: '0.02 mm (20 microns)' }
    ],
    specifications: {
      machineModel: 'HICOM Automated Vision QC Tunnel VQ-3000 Series',
      assignedLine: 'Post-Press Inspection Line',
      tonnage: 'N/A (Optical Inspection Station)',
      toolingType: 'Overhead Triangulation Laser & 3x 20MP Telecentric Industrial Cameras',
      dieMaterial: 'Hard Anodized Aerospace Aluminum Bridge with Anti-Vibration Isolation',
      strokeLength: 'Continuous Laser Sweep (300 mm scan width)',
      shutHeight: 'Tunnel Clearance: 450 mm',
      spmRating: 'Up to 30 parts/minute line inspection',
      cushionPressure: 'N/A',
      cuttingClearance: 'Edge burr detection sensitivity: > 0.08 mm',
      lubrication: 'Air-Knife Lens Purge to prevent oil mist contamination',
      safetyStandard: 'Class 2M Eye-Safe Solid-State Inspection Laser (520 nm)'
    }
  });

  // 4. Sorting Station - OK Bin
  stations.push({
    id: 'station-bin-ok',
    type: 'sorting_ok',
    title: 'OK Parts Bin',
    subtitle: 'Automated Part Stacking & Palletizing',
    description: `Conforming automotive stampings meeting all dimensional tolerances and Class A/B surface requirements are robotically placed straight into the green OK production container for assembly/welding.`,
    stationPositionX: layout.binsX,
    stationPositionZ: -0.65,
    parameters: [
      { label: 'Sorting Action', value: 'Robotic Pick-and-Place Pass' },
      { label: 'Container Type', value: 'Standard Steel Wire Mesh Pallet Box' },
      { label: 'Batch Lot Size', value: '500 parts / container' }
    ],
    specifications: {
      machineModel: 'HICOM Automated Parts Stacking & Palletizer OK-500',
      assignedLine: 'Downstream Finished Goods Logistics',
      tonnage: 'N/A (Sorting Logistics)',
      toolingType: 'Robotic Vacuum Gripper & Soft-Touch Part Stacking Baffles',
      dieMaterial: 'Urethane-Cushioned Drop Guide to prevent cosmetic denting',
      strokeLength: 'Robotic Transfer: 1200 mm',
      shutHeight: 'Bin Infeed Height: 850 mm',
      spmRating: 'Synchronized with Press Line Speed',
      cushionPressure: 'N/A',
      cuttingClearance: 'N/A',
      lubrication: 'Dry / Residual Light Film',
      safetyStandard: 'ISO 13849-1 Category 3 Safety Enclosure'
    }
  });

  // 5. Sorting Station - NG Bin
  stations.push({
    id: 'station-bin-ng',
    type: 'sorting_ng',
    title: 'NG Parts Bin',
    subtitle: 'Automated Robotic Reject Segregation',
    description: `Non-conforming parts with detected defects (e.g. edge burrs, cracks, excessive wrinkling, split tears) are automatically transferred by the sorting robot arm into the red NG bin for rework or scrap logging.`,
    stationPositionX: layout.binsX,
    stationPositionZ: 0.65,
    parameters: [
      { label: 'Sorting Action', value: 'Robotic Defect Segregation' },
      { label: 'Transfer Actuation', value: '< 2.0 seconds' },
      { label: 'Segregation', value: '100% Defect Containment' }
    ],
    specifications: {
      machineModel: 'HICOM High-Speed Robotic Reject Segregation Unit NG-250',
      assignedLine: 'Quality Assurance Quarantine Spur',
      tonnage: 'N/A (Reject Segregation)',
      toolingType: 'Articulated Robot Arm with Protective Rubber Wiper & Vacuum Cups',
      dieMaterial: 'Heavy-Gauge Powder-Coated Steel Reject Container',
      strokeLength: 'Robot Swing: 60 degrees into NG bin',
      shutHeight: 'Bin Height: 800 mm',
      spmRating: 'Instantaneous trigger on defect signal',
      cushionPressure: 'Pneumatic Actuator: 6.0 bar line pressure',
      cuttingClearance: 'N/A',
      lubrication: 'N/A',
      safetyStandard: 'Automated Safety Interlock with Alarm Beacon & MES Lot Traceability'
    }
  });

  return stations;
}

/**
 * Generate dedicated specifications for all Pick-and-Place Robot Arms on the line
 */
export function generateRobotArmStations(part: StampingPart): ProductionStation[] {
  const layout = calculateLineLayout(part);
  const numOps = layout.numOps;
  const arms: ProductionStation[] = [];

  // Infeed Robot Arm (Feeding to First OP)
  const firstOpCode = part.operations[0]?.opCode || 'OP05';
  arms.push({
    id: 'station-robot-infeed',
    type: 'robot_arm',
    title: `Infeed Robot Arm: Material Feeding to ${firstOpCode}`,
    subtitle: '6-Axis Industrial Automation Robot with Vacuum Gripper',
    robotIndex: 0,
    description: `Picks raw sheet metal blank from destacker staging table using multi-cup vacuum end-effector, lifts, swings across, and accurately nests blank onto ${firstOpCode} lower die pins.`,
    stationPositionX: layout.infeedRobotX,
    stationPositionZ: layout.robotZ,
    parameters: [
      { label: 'Transfer Route', value: `Feeding Destacker to ${firstOpCode}` },
      { label: 'Gripper Tooling', value: '6-Cup Vacuum Suction Tooling Frame' },
      { label: 'Payload Capacity', value: '210 kg (Heavy Duty Automotive)' },
      { label: 'Vacuum Pressure', value: '-85 kPa (Pneumatic Venturi Ejector)' },
      { label: 'Repeatability', value: '±0.05 mm Positioning Accuracy' }
    ],
    specifications: {
      machineModel: 'FANUC R-2000iC / 210F Heavy Press Automation Robot',
      assignedLine: part.pressLineSummary || 'MED-B',
      tonnage: '210 kg',
      toolingType: 'Lightweight Aluminum Vacuum Tooling Frame with 6x Polyurethane Suction Cups',
      dieMaterial: 'Oil-Resistant Nitrile / Polyurethane Vacuum Bellows Cups',
      strokeLength: '3,100 mm',
      horizontalReach: '3,100 mm',
      verticalLift: '850 mm',
      swingAngle: '81°',
      shutHeight: 'Passline Working Height: 950 mm',
      spmRating: 'Up to 16 transfer cycles/min',
      cushionPressure: 'Air Supply: 6.0 bar filtered dry air',
      cuttingClearance: 'Dynamic Path Deviation: < 0.08 mm',
      lubrication: 'Synthetic High-Torque Gear Grease (Molykote)',
      safetyStandard: 'Dual Check Safety (DCS) Interlocked with Press TDC Safety Curtains'
    }
  });

  // Inter-Press Robot Arms (Between consecutive OP stamping presses)
  for (let i = 0; i < numOps - 1; i++) {
    const fromOp = part.operations[i];
    const toOp = part.operations[i + 1];
    const fromCode = fromOp?.opCode || `OP${(i + 1) * 10}`;
    const toCode = toOp?.opCode || `OP${(i + 2) * 10}`;
    const robotX = layout.interPressRobotX[i] ?? 0;

    arms.push({
      id: `station-robot-${i + 1}`,
      type: 'robot_arm',
      title: `Robot Arm ${i + 1}: ${fromCode} to ${toCode}`,
      subtitle: `Inter-Press Part Transfer (${fromOp?.name || 'Form'} to ${toOp?.name || 'Next'})`,
      robotIndex: i + 1,
      description: `Picks stamped component from ${fromCode} die upon press ram ascent, lifts clear of guide pins, executes high-speed horizontal transfer swing, and places part into ${toCode} die bolster.`,
      stationPositionX: robotX,
      stationPositionZ: layout.robotZ,
      parameters: [
        { label: 'Transfer Route', value: `${fromCode} to ${toCode}` },
        { label: 'Gripper Tooling', value: 'Contoured Vacuum Suction Frame with Part Sensors' },
        { label: 'Payload Capacity', value: '210 kg Heavy Capacity' },
        { label: 'Cycle Time', value: '2.1 seconds per transfer' },
        { label: 'Vacuum Verification', value: 'Digital Vacuum Pressure Switch Confirmed' }
      ],
      specifications: {
        machineModel: `KUKA KR 210 R2700-2 / FANUC R-2000iC Press Transfer Robot`,
        assignedLine: toOp?.pressLine || part.pressLineSummary || 'MED-B',
        tonnage: '210 kg',
        toolingType: 'Cross-Beam EOAT Frame with Compliant Vacuum Cups & Proximity Sensors',
        dieMaterial: 'Anti-Static Polyurethane Cups with Internal Mesh Filters',
        strokeLength: '3,100 mm',
        horizontalReach: '3,100 mm',
        verticalLift: '900 mm',
        swingAngle: '87°',
        shutHeight: 'Die Cavity Entry Clearance: 450 mm',
        spmRating: 'Synchronized with Press Line Speed (Up to 22 SPM)',
        cushionPressure: 'Operating Vacuum: -82 to -88 kPa',
        cuttingClearance: 'Tooling Orientation Accuracy: ±0.03°',
        lubrication: 'Central Sealed Gearboxes with Food-Grade Synthetic Lubricant',
        safetyStandard: 'ISO 10218-1 Industrial Robot Safety & SafeMove Hardware Interlock'
      }
    });
  }

  // Outfeed Transfer Robot Arm (Last OP to QC Inspection Station)
  const lastOp = part.operations[numOps - 1];
  const lastOpCode = lastOp?.opCode || `OP${numOps * 10}`;
  arms.push({
    id: 'station-robot-outfeed',
    type: 'robot_arm',
    title: `Outfeed Robot Arm: ${lastOpCode} to QC Inspection`,
    subtitle: 'Automated Post-Stamping Transfer to Vision Station',
    robotIndex: numOps,
    description: `Extracts completed stamped part from final operation ${lastOpCode} and smoothly transfers it onto the precision optical inspection fixture beneath the QC defect vision cameras.`,
    stationPositionX: layout.outfeedRobotX,
    stationPositionZ: layout.robotZ,
    parameters: [
      { label: 'Transfer Route', value: `${lastOpCode} to QC Vision Station` },
      { label: 'Gripper Tooling', value: 'Soft-Touch Vacuum Cups (Anti-Marring)' },
      { label: 'Part Handling', value: 'Gentle Placement on Anodized QC Nest' },
      { label: 'Cycle Synchronization', value: 'TDC Signal Triggered' }
    ],
    specifications: {
      machineModel: 'ABB IRB 6700-205 / FANUC M-900iB Finished Goods Robot',
      assignedLine: 'Post-Press Inspection Automation',
      tonnage: '205 kg',
      toolingType: 'Class-A Surface Protective Vacuum Gripper',
      dieMaterial: 'Non-Marking White EPDM / Fluoroelastomer Suction Cups',
      strokeLength: '3,100 mm',
      horizontalReach: '3,100 mm',
      verticalLift: '950 mm',
      swingAngle: '81°',
      shutHeight: 'Inspection Table Passline: 950 mm',
      spmRating: 'Synchronized with QC Scan Cycle (1.2 s)',
      cushionPressure: 'Vacuum Supply: -85 kPa with Blow-Off Pulse',
      cuttingClearance: 'Placement Repeatability: ±0.03 mm',
      lubrication: 'Sealed Lifetime Grease Lubricated Bearings',
      safetyStandard: 'Category 4 Optical Safety Barrier & Robot Zone Restriction'
    }
  });

  // Sorting Robot Arm (QC to OK Bin or NG Bin)
  arms.push({
    id: 'station-robot-sorting',
    type: 'robot_arm',
    title: 'Sorting Robot Arm: QC Station to OK / NG Bin',
    subtitle: 'Automated Defect Segregation & Pallet Stacking',
    robotIndex: numOps + 1,
    description: `Receives pass/fail verdict from the automated vision inspection system. Conforming parts are neatly stacked into the green OK pallet box; defective parts are segregated into the red NG quarantine container.`,
    stationPositionX: layout.sortingRobotX,
    stationPositionZ: layout.sortingRobotZ,
    parameters: [
      { label: 'Transfer Route', value: 'QC Station to OK Bin / NG Bin' },
      { label: 'Gripper Tooling', value: 'High-Speed Dual-Zone Vacuum Gripper with Blow-Off' },
      { label: 'Decision Logic', value: 'Vision Verdict (PASS: OK Bin | DEFECT: NG Bin)' },
      { label: 'Sorting Speed', value: '< 1.8 seconds per cycle' },
      { label: 'Defect Containment', value: '100% Poka-Yoke Automated Segregation' }
    ],
    specifications: {
      machineModel: 'HICOM Automated Palletizing & Sorting Robot PSR-200',
      assignedLine: 'Quality Sorting & Logistics Spur',
      tonnage: '180 kg',
      toolingType: 'High-Speed Dual-Zone Vacuum Gripper with Blow-Off Assist',
      dieMaterial: 'Soft Urethane Surface Protection Pads',
      strokeLength: '2,600 mm',
      horizontalReach: '2,600 mm',
      verticalLift: '750 mm',
      swingAngle: '180°',
      shutHeight: 'Pallet Container Height: 850 mm',
      spmRating: 'Up to 24 parts/minute sorting throughput',
      cushionPressure: 'Operating Vacuum: -80 kPa',
      cuttingClearance: 'Stacking Precision: ±1.0 mm in pallet guide frame',
      lubrication: 'Low-Maintenance Synthetic Grease',
      safetyStandard: 'Automated Light Curtain Enclosure & MES Traceability Gateway'
    }
  });

  return arms;
}

