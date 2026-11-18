/**
 * HICOM Engineering - Dedicated Automotive Stamping Press 3D Builder
 * Builds individual physical stamping presses for each operation in the production line
 */

import * as THREE from 'three';
import { PartOperation } from '../../data/partsData';

export interface StampingPressAssembly {
  rootGroup: THREE.Group;
  ramSlideGroup: THREE.Group;
  pistonRods: THREE.Mesh[];
  statusLight: THREE.Mesh;
  clickHitbox: THREE.Mesh;
  opIndex: number;
  opCode: string;
  tonnage: number;
  posX: number;
}

export interface PressMaterials {
  bluePaint: THREE.MeshStandardMaterial;
  darkCast: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  dieSteel: THREE.MeshStandardMaterial;
  hazardYellow: THREE.MeshStandardMaterial;
  lampIdle: THREE.MeshStandardMaterial;
  lampStamping: THREE.MeshStandardMaterial;
}

/**
 * Creates reusable PBR materials for stamping presses
 */
export function createPressMaterials(): PressMaterials {
  return {
    bluePaint: new THREE.MeshStandardMaterial({
      color: 0x0754A6, // HICOM Corporate Industrial Blue
      metalness: 0.45,
      roughness: 0.38
    }),
    darkCast: new THREE.MeshStandardMaterial({
      color: 0x1E293B, // Heavy cast iron press base
      metalness: 0.65,
      roughness: 0.5
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xE2E8F0, // Polished chrome tie rods & hydraulic rams
      metalness: 0.95,
      roughness: 0.12
    }),
    dieSteel: new THREE.MeshStandardMaterial({
      color: 0x334155, // Hardened tool steel / FCD500 die bolster
      metalness: 0.85,
      roughness: 0.22
    }),
    hazardYellow: new THREE.MeshStandardMaterial({
      color: 0xEAB308,
      metalness: 0.2,
      roughness: 0.4
    }),
    lampIdle: new THREE.MeshStandardMaterial({
      color: 0x10B981,
      emissive: 0x10B981,
      emissiveIntensity: 0.5
    }),
    lampStamping: new THREE.MeshStandardMaterial({
      color: 0xF59E0B,
      emissive: 0xF59E0B,
      emissiveIntensity: 0.9
    })
  };
}

/**
 * Creates a high-visibility procedural canvas texture for the press crown header plate
 */
function createPressHeaderTexture(opCode: string, opName: string, tonnage: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0B2340';
  ctx.fillRect(0, 0, 512, 128);

  // Border
  ctx.strokeStyle = '#0754A6';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);

  // Accent badge
  ctx.fillStyle = '#0754A6';
  ctx.fillRect(16, 16, 130, 96);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 38px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(opCode, 81, 76);

  // Operation Name & Tonnage
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'left';
  const truncatedName = opName.length > 18 ? opName.substring(0, 16) + '...' : opName;
  ctx.fillText(truncatedName, 165, 58);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`${tonnage} METRIC TONS`, 165, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Builds a dedicated physical automotive stamping press for a specific operation
 */
export function buildStampingPressMesh(
  opIndex: number,
  operation: PartOperation,
  posX: number,
  materials: PressMaterials
): StampingPressAssembly {
  const rootGroup = new THREE.Group();
  rootGroup.name = `StampingPress_${opIndex}_${operation.opCode}`;
  rootGroup.position.set(posX, 0, 0);

  const tonnage = operation.pressTonnage || 400;

  // 1. Bed & Bolster Plate
  const bedBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.42, 2.0),
    materials.darkCast
  );
  bedBase.position.set(0, 0.21, 0);
  bedBase.castShadow = true;
  rootGroup.add(bedBase);

  const bolster = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.2, 1.6),
    materials.dieSteel
  );
  bolster.position.set(0, 0.52, 0);
  bolster.castShadow = true;
  rootGroup.add(bolster);

  // Lower Tooling Die Block
  const lowerDieGroup = new THREE.Group();
  lowerDieGroup.position.set(0, 0.62, 0);
  const lowerDieShoe = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.16, 1.1),
    materials.darkCast
  );
  lowerDieShoe.position.y = 0.08;
  lowerDieGroup.add(lowerDieShoe);

  const lowerDieCavity = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.14, 0.75),
    materials.dieSteel
  );
  lowerDieCavity.position.y = 0.23;
  lowerDieCavity.castShadow = true;
  lowerDieGroup.add(lowerDieCavity);
  rootGroup.add(lowerDieGroup);

  // 2. 4 Chrome Tie-Rod Guide Pillars
  const pillarGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.7, 20);
  const pillarPositions = [
    [-0.95, 1.95, -0.75],
    [0.95, 1.95, -0.75],
    [-0.95, 1.95, 0.75],
    [0.95, 1.95, 0.75]
  ];

  pillarPositions.forEach(([px, py, pz]) => {
    const pillar = new THREE.Mesh(pillarGeom, materials.chrome);
    pillar.position.set(px, py, pz);
    pillar.castShadow = true;
    rootGroup.add(pillar);

    const topNut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.1, 6),
      materials.darkCast
    );
    topNut.position.set(px, 3.35, pz);
    const botNut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.1, 6),
      materials.darkCast
    );
    botNut.position.set(px, 0.46, pz);
    rootGroup.add(topNut, botNut);
  });

  // 3. Side Upright Columns (With wide robot pass-through openings)
  const sideColGeom = new THREE.BoxGeometry(0.3, 2.5, 1.4);
  const leftCol = new THREE.Mesh(sideColGeom, materials.bluePaint);
  leftCol.position.set(-1.05, 1.95, 0);
  leftCol.castShadow = true;
  const rightCol = new THREE.Mesh(sideColGeom, materials.bluePaint);
  rightCol.position.set(1.05, 1.95, 0);
  rightCol.castShadow = true;
  rootGroup.add(leftCol, rightCol);

  // 4. Press Crown (Top Bridge)
  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.85, 2.0),
    materials.bluePaint
  );
  crown.position.set(0, 3.7, 0);
  crown.castShadow = true;
  rootGroup.add(crown);

  // Operation Signage Badge on front of Crown
  const headerTex = createPressHeaderTexture(operation.opCode, operation.name, tonnage);
  const headerMat = new THREE.MeshBasicMaterial({ map: headerTex });
  const headerPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.48),
    headerMat
  );
  headerPlate.position.set(0, 3.7, 1.01);
  rootGroup.add(headerPlate);

  // Drive Motor & Flywheel
  const motor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16),
    materials.darkCast
  );
  motor.geometry.rotateZ(Math.PI / 2);
  motor.position.set(0, 4.35, -0.35);
  rootGroup.add(motor);

  const flywheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.16, 24),
    materials.darkCast
  );
  flywheel.geometry.rotateZ(Math.PI / 2);
  flywheel.position.set(1.25, 4.35, -0.35);
  rootGroup.add(flywheel);

  // 5. Hydraulic Cylinders & Piston Rods
  const pistonRods: THREE.Mesh[] = [];
  [[-0.4, 0], [0.4, 0]].forEach(([cx, cz]) => {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.75, 16),
      materials.darkCast
    );
    barrel.position.set(cx, 3.08, cz);
    rootGroup.add(barrel);

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 1.0, 16),
      materials.chrome
    );
    rod.position.set(cx, 2.4, cz);
    rootGroup.add(rod);
    pistonRods.push(rod);
  });

  // 6. Moving Upper Slide / Ram & Punch Tooling
  const ramSlideGroup = new THREE.Group();
  ramSlideGroup.name = `RamSlide_${opIndex}`;
  ramSlideGroup.position.set(0, 2.5, 0);

  const ramBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.45, 1.3),
    materials.bluePaint
  );
  ramBody.castShadow = true;
  ramSlideGroup.add(ramBody);

  // Corner guide bushings
  pillarPositions.forEach(([px, _, pz]) => {
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.48, 12),
      materials.darkCast
    );
    sleeve.position.set(px, 0, pz);
    ramSlideGroup.add(sleeve);
  });

  // Upper Punch Die
  const upperDieShoe = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.12, 0.95),
    materials.darkCast
  );
  upperDieShoe.position.y = -0.28;
  ramSlideGroup.add(upperDieShoe);

  const punchPunch = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.18, 0.65),
    materials.dieSteel
  );
  punchPunch.position.y = -0.42;
  punchPunch.castShadow = true;
  ramSlideGroup.add(punchPunch);

  rootGroup.add(ramSlideGroup);

  // 7. Status Signal Light Beacon
  const statusLight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.18, 12),
    materials.lampIdle
  );
  statusLight.position.set(1.15, 4.25, 0.85);
  rootGroup.add(statusLight);

  // 8. 3D Raycasting Hitbox
  const clickHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 4.2, 2.2),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  clickHitbox.position.set(0, 2.1, 0);
  rootGroup.add(clickHitbox);

  return {
    rootGroup,
    ramSlideGroup,
    pistonRods,
    statusLight,
    clickHitbox,
    opIndex,
    opCode: operation.opCode,
    tonnage,
    posX
  };
}

/**
 * Updates Ram Slide Kinematics for a specific press
 * strokeNormalized: 0.0 (TDC - Top Dead Center) to 1.0 (BDC - Bottom Dead Center)
 */
export function updatePressSlide(
  press: StampingPressAssembly,
  strokeNormalized: number,
  isCurrentlyStamping: boolean,
  materials: PressMaterials
) {
  // TDC at Y = 2.5 (Open), BDC at Y = 1.08 (Stamping Impact)
  const ramY = 2.5 - strokeNormalized * 1.42;
  press.ramSlideGroup.position.y = ramY;

  // Extend piston rods
  press.pistonRods.forEach((rod) => {
    rod.position.y = (3.08 + ramY) / 2;
    rod.scale.y = Math.max(0.1, (3.08 - ramY) / 0.7);
  });

  // Signal Lamp
  press.statusLight.material = isCurrentlyStamping
    ? materials.lampStamping
    : materials.lampIdle;
}
