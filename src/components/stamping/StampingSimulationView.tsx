/**
 * HICOM Engineering Sdn Bhd - Stamping Simulation View
 * Features:
 * - Dynamic Automotive Stamping Production Line for all 43 parts
 * - One physical stamping machine used sequentially for all operations
 * - Complete process flow: Material Feeding -> OP stages -> Conveyors -> QC Defect Detection -> OK / NG Bin
 * - Interactive Stamping Machine & Station Inspection Drawer (inspect without interrupting simulation)
 * - Full Production Run Mode & Single OP Stroke Analysis Mode
 * - Real-time machine telemetry, camera presets, sound synthesis, and technical specifications
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Grid,
  Volume2,
  VolumeX,
  Layers,
  Gauge,
  Sliders,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Shuffle,
  Scan,
  Package,
  ArrowRight
} from 'lucide-react';
import { StampingScene, CameraPreset, StepTransitionRequest, ZoomRequest } from '../3d/StampingScene';
import { STAMPING_PARTS, StampingPart } from '../../data/partsData';
import {
  ProductionStation,
  generateProductionLineStations,
  generateRobotArmStations
} from '../../data/productionLine';
import { StationSpecDrawer } from './StationSpecDrawer';
import { soundEngine } from '../../utils/audioSynthesis';
import {
  QcMode,
  QcVerdict,
  QcStageStatus,
  QcCycleState,
  createInitialQcCycleState,
  applyQcStageUpdate,
  completeQcCycleIfInspected,
  resetCurrentPartQcState
} from '../../utils/qcInspectionEngine';
import {
  formatCompletePartName,
  getProcessSequence,
  getProcessIndexFromLineProgress,
  getActiveStationIndexForProcess,
  clampProcessIndex,
  getResultBinLabel
} from '../../utils/processStepNavigation';
import {
  getNextSimulationSpeed,
  resolveSimulationShortcut
} from '../../utils/simulationShortcuts';

export const StampingSimulationView: React.FC = () => {
  // Part Selection State
  const [selectedPartId, setSelectedPartId] = useState<number>(1);

  // Simulation Modes & Per-Cycle QC State
  const [simulationMode, setSimulationMode] = useState<'full_line' | 'single_op'>('full_line');
  const [qcCycleState, setQcCycleState] = useState<QcCycleState>(() =>
    createInitialQcCycleState('PASS')
  );

  const handleSetQcMode = (mode: QcMode) => {
    setQcCycleState(prev => ({
      ...prev,
      mode
    }));
  };

  const isOverwriteNavRef = useRef<boolean>(false);

  const handleQcStageUpdate = (status: QcStageStatus, verdict: QcVerdict | null) => {
    if (isOverwriteNavRef.current) return;
    setQcCycleState(prev => applyQcStageUpdate(prev, status, verdict, isOverwriteNavRef.current));
  };
  const [currentOpIndex, setCurrentOpIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [restartTrigger, setRestartTrigger] = useState<number>(0);
  const [manualProgressOverride, setManualProgressOverride] = useState<number | null>(null);
  const [stepTransitionRequest, setStepTransitionRequest] = useState<StepTransitionRequest | null>(null);
  const stepRequestIdRef = useRef<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Interactive Inspection Drawer State (Non-intrusive, does not pause simulation)
  const [inspectedStation, setInspectedStation] = useState<ProductionStation | null>(null);

  // 3D Viewport Controls
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraPreset | null>(null);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('');
  const [zoomRequest, setZoomRequest] = useState<ZoomRequest | null>(null);
  const zoomRequestIdRef = useRef<number>(0);

  // Live Telemetry from 3D Scene
  const [simProgress, setSimProgress] = useState<number>(0);
  const [lineProgress, setLineProgress] = useState<number>(0);
  const [strokeAngle, setStrokeAngle] = useState<number>(0);
  const [ramDisplacementMm, setRamDisplacementMm] = useState<number>(0);
  const [pressPressureBar, setPressPressureBar] = useState<number>(12);

  // Active Part Object
  const currentPart: StampingPart = useMemo(() => {
    return STAMPING_PARTS.find(p => p.id === selectedPartId) || STAMPING_PARTS[0];
  }, [selectedPartId]);

  // Dynamically Generated Production Line Stations for the selected part
  const productionStations = useMemo(() => {
    return generateProductionLineStations(currentPart);
  }, [currentPart]);

  // Pick-and-Place Robot Arm Stations
  const robotStations = useMemo(() => {
    return generateRobotArmStations(currentPart);
  }, [currentPart]);

  // Discrete Process Sequence for < and > navigation (FEED -> OPs -> QC -> OK/NG BIN)
  const processSequence = useMemo(() => {
    return getProcessSequence(currentPart);
  }, [currentPart]);

  // Current Operation
  const currentOperation = currentPart.operations[currentOpIndex] || currentPart.operations[0];
  const totalOperations = Math.max(1, currentPart.operations.length);

  // Current discrete process index derived from lineProgress
  const currentProcessIndex = useMemo(() => {
    return getProcessIndexFromLineProgress(lineProgress, totalOperations);
  }, [lineProgress, totalOperations]);

  // Handlers
  const handlePartSelect = (partId: number) => {
    soundEngine.unlock();
    isOverwriteNavRef.current = false;
    setSelectedPartId(partId);
    setCurrentOpIndex(0);
    setSimProgress(0);
    setLineProgress(0);
    setStrokeAngle(0);
    setRamDisplacementMm(0);
    setPressPressureBar(12);
    setManualProgressOverride(null);
    setStepTransitionRequest(null);
    setRestartTrigger(prev => prev + 1);
    setIsPlaying(false);
    setInspectedStation(null);
    setQcCycleState(prev => resetCurrentPartQcState(prev, true));
  };

  const handleNextOp = () => {
    if (currentOpIndex < totalOperations - 1) {
      setCurrentOpIndex(prev => prev + 1);
      setSimProgress(0);
      setStrokeAngle(0);
      setRamDisplacementMm(0);
      setPressPressureBar(12);
      setRestartTrigger(prev => prev + 1);
      setIsPlaying(false);
    }
  };

  const handlePrevOp = () => {
    if (currentOpIndex > 0) {
      setCurrentOpIndex(prev => prev - 1);
      setSimProgress(0);
      setStrokeAngle(0);
      setRamDisplacementMm(0);
      setPressPressureBar(12);
      setRestartTrigger(prev => prev + 1);
      setIsPlaying(false);
    }
  };

  const handleCycleComplete = () => {
    if (isOverwriteNavRef.current) return;
    setQcCycleState(prev =>
      completeQcCycleIfInspected(prev, prev.hasInspectedCurrentPart, isOverwriteNavRef.current)
    );
  };

  // Throttled live telemetry updates for smooth 60fps rendering
  const lastUpdateRef = useRef<number>(0);
  const isDraggingSliderRef = useRef<boolean>(false);

  const handleProgressUpdate = (
    progress: number,
    angle: number,
    dispMm: number,
    pressure: number
  ) => {
    if (isDraggingSliderRef.current) return;
    const now = performance.now();
    if (now - lastUpdateRef.current > 48) {
      lastUpdateRef.current = now;
      setSimProgress(progress);
      setStrokeAngle(angle);
      setRamDisplacementMm(dispMm);
      setPressPressureBar(pressure);
    }
  };

  const handleLineProgressUpdate = (
    prog: number,
    _stageTitle: string,
    activeOpIdx: number
  ) => {
    setLineProgress(prog);
    if (activeOpIdx !== currentOpIndex && activeOpIdx < currentPart.operations.length) {
      setCurrentOpIndex(activeOpIdx);
    }
  };

  // Slider Scrub (automatically pauses simulation while adjusting; operates in overwrite mode)
  const handleSliderStart = () => {
    isDraggingSliderRef.current = true;
    isOverwriteNavRef.current = true;
    setIsPlaying(false);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const progress = Math.max(0, Math.min(1, val / 100));
    isOverwriteNavRef.current = true;
    setIsPlaying(false);
    setStepTransitionRequest(null);
    setManualProgressOverride(progress);
    setSimProgress(progress);
    if (simulationMode === 'full_line') {
      setLineProgress(progress);
    } else {
      const angle = (progress * 360) % 360;
      setStrokeAngle(angle);
    }
  };

  const handleSliderCommit = () => {
    isDraggingSliderRef.current = false;
  };

  const handlePlayToggle = () => {
    soundEngine.unlock();
    if (!isPlaying) {
      isOverwriteNavRef.current = false;
    }
    setManualProgressOverride(null);
    setStepTransitionRequest(null);
    setIsPlaying(prev => !prev);
  };

  const handleRestart = () => {
    isOverwriteNavRef.current = false;
    setManualProgressOverride(null);
    setStepTransitionRequest(null);
    setSimProgress(0);
    setLineProgress(0);
    setStrokeAngle(0);
    setRamDisplacementMm(0);
    setPressPressureBar(12);
    setCurrentOpIndex(0);
    setRestartTrigger(prev => prev + 1);
    setIsPlaying(false);
    setQcCycleState(prev => resetCurrentPartQcState(prev, false));
  };

  const handleStepProcess = (delta: -1 | 1) => {
    soundEngine.unlock();
    if (simulationMode === 'full_line') {
      const nextIndex = clampProcessIndex(currentProcessIndex + delta, processSequence.length);
      if (nextIndex === currentProcessIndex) return;
      const targetStep = processSequence[nextIndex];
      isOverwriteNavRef.current = true;
      setIsPlaying(false);
      setManualProgressOverride(null);
      setLineProgress(targetStep.targetLineProgress);
      setSimProgress(targetStep.targetLineProgress);
      if (targetStep.opIndex !== null) {
        setCurrentOpIndex(targetStep.opIndex);
      } else if (targetStep.kind === 'feed') {
        setCurrentOpIndex(0);
      } else {
        setCurrentOpIndex(totalOperations - 1);
      }
      stepRequestIdRef.current += 1;
      setStepTransitionRequest({
        id: stepRequestIdRef.current,
        targetProgress: targetStep.targetLineProgress
      });
    } else {
      if (delta > 0) handleNextOp();
      else handlePrevOp();
    }
  };

  const triggerCameraPreset = (preset: CameraPreset, label: string) => {
    setActiveCameraPreset(preset);
    setActiveCameraLabel(label);
  };

  const triggerZoom = (direction: 'in' | 'out') => {
    zoomRequestIdRef.current += 1;
    setActiveCameraLabel('');
    setZoomRequest({ id: zoomRequestIdRef.current, direction });
  };

  const handleRestartQcCounter = () => {
    setQcCycleState(prev => resetCurrentPartQcState(prev, true));
  };

  const toggleSound = () => {
    soundEngine.unlock();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  // Keyboard shortcuts for simulation & camera controls (active only while Stamping Simulation is mounted)
  const shortcutHandlersRef = useRef({
    togglePlay: () => {},
    restart: () => {},
    cycleSpeed: () => {},
    zoomIn: () => {},
    zoomOut: () => {},
    fullLine: () => {}
  });

  shortcutHandlersRef.current = {
    togglePlay: handlePlayToggle,
    restart: handleRestart,
    cycleSpeed: () => setPlaybackSpeed(prev => getNextSimulationSpeed(prev)),
    zoomIn: () => triggerZoom('in'),
    zoomOut: () => triggerZoom('out'),
    fullLine: () => triggerCameraPreset('fit', 'Full Line')
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = resolveSimulationShortcut(event);
      if (!action) return;

      event.preventDefault();
      if (action === 'toggle_play' && event.target instanceof Element) {
        const buttonEl = event.target.closest('button, [role="button"]');
        if (buttonEl instanceof HTMLElement) {
          buttonEl.blur();
        }
      }
      const handlers = shortcutHandlersRef.current;
      switch (action) {
        case 'toggle_play':
          handlers.togglePlay();
          break;
        case 'restart':
          handlers.restart();
          break;
        case 'cycle_speed':
          handlers.cycleSpeed();
          break;
        case 'zoom_in':
          handlers.zoomIn();
          break;
        case 'zoom_out':
          handlers.zoomOut();
          break;
        case 'full_line':
          handlers.fullLine();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 3D Raycasting Station Click Handler
  const handleStationClickFrom3D = (stationId: string) => {
    let targetStation: ProductionStation | undefined;

    if (stationId.startsWith('station-robot')) {
      targetStation = robotStations.find(r => r.id === stationId);
    } else if (stationId === 'station-machine') {
      // Find the currently active OP station
      targetStation = productionStations.find(s => s.type === 'stamping_op' && s.opIndex === currentOpIndex)
        || productionStations.find(s => s.type === 'stamping_op');
    } else if (stationId === 'station-destacker' || stationId === 'station-feeding') {
      targetStation = productionStations.find(s => s.type === 'feeding');
    } else {
      targetStation = productionStations.find(s => s.id === stationId);
    }

    if (targetStation) {
      setInspectedStation(targetStation);
    }
  };

  // Calculate active station index on the production line track
  const activeStationIndex = useMemo(() => {
    if (simulationMode === 'single_op') {
      return 1 + currentOpIndex;
    }
    return getActiveStationIndexForProcess(
      currentProcessIndex,
      totalOperations,
      qcCycleState.currentPartVerdict
    );
  }, [simulationMode, currentOpIndex, currentProcessIndex, totalOperations, qcCycleState.currentPartVerdict]);

  const isAtFirstProcess = simulationMode === 'full_line' ? currentProcessIndex <= 0 : currentOpIndex <= 0;
  const isAtLastProcess =
    simulationMode === 'full_line'
      ? currentProcessIndex >= processSequence.length - 1
      : currentOpIndex >= totalOperations - 1;

  const displayOperationCurrent = simulationMode === 'full_line' ? currentProcessIndex + 1 : currentOpIndex + 1;
  const displayOperationTotal = simulationMode === 'full_line' ? processSequence.length : totalOperations;

  const baseSpm = currentPart.devTypeCode === 'SL' ? 26 : 20;
  const liveSpm = isPlaying ? baseSpm * playbackSpeed : 0;
  const operatingTempC = (38.5 + (pressPressureBar / 320) * 8.5).toFixed(1);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. TOP SECTION: PART SELECTION (Full Width) */}
      <div
        data-testid="section-part-selection"
        className="w-full bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs"
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2340] flex items-center gap-1.5">
            <Package className="w-4 h-4 text-[#0754A6]" /> Part Selection
          </h3>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0754A6]/10 flex items-center justify-center text-[#0754A6] shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0754A6]/10 text-[#0754A6]">
                  {currentPart.devType} ({currentPart.devTypeCode})
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F3F5F8] text-[#64748B] border border-[#E2E8F0]">
                  {currentPart.diesType}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F3F5F8] text-[#64748B] border border-[#E2E8F0]">
                  Press Line: {currentPart.pressLineSummary}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#0B2340] tracking-tight mt-1">
                {currentPart.name}
              </h2>
            </div>
          </div>

          {/* Quick Select Dropdown with All 43 Parts */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-auto min-w-[280px] sm:min-w-[340px]">
              <select
                aria-label="Select Stamping Part"
                value={selectedPartId}
                onChange={(e) => handlePartSelect(Number(e.target.value))}
                className="w-full bg-[#F3F5F8] border border-[#CBD5E1] text-[#273444] text-xs font-semibold rounded-lg px-3 py-2.5 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0754A6] focus:border-transparent cursor-pointer font-sans"
              >
                {STAMPING_PARTS.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.codeName}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-[#64748B]">
                <Layers className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN SECTION: SIMULATION (Full Width, Compact Viewing Area) */}
      <div
        data-testid="section-simulation-viewport"
        className="relative w-full h-[340px] sm:h-[380px] lg:h-[420px] xl:h-[440px] bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden p-1.5 flex flex-col"
      >
        <StampingScene
          currentPart={currentPart}
          currentOpIndex={currentOpIndex}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          restartTrigger={restartTrigger}
          manualProgressOverride={manualProgressOverride}
          stepTransitionRequest={stepTransitionRequest}
          simulationMode={simulationMode}
          qcMode={qcCycleState.mode}
          onCycleComplete={handleCycleComplete}
          onQcStageUpdate={handleQcStageUpdate}
          onProgressUpdate={handleProgressUpdate}
          onLineProgressUpdate={handleLineProgressUpdate}
          onStationClick={handleStationClickFrom3D}
          showGrid={showGrid}
          activeCameraPreset={activeCameraPreset}
          onCameraPresetHandled={() => setActiveCameraPreset(null)}
          zoomRequest={zoomRequest}
        />

        {/* Viewport Action Controls: Zoom In, Zoom Out, Fit Full Line, Ground Grid, Sound */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[#FFFFFF]/95 border border-[#E2E8F0] px-3 py-1.5 rounded-xl shadow-md text-[11px] font-medium text-[#273444] z-10 backdrop-blur-none">
          <button
            type="button"
            data-testid="btn-zoom-in"
            onClick={() => triggerZoom('in')}
            className="p-1.5 rounded hover:bg-[#F3F5F8] text-[#0754A6] transition-colors shrink-0 cursor-pointer"
            title="Zoom In (+)"
            aria-label="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            data-testid="btn-zoom-out"
            onClick={() => triggerZoom('out')}
            className="p-1.5 rounded hover:bg-[#F3F5F8] text-[#0754A6] transition-colors shrink-0 cursor-pointer"
            title="Zoom Out (-)"
            aria-label="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-[#CBD5E1] mx-0.5 shrink-0" />

          <button
            type="button"
            data-testid="btn-full-line"
            onClick={() => triggerCameraPreset('fit', 'Full Line')}
            className={`px-2.5 py-1 rounded hover:bg-[#F3F5F8] transition-colors font-semibold flex items-center gap-1 shrink-0 cursor-pointer ${activeCameraLabel === 'Full Line' ? 'bg-[#0754A6] text-white' : 'text-[#0754A6]'}`}
            title="Fit Entire Production Line to View (F)"
          >
            <Maximize2 className="w-3.5 h-3.5" /> Full Line
          </button>

          <div className="w-[1px] h-4 bg-[#CBD5E1] mx-0.5 shrink-0" />

          <button
            type="button"
            data-testid="btn-toggle-grid"
            onClick={() => setShowGrid(prev => !prev)}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${showGrid ? 'bg-[#0754A6]/10 text-[#0754A6]' : 'text-[#64748B]'}`}
            title="Toggle Ground Grid"
          >
            <Grid className="w-3.5 h-3.5" /> {showGrid ? 'Grid' : 'No Grid'}
          </button>
          <button
            type="button"
            onClick={toggleSound}
            className={`px-2 py-1 rounded transition-colors shrink-0 cursor-pointer ${!isMuted ? 'text-[#0754A6]' : 'text-[#64748B]'}`}
            title={isMuted ? 'Unmute Mechanical Sound' : 'Mute Mechanical Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 3. BELOW SIMULATION: STAMPING PROCESS FLOW (Full Width) */}
      <div
        data-testid="section-process-flow"
        className="w-full bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0754A6]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2340]">
              Stamping Process Flow
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="operation-nav-indicator"
              className="text-xs font-semibold text-[#0B2340] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-lg"
            >
              Operation {displayOperationCurrent} of {displayOperationTotal}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="btn-prev-process"
                onClick={() => handleStepProcess(-1)}
                disabled={isAtFirstProcess}
                className="px-2.5 py-1 rounded-lg bg-[#F3F5F8] hover:bg-[#E2E8F0] text-[#273444] font-bold text-xs transition-colors border border-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#F3F5F8] cursor-pointer"
                title="Previous Process"
              >
                &lt;
              </button>
              <button
                type="button"
                data-testid="btn-next-process"
                onClick={() => handleStepProcess(1)}
                disabled={isAtLastProcess}
                className="px-2.5 py-1 rounded-lg bg-[#F3F5F8] hover:bg-[#E2E8F0] text-[#273444] font-bold text-xs transition-colors border border-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#F3F5F8] cursor-pointer"
                title="Next Process"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Station Pills Track */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {(() => {
            const ngBinStation = productionStations.find(s => s.type === 'sorting_ng') || null;
            const flowStations = productionStations.filter(s => s.type !== 'sorting_ng');
            return flowStations.map((station, sIdx) => {
              const isResultBin = station.type === 'sorting_ok';
              const isActive = isResultBin
                ? activeStationIndex >= sIdx
                : sIdx === activeStationIndex;
              const isCompleted = isResultBin ? false : sIdx < activeStationIndex;
              const inspectedTarget =
                isResultBin && qcCycleState.currentPartVerdict === 'DEFECT' && ngBinStation
                  ? ngBinStation
                  : station;
              const stationLabel = isResultBin
                ? getResultBinLabel(qcCycleState.currentPartVerdict)
                : station.opCode || (station.type === 'feeding' ? 'FEED' : 'QC SCAN');

              return (
                <React.Fragment key={station.id}>
                  <button
                    type="button"
                    data-testid={isResultBin ? 'process-pill-result-bin' : `process-pill-${station.type}`}
                    onClick={() => setInspectedStation(inspectedTarget)}
                    aria-current={isActive ? 'step' : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#0754A6] text-white border-[#0754A6] shadow-sm ring-2 ring-[#0754A6]/30'
                        : isCompleted
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534] hover:bg-[#DCFCE7]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-white hover:border-[#CBD5E1]'
                    }`}
                    title={`Click to view machine & process specifications for ${inspectedTarget.title}`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-white text-[#0754A6]'
                          : isCompleted
                          ? 'bg-[#10B981] text-white'
                          : 'bg-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      {isCompleted ? '✓' : sIdx + 1}
                    </div>
                    <div className="text-xs font-bold leading-tight flex items-center gap-1">
                      <span>{stationLabel}</span>
                      {station.opName && (
                        <span className={`text-[10px] font-normal ${isActive ? 'text-white/80' : 'text-[#64748B]'}`}>
                          • {station.opName}
                        </span>
                      )}
                      {station.type === 'qc_inspection' && qcCycleState.currentPartVerdict && (
                        <span
                          className={`ml-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                            qcCycleState.currentPartVerdict === 'PASS'
                              ? 'bg-[#10B981] text-white'
                              : 'bg-[#EF4444] text-white'
                          }`}
                        >
                          {qcCycleState.currentPartVerdict}
                        </span>
                      )}
                    </div>
                  </button>
                  {sIdx < flowStations.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-[#CBD5E1] shrink-0" />
                  )}
                </React.Fragment>
              );
            });
          })()}
        </div>
      </div>

      {/* 4. BOTTOM SECTION: 2-Column Equal-Width Grid
          Row 1: SIMULATION CONTROL | QC INSPECTION STATION
          Row 2: MACHINE TELEMETRY  | PART TECHNICAL SPEC */}
      <div
        data-testid="section-bottom-grid"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch"
      >
        {/* Row 1 Left: Simulation Control */}
        <div
          data-testid="simulation-control-section"
          className="h-full bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between gap-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2340] flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-[#0754A6]" /> Simulation Control
            </h3>
          </div>

          {/* Simulation Mode */}
          <div
            data-testid="sim-mode-row"
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <span className="text-xs font-bold text-[#0B2340]">Simulation Mode:</span>
            <div
              data-testid="sim-mode-buttons"
              className="flex items-center bg-[#F1F5F9] p-1 rounded-lg border border-[#CBD5E1] ml-auto"
            >
              <button
                onClick={() => {
                  isOverwriteNavRef.current = false;
                  setSimulationMode('full_line');
                  setManualProgressOverride(null);
                  setStepTransitionRequest(null);
                  setSimProgress(0);
                  setLineProgress(0);
                }}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  simulationMode === 'full_line'
                    ? 'bg-[#0754A6] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0B2340]'
                }`}
              >
                Full Production Line Run
              </button>
              <button
                onClick={() => {
                  isOverwriteNavRef.current = false;
                  setSimulationMode('single_op');
                  setManualProgressOverride(null);
                  setStepTransitionRequest(null);
                  setSimProgress(0);
                }}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  simulationMode === 'single_op'
                    ? 'bg-[#0754A6] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0B2340]'
                }`}
              >
                Single OP Stroke Analysis
              </button>
            </div>
          </div>

          {/* Simulated QC Result */}
          <div
            data-testid="sim-qc-row"
            className="flex items-center justify-between gap-2 flex-wrap"
          >
            <span className="text-xs font-bold text-[#0B2340]">Simulated QC Result:</span>
            <div
              data-testid="sim-qc-buttons"
              className="flex items-center bg-[#F1F5F9] p-1 rounded-lg border border-[#CBD5E1] gap-1 ml-auto"
            >
              <button
                onClick={() => handleSetQcMode('PASS')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  qcCycleState.mode === 'PASS'
                    ? 'bg-[#10B981] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0B2340]'
                }`}
                title="Set QC Mode to PASS (Transfers to OK Bin)"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> PASS
              </button>
              <button
                onClick={() => handleSetQcMode('DEFECT')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  qcCycleState.mode === 'DEFECT'
                    ? 'bg-[#EF4444] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0B2340]'
                }`}
                title="Set QC Mode to DEFECT (Transfers to NG Bin)"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> DEFECT
              </button>
              <button
                onClick={() => handleSetQcMode('RANDOM')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  qcCycleState.mode === 'RANDOM'
                    ? 'bg-[#0754A6] text-white shadow-xs'
                    : 'text-[#0754A6] hover:bg-[#0754A6]/10'
                }`}
                title="Enable Random QC Mode (Independently generates PASS or DEFECT each cycle upon reaching QC)"
              >
                <Shuffle className="w-3.5 h-3.5" /> RANDOM
              </button>
            </div>
          </div>

          {/* Stroke/Angle Slider */}
          <div className="w-full flex items-center gap-3 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-1.5 rounded-xl">
            <span className="text-[11px] font-mono font-bold text-[#0B2340] min-w-[38px]">
              {Math.round((simulationMode === 'full_line' ? lineProgress : simProgress) * 100)}%
            </span>

            <div className="relative flex-1 flex items-center h-5">
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={Math.round((simulationMode === 'full_line' ? lineProgress : simProgress) * 100)}
                onPointerDown={handleSliderStart}
                onPointerUp={handleSliderCommit}
                onMouseDown={handleSliderStart}
                onTouchStart={handleSliderStart}
                onChange={handleSliderChange}
                onMouseUp={handleSliderCommit}
                onTouchEnd={handleSliderCommit}
                aria-label="Adjust Simulation Timeline"
                className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-ew-resize accent-[#0754A6] focus:outline-none focus:ring-2 focus:ring-[#0754A6]/30"
              />
            </div>

            <span className="text-[11px] font-mono font-bold text-[#0754A6] min-w-[44px] text-right">
              {simulationMode === 'full_line' ? (
                `${(lineProgress * (18 + totalOperations * 2)).toFixed(1)}s`
              ) : (
                `${Math.floor(strokeAngle)}°`
              )}
            </span>
          </div>

          {/* Simulation Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                data-testid="btn-play-pause"
                onClick={handlePlayToggle}
                title={isPlaying ? 'Pause Simulation (Space)' : 'Play Simulation (Space)'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-sm cursor-pointer ${
                  isPlaying
                    ? 'bg-[#0B2340] hover:bg-[#1E293B] text-white'
                    : 'bg-[#0754A6] hover:bg-[#064487] text-white'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Play Simulation
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="btn-restart-sim"
                onClick={handleRestart}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F3F5F8] hover:bg-[#E2E8F0] text-[#273444] font-medium text-xs transition-colors border border-[#CBD5E1] cursor-pointer"
                title="Restart Simulation (R)"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restart
              </button>
            </div>

            <div className="flex items-center gap-1 bg-[#F3F5F8] p-1 rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] font-semibold text-[#64748B] px-1.5 uppercase">Speed:</span>
              {([1, 2, 5] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  data-testid={`btn-speed-${spd}x`}
                  aria-pressed={playbackSpeed === spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  title={`Simulation Speed ${spd}x — Cycle Speed (S)`}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded transition-all cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-[#0754A6] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#273444] hover:bg-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 1 Right: QC Inspection Station */}
        <div
          data-testid="qc-inspection-section"
          className="h-full bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2340] flex items-center gap-1.5 shrink-0">
              <Scan className="w-4 h-4 text-[#0754A6]" /> QC Inspection Station
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  qcCycleState.mode === 'RANDOM'
                    ? 'bg-[#0754A6]/10 text-[#0754A6]'
                    : qcCycleState.mode === 'PASS'
                    ? 'bg-[#10B981]/10 text-[#059669]'
                    : 'bg-[#EF4444]/10 text-[#DC2626]'
                }`}
              >
                {qcCycleState.mode === 'RANDOM' ? 'MODE: RANDOM' : `MODE: ${qcCycleState.mode}`}
              </span>
              <span
                data-testid="qc-cycle-badge"
                className="text-[10px] font-mono text-[#64748B] font-semibold"
              >
                Cycle #{qcCycleState.cycleNumber}
              </span>
              <button
                type="button"
                data-testid="btn-restart-qc-counter"
                onClick={handleRestartQcCounter}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F3F5F8] hover:bg-[#E2E8F0] text-[#273444] border border-[#CBD5E1] text-[10px] font-semibold transition-colors cursor-pointer shrink-0"
                title="Reset QC cycle & bin counters without interrupting simulation"
              >
                <RotateCcw className="w-3 h-3" /> Restart Counter
              </button>
            </div>
          </div>

          {simulationMode === 'single_op' ? (
            <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569]">
              Switch to <strong>Full Production Line Run</strong> to inspect completed stampings at the QC station and sort to OK / NG bins.
            </div>
          ) : (
            <>
              <div
                className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                  qcCycleState.currentPartVerdict === 'PASS'
                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                    : qcCycleState.currentPartVerdict === 'DEFECT'
                    ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    : qcCycleState.stageStatus === 'SCANNING'
                    ? 'bg-[#ECFEFF] border-[#A5F3FC] text-[#155E75]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#334155]'
                }`}
              >
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                    Inspection Result (Current Part)
                  </div>
                  <div className="text-base font-bold font-mono mt-0.5 flex items-center gap-1.5">
                    {qcCycleState.currentPartVerdict === 'PASS' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        <span>PASS</span>
                      </>
                    ) : qcCycleState.currentPartVerdict === 'DEFECT' ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                        <span>DEFECT</span>
                      </>
                    ) : qcCycleState.stageStatus === 'SCANNING' ? (
                      <span>SCANNING PART...</span>
                    ) : (
                      <span className="text-xs font-sans font-semibold text-[#64748B]">
                        Awaiting Part at QC Stage
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-90">
                    {qcCycleState.currentPartVerdict === 'PASS'
                      ? 'Sorting Destination: Transferring to OK Bin'
                      : qcCycleState.currentPartVerdict === 'DEFECT'
                      ? 'Sorting Destination: Transferring to NG Bin'
                      : qcCycleState.stageStatus === 'SCANNING'
                      ? 'Laser triangulation & optical camera analysis active'
                      : qcCycleState.mode === 'RANDOM'
                      ? 'New random verdict generates when part reaches QC'
                      : `Configured outcome (${qcCycleState.mode}) applies upon QC arrival`}
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold shrink-0 ${
                    qcCycleState.currentPartVerdict === 'PASS'
                      ? 'bg-[#10B981] text-white'
                      : qcCycleState.currentPartVerdict === 'DEFECT'
                      ? 'bg-[#EF4444] text-white'
                      : qcCycleState.stageStatus === 'SCANNING'
                      ? 'bg-[#06B6D4] text-white'
                      : 'bg-[#E2E8F0] text-[#475569]'
                  }`}
                >
                  {qcCycleState.currentPartVerdict === 'PASS'
                    ? 'OK BIN'
                    : qcCycleState.currentPartVerdict === 'DEFECT'
                    ? 'NG BIN'
                    : qcCycleState.stageStatus === 'SCANNING'
                    ? 'SCAN'
                    : 'PENDING'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-2">
                  <div className="text-[10px] font-bold uppercase text-[#166534]">OK Bin</div>
                  <div
                    data-testid="qc-ok-count"
                    className="text-sm font-mono font-bold text-[#15803D] mt-0.5"
                  >
                    {qcCycleState.passCount}
                  </div>
                </div>
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-2">
                  <div className="text-[10px] font-bold uppercase text-[#991B1B]">NG Bin</div>
                  <div
                    data-testid="qc-ng-count"
                    className="text-sm font-mono font-bold text-[#DC2626] mt-0.5"
                  >
                    {qcCycleState.defectCount}
                  </div>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2">
                  <div className="text-[10px] font-bold uppercase text-[#64748B]">Last QC</div>
                  <div
                    data-testid="qc-last-verdict"
                    className={`text-sm font-mono font-bold mt-0.5 ${
                      qcCycleState.lastCompletedVerdict === 'PASS'
                        ? 'text-[#059669]'
                        : qcCycleState.lastCompletedVerdict === 'DEFECT'
                        ? 'text-[#DC2626]'
                        : 'text-[#94A3B8]'
                    }`}
                  >
                    {qcCycleState.lastCompletedVerdict ?? '—'}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Row 2 Left: Machine Telemetry Panel */}
        <div
          data-testid="machine-telemetry-section"
          className="h-full bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col gap-3"
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2340] flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-[#0754A6]" /> Machine Telemetry
            </h3>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-2.5 flex-1">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
              <div className="text-[10px] text-[#64748B] uppercase font-bold">
                Strokes / Min (SPM)
              </div>
              <div className="text-lg font-bold font-mono text-[#0B2340] mt-1">
                {liveSpm.toFixed(0)} <span className="text-xs font-normal text-[#64748B]">SPM</span>
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">
                Line rating: {currentPart.devTypeCode === 'SL' ? '26 SPM' : '20 SPM'}
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
              <div className="text-[10px] text-[#64748B] uppercase font-bold">
                Die Bed Temp
              </div>
              <div className="text-lg font-bold font-mono text-[#0B2340] mt-1">
                {operatingTempC} <span className="text-xs font-normal text-[#64748B]">°C</span>
              </div>
              <div className="text-[10px] text-[#059669] mt-0.5">
                Thermal state: Normal
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
              <div className="text-[10px] text-[#64748B] uppercase font-bold">
                Press Hydraulic Load
              </div>
              <div className="text-lg font-bold font-mono text-[#0754A6] mt-1">
                {pressPressureBar.toFixed(1)} <span className="text-xs font-normal text-[#64748B]">bar</span>
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">
                Peak at BDC impact
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
              <div className="text-[10px] text-[#64748B] uppercase font-bold">
                Stroke Angle
              </div>
              <div className="text-lg font-bold font-mono text-[#0B2340] mt-1">
                {Math.floor(strokeAngle)} <span className="text-xs font-normal text-[#64748B]">deg</span>
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">
                {strokeAngle < 90
                  ? 'Approach Stroke'
                  : strokeAngle < 180
                  ? 'Forming / Impact'
                  : strokeAngle < 270
                  ? 'Return Stroke'
                  : 'Dwell at TDC'}
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
              <div className="text-[10px] text-[#64748B] uppercase font-bold">
                Ram Movement
              </div>
              <div className="text-lg font-bold font-mono text-[#0B2340] mt-1">
                {ramDisplacementMm.toFixed(1)} <span className="text-xs font-normal text-[#64748B]">mm</span>
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">
                Total stroke: 350 mm
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
              <div className="text-[10px] text-[#64748B] uppercase font-bold">
                Active Force
              </div>
              <div className="text-lg font-bold font-mono text-[#0B2340] mt-1">
                {currentOperation.pressTonnage} <span className="text-xs font-normal text-[#64748B]">Tons</span>
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5 truncate">
                {currentOperation.pressLine}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 Right: Part Technical Specifications Card */}
        <div
          data-testid="part-technical-spec-section"
          className="h-full bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2340] flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-[#0754A6]" /> Part Technical Specifications
            </h3>
            <span className="text-xs font-mono font-bold text-[#0754A6]">
              Part #{currentPart.id}
            </span>
          </div>

          <div className="divide-y divide-[#F1F5F9] text-xs">
            <div className="py-1.5 flex justify-between items-start gap-3">
              <span className="text-[#64748B] shrink-0">Complete Part Name</span>
              <span
                data-testid="complete-part-name"
                className="font-semibold text-[#0B2340] text-right break-words"
              >
                {formatCompletePartName(currentPart.name)}
              </span>
            </div>

            <div className="py-1.5 flex justify-between items-center">
              <span className="text-[#64748B]">Dimensions (L × W × H)</span>
              <span className="font-mono font-semibold text-[#0B2340]">
                {currentPart.lengthMm !== null
                  ? `${currentPart.lengthMm} × ${currentPart.widthMm} × ${currentPart.heightMm} mm`
                  : 'Not Available'}
              </span>
            </div>

            <div className="py-1.5 flex justify-between items-center">
              <span className="text-[#64748B]">Material Specification</span>
              <span className="font-semibold text-[#0B2340] text-right max-w-[260px]">
                {currentPart.materialSpec}
              </span>
            </div>

            <div className="py-1.5 flex justify-between items-center">
              <span className="text-[#64748B]">Development Line Type</span>
              <span className="font-semibold text-[#0754A6]">
                {currentPart.devType} ({currentPart.devTypeCode})
              </span>
            </div>

            <div className="py-1.5 flex justify-between items-center">
              <span className="text-[#64748B]">Die Tooling Type</span>
              <span className="font-semibold text-[#0B2340]">
                {currentPart.diesType}
              </span>
            </div>

            <div className="py-1.5 flex justify-between items-center">
              <span className="text-[#64748B]">Blanking Dies (BLK)</span>
              <span className="font-mono font-semibold text-[#0B2340]">
                {currentPart.blankDiesCount} Die{currentPart.blankDiesCount !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="py-1.5 flex justify-between items-center">
              <span className="text-[#64748B]">Forming Dies (DIES)</span>
              <span className="font-mono font-semibold text-[#0B2340]">
                {currentPart.formingDiesCount} Dies
              </span>
            </div>

            <div className="py-1.5 flex justify-between items-center">
              <span className="text-[#64748B]">Assigned Press Line</span>
              <span className="font-semibold text-[#0B2340]">
                {currentPart.pressLineSummary}
              </span>
            </div>

            <div className="py-1.5 flex justify-between items-center">
              <span className="text-[#64748B]">Press Tonnage Range</span>
              <span className="font-mono font-bold text-[#0B2340]">
                {currentPart.pressTonnageRange}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operation & Machine Specifications Drawer (Opened by clicking on any OP stage or 3D station) */}
      <StationSpecDrawer
        station={inspectedStation}
        part={currentPart}
        onClose={() => setInspectedStation(null)}
        onFocusCamera={(type) => {
          triggerCameraPreset(type, type.toUpperCase());
        }}
        onSelectOperation={(opIdx) => {
          soundEngine.unlock();
          isOverwriteNavRef.current = false;
          setSimulationMode('single_op');
          setCurrentOpIndex(opIdx);
          setManualProgressOverride(null);
          setStepTransitionRequest(null);
          setSimProgress(0);
          setStrokeAngle(0);
          setRamDisplacementMm(0);
          setPressPressureBar(12);
          setRestartTrigger(prev => prev + 1);
          setIsPlaying(true);
          triggerCameraPreset('machine', 'MACHINE');
        }}
        isActive={inspectedStation?.type === 'stamping_op' && inspectedStation.opIndex === currentOpIndex}
        qcMode={qcCycleState.mode}
        qcStageStatus={qcCycleState.stageStatus}
        currentQcVerdict={qcCycleState.currentPartVerdict}
        lastCompletedVerdict={qcCycleState.lastCompletedVerdict}
      />
    </div>
  );
};
