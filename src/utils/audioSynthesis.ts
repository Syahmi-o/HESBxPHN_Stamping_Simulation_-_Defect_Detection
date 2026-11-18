/**
 * Procedural Web Audio API sound generator for industrial stamping press
 * Zero external audio file dependencies
 */

class StampingAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private activeQcNodes: { stop: (when?: number) => void }[] = [];
  private lastLaserTimeMs: number = 0;
  private lastFlashTimeMs: number = 0;
  private lastVerdictTimeMs: number = 0;

  private initCtx(): AudioNode | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        compressor.knee.setValueAtTime(18, this.ctx.currentTime);
        compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        gain.connect(compressor);
        compressor.connect(this.ctx.destination);
        this.masterGain = gain;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.masterGain || this.ctx?.destination || null;
  }

  public unlock() {
    this.initCtx();
  }

  private getOutputIfReady(): { ctx: AudioContext; out: AudioNode } | null {
    if (this.isMuted) return null;
    const out = this.initCtx();
    if (!this.ctx || !out || this.ctx.state !== 'running') return null;
    return { ctx: this.ctx, out };
  }

  private stopActiveQcSounds() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeQcNodes.forEach((node) => {
      try {
        node.stop(now);
      } catch {
        // Already stopped
      }
    });
    this.activeQcNodes = [];
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopActiveQcSounds();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Plays satisfying metallic impact clack / hydraulic press thud
  public playStampImpact(tonnage: number = 400) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const intensity = Math.min(1.0, Math.max(0.3, tonnage / 800));

      // Low frequency sub-thump (mechanical punch impact)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.18);

      gain.gain.setValueAtTime(0.4 * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);

      // Metallic clank noise (sheet contact resonance)
      const bufferSize = this.ctx.sampleRate * 0.12;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + intensity * 600, now);
      filter.Q.setValueAtTime(3.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25 * intensity, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.16);
    } catch {
      // Audio playback fails gracefully if browser tab is unactivated
    }
  }

  // Hydraulic release hiss on slide return
  public playHydraulicRelease() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.25;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.3;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.25);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.26);
    } catch {
      // Ignore
    }
  }

  // Pneumatic destacker / feeder suction feed sound
  public playBlankFeed() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.18);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.19);
    } catch {
      // Ignore
    }
  }

  // High-tech optical laser triangulation sweep beep
  public playLaserScan() {
    const audio = this.getOutputIfReady();
    if (!audio) return;
    const perfNow = performance.now();
    if (perfNow - this.lastLaserTimeMs < 250) return;
    this.lastLaserTimeMs = perfNow;

    try {
      const { ctx, out } = audio;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.exponentialRampToValueAtTime(1680, now + 0.14);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(out);

      osc.start(now);
      osc.stop(now + 0.17);
    } catch {
      // Ignore
    }
  }

  // Mechanical diverter gate and container drop clink
  public playEjectPin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.14);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Ignore
    }
  }

  // Vacuum suction cup engagement / release pneumatic hiss
  public playVacuumSuction(engage: boolean = true) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // High-pressure venturi hiss
      const bufferSize = this.ctx.sampleRate * 0.14;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(engage ? 2200 : 1600, now);
      filter.Q.setValueAtTime(4.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.14);

      // Suction cup rubber seal plop
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(engage ? 380 : 220, now);
      osc.frequency.exponentialRampToValueAtTime(engage ? 560 : 120, now + 0.08);

      oscGain.gain.setValueAtTime(0.06, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore
    }
  }

  // Industrial robot 6-axis servo acceleration whine
  public playRobotServo() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.3);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.33);
    } catch {
      // Ignore
    }
  }

  // High-intensity QC inspection camera optical strobe flash & shutter click
  public playCameraFlash() {
    const audio = this.getOutputIfReady();
    if (!audio) return;
    const perfNow = performance.now();
    if (perfNow - this.lastFlashTimeMs < 250) return;
    this.lastFlashTimeMs = perfNow;

    try {
      const { ctx, out } = audio;
      const now = ctx.currentTime;

      // 1. Clean filtered mechanical shutter click
      const clickLen = Math.floor(ctx.sampleRate * 0.03);
      const clickBuffer = ctx.createBuffer(1, clickLen, ctx.sampleRate);
      const data = clickBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.006));
      }
      const clickSource = ctx.createBufferSource();
      clickSource.buffer = clickBuffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(2400, now);
      bandpass.Q.setValueAtTime(1.8, now);

      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.0001, now);
      clickGain.gain.linearRampToValueAtTime(0.09, now + 0.002);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

      clickSource.connect(bandpass);
      bandpass.connect(clickGain);
      clickGain.connect(out);
      clickSource.start(now);

      // 2. Clean strobe discharge soft ping
      const strobeOsc = ctx.createOscillator();
      const strobeGain = ctx.createGain();
      strobeOsc.type = 'sine';
      strobeOsc.frequency.setValueAtTime(1850, now + 0.005);
      strobeOsc.frequency.exponentialRampToValueAtTime(620, now + 0.075);

      strobeGain.gain.setValueAtTime(0.0001, now + 0.005);
      strobeGain.gain.linearRampToValueAtTime(0.05, now + 0.01);
      strobeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      strobeOsc.connect(strobeGain);
      strobeGain.connect(out);
      strobeOsc.start(now + 0.005);
      strobeOsc.stop(now + 0.085);
    } catch {
      // Ignore
    }
  }

  // QC inspection verdict audio cue: harmonic chime for PASS, clean dual-tone alert for DEFECT
  public playQcVerdict(isPass: boolean) {
    const audio = this.getOutputIfReady();
    if (!audio) return;
    const perfNow = performance.now();
    if (perfNow - this.lastVerdictTimeMs < 220) return;
    this.lastVerdictTimeMs = perfNow;

    try {
      const { ctx, out } = audio;
      this.stopActiveQcSounds();
      const now = ctx.currentTime;

      if (isPass) {
        // Clear two-tone rising major third chime (C5 -> E5) with soft attack
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        gain1.gain.setValueAtTime(0.0001, now);
        gain1.gain.linearRampToValueAtTime(0.09, now + 0.008);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
        osc1.connect(gain1);
        gain1.connect(out);
        osc1.start(now);
        osc1.stop(now + 0.18);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.09);
        gain2.gain.setValueAtTime(0.0001, now + 0.09);
        gain2.gain.linearRampToValueAtTime(0.11, now + 0.098);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.31);
        osc2.connect(gain2);
        gain2.connect(out);
        osc2.start(now + 0.09);
        osc2.stop(now + 0.32);

        this.activeQcNodes.push(osc1, osc2);
      } else {
        // Clean, non-distorted descending industrial alert tone (triangle + lowpass)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(950, now);
        filter.connect(out);

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(349.23, now);
        gain1.gain.setValueAtTime(0.0001, now);
        gain1.gain.linearRampToValueAtTime(0.11, now + 0.008);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
        osc1.connect(gain1);
        gain1.connect(filter);
        osc1.start(now);
        osc1.stop(now + 0.14);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(246.94, now + 0.11);
        gain2.gain.setValueAtTime(0.0001, now + 0.11);
        gain2.gain.linearRampToValueAtTime(0.12, now + 0.118);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        osc2.connect(gain2);
        gain2.connect(filter);
        osc2.start(now + 0.11);
        osc2.stop(now + 0.33);

        this.activeQcNodes.push(osc1, osc2);
      }
    } catch {
      // Ignore
    }
  }
}

export const soundEngine = new StampingAudioEngine();
