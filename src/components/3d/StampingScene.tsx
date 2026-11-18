/**
 * Interactive 3D Multi-Machine Automotive Stamping Production Line Simulation for HICOM Engineering Sdn Bhd
 * Built with Three.js (r160+ PBR standards, RoomEnvironment, and camera controls)
 * 
 * Production Flow:
 * Material Feeding -> Dedicated Press OP05 -> Robot Arm 1 -> Dedicated Press OP10 -> Robot Arm 2 -> ... -> QC Defect Detection -> Sorting Robot -> OK / NG Bin
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { StampingPart, PartOperation } from '../../data/partsData';
import { calculateLineLayout } from '../../data/productionLine';
import { soundEngine } from '../../utils/audioSynthesis';
import {
  QcMode,
  QcVerdict,
  QcStageStatus,
  resolveQcVerdict,
  getQcTimelinePhase,
  getSortingDestinationForVerdict
} from '../../utils/qcInspectionEngine';
import { computeClampedZoomDistance } from '../../utils/processStepNavigation';
import {
  RobotArmAssembly,
  RobotMaterials,
  createRobotMaterials,
  buildRobotArmMesh,
  setRobotArmMotion
} from './robotArmBuilder';
import {
  StampingPressAssembly,
  PressMaterials,
  createPressMaterials,
  buildStampingPressMesh,
  updatePressSlide
} from './stampingPressBuilder';

/**
 * Creates high-visibility procedural texture for the floating QC verdict holographic tag
 */
function createVerdictTexture(isPass: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 140);
  ctx.fillStyle = isPass ? '#065F46' : '#991B1B';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 124, 18);
  ctx.fill();

  ctx.strokeStyle = isPass ? '#34D399' : '#F87171';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 124, 18);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isPass ? '✓ PASS: CONFORMING' : '⚠ DEFECT: REJECT', 256, 52);

  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = isPass ? '#A7F3D0' : '#FECACA';
  ctx.fillText(isPass ? 'DIMENSIONS & CRACK CHECK: OK' : 'DEFECT EXCEEDS TOLERANCE: NG', 256, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export type CameraPreset =
  | 'posX'
  | 'negX'
  | 'posY'
  | 'negY'
  | 'posZ'
  | 'negZ'
  | 'top'
  | 'bottom'
  | 'front'
  | 'back'
  | 'right'
  | 'left'
  | 'side'
  | 'isometric'
  | 'fit'
  | 'feeding'
  | 'machine'
  | 'qc'
  | 'sorting'
  | 'bins';

export interface StepTransitionRequest {
  id: number;
  targetProgress: number;
}

export interface ZoomRequest {
  id: number;
  direction: 'in' | 'out';
}

export interface StampingSceneProps {
  currentPart: StampingPart;
  currentOpIndex: number;
  isPlaying: boolean;
  playbackSpeed: 1 | 2 | 5;
  restartTrigger?: number;
  manualProgressOverride?: number | null; // 0.0 to 1.0 manual scrub
  stepTransitionRequest?: StepTransitionRequest | null;
  simulationMode: 'full_line' | 'single_op';
  qcMode: QcMode;
  onCycleComplete: () => void;
  onQcStageUpdate?: (status: QcStageStatus, verdict: QcVerdict | null) => void;
  onProgressUpdate: (progress: number, strokeAngle: number, ramDisplacementMm: number, pressureBar: number) => void;
  onLineProgressUpdate?: (lineProgress: number, currentStageTitle: string, activeOpIndex: number) => void;
  onStationClick?: (stationId: string) => void;
  activeStationId?: string | null;
  showGrid: boolean;
  activeCameraPreset: CameraPreset | null;
  onCameraPresetHandled: () => void;
  zoomRequest?: ZoomRequest | null;
}

export const StampingScene: React.FC<StampingSceneProps> = ({
  currentPart,
  currentOpIndex,
  isPlaying,
  playbackSpeed,
  restartTrigger = 0,
  manualProgressOverride = null,
  stepTransitionRequest = null,
  simulationMode = 'full_line',
  qcMode = 'PASS',
  onCycleComplete,
  onQcStageUpdate,
  onProgressUpdate,
  onLineProgressUpdate,
  onStationClick,
  activeStationId = null,
  showGrid,
  activeCameraPreset,
  onCameraPresetHandled,
  zoomRequest = null
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References to Three.js core instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // 3D Cartesian Coordinate Gizmo instances
  const axesMountRef = useRef<HTMLDivElement>(null);
  const axesRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const axesSceneRef = useRef<THREE.Scene | null>(null);
  const axesCameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Multi-Machine and Multi-Robot Assemblies
  const pressesRef = useRef<StampingPressAssembly[]>([]);
  const robotArmsRef = useRef<RobotArmAssembly[]>([]);
  const workpieceGroupRef = useRef<THREE.Group | null>(null);
  const lineRootGroupRef = useRef<THREE.Group | null>(null);
  const qcLaserBeamRef = useRef<THREE.Mesh | null>(null);
  const qcStatusLightRef = useRef<THREE.Mesh | null>(null);
  const qcFlashLightRef = useRef<THREE.PointLight | null>(null);
  const qcCameraLensesRef = useRef<THREE.Mesh[]>([]);
  const qcVerdictBadgeRef = useRef<THREE.Mesh | null>(null);
  const qcVerdictTexturePassRef = useRef<THREE.CanvasTexture | null>(null);
  const qcVerdictTextureDefectRef = useRef<THREE.CanvasTexture | null>(null);
  const pressMaterialsRef = useRef<PressMaterials | null>(null);
  const robotMaterialsRef = useRef<RobotMaterials | null>(null);

  // Interactive Raycasting targets
  const interactiveObjectsRef = useRef<{ id: string; name: string; mesh: THREE.Object3D }[]>([]);
  const [hoveredStationName, setHoveredStationName] = useState<string | null>(null);

  // Camera transition state
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetCamLookRef = useRef<THREE.Vector3 | null>(null);
  const targetCamUpRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));

  // Simulation timeline & state
  const lineProgressRef = useRef<number>(0); // 0.0 to 1.0 for full production line run
  const cycleTimeRef = useRef<number>(0);     // 0.0 to 1.0 for single operation stroke
  const strokeAngleRef = useRef<number>(0);
  const hasImpactedInCycleRef = useRef<boolean>(false);
  const lastAudioStepRef = useRef<number>(-1);
  const firedStepMilestonesRef = useRef<Set<string>>(new Set());
  const lastWorkpieceGeomKeyRef = useRef<string>('raw');
  const stepTransitionRef = useRef<{ targetProgress: number; active: boolean; direction: 1 | -1 }>({
    targetProgress: 0,
    active: false,
    direction: 1
  });
  const processNavOverwriteRef = useRef<boolean>(false);
  const lastStepReqIdRef = useRef<number | null>(null);
  const lastManualOverrideRef = useRef<number | null>(null);
  if (stepTransitionRequest && stepTransitionRequest.id !== lastStepReqIdRef.current) {
    lastStepReqIdRef.current = stepTransitionRequest.id;
    processNavOverwriteRef.current = true;
  }
  if (manualProgressOverride !== null && manualProgressOverride !== lastManualOverrideRef.current) {
    lastManualOverrideRef.current = manualProgressOverride;
    processNavOverwriteRef.current = true;
  } else if (manualProgressOverride === null) {
    lastManualOverrideRef.current = null;
  }

  // Synchronized prop refs for 60fps render loop
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;

  const simModeRef = useRef(simulationMode);
  simModeRef.current = simulationMode;

  const qcModeRef = useRef<QcMode>(qcMode);
  qcModeRef.current = qcMode;

  const showGridRef = useRef<boolean>(showGrid);
  showGridRef.current = showGrid;

  // Per-cycle QC evaluation state (new random verdict generated only when part reaches QC stage)
  const hasEvaluatedQcRef = useRef<boolean>(false);
  const cycleVerdictRef = useRef<QcVerdict | null>(null);
  const lastReportedQcKeyRef = useRef<string>('AWAITING:null');

  const manualOverrideRef = useRef<number | null>(manualProgressOverride);
  manualOverrideRef.current = manualProgressOverride;

  const currentOpIndexRef = useRef(currentOpIndex);
  currentOpIndexRef.current = currentOpIndex;

  const partRef = useRef(currentPart);
  partRef.current = currentPart;

  const onCycleCompleteRef = useRef(onCycleComplete);
  onCycleCompleteRef.current = onCycleComplete;

  const onQcStageUpdateRef = useRef(onQcStageUpdate);
  onQcStageUpdateRef.current = onQcStageUpdate;

  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  const onLineProgressUpdateRef = useRef(onLineProgressUpdate);
  onLineProgressUpdateRef.current = onLineProgressUpdate;

  const onStationClickRef = useRef(onStationClick);
  onStationClickRef.current = onStationClick;

  // Geometry Cache Helper for Stamped Workpiece
  const updateWorkpieceGeometry = useCallback((
    opIndex: number,
    part: StampingPart,
    deformationRatio: number = 1.0,
    isRawBlank: boolean = false
  ) => {
    if (!workpieceGroupRef.current) return;
    const group = workpieceGroupRef.current;

    // Dispose old children meshes
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    const currentOp = part.operations[opIndex] || part.operations[0];
    const L = Math.max(0.6, (part.lengthMm || 400) / 450);
    const W = Math.max(0.35, (part.widthMm || 200) / 450);
    const H = Math.max(0.15, (part.heightMm || 100) / 350) * deformationRatio;

    const sheetMaterial = new THREE.MeshStandardMaterial({
      color: 0x94A3B8,
      metalness: 0.88,
      roughness: 0.28,
      side: THREE.DoubleSide
    });

    if (isRawBlank || currentOp?.toolingAction === 'blank') {
      // Raw sheet metal blank with contour and pilot holes
      const shape = new THREE.Shape();
      const halfL = L / 2;
      const halfW = W / 2;
      shape.moveTo(-halfL, -halfW);
      shape.lineTo(halfL, -halfW);
      shape.lineTo(halfL + 0.04, 0);
      shape.lineTo(halfL, halfW);
      shape.lineTo(-halfL, halfW);
      shape.lineTo(-halfL - 0.04, 0);
      shape.closePath();

      const hole1 = new THREE.Path();
      hole1.absarc(-halfL * 0.7, 0, 0.02, 0, Math.PI * 2, true);
      shape.holes.push(hole1);

      const hole2 = new THREE.Path();
      hole2.absarc(halfL * 0.7, 0, 0.02, 0, Math.PI * 2, true);
      shape.holes.push(hole2);

      const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.015, bevelEnabled: false });
      geom.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geom, sheetMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    } else {
      // 3D Stamped Formed Geometry (Draw / Trim / Restrike / Flange)
      const isTrimmed = opIndex >= 2;
      const isRestruck = opIndex >= 3;
      const isPierced = opIndex >= 4 || (currentOp && currentOp.fullName.toLowerCase().includes('pierc'));

      const formedGroup = new THREE.Group();

      // Bottom cavity floor
      const floorGeom = new THREE.BoxGeometry(L * 0.7, 0.015, W * 0.65);
      const floorMesh = new THREE.Mesh(floorGeom, sheetMaterial);
      floorMesh.position.y = -H * 0.4;
      floorMesh.castShadow = true;
      formedGroup.add(floorMesh);

      // Sloped sidewalls
      const wallThickness = 0.015;
      const wallGeomLong = new THREE.BoxGeometry(L * 0.7, H * 0.5, wallThickness);
      const wallFront = new THREE.Mesh(wallGeomLong, sheetMaterial);
      wallFront.position.set(0, -H * 0.15, W * 0.325);
      wallFront.rotation.x = 0.25;
      formedGroup.add(wallFront);

      const wallBack = new THREE.Mesh(wallGeomLong, sheetMaterial);
      wallBack.position.set(0, -H * 0.15, -W * 0.325);
      wallBack.rotation.x = -0.25;
      formedGroup.add(wallBack);

      const wallGeomSide = new THREE.BoxGeometry(wallThickness, H * 0.5, W * 0.65);
      const wallLeft = new THREE.Mesh(wallGeomSide, sheetMaterial);
      wallLeft.position.set(-L * 0.35, -H * 0.15, 0);
      wallLeft.rotation.z = -0.25;
      formedGroup.add(wallLeft);

      const wallRight = new THREE.Mesh(wallGeomSide, sheetMaterial);
      wallRight.position.set(L * 0.35, -H * 0.15, 0);
      wallRight.rotation.z = 0.25;
      formedGroup.add(wallRight);

      // Outer flanges (trimmed vs untrimmed)
      const flangeWidth = isTrimmed ? 0.08 : 0.18;
      const flangeGeom = new THREE.BoxGeometry(L * 0.85, 0.015, flangeWidth);
      const flangeFront = new THREE.Mesh(flangeGeom, sheetMaterial);
      flangeFront.position.set(0, 0.05, W * 0.36 + flangeWidth / 2);
      formedGroup.add(flangeFront);

      const flangeBack = new THREE.Mesh(flangeGeom, sheetMaterial);
      flangeBack.position.set(0, 0.05, -(W * 0.36 + flangeWidth / 2));
      formedGroup.add(flangeBack);

      if (isRestruck) {
        const beadGeom = new THREE.CylinderGeometry(0.015, 0.015, L * 0.5, 12);
        beadGeom.rotateZ(Math.PI / 2);
        const bead = new THREE.Mesh(beadGeom, sheetMaterial);
        bead.position.set(0, -H * 0.38, 0);
        formedGroup.add(bead);
      }

      if (isPierced) {
        const holePunchGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 16);
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x1E293B });
        const holePositions = [
          [-L * 0.25, 0.05, W * 0.4],
          [L * 0.25, 0.05, W * 0.4],
          [-L * 0.25, 0.05, -W * 0.4],
          [L * 0.25, 0.05, -W * 0.4],
          [0, -H * 0.4, 0]
        ];
        holePositions.forEach(([hx, hy, hz]) => {
          const hole = new THREE.Mesh(holePunchGeom, holeMat);
          hole.position.set(hx, hy, hz);
          formedGroup.add(hole);
        });
      }

      formedGroup.position.y = 0.05;
      group.add(formedGroup);
    }
  }, []);

  // Camera Presets
  const applyCameraPreset = useCallback((preset: CameraPreset) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const layout = calculateLineLayout(partRef.current);

    let target = new THREE.Vector3(0, 1.3, 0);
    let targetPos = new THREE.Vector3();
    let targetUp = new THREE.Vector3(0, 1, 0);

    const span = layout.totalSpan;
    const currentOpIdx = currentOpIndexRef.current;
    const currentPressX = layout.pressPositionsX[currentOpIdx] ?? 0;

    switch (preset) {
      case 'feeding':
        target = new THREE.Vector3(layout.feedingX, 1.0, 0);
        targetPos.set(layout.feedingX, 2.5, 4.2);
        break;
      case 'machine':
        target = new THREE.Vector3(currentPressX, 1.4, 0.3);
        targetPos.set(currentPressX, 2.7, 5.2);
        break;
      case 'qc':
        target = new THREE.Vector3(layout.qcX, 1.1, 0);
        targetPos.set(layout.qcX, 2.2, 3.8);
        break;
      case 'sorting':
      case 'bins':
        target = new THREE.Vector3(layout.binsX, 0.8, 0.0);
        targetPos.set(layout.binsX, 2.5, 4.2);
        break;
      case 'front':
        targetPos.set(0, 2.0, Math.max(13, span * 0.88));
        target.set(0, 1.3, 0);
        break;
      case 'side':
      case 'right':
        targetPos.set(layout.binsX + 5.5, 2.4, 0);
        target.set(0, 1.3, 0);
        break;
      case 'left':
        targetPos.set(layout.feedingX - 5.5, 2.4, 0);
        target.set(0, 1.3, 0);
        break;
      case 'top':
        targetPos.set(0, Math.max(16, span * 1.1), 0.001);
        target.set(0, 0, 0);
        targetUp.set(0, 0, -1);
        break;
      case 'fit':
      case 'isometric':
      default:
        // Full production line sweeping overview
        targetPos.set(0, Math.max(7.8, span * 0.48), Math.max(13.8, span * 0.96));
        target.set(0, 1.2, 0.25);
        break;
    }

    targetCamPosRef.current = targetPos;
    targetCamLookRef.current = target;
    targetCamUpRef.current = targetUp;
    controls.target.copy(target);
  }, []);

  // Main Scene Construction for the Selected Part
  const rebuildProductionLine = useCallback(() => {
    if (!sceneRef.current || !pressMaterialsRef.current || !robotMaterialsRef.current) return;
    const scene = sceneRef.current;
    const pMat = pressMaterialsRef.current;
    const rMat = robotMaterialsRef.current;

    // Remove existing line root group if present
    if (lineRootGroupRef.current) {
      scene.remove(lineRootGroupRef.current);
    }

    const lineRoot = new THREE.Group();
    lineRoot.name = "ProductionLine_Root";
    lineRootGroupRef.current = lineRoot;

    interactiveObjectsRef.current = [];
    pressesRef.current = [];
    robotArmsRef.current = [];

    const layout = calculateLineLayout(partRef.current);
    const numOps = layout.numOps;

    // 1. Concrete Foundation Slab spanning the entire production line
    const slabSpan = layout.totalSpan + 3.6;
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0xCBD5E1,
      roughness: 0.6,
      metalness: 0.2
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(slabSpan, 0.08, 5.0), slabMat);
    slab.position.set(0, 0.04, 0.80);
    slab.receiveShadow = true;
    lineRoot.add(slab);

    // Yellow Safety Boundary Stripes
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xF59E0B });
    const stripeFront = new THREE.Mesh(new THREE.PlaneGeometry(slabSpan, 0.06), stripeMat);
    stripeFront.rotation.x = -Math.PI / 2;
    stripeFront.position.set(0, 0.085, 3.22);
    const stripeBack = new THREE.Mesh(new THREE.PlaneGeometry(slabSpan, 0.06), stripeMat);
    stripeBack.rotation.x = -Math.PI / 2;
    stripeBack.position.set(0, 0.085, -1.65);
    lineRoot.add(stripeFront, stripeBack);

    // 2. Material Feeding Station (Destacker table with blank stack)
    const feedingGroup = new THREE.Group();
    feedingGroup.position.set(layout.feedingX, 0, 0);

    const feederBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.4), pMat.darkCast);
    feederBase.position.y = 0.2;
    feederBase.castShadow = true;
    feedingGroup.add(feederBase);

    // Destacker guide uprights
    const uprGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 12);
    [[-0.65, -0.55], [0.65, -0.55], [-0.65, 0.55], [0.65, 0.55]].forEach(([fx, fz]) => {
      const up = new THREE.Mesh(uprGeom, pMat.chrome);
      up.position.set(fx, 0.9, fz);
      feedingGroup.add(up);
    });

    // Stack of raw blanks
    for (let i = 0; i < 6; i++) {
      const sheet = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.015, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x94A3B8, metalness: 0.85, roughness: 0.3 })
      );
      sheet.position.set(0, 0.42 + i * 0.02, 0);
      sheet.castShadow = true;
      feedingGroup.add(sheet);
    }

    // Feeder Hitbox
    const feederHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.8, 1.6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    feederHitbox.position.set(0, 0.9, 0);
    feedingGroup.add(feederHitbox);
    interactiveObjectsRef.current.push({
      id: 'station-feeding',
      name: 'Material Feeding Station',
      mesh: feederHitbox
    });

    lineRoot.add(feedingGroup);

    // 3. Infeed Robot Arm (Between Material Feeding & Stamping Press 0)
    const infeedRobot = buildRobotArmMesh(
      0,
      layout.infeedRobotX,
      layout.robotZ,
      'Infeed',
      rMat
    );
    lineRoot.add(infeedRobot.rootGroup);
    robotArmsRef.current.push(infeedRobot);
    interactiveObjectsRef.current.push({
      id: 'station-robot-infeed',
      name: `Infeed Robot Arm (Feeding to ${partRef.current.operations[0]?.opCode || 'OP05'})`,
      mesh: infeedRobot.clickHitbox
    });

    // 4. Stamping Presses & Inter-Press Robot Arms
    const presses: StampingPressAssembly[] = [];
    partRef.current.operations.forEach((op, idx) => {
      const pressX = layout.pressPositionsX[idx] ?? 0;
      const press = buildStampingPressMesh(idx, op, pressX, pMat);
      lineRoot.add(press.rootGroup);
      presses.push(press);
      interactiveObjectsRef.current.push({
        id: `station-op-${idx}`,
        name: `Stamping Press: ${op.opCode} • ${op.name} (${op.pressTonnage}T)`,
        mesh: press.clickHitbox
      });

      // Build Inter-Press Robot Arm between this press and the next press
      if (idx < numOps - 1) {
        const robotX = layout.interPressRobotX[idx] ?? 0;
        const nextOp = partRef.current.operations[idx + 1];
        const robot = buildRobotArmMesh(
          idx + 1,
          robotX,
          layout.robotZ,
          `InterPress_${idx + 1}`,
          rMat
        );
        lineRoot.add(robot.rootGroup);
        robotArmsRef.current.push(robot);
        interactiveObjectsRef.current.push({
          id: `station-robot-${idx + 1}`,
          name: `Robot Arm ${idx + 1} (${op.opCode} to ${nextOp?.opCode || 'Next OP'})`,
          mesh: robot.clickHitbox
        });
      }
    });
    pressesRef.current = presses;

    // 5. Outfeed Transfer Robot Arm (Between last press & QC Vision Station)
    const outfeedRobot = buildRobotArmMesh(
      numOps,
      layout.outfeedRobotX,
      layout.robotZ,
      'Outfeed_QC',
      rMat
    );
    lineRoot.add(outfeedRobot.rootGroup);
    robotArmsRef.current.push(outfeedRobot);
    interactiveObjectsRef.current.push({
      id: 'station-robot-outfeed',
      name: `Outfeed Robot Arm (${partRef.current.operations[numOps - 1]?.opCode || 'Last OP'} to QC)`,
      mesh: outfeedRobot.clickHitbox
    });

    // 6. QC Defect Detection Vision Gantry
    const qcStation = new THREE.Group();
    qcStation.position.set(layout.qcX, 0, 0);

    // Inspection Base Table & Precision Bolster Fixture Plate
    const qcTable = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.72, 1.2), pMat.darkCast);
    qcTable.position.y = 0.36;
    qcTable.castShadow = true;
    qcStation.add(qcTable);

    const qcFixturePlate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.95), pMat.dieSteel);
    qcFixturePlate.position.y = 0.77;
    qcFixturePlate.castShadow = true;
    qcStation.add(qcFixturePlate);

    // Vision Tunnel Arch
    const archLegGeom = new THREE.BoxGeometry(0.12, 1.4, 0.14);
    const archLegFront = new THREE.Mesh(archLegGeom, pMat.bluePaint);
    archLegFront.position.set(0, 1.4, 0.65);
    const archLegBack = new THREE.Mesh(archLegGeom, pMat.bluePaint);
    archLegBack.position.set(0, 1.4, -0.65);
    const archBridge = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.15, 1.44), pMat.bluePaint);
    archBridge.position.set(0, 2.05, 0);
    qcStation.add(archLegFront, archLegBack, archBridge);

    // 3 Industrial Inspection Cameras with Emissive Strobe Lenses
    qcCameraLensesRef.current = [];
    [-0.35, 0, 0.35].forEach((cz) => {
      const camHousing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), pMat.darkCast);
      camHousing.position.set(0, 1.88, cz);
      const camLensMat = new THREE.MeshStandardMaterial({
        color: 0xE2E8F0,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        metalness: 0.95,
        roughness: 0.15
      });
      const camLens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 16), camLensMat);
      camLens.position.set(0, 1.74, cz);
      qcStation.add(camHousing, camLens);
      qcCameraLensesRef.current.push(camLens);
    });

    // High-Intensity Optical Camera Strobe Flash Light
    const qcFlashLight = new THREE.PointLight(0xFFFFFF, 0, 7);
    qcFlashLight.position.set(0, 1.85, 0);
    qcFlashLightRef.current = qcFlashLight;
    qcStation.add(qcFlashLight);

    // Triangulation Laser Scan Beam Plane
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x06B6D4,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    const laserBeam = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 1.1), laserMat);
    laserBeam.rotation.z = Math.PI / 2;
    laserBeam.position.set(0, 1.3, 0);
    laserBeam.visible = false;
    qcLaserBeamRef.current = laserBeam;
    qcStation.add(laserBeam);

    // Status Signal Tower (Dedicated material so QC verdict never mutates press lamps)
    const towerMast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 12), pMat.darkCast);
    towerMast.position.set(0.2, 2.3, 0.6);
    const qcTowerMat = new THREE.MeshStandardMaterial({
      color: 0x64748B,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.3
    });
    const statusLight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.2, 16),
      qcTowerMat
    );
    statusLight.position.set(0.2, 2.55, 0.6);
    qcStatusLightRef.current = statusLight;
    qcStation.add(towerMast, statusLight);

    // 3D Floating Verdict Holographic Badge
    if (!qcVerdictTexturePassRef.current) qcVerdictTexturePassRef.current = createVerdictTexture(true);
    if (!qcVerdictTextureDefectRef.current) qcVerdictTextureDefectRef.current = createVerdictTexture(false);

    const verdictPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.44),
      new THREE.MeshBasicMaterial({
        map: qcVerdictTexturePassRef.current,
        transparent: true,
        side: THREE.DoubleSide
      })
    );
    verdictPlane.position.set(0, 2.45, 0);
    verdictPlane.visible = false;
    qcVerdictBadgeRef.current = verdictPlane;
    qcStation.add(verdictPlane);

    // QC Hitbox
    const qcHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.4, 1.6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    qcHitbox.position.set(0, 1.2, 0);
    qcStation.add(qcHitbox);
    interactiveObjectsRef.current.push({
      id: 'station-qc',
      name: 'QC Defect Detection Station',
      mesh: qcHitbox
    });

    lineRoot.add(qcStation);

    // 7. Sorting Robot Arm (Between QC and Bins)
    const sortingRobot = buildRobotArmMesh(
      numOps + 1,
      layout.sortingRobotX,
      layout.sortingRobotZ,
      'Sorting_Robot',
      rMat
    );
    lineRoot.add(sortingRobot.rootGroup);
    robotArmsRef.current.push(sortingRobot);
    interactiveObjectsRef.current.push({
      id: 'station-robot-sorting',
      name: 'Sorting Robot Arm (QC to OK / NG Bin)',
      mesh: sortingRobot.clickHitbox
    });

    // 8. Sorting Bins (OK Bin at Z = -0.65, NG Bin at Z = 0.65)
    // OK Parts Bin (Green)
    const okBinGroup = new THREE.Group();
    okBinGroup.position.set(layout.binsX, 0, -0.65);

    const okPallet = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.12, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xB45309, roughness: 0.9 })
    );
    okPallet.position.y = 0.06;
    okBinGroup.add(okPallet);

    const okBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.65, 1.15),
      new THREE.MeshStandardMaterial({ color: 0x10B981, metalness: 0.4, roughness: 0.4 })
    );
    okBox.position.y = 0.45;
    okBox.castShadow = true;
    okBinGroup.add(okBox);

    const okLabel = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.14, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    );
    okLabel.position.set(-0.58, 0.6, 0);
    okBinGroup.add(okLabel);

    const okHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.2, 1.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    okHitbox.position.set(0, 0.6, 0);
    okBinGroup.add(okHitbox);
    interactiveObjectsRef.current.push({
      id: 'station-bin-ok',
      name: 'OK Parts Bin (Conforming)',
      mesh: okHitbox
    });

    lineRoot.add(okBinGroup);

    // NG Parts Bin (Red)
    const ngBinGroup = new THREE.Group();
    ngBinGroup.position.set(layout.binsX, 0, 0.65);

    const ngPallet = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.12, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xB45309, roughness: 0.9 })
    );
    ngPallet.position.y = 0.06;
    ngBinGroup.add(ngPallet);

    const ngBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.65, 1.05),
      new THREE.MeshStandardMaterial({ color: 0xEF4444, metalness: 0.4, roughness: 0.4 })
    );
    ngBox.position.y = 0.45;
    ngBox.castShadow = true;
    ngBinGroup.add(ngBox);

    const ngLabel = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.14, 0.55),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    );
    ngLabel.position.set(-0.53, 0.6, 0);
    ngBinGroup.add(ngLabel);

    const ngHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.2, 1.3),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    ngHitbox.position.set(0, 0.6, 0);
    ngBinGroup.add(ngHitbox);
    interactiveObjectsRef.current.push({
      id: 'station-bin-ng',
      name: 'NG Parts Bin (Scrap / Rework)',
      mesh: ngHitbox
    });

    lineRoot.add(ngBinGroup);

    // 9. Active Workpiece Group
    const workpieceGroup = new THREE.Group();
    workpieceGroup.name = "Active_Workpiece";
    workpieceGroup.position.set(layout.feedingX, 0.54, 0);
    workpieceGroupRef.current = workpieceGroup;
    lineRoot.add(workpieceGroup);

    scene.add(lineRoot);

    // Initial workpiece geometry
    updateWorkpieceGeometry(0, partRef.current, 1.0, true);
  }, [updateWorkpieceGeometry]);

  // Restart / Sync when part, OP, or trigger changes
  useEffect(() => {
    lineProgressRef.current = 0;
    cycleTimeRef.current = 0;
    strokeAngleRef.current = 0;
    hasImpactedInCycleRef.current = false;
    lastAudioStepRef.current = -1;
    firedStepMilestonesRef.current.clear();
    lastWorkpieceGeomKeyRef.current = 'raw';
    stepTransitionRef.current = { targetProgress: 0, active: false, direction: 1 };
    processNavOverwriteRef.current = false;
    hasEvaluatedQcRef.current = false;
    cycleVerdictRef.current = null;
    lastReportedQcKeyRef.current = 'AWAITING:null';

    rebuildProductionLine();
  }, [restartTrigger, currentPart, rebuildProductionLine]);

  // Handle live qcMode switch: only update active verdict immediately if part is currently at QC decision stage (never during overwrite navigation)
  useEffect(() => {
    if (simModeRef.current !== 'full_line' || processNavOverwriteRef.current) return;
    const numOps = Math.max(1, partRef.current.operations?.length || 1);
    const phase = getQcTimelinePhase(lineProgressRef.current, numOps);
    if (phase.hasReachedQcDecision && !phase.isSortingStep) {
      const updatedVerdict = resolveQcVerdict(qcMode);
      hasEvaluatedQcRef.current = true;
      cycleVerdictRef.current = updatedVerdict;
      lastReportedQcKeyRef.current = `INSPECTED:${updatedVerdict}`;
      onQcStageUpdateRef.current?.('INSPECTED', updatedVerdict);
    }
  }, [qcMode]);

  // Handle discrete < / > step transition requests (operates in overwrite mode without triggering QC)
  useEffect(() => {
    if (!stepTransitionRequest || simulationMode !== 'full_line') return;
    processNavOverwriteRef.current = true;
    const target = Math.max(0, Math.min(0.999999, stepTransitionRequest.targetProgress));
    const diff = target - lineProgressRef.current;
    if (Math.abs(diff) < 0.001) {
      lineProgressRef.current = target;
      stepTransitionRef.current = { targetProgress: target, active: false, direction: 1 };
    } else {
      stepTransitionRef.current = {
        targetProgress: target,
        active: true,
        direction: diff >= 0 ? 1 : -1
      };
    }
  }, [stepTransitionRequest, simulationMode]);

  // Reset overwrite navigation flag when switching between Full Line and Single OP modes
  useEffect(() => {
    processNavOverwriteRef.current = false;
  }, [simulationMode]);

  // Handle manual progress override slider (operates in overwrite mode without triggering QC)
  useEffect(() => {
    if (manualProgressOverride !== null && manualProgressOverride !== undefined) {
      const progress = Math.max(0, Math.min(1, manualProgressOverride));
      stepTransitionRef.current.active = false;
      processNavOverwriteRef.current = true;
      if (simulationMode === 'full_line') {
        lineProgressRef.current = progress;
      } else {
        cycleTimeRef.current = progress;
        strokeAngleRef.current = Math.max(0, (progress * 360) % 360);
      }
    }
  }, [manualProgressOverride, simulationMode]);

  // Handle camera presets requested from parent UI
  useEffect(() => {
    if (activeCameraPreset) {
      applyCameraPreset(activeCameraPreset);
      onCameraPresetHandled();
    }
  }, [activeCameraPreset, applyCameraPreset, onCameraPresetHandled]);

  // Handle smooth bounded Zoom In / Zoom Out button requests
  useEffect(() => {
    if (!zoomRequest || !cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const layout = calculateLineLayout(partRef.current);

    const baseTarget = (targetCamLookRef.current ?? controls.target).clone();
    const basePos = (targetCamPosRef.current ?? camera.position).clone();
    const offset = new THREE.Vector3().subVectors(basePos, baseTarget);
    const currentDist = offset.length();

    if (currentDist <= 0.001) return;

    const minDist = controls.minDistance || 2.8;
    const maxDist = Math.min(38, Math.max(16, layout.totalSpan * 1.15 + 4));
    const nextDist = computeClampedZoomDistance(
      currentDist,
      zoomRequest.direction,
      minDist,
      maxDist
    );

    offset.normalize().multiplyScalar(nextDist);
    targetCamPosRef.current = baseTarget.clone().add(offset);
    targetCamLookRef.current = baseTarget;
    targetCamUpRef.current = camera.up.clone();
  }, [zoomRequest]);

  // Toggle grid visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Main Three.js Mount Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF1F5F9);
    scene.fog = new THREE.Fog(0xF1F5F9, 22, 60);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      120
    );
    camera.position.set(0, 11, 22);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls with restricted pan, rotate, and zoom navigation boundaries
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.8; // High-detail die & gripper inspection without mesh clipping
    controls.maxDistance = 38;  // Restrict excessive zoom-out to maintain line presence
    controls.minPolarAngle = 0.25; // Prevents looking directly overhead into gimbal inversion
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevents camera from moving underneath ground level
    controls.target.set(0, 1.2, 0);

    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    controlsRef.current = controls;

    // 5. Environment Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 6. Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 2.2);
    keyLight.position.set(8, 14, 8);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 45;
      const d = 16;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8DBEFF, 1.2);
    fillLight.position.set(-10, 8, -6);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0x0B2340, 0.75);
    hemiLight.position.set(0, 14, 0);
    scene.add(hemiLight);

    // 7. Ground Foundation
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xE2E8F0,
      roughness: 0.82,
      metalness: 0.08
    });
    const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), groundMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = 0;
    groundPlane.receiveShadow = !isSoftwareGl;
    scene.add(groundPlane);

    // Ground Grid
    const grid = new THREE.GridHelper(36, 72, 0x0754A6, 0x94A3B8);
    grid.position.y = 0.086;
    grid.visible = showGridRef.current;
    gridHelperRef.current = grid;
    scene.add(grid);

    // Shared Materials
    pressMaterialsRef.current = createPressMaterials();
    robotMaterialsRef.current = createRobotMaterials();

    // Build Initial Multi-Machine Production Line
    rebuildProductionLine();

    // 8. Raycasting for interactive station clicking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshesToTest = interactiveObjectsRef.current.map(o => o.mesh);
      const intersects = raycaster.intersectObjects(meshesToTest, false);

      if (intersects.length > 0) {
        const hit = interactiveObjectsRef.current.find(o => o.mesh === intersects[0].object);
        if (hit) {
          renderer.domElement.style.cursor = 'pointer';
          setHoveredStationName(hit.name);
          return;
        }
      }
      renderer.domElement.style.cursor = 'default';
      setHoveredStationName(null);
    };

    const handlePointerClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshesToTest = interactiveObjectsRef.current.map(o => o.mesh);
      const intersects = raycaster.intersectObjects(meshesToTest, false);

      if (intersects.length > 0) {
        const hit = interactiveObjectsRef.current.find(o => o.mesh === intersects[0].object);
        if (hit && onStationClickRef.current) {
          onStationClickRef.current(hit.id);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handlePointerClick);

    // Pre-warm shaders
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 9. ANIMATION & SYNCHRONIZED RENDER LOOP
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const deltaMs = Math.min(currentTime - lastTime, 100);
      lastTime = currentTime;
      const dt = deltaMs / 1000;

      // Smooth Camera Lerp
      if (targetCamPosRef.current && targetCamLookRef.current) {
        const factor = Math.min(1.0, dt * 5.0);
        camera.position.lerp(targetCamPosRef.current, factor);
        controls.target.lerp(targetCamLookRef.current, factor);
        camera.up.lerp(targetCamUpRef.current, factor);

        if (camera.position.distanceTo(targetCamPosRef.current) < 0.05) {
          targetCamPosRef.current = null;
          targetCamLookRef.current = null;
        }
      }

      const isRunning = isPlayingRef.current;
      const speed = speedRef.current;
      const mode = simModeRef.current;
      const part = partRef.current;
      const numOps = Math.max(1, part.operations?.length || 1);
      const layout = calculateLineLayout(part);
      const pMat = pressMaterialsRef.current;
      const rMat = robotMaterialsRef.current;

      // Enforce camera movement restrictions: clamp panning target to keep the line centered in view
      const minTargetX = layout.feedingX - 1.8;
      const maxTargetX = layout.binsX + 1.8;
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, minTargetX, maxTargetX);
      controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0.5, 2.5);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -1.8, 3.2);
      controls.maxDistance = Math.min(38, Math.max(16, layout.totalSpan * 1.15 + 4));

      controls.update();

      if (mode === 'full_line') {
        // ==========================================
        // MULTI-MACHINE PRODUCTION LINE FLOW
        // Total steps = 2 * numOps + 3
        // Even steps = Robot Arm Transfer
        // Odd steps  = Press Stamping / QC / Sorting
        // ==========================================
        const totalSteps = 2 * numOps + 3;
        const stepDuration = 1.0 / totalSteps;

        if (isRunning && manualOverrideRef.current === null) {
          stepTransitionRef.current.active = false;
          // Exit overwrite navigation mode when actively playing upstream of QC decision
          if (processNavOverwriteRef.current) {
            const currentPhase = getQcTimelinePhase(lineProgressRef.current, numOps);
            if (!currentPhase.hasReachedQcDecision) {
              processNavOverwriteRef.current = false;
            }
          }
          // Deliberate, smooth industrial cycle speed (~18-28 seconds for full multi-machine transfer)
          const progressInc = (dt * speed) / (18.0 + numOps * 2.0);
          const nextProgress = lineProgressRef.current + progressInc;
          if (nextProgress >= 1.0) {
            const completedActualQc = hasEvaluatedQcRef.current;
            lineProgressRef.current = nextProgress % 1.0;
            processNavOverwriteRef.current = false;
            hasEvaluatedQcRef.current = false;
            cycleVerdictRef.current = null;
            lastReportedQcKeyRef.current = 'AWAITING:null';
            lastAudioStepRef.current = -1;
            firedStepMilestonesRef.current.clear();
            lastWorkpieceGeomKeyRef.current = 'raw';
            updateWorkpieceGeometry(0, part, 1.0, true);
            if (completedActualQc) {
              onCycleCompleteRef.current();
            }
          } else {
            lineProgressRef.current = nextProgress;
          }
        } else if (!isRunning && stepTransitionRef.current.active) {
          const target = stepTransitionRef.current.targetProgress;
          const diff = target - lineProgressRef.current;
          const stepRate = Math.max(0.18, (2.0 / totalSteps) / 0.65);
          const move = stepRate * dt;
          if (Math.abs(diff) <= move) {
            lineProgressRef.current = target;
            stepTransitionRef.current.active = false;
          } else {
            lineProgressRef.current += Math.sign(diff) * move;
          }
        }

        const t = lineProgressRef.current;
        const currentStep = Math.min(totalSteps - 1, Math.floor(t / stepDuration));
        const stepProgress = (t - currentStep * stepDuration) / stepDuration;

        if (currentStep !== lastAudioStepRef.current) {
          lastAudioStepRef.current = currentStep;
          firedStepMilestonesRef.current.clear();
          hasImpactedInCycleRef.current = false;
        }

        const canPlayForwardAudio =
          isRunning || (stepTransitionRef.current.active && stepTransitionRef.current.direction === 1);
        const triggerStepAudio = (milestoneKey: string, fn: () => void) => {
          if (canPlayForwardAudio && !firedStepMilestonesRef.current.has(milestoneKey)) {
            firedStepMilestonesRef.current.add(milestoneKey);
            fn();
          }
        };

        // Keep workpiece 3D geometry synchronized with current production step (supports forward, backward & scrubbing)
        let desiredGeomKey = 'raw';
        let desiredGeomOpIdx = 0;
        let desiredIsRaw = true;
        if (currentStep === 0) {
          desiredGeomKey = 'raw';
          desiredIsRaw = true;
        } else if (currentStep < 2 * numOps) {
          const stepOffset = currentStep - 1;
          const isStampingStep = stepOffset % 2 === 0;
          const opIndex = Math.min(numOps - 1, Math.floor(stepOffset / 2));
          if (isStampingStep && stepProgress < 0.45) {
            if (opIndex === 0) {
              desiredGeomKey = 'raw';
              desiredIsRaw = true;
            } else {
              desiredGeomOpIdx = opIndex - 1;
              desiredGeomKey = `op:${desiredGeomOpIdx}`;
              desiredIsRaw = false;
            }
          } else {
            desiredGeomOpIdx = opIndex;
            desiredGeomKey = `op:${desiredGeomOpIdx}`;
            desiredIsRaw = false;
          }
        } else {
          desiredGeomOpIdx = numOps - 1;
          desiredGeomKey = `op:${desiredGeomOpIdx}`;
          desiredIsRaw = false;
        }
        if (desiredGeomKey !== lastWorkpieceGeomKeyRef.current) {
          lastWorkpieceGeomKeyRef.current = desiredGeomKey;
          updateWorkpieceGeometry(desiredGeomOpIdx, part, 1.0, desiredIsRaw);
        }

        let activeOpIdx = 0;
        let currentStageTitle = '';
        let currentStrokeAngle = 0;
        let ramDisplacementMm = 0;
        let pressPressureBar = 12.0;

        // Reset all presses to open TDC by default
        pressesRef.current.forEach((press) => {
          if (pMat) updatePressSlide(press, 0.0, false, pMat);
        });

        // Reset all robot arms to standby by default
        robotArmsRef.current.forEach((robot) => {
          if (rMat) setRobotArmMotion(robot, 0.0, 0, 0, false, rMat);
        });

        // Default QC visual states
        if (qcLaserBeamRef.current) qcLaserBeamRef.current.visible = false;
        if (qcFlashLightRef.current) qcFlashLightRef.current.intensity = 0;
        if (qcVerdictBadgeRef.current) qcVerdictBadgeRef.current.visible = false;
        qcCameraLensesRef.current.forEach((lens) => {
          (lens.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.0;
        });
        if (qcStatusLightRef.current) {
          const qcMat = qcStatusLightRef.current.material as THREE.MeshStandardMaterial;
          qcMat.color.setHex(0x64748B);
          qcMat.emissive.setHex(0x000000);
          qcMat.emissiveIntensity = 0.0;
        }

        // Evaluate QC stage strictly when the active part reaches the QC inspection station during simulation (never in < / > overwrite mode)
        const qcPhase = getQcTimelinePhase(t, numOps);
        if (!processNavOverwriteRef.current) {
          if (!qcPhase.hasReachedQcDecision) {
            if (hasEvaluatedQcRef.current) {
              hasEvaluatedQcRef.current = false;
              cycleVerdictRef.current = null;
            }
            const nextQcStatus: QcStageStatus = qcPhase.isAtQcScanSweep ? 'SCANNING' : 'AWAITING';
            const statusKey = `${nextQcStatus}:null`;
            if (lastReportedQcKeyRef.current !== statusKey) {
              lastReportedQcKeyRef.current = statusKey;
              onQcStageUpdateRef.current?.(nextQcStatus, null);
            }
          } else {
            if (!hasEvaluatedQcRef.current || cycleVerdictRef.current === null) {
              const freshVerdict = resolveQcVerdict(qcModeRef.current);
              hasEvaluatedQcRef.current = true;
              cycleVerdictRef.current = freshVerdict;
            }
            const statusKey = `INSPECTED:${cycleVerdictRef.current}`;
            if (lastReportedQcKeyRef.current !== statusKey) {
              lastReportedQcKeyRef.current = statusKey;
              onQcStageUpdateRef.current?.('INSPECTED', cycleVerdictRef.current);
            }
          }
        }

        const allowQcVisuals = !processNavOverwriteRef.current || hasEvaluatedQcRef.current;

        const activeVerdict: QcVerdict = cycleVerdictRef.current ?? 'PASS';
        const isPass = activeVerdict === 'PASS';

        // Step Evaluation
        if (currentStep === 0) {
          // ==========================================
          // STEP 0: Infeed Transfer (Feeding Destacker -> Press 0)
          // ==========================================
          activeOpIdx = 0;
          currentStageTitle = `Infeed Robot: Transferring Raw Blank → ${part.operations[0]?.opCode || 'OP05'}`;

          const infeedRobot = robotArmsRef.current[0];
          const feedX = layout.feedingX;
          const press0X = layout.pressPositionsX[0] ?? 0;
          const fromPos = { x: feedX, y: 0.54, z: 0 };
          const toPos = { x: press0X, y: 0.92, z: 0 };

          if (infeedRobot && rMat) {
            const motion = setRobotArmMotion(infeedRobot, stepProgress, fromPos, toPos, true, rMat);

            if (motion.isGripping && workpieceGroupRef.current) {
              infeedRobot.rootGroup.updateMatrixWorld(true);
              const tcpPos = new THREE.Vector3();
              const tcpQuat = new THREE.Quaternion();
              infeedRobot.toolCenterPoint.getWorldPosition(tcpPos);
              infeedRobot.toolCenterPoint.getWorldQuaternion(tcpQuat);
              workpieceGroupRef.current.position.copy(tcpPos);
              workpieceGroupRef.current.quaternion.copy(tcpQuat);
            } else if (stepProgress < 0.24 && workpieceGroupRef.current) {
              workpieceGroupRef.current.position.set(feedX, 0.54, 0);
              workpieceGroupRef.current.quaternion.identity();
            } else if (workpieceGroupRef.current) {
              workpieceGroupRef.current.position.set(press0X, 0.92, 0);
              workpieceGroupRef.current.quaternion.identity();
            }
          }

          if (stepProgress >= 0.20 && stepProgress < 0.35) {
            triggerStepAudio('infeed_grip', () => {
              soundEngine.playVacuumSuction(true);
              soundEngine.playRobotServo();
            });
          } else if (stepProgress >= 0.76) {
            triggerStepAudio('infeed_place', () => {
              soundEngine.playVacuumSuction(false);
            });
          }

        } else if (currentStep < 2 * numOps) {
          // ==========================================
          // STEPS 1 to 2N-1: Alternating Stamping & Inter-Press Transfers
          // ==========================================
          const stepOffset = currentStep - 1;
          const isStamping = stepOffset % 2 === 0;
          const opIndex = Math.floor(stepOffset / 2);
          activeOpIdx = Math.min(numOps - 1, opIndex);
          const currentOp = part.operations[activeOpIdx];

          if (isStamping) {
            // STAMPING IN PRESS `opIndex`
            currentStageTitle = `Press ${activeOpIdx + 1}: ${currentOp?.opCode || 'OP'} ${currentOp?.name || 'Stamping'} (${currentOp?.pressTonnage}T)`;
            const press = pressesRef.current[activeOpIdx];

            // Harmonic ram cycle: starts TDC (0) -> reaches BDC (1) -> returns TDC (0)
            const strokeNorm = Math.sin(stepProgress * Math.PI);
            currentStrokeAngle = stepProgress * 360;
            ramDisplacementMm = strokeNorm * 350;

            if (press && pMat) {
              updatePressSlide(press, strokeNorm, true, pMat);
            }

            // Workpiece is 100% stationary and perfectly centered on the lower die bolster
            const pressX = layout.pressPositionsX[activeOpIdx] ?? 0;
            if (workpieceGroupRef.current) {
              workpieceGroupRef.current.position.set(pressX, 0.92, 0);
              workpieceGroupRef.current.quaternion.identity();
            }

            // Impact audio and pressure spike at bottom dead center
            if (stepProgress >= 0.45 && stepProgress <= 0.58) {
              triggerStepAudio('stamp_impact', () => {
                soundEngine.playStampImpact(currentOp?.pressTonnage || 400);
              });
            }

            if (stepProgress > 0.65) {
              triggerStepAudio('hydraulic_release', () => {
                soundEngine.playHydraulicRelease();
              });
            }

            if (strokeNorm > 0.7) {
              pressPressureBar = 12.0 + strokeNorm * 220.0;
            }

          } else {
            // INTER-PRESS ROBOT ARM TRANSFER (Press `opIndex` -> Press `opIndex + 1`)
            const nextOp = part.operations[opIndex + 1];
            currentStageTitle = `Robot Arm ${opIndex + 1}: Transfer ${currentOp?.opCode} → ${nextOp?.opCode}`;

            const robot = robotArmsRef.current[opIndex + 1];
            const fromX = layout.pressPositionsX[opIndex] ?? 0;
            const toX = layout.pressPositionsX[opIndex + 1] ?? 0;
            const fromPos = { x: fromX, y: 0.92, z: 0 };
            const toPos = { x: toX, y: 0.92, z: 0 };

            if (robot && rMat) {
              const motion = setRobotArmMotion(robot, stepProgress, fromPos, toPos, true, rMat);

              if (motion.isGripping && workpieceGroupRef.current) {
                robot.rootGroup.updateMatrixWorld(true);
                const tcpPos = new THREE.Vector3();
                const tcpQuat = new THREE.Quaternion();
                robot.toolCenterPoint.getWorldPosition(tcpPos);
                robot.toolCenterPoint.getWorldQuaternion(tcpQuat);
                workpieceGroupRef.current.position.copy(tcpPos);
                workpieceGroupRef.current.quaternion.copy(tcpQuat);
              } else if (stepProgress < 0.24 && workpieceGroupRef.current) {
                workpieceGroupRef.current.position.set(fromX, 0.92, 0);
                workpieceGroupRef.current.quaternion.identity();
              } else if (workpieceGroupRef.current) {
                workpieceGroupRef.current.position.set(toX, 0.92, 0);
                workpieceGroupRef.current.quaternion.identity();
              }
            }

            if (stepProgress >= 0.20 && stepProgress < 0.35) {
              triggerStepAudio(`grip_${opIndex}`, () => {
                soundEngine.playVacuumSuction(true);
                soundEngine.playRobotServo();
              });
            } else if (stepProgress >= 0.76) {
              triggerStepAudio(`place_${opIndex}`, () => {
                soundEngine.playVacuumSuction(false);
              });
            }
          }

        } else if (currentStep === 2 * numOps) {
          // ==========================================
          // STEP 2N: Outfeed Robot Transfer (Last Press -> QC Station)
          // ==========================================
          activeOpIdx = numOps - 1;
          currentStageTitle = 'Outfeed Robot: Transferring Stamped Part → QC Vision Station';

          const outfeedRobot = robotArmsRef.current[numOps];
          const fromX = layout.pressPositionsX[numOps - 1] ?? 0;
          const toX = layout.qcX;
          const fromPos = { x: fromX, y: 0.92, z: 0 };
          const toPos = { x: toX, y: 0.82, z: 0 };

          if (outfeedRobot && rMat) {
            const motion = setRobotArmMotion(outfeedRobot, stepProgress, fromPos, toPos, true, rMat);

            if (motion.isGripping && workpieceGroupRef.current) {
              outfeedRobot.rootGroup.updateMatrixWorld(true);
              const tcpPos = new THREE.Vector3();
              const tcpQuat = new THREE.Quaternion();
              outfeedRobot.toolCenterPoint.getWorldPosition(tcpPos);
              outfeedRobot.toolCenterPoint.getWorldQuaternion(tcpQuat);
              workpieceGroupRef.current.position.copy(tcpPos);
              workpieceGroupRef.current.quaternion.copy(tcpQuat);
            } else if (stepProgress < 0.24 && workpieceGroupRef.current) {
              workpieceGroupRef.current.position.set(fromX, 0.92, 0);
              workpieceGroupRef.current.quaternion.identity();
            } else if (workpieceGroupRef.current) {
              workpieceGroupRef.current.position.set(toX, 0.82, 0);
              workpieceGroupRef.current.quaternion.identity();
            }
          }

          if (stepProgress >= 0.20 && stepProgress < 0.35) {
            triggerStepAudio('outfeed_grip', () => {
              soundEngine.playVacuumSuction(true);
              soundEngine.playRobotServo();
            });
          } else if (stepProgress >= 0.76) {
            triggerStepAudio('outfeed_place', () => {
              soundEngine.playVacuumSuction(false);
            });
          }

        } else if (currentStep === 2 * numOps + 1) {
          // ==========================================
          // STEP 2N+1: QC Defect Detection Station (Stationary Part + Laser Scan + Camera Flash + Verdict)
          // ==========================================
          activeOpIdx = numOps - 1;
          currentStageTitle =
            !allowQcVisuals
              ? 'QC Defect Detection Station'
              : stepProgress < 0.45
              ? 'QC Defect Detection: Laser Triangulation Surface Scan...'
              : `QC Defect Detection: Inspection Result — ${isPass ? 'PASS (OK Bin)' : 'DEFECT (NG Bin)'}`;

          // Part remains 100% stationary on QC fixture table throughout inspection
          if (workpieceGroupRef.current) {
            workpieceGroupRef.current.position.set(layout.qcX, 0.82, 0);
            workpieceGroupRef.current.quaternion.identity();
          }

          if (allowQcVisuals) {
            // Phase 1: Laser Triangulation Scan Sweep (0.00 to 0.45)
            if (stepProgress < 0.45) {
              if (qcLaserBeamRef.current) {
                qcLaserBeamRef.current.visible = true;
                qcLaserBeamRef.current.position.x = (stepProgress / 0.45 - 0.5) * 1.0;
              }
              if (qcStatusLightRef.current) {
                const qcMat = qcStatusLightRef.current.material as THREE.MeshStandardMaterial;
                qcMat.color.setHex(0x06B6D4);
                qcMat.emissive.setHex(0x06B6D4);
                qcMat.emissiveIntensity = 0.7;
              }
              if (stepProgress >= 0.02) {
                triggerStepAudio('laser_scan', () => {
                  soundEngine.playLaserScan();
                });
              }
            }

            // Phase 2: High-Intensity Inspection Camera Strobe Flash (0.45 to 0.65)
            if (stepProgress >= 0.45 && stepProgress < 0.65) {
              const fp = (stepProgress - 0.45) / 0.20;
              const flashIntensity = Math.exp(-fp * 7.0) * 8.0;

              if (qcFlashLightRef.current) {
                qcFlashLightRef.current.intensity = flashIntensity;
              }
              qcCameraLensesRef.current.forEach((lens) => {
                (lens.material as THREE.MeshStandardMaterial).emissive.setHex(0xFFFFFF);
                (lens.material as THREE.MeshStandardMaterial).emissiveIntensity = flashIntensity * 0.4;
              });

              triggerStepAudio('cam_flash', () => {
                soundEngine.playCameraFlash();
              });
            } else {
              if (qcFlashLightRef.current) qcFlashLightRef.current.intensity = 0;
              qcCameraLensesRef.current.forEach((lens) => {
                (lens.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.0;
              });
            }

            // Phase 3: Inspection Verdict Display (0.52 to 1.00) & clean non-overlapping audio (0.56+)
            if (stepProgress >= 0.52) {
              // Signal tower status light
              if (qcStatusLightRef.current) {
                const hex = isPass ? 0x10B981 : 0xEF4444;
                (qcStatusLightRef.current.material as THREE.MeshStandardMaterial).color.setHex(hex);
                (qcStatusLightRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(hex);
                (qcStatusLightRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
              }

              // 3D Floating Verdict Badge
              if (qcVerdictBadgeRef.current) {
                qcVerdictBadgeRef.current.visible = true;
                (qcVerdictBadgeRef.current.material as THREE.MeshBasicMaterial).map = isPass
                  ? qcVerdictTexturePassRef.current
                  : qcVerdictTextureDefectRef.current;
                (qcVerdictBadgeRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
              }

              if (stepProgress >= 0.56) {
                triggerStepAudio('qc_verdict', () => {
                  soundEngine.playQcVerdict(isPass);
                });
              }
            }
          }

        } else {
          // ==========================================
          // STEP 2N+2: Sorting Robot Arm Transfer (QC -> OK Bin or NG Bin)
          // ==========================================
          activeOpIdx = numOps - 1;
          const sortingDest = getSortingDestinationForVerdict(activeVerdict);
          currentStageTitle = isPass
            ? 'Sorting Robot: Placing Conforming Part → OK Bin'
            : 'Sorting Robot: Defect Quarantined → NG Bin';

          // Keep QC signal tower showing the part's verdict while sorting completes (if inspected)
          if (allowQcVisuals && qcStatusLightRef.current) {
            const hex = isPass ? 0x10B981 : 0xEF4444;
            (qcStatusLightRef.current.material as THREE.MeshStandardMaterial).color.setHex(hex);
            (qcStatusLightRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(hex);
            (qcStatusLightRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.85;
          }

          const sortingRobot = robotArmsRef.current[numOps + 1];
          const targetZ = sortingDest.targetZ;
          const fromX = layout.qcX;
          const toX = layout.binsX;
          const fromPos = { x: fromX, y: 0.82, z: 0 };
          const toPos = { x: toX, y: 0.38, z: targetZ };

          if (sortingRobot && rMat) {
            const motion = setRobotArmMotion(sortingRobot, stepProgress, fromPos, toPos, true, rMat);

            if (motion.isGripping && workpieceGroupRef.current) {
              sortingRobot.rootGroup.updateMatrixWorld(true);
              const tcpPos = new THREE.Vector3();
              const tcpQuat = new THREE.Quaternion();
              sortingRobot.toolCenterPoint.getWorldPosition(tcpPos);
              sortingRobot.toolCenterPoint.getWorldQuaternion(tcpQuat);
              workpieceGroupRef.current.position.copy(tcpPos);
              workpieceGroupRef.current.quaternion.copy(tcpQuat);
            } else if (stepProgress < 0.24 && workpieceGroupRef.current) {
              workpieceGroupRef.current.position.set(fromX, 0.82, 0);
              workpieceGroupRef.current.quaternion.identity();
            } else if (workpieceGroupRef.current) {
              workpieceGroupRef.current.position.set(toX, 0.38, targetZ);
              workpieceGroupRef.current.quaternion.identity();
            }
          }

          if (stepProgress >= 0.20 && stepProgress < 0.35) {
            triggerStepAudio('sort_grip', () => {
              soundEngine.playVacuumSuction(true);
              soundEngine.playRobotServo();
            });
          } else if (stepProgress >= 0.76) {
            triggerStepAudio('sort_place', () => {
              soundEngine.playVacuumSuction(false);
            });
          }
          if (stepProgress >= 0.90) {
            triggerStepAudio('bin_drop', () => {
              soundEngine.playEjectPin();
            });
          }
        }

        // Parent telemetry updates
        onProgressUpdateRef.current(t, currentStrokeAngle, ramDisplacementMm, pressPressureBar);
        if (onLineProgressUpdateRef.current && isRunning && manualOverrideRef.current === null) {
          onLineProgressUpdateRef.current(t, currentStageTitle, activeOpIdx);
        }

      } else {
        // ==========================================
        // SINGLE OP STROKE ANALYSIS MODE
        // Focuses ram slide kinematics on selected OP machine
        // ==========================================
        const opIdx = Math.min(numOps - 1, currentOpIndexRef.current);
        const currentOp = part.operations[opIdx];
        const press = pressesRef.current[opIdx];

        if (isRunning && manualOverrideRef.current === null) {
          const progressInc = (dt * speed) / 3.0;
          cycleTimeRef.current = (cycleTimeRef.current + progressInc) % 1.0;
        }

        const cycleProgress = cycleTimeRef.current;
        const strokeAngle = (cycleProgress * 360) % 360;
        const strokeNormalized = Math.sin((strokeAngle / 360) * Math.PI);

        if (press && pMat) {
          updatePressSlide(press, strokeNormalized, isRunning, pMat);
        }

        // Centered workpiece under punch
        const pressX = layout.pressPositionsX[opIdx] ?? 0;
        if (workpieceGroupRef.current) {
          workpieceGroupRef.current.position.set(pressX, 0.92, 0);
          workpieceGroupRef.current.rotation.set(0, 0, 0);
        }

        if (strokeAngle >= 170 && strokeAngle <= 190 && !hasImpactedInCycleRef.current) {
          hasImpactedInCycleRef.current = true;
          soundEngine.playStampImpact(currentOp?.pressTonnage || 400);
          updateWorkpieceGeometry(opIdx, part, 1.0, false);
        }

        if (strokeAngle > 220 && hasImpactedInCycleRef.current) {
          hasImpactedInCycleRef.current = false;
          soundEngine.playHydraulicRelease();
        }

        const ramDisplacementMm = strokeNormalized * 350;
        const pressPressureBar = 12.0 + (strokeNormalized > 0.7 ? strokeNormalized * 220.0 : 0);
        onProgressUpdateRef.current(cycleProgress, strokeAngle, ramDisplacementMm, pressPressureBar);
      }

      renderer.render(scene, camera);

      // Coordinate axes inset sync
      if (axesRendererRef.current && axesSceneRef.current && axesCameraRef.current) {
        const axesCam = axesCameraRef.current;
        const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
        axesCam.position.copy(dir.multiplyScalar(4.0));
        axesCam.lookAt(0, 0, 0);
        axesCam.up.copy(camera.up);
        axesCam.updateProjectionMatrix();
        axesRendererRef.current.render(axesSceneRef.current, axesCam);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    const cancelLerp = () => {
      targetCamPosRef.current = null;
      targetCamLookRef.current = null;
    };

    controls.addEventListener('start', cancelLerp);
    const canvasDom = renderer.domElement;
    canvasDom.style.touchAction = 'none';
    canvasDom.addEventListener('pointerdown', cancelLerp, { passive: true });
    canvasDom.addEventListener('wheel', cancelLerp, { passive: true });

    // Setup 3D Coordinate Axes Gizmo Inset
    const axesContainer = axesMountRef.current;
    if (axesContainer) {
      const axesScene = new THREE.Scene();
      axesSceneRef.current = axesScene;

      const axesCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 20);
      axesCameraRef.current = axesCamera;

      const axesRenderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance'
      });
      axesRenderer.setSize(96, 96);
      axesRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      axesContainer.appendChild(axesRenderer.domElement);
      axesRendererRef.current = axesRenderer;

      const axesAmbLight = new THREE.AmbientLight(0xffffff, 1.2);
      axesScene.add(axesAmbLight);
      const axesDirLight = new THREE.DirectionalLight(0xffffff, 2.0);
      axesDirLight.position.set(3, 4, 3);
      axesScene.add(axesDirLight);

      const createAxis = (direction: THREE.Vector3, colorHex: number) => {
        const axisGroup = new THREE.Group();
        const length = 1.45;
        const radius = 0.055;
        const headLength = 0.42;
        const headRadius = 0.14;

        const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.25 });
        const cylinderGeom = new THREE.CylinderGeometry(radius, radius, length - headLength, 16);
        cylinderGeom.translate(0, (length - headLength) / 2, 0);
        const cylinder = new THREE.Mesh(cylinderGeom, mat);

        const coneGeom = new THREE.ConeGeometry(headRadius, headLength, 16);
        coneGeom.translate(0, length - headLength / 2, 0);
        const cone = new THREE.Mesh(coneGeom, mat);

        axisGroup.add(cylinder, cone);

        const up = new THREE.Vector3(0, 1, 0);
        if (!up.equals(direction)) {
          if (up.clone().negate().equals(direction)) {
            axisGroup.rotation.x = Math.PI;
          } else {
            const quat = new THREE.Quaternion().setFromUnitVectors(up, direction);
            axisGroup.applyQuaternion(quat);
          }
        }
        return axisGroup;
      };

      axesScene.add(createAxis(new THREE.Vector3(1, 0, 0), 0xEF4444));
      axesScene.add(createAxis(new THREE.Vector3(0, 1, 0), 0x10B981));
      axesScene.add(createAxis(new THREE.Vector3(0, 0, 1), 0x0754A6));

      const centerSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 })
      );
      axesScene.add(centerSphere);
    }

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => handleResize())
      : null;
    if (resizeObserver) {
      resizeObserver.observe(container);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      controls.removeEventListener('start', cancelLerp);
      canvasDom.removeEventListener('pointerdown', cancelLerp);
      canvasDom.removeEventListener('wheel', cancelLerp);
      canvasDom.removeEventListener('mousemove', handlePointerMove);
      canvasDom.removeEventListener('click', handlePointerClick);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (axesRendererRef.current && axesRendererRef.current.domElement && axesMountRef.current) {
        axesMountRef.current.removeChild(axesRendererRef.current.domElement);
        axesRendererRef.current.dispose();
      }
    };
  }, [rebuildProductionLine]);

  return (
    <div
      data-testid="stamping-scene-container"
      data-grid-visible={String(showGrid)}
      className="relative w-full h-full min-h-[300px] bg-[#F1F5F9] select-none overflow-hidden rounded-xl border border-[#E2E8F0] shadow-inner"
    >
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Viewport Top Watermark / Status Badge */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 bg-[#FFFFFF]/95 border border-[#E2E8F0] px-3 py-1.5 rounded-lg shadow-xs pointer-events-none">
        <div className="w-2.5 h-2.5 rounded-full bg-[#0754A6]" />
        <span className="text-xs font-bold text-[#0B2340] tracking-wide uppercase">
          Stamping Production Line Simulation
        </span>
        <span className="text-[11px] text-[#64748B] font-mono border-l border-[#CBD5E1] pl-2">
          {currentPart.devType} • {currentPart.codeName} • {currentPart.operations.length} Presses &amp; Robots
        </span>
      </div>

      {/* Interactive Hover Tooltip */}
      {hoveredStationName && (
        <div className="absolute top-12 left-3 bg-[#0B2340] text-white text-xs px-3 py-1.5 rounded-md shadow-md pointer-events-none flex items-center gap-2 border border-[#8DBEFF]/30 animate-in fade-in duration-150">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span>Click to inspect <strong>{hoveredStationName}</strong> specifications</span>
        </div>
      )}

      {/* 3D Cartesian Coordinate Axes (X: Red, Y: Green, Z: Blue) */}
      <div
        ref={axesMountRef}
        className="absolute top-2 right-2 w-[84px] h-[84px] pointer-events-none flex items-center justify-center overflow-hidden"
        title="3D Cartesian Coordinate Axes (X: Red, Y: Green, Z: Blue)"
      />
    </div>
  );
};
