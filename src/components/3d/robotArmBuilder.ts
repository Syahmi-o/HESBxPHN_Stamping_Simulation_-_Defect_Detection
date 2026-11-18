/**
 * HICOM Engineering - Industrial Pick-and-Place Robot Arm 3D Builder
 * High-fidelity 6-DOF industrial press transfer robot with pneumatic vacuum suction tooling
 */

import * as THREE from 'three';

export interface RobotArmAssembly {
  rootGroup: THREE.Group;
  baseTurret: THREE.Group;
  shoulderGroup: THREE.Group;
  elbowGroup: THREE.Group;
  wristGroup: THREE.Group;
  toolingFrame: THREE.Group;
  vacuumCups: THREE.Mesh[];
  suctionStatusLight: THREE.Mesh;
  clickHitbox: THREE.Mesh;
  toolCenterPoint: THREE.Group;
  index: number;
}

export interface RobotMaterials {
  robotOrange: THREE.MeshStandardMaterial;
  robotDark: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  suctionCupMat: THREE.MeshStandardMaterial;
  hazardStripeMat: THREE.MeshBasicMaterial;
  vacuumActiveMat: THREE.MeshStandardMaterial;
  vacuumInactiveMat: THREE.MeshStandardMaterial;
}

/**
 * Creates reusable PBR materials for industrial robot arms
 */
export function createRobotMaterials(): RobotMaterials {
  return {
    robotOrange: new THREE.MeshStandardMaterial({
      color: 0xF59E0B, // Industrial Safety Yellow / Amber (FANUC / KUKA press line standard)
      metalness: 0.35,
      roughness: 0.38
    }),
    robotDark: new THREE.MeshStandardMaterial({
      color: 0x1E293B, // Heavy cast steel gray
      metalness: 0.65,
      roughness: 0.45
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xE2E8F0,
      metalness: 0.95,
      roughness: 0.12
    }),
    suctionCupMat: new THREE.MeshStandardMaterial({
      color: 0x0284C7, // Industrial vacuum polyurethane blue
      metalness: 0.15,
      roughness: 0.55
    }),
    hazardStripeMat: new THREE.MeshBasicMaterial({
      color: 0xD97706
    }),
    vacuumActiveMat: new THREE.MeshStandardMaterial({
      color: 0x10B981,
      emissive: 0x10B981,
      emissiveIntensity: 0.8,
      roughness: 0.2
    }),
    vacuumInactiveMat: new THREE.MeshStandardMaterial({
      color: 0x475569,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.6
    })
  };
}

/**
 * Builds an authentic 6-DOF industrial pick-and-place robot arm
 */
export function buildRobotArmMesh(
  index: number,
  posX: number,
  posZ: number,
  label: string,
  materials: RobotMaterials
): RobotArmAssembly {
  const rootGroup = new THREE.Group();
  rootGroup.name = `RobotArm_${index}_${label}`;
  rootGroup.position.set(posX, 0, posZ);

  // 1. Heavy Floor Pedestal / Base Plate
  const pedestalBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.65, 0.22, 16),
    materials.robotDark
  );
  pedestalBase.position.y = 0.11;
  pedestalBase.castShadow = true;
  rootGroup.add(pedestalBase);

  // Hazard Ring
  const hazardRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.66, 0.66, 0.06, 16),
    materials.hazardStripeMat
  );
  hazardRing.position.y = 0.03;
  rootGroup.add(hazardRing);

  // Anchor Bolts
  const boltGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8);
  for (let b = 0; b < 6; b++) {
    const angle = (b / 6) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeom, materials.chrome);
    bolt.position.set(Math.cos(angle) * 0.52, 0.23, Math.sin(angle) * 0.52);
    rootGroup.add(bolt);
  }

  // 2. J1 Rotating Base Turret (Waist)
  const baseTurret = new THREE.Group();
  baseTurret.position.y = 0.22;

  const turretHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.48, 0.45, 16),
    materials.robotOrange
  );
  turretHousing.position.y = 0.225;
  turretHousing.castShadow = true;
  baseTurret.add(turretHousing);

  const turretCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.42, 0.12, 16),
    materials.robotDark
  );
  turretCap.position.y = 0.48;
  baseTurret.add(turretCap);

  // 3. J2 Shoulder Joint & Fork
  const shoulderGroup = new THREE.Group();
  shoulderGroup.position.set(0, 0.52, 0);

  const shoulderPivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.42, 16),
    materials.robotDark
  );
  shoulderPivot.rotation.x = Math.PI / 2;
  shoulderPivot.castShadow = true;
  shoulderGroup.add(shoulderPivot);

  // Counterbalance Balancer Cylinder on the rear
  const balancerBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.65, 12),
    materials.robotDark
  );
  balancerBarrel.position.set(-0.25, 0.25, 0);
  balancerBarrel.rotation.z = -0.4;
  shoulderGroup.add(balancerBarrel);

  const balancerRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.45, 12),
    materials.chrome
  );
  balancerRod.position.set(-0.35, 0.45, 0);
  balancerRod.rotation.z = -0.4;
  shoulderGroup.add(balancerRod);

  // Upper Arm Boom Link (Length = 1.60 m for comfortable front-aisle reach)
  const upperArmBoom = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 1.60, 0.28),
    materials.robotOrange
  );
  upperArmBoom.position.set(0, 0.78, 0);
  upperArmBoom.castShadow = true;
  shoulderGroup.add(upperArmBoom);

  baseTurret.add(shoulderGroup);

  // 4. J3 Elbow Joint & Forearm Link
  const elbowGroup = new THREE.Group();
  elbowGroup.position.set(0, 1.60, 0);

  const elbowPivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.36, 16),
    materials.robotDark
  );
  elbowPivot.rotation.x = Math.PI / 2;
  elbowPivot.castShadow = true;
  elbowGroup.add(elbowPivot);

  // Forearm Body (Length = 1.50 m -> Total kinematic reach = 3.10 m)
  const forearmBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.50, 0.22),
    materials.robotOrange
  );
  forearmBody.position.set(0, 0.73, 0);
  forearmBody.castShadow = true;
  elbowGroup.add(forearmBody);

  // Servo Motor Housings on forearm
  const servoMotor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12),
    materials.robotDark
  );
  servoMotor.position.set(0.16, 0.34, 0);
  elbowGroup.add(servoMotor);

  shoulderGroup.add(elbowGroup);

  // 5. J4/J5/J6 3-Axis Wrist Assembly
  const wristGroup = new THREE.Group();
  wristGroup.position.set(0, 1.50, 0);

  const wristHub = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    materials.robotDark
  );
  wristGroup.add(wristHub);

  const toolFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.12, 16),
    materials.chrome
  );
  toolFlange.position.y = 0.12;
  wristGroup.add(toolFlange);

  // 6. Vacuum Suction End-Effector (EOAT) Tooling Frame
  const toolingFrame = new THREE.Group();
  toolingFrame.position.y = 0.18;

  // Aluminum cross-beam structure
  const crossBeamMain = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.05, 0.95),
    materials.chrome
  );
  crossBeamMain.castShadow = true;
  toolingFrame.add(crossBeamMain);

  const crossBeamFront = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.04, 0.06),
    materials.chrome
  );
  crossBeamFront.position.set(0, 0, 0.35);
  const crossBeamBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.04, 0.06),
    materials.chrome
  );
  crossBeamBack.position.set(0, 0, -0.35);
  toolingFrame.add(crossBeamFront, crossBeamBack);

  // Vacuum Suction Cups (6 Bellows Cups)
  const vacuumCups: THREE.Mesh[] = [];
  const cupGeom = new THREE.CylinderGeometry(0.055, 0.075, 0.08, 12);
  const cupStemGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8);

  const cupPositions = [
    [-0.24, 0.35],
    [0, 0.35],
    [0.24, 0.35],
    [-0.24, -0.35],
    [0, -0.35],
    [0.24, -0.35]
  ];

  cupPositions.forEach(([cx, cz]) => {
    const stem = new THREE.Mesh(cupStemGeom, materials.chrome);
    stem.position.set(cx, -0.06, cz);
    toolingFrame.add(stem);

    const cup = new THREE.Mesh(cupGeom, materials.suctionCupMat);
    cup.position.set(cx, -0.14, cz);
    cup.castShadow = true;
    toolingFrame.add(cup);
    vacuumCups.push(cup);
  });

  // Vacuum Status Signal LED
  const suctionStatusLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 12, 12),
    materials.vacuumInactiveMat
  );
  suctionStatusLight.position.set(0, 0.06, 0);
  toolingFrame.add(suctionStatusLight);

  // Tool Center Point (TCP) Anchor - At the exact face plane of the 6 vacuum suction cups
  const toolCenterPoint = new THREE.Group();
  toolCenterPoint.position.set(0, -0.18, 0);
  toolingFrame.add(toolCenterPoint);

  wristGroup.add(toolingFrame);
  elbowGroup.add(wristGroup);
  rootGroup.add(baseTurret);

  // 7. Click Hitbox for 3D Raycasting (Covers entire working envelope)
  const clickHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 3.2, 2.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  clickHitbox.position.set(0, 1.6, 0);
  rootGroup.add(clickHitbox);

  return {
    rootGroup,
    baseTurret,
    shoulderGroup,
    elbowGroup,
    wristGroup,
    toolingFrame,
    vacuumCups,
    suctionStatusLight,
    clickHitbox,
    toolCenterPoint,
    index
  };
}

/**
 * Calculates authentic industrial robot yaw angles based on 3D floor coordinates
 */
export function calculateRobotTransferAngles(
  robotX: number,
  robotZ: number,
  pickX: number,
  pickZ: number,
  placeX: number,
  placeZ: number
): { pickAngleY: number; placeAngleY: number; homeAngleY: number } {
  // Local +X rotated by yaw: dx = cos(yaw), dz = -sin(yaw) => yaw = atan2(-dz, dx)
  const pickAngleY = Math.atan2(-(pickZ - robotZ), pickX - robotX);
  const placeAngleY = Math.atan2(-(placeZ - robotZ), placeX - robotX);
  // Standby home faces into service aisle away from press line (rearward when robotZ < 0, forward when robotZ >= 0)
  const homeAngleY = robotZ >= 0 ? -Math.PI / 2 : Math.PI / 2;

  return { pickAngleY, placeAngleY, homeAngleY };
}

/**
 * Shortest-arc angle interpolation avoiding 360-degree wrapping discontinuity
 */
export function interpolateAngle(fromAngle: number, toAngle: number, t: number): number {
  let diff = (toAngle - fromAngle) % (2 * Math.PI);
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return fromAngle + diff * t;
}

/**
 * C2 continuous 5th-order minimum-jerk polynomial easing s(u) = 10u^3 - 15u^4 + 6u^5
 * Guarantees zero velocity and zero acceleration at endpoints, eliminating jerky motion.
 */
export function smoothQuintic(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return c * c * c * (10 + c * (-15 + 6 * c));
}

export interface RobotJointAngles {
  shoulder: number;
  elbow: number;
  wrist: number;
}

/**
 * Closed-form analytical 2-link + wrist inverse kinematics solver for 6-axis industrial robot
 * Calculates exact shoulder, elbow, and wrist pitch angles to reach target (R, Y)
 * while maintaining the suction tooling frame horizontally level and facing downward.
 */
export function solveRobotArmIK(
  targetR: number,
  targetY: number,
  shoulderY: number = 0.74,
  L1: number = 1.60,
  L2: number = 1.50
): RobotJointAngles {
  const dr = Math.max(0.2, targetR);
  const dy = targetY - shoulderY;
  let D = Math.hypot(dr, dy);

  // Clamp reach to physical kinematics limit (with 15mm safety margin to avoid singularity)
  const maxReach = L1 + L2 - 0.015;
  const minReach = Math.abs(L1 - L2) + 0.08;
  D = Math.max(minReach, Math.min(maxReach, D));

  // Law of Cosines for elbow interior angle
  const cosPsi = Math.max(-0.9999, Math.min(0.9999, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2)));
  const psi = Math.acos(cosPsi);
  const beta = Math.PI - psi;

  // Angle from vertical to target line
  const gamma = Math.atan2(dr, dy);

  // Angle between target line and upper arm
  const cosAlpha = Math.max(-0.9999, Math.min(0.9999, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D)));
  const alpha = Math.acos(cosAlpha);

  const phi1 = gamma - alpha;
  const theta_s = -phi1;
  const theta_e = -beta;
  const theta_w = -(theta_s + theta_e);

  return { shoulder: theta_s, elbow: theta_e, wrist: theta_w };
}

export interface StationPoint3D {
  x: number;
  y: number;
  z: number;
}

export interface RobotArmMotionState {
  isGripping: boolean;
  phaseName: 'standby' | 'approach' | 'grip' | 'lift' | 'swing' | 'place' | 'retract';
  suctionActive: boolean;
}

/**
 * Animate Robot Arm Kinematics for Pick-and-Place Motion Cycle
 * Uses analytical inverse kinematics and realistic 7-stage articulated motion:
 * 1. Approach: Arm unfolds and positions suction gripper directly above material
 * 2. Lower & Contact: Suction cups descend and make contact, vacuum engages
 * 3. Lift Vertically: Workpiece lifted vertically clear of die bolster and pins
 * 4. Transfer Swing: High-clearance Cartesian arc swing to destination
 * 5. Lower & Place: Workpiece lowered accurately into die cavity, vacuum releases
 * 6. Vertical Retract: Gripper retracts vertically clear of newly placed part
 * 7. Return to Standby: Arm folds back into compact parking pose in service aisle
 */
export function setRobotArmMotion(
  arm: RobotArmAssembly,
  phaseProgress: number, // 0.0 to 1.0 within the robot's active transfer window
  pickPosOrAngle: number | StationPoint3D,
  placePosOrAngle: number | StationPoint3D,
  isTransferring: boolean,
  materials: RobotMaterials,
  optPick?: StationPoint3D,
  optPlace?: StationPoint3D
): RobotArmMotionState {
  const robotX = arm.rootGroup.position.x;
  const robotZ = arm.rootGroup.position.z;
  const homeYaw = robotZ >= 0 ? -Math.PI / 2 : Math.PI / 2;

  if (!isTransferring) {
    // Rest / Standby Pose (Compact safety position completely clear of press die spaces in aisle)
    arm.baseTurret.rotation.y = homeYaw;
    arm.shoulderGroup.rotation.z = -0.55;
    arm.elbowGroup.rotation.z = 1.35;
    arm.wristGroup.rotation.z = -0.80;
    arm.toolingFrame.rotation.y = 0;
    arm.suctionStatusLight.material = materials.vacuumInactiveMat;
    return {
      isGripping: false,
      phaseName: 'standby',
      suctionActive: false
    };
  }

  // Resolve 3D station coordinates
  let pickPos: StationPoint3D;
  let placePos: StationPoint3D;

  if (typeof pickPosOrAngle === 'object' && pickPosOrAngle !== null) {
    pickPos = pickPosOrAngle;
  } else if (optPick) {
    pickPos = optPick;
  } else {
    const yaw = Number(pickPosOrAngle);
    const R = Math.max(2.15, Math.min(2.75, Math.abs(robotZ) * 1.35));
    pickPos = { x: robotX + R * Math.cos(yaw), y: 0.92, z: robotZ - R * Math.sin(yaw) };
  }

  if (typeof placePosOrAngle === 'object' && placePosOrAngle !== null) {
    placePos = placePosOrAngle;
  } else if (optPlace) {
    placePos = optPlace;
  } else {
    const yaw = Number(placePosOrAngle);
    const R = Math.max(2.15, Math.min(2.75, Math.abs(robotZ) * 1.35));
    placePos = { x: robotX + R * Math.cos(yaw), y: 0.92, z: robotZ - R * Math.sin(yaw) };
  }

  const pickAngleY = Math.atan2(-(pickPos.z - robotZ), pickPos.x - robotX);
  const placeAngleY = Math.atan2(-(placePos.z - robotZ), placePos.x - robotX);
  const pickR = Math.hypot(pickPos.x - robotX, pickPos.z - robotZ);
  const placeR = Math.hypot(placePos.x - robotX, placePos.z - robotZ);
  const liftY = Math.max(pickPos.y, placePos.y) + 0.40;

  let yawY = pickAngleY;
  let shoulderPitch = -0.55;
  let elbowPitch = 1.35;
  let wristPitch = -0.80;
  let isGripping = false;
  let suctionActive = false;
  let phaseName: RobotArmMotionState['phaseName'] = 'standby';

  if (phaseProgress < 0.14) {
    // 1. Approach: Unfold and rotate towards Station A, hover directly above material
    phaseName = 'approach';
    const u = phaseProgress / 0.14;
    const s = smoothQuintic(u);
    yawY = interpolateAngle(homeYaw, pickAngleY, s);

    const hoverIK = solveRobotArmIK(pickR, pickPos.y + 0.35);
    shoulderPitch = -0.55 + (hoverIK.shoulder - (-0.55)) * s;
    elbowPitch = 1.35 + (hoverIK.elbow - 1.35) * s;
    wristPitch = -0.80 + (hoverIK.wrist - (-0.80)) * s;
    arm.toolingFrame.rotation.y = -yawY;
    suctionActive = false;
    isGripping = false;

  } else if (phaseProgress < 0.24) {
    // 2. Lower & Contact: Descend suction cups directly onto material, activate suction
    phaseName = 'grip';
    const u = (phaseProgress - 0.14) / 0.10;
    const s = smoothQuintic(u);
    yawY = pickAngleY;

    const currY = pickPos.y + 0.35 * (1 - s);
    const contactIK = solveRobotArmIK(pickR, currY);
    shoulderPitch = contactIK.shoulder;
    elbowPitch = contactIK.elbow;
    wristPitch = contactIK.wrist;
    arm.toolingFrame.rotation.y = -yawY;

    suctionActive = u >= 0.70;
    isGripping = u >= 0.70;

  } else if (phaseProgress < 0.36) {
    // 3. Vertical Lift: Raise workpiece vertically clear of die pins and bolster
    phaseName = 'lift';
    const u = (phaseProgress - 0.24) / 0.12;
    const s = smoothQuintic(u);
    yawY = pickAngleY;

    const currY = pickPos.y + (liftY - pickPos.y) * s;
    const liftIK = solveRobotArmIK(pickR, currY);
    shoulderPitch = liftIK.shoulder;
    elbowPitch = liftIK.elbow;
    wristPitch = liftIK.wrist;
    arm.toolingFrame.rotation.y = -yawY;

    suctionActive = true;
    isGripping = true;

  } else if (phaseProgress < 0.66) {
    // 4. Elevated Transfer Swing: Smooth Cartesian arc towards Station B with clearance
    phaseName = 'swing';
    const u = (phaseProgress - 0.36) / 0.30;
    const s = smoothQuintic(u);

    const arcSign = robotZ < 0 ? -1 : 1;
    const referenceStationZ = robotZ >= 0 ? Math.max(pickPos.z, placePos.z) : Math.min(pickPos.z, placePos.z);
    const availableClearance = Math.abs(robotZ - referenceStationZ);
    const arcDepth = Math.min(1.20, Math.max(0.35, availableClearance * 0.58));
    const targetX = pickPos.x + (placePos.x - pickPos.x) * s;
    const targetZ = pickPos.z + (placePos.z - pickPos.z) * s + arcSign * arcDepth * Math.sin(Math.PI * s);
    const targetY = liftY + 0.08 * Math.sin(Math.PI * s);

    yawY = Math.atan2(-(targetZ - robotZ), targetX - robotX);
    const currR = Math.hypot(targetX - robotX, targetZ - robotZ);
    const swingIK = solveRobotArmIK(currR, targetY);

    shoulderPitch = swingIK.shoulder;
    elbowPitch = swingIK.elbow;
    wristPitch = swingIK.wrist;
    arm.toolingFrame.rotation.y = -yawY;

    suctionActive = true;
    isGripping = true;

  } else if (phaseProgress <= 0.80) {
    // 5. Lower & Place: Descend part accurately into Station B bolster, release suction
    phaseName = 'place';
    const u = (phaseProgress - 0.66) / 0.14;
    const s = smoothQuintic(u);
    yawY = placeAngleY;

    const currY = placePos.y + 0.35 * (1 - s);
    const placeIK = solveRobotArmIK(placeR, currY);
    shoulderPitch = placeIK.shoulder;
    elbowPitch = placeIK.elbow;
    wristPitch = placeIK.wrist;
    arm.toolingFrame.rotation.y = -yawY;

    // Suction releases only after the material is fully and correctly positioned on the platform
    suctionActive = u < 0.85;
    isGripping = u < 0.85;

  } else if (phaseProgress < 0.90) {
    // 6. Vertical Retract: Raise suction frame vertically clear of destination die
    phaseName = 'retract';
    const u = (phaseProgress - 0.80) / 0.10;
    const s = smoothQuintic(u);
    yawY = placeAngleY;

    const currY = placePos.y + 0.35 * s;
    const retractIK = solveRobotArmIK(placeR, currY);
    shoulderPitch = retractIK.shoulder;
    elbowPitch = retractIK.elbow;
    wristPitch = retractIK.wrist;
    arm.toolingFrame.rotation.y = -yawY;

    suctionActive = false;
    isGripping = false;

  } else {
    // 7. Return to Standby: Fold arm and return to compact parking pose in aisle
    phaseName = 'standby';
    const u = (phaseProgress - 0.90) / 0.10;
    const s = smoothQuintic(u);
    yawY = interpolateAngle(placeAngleY, homeYaw, s);
    arm.toolingFrame.rotation.y = interpolateAngle(-placeAngleY, 0, s);

    const baseIK = solveRobotArmIK(placeR, placePos.y + 0.35);
    shoulderPitch = baseIK.shoulder + (-0.55 - baseIK.shoulder) * s;
    elbowPitch = baseIK.elbow + (1.35 - baseIK.elbow) * s;
    wristPitch = baseIK.wrist + (-0.80 - baseIK.wrist) * s;

    suctionActive = false;
    isGripping = false;
  }

  arm.baseTurret.rotation.y = yawY;
  arm.shoulderGroup.rotation.z = shoulderPitch;
  arm.elbowGroup.rotation.z = elbowPitch;
  arm.wristGroup.rotation.z = wristPitch;
  arm.suctionStatusLight.material = suctionActive ? materials.vacuumActiveMat : materials.vacuumInactiveMat;

  return {
    isGripping,
    phaseName,
    suctionActive
  };
}
