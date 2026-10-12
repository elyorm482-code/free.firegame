import { WeaponType } from '../../types/game';

class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private isMusicPlaying: boolean = false;
  private musicInterval: number | null = null;
  private currentMusicTrack: 'lobby' | 'battle' | null = null;
  private audioInitialized: boolean = false;

  private masterVolume: number = 0.8;
  private sfxVolume: number = 0.9;
  private musicVolume: number = 0.45;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (this.audioInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.audioInitialized = true;
    } catch {
      // AudioContext unavailable or restricted
    }
  }

  public setVolumes(master: number, sfx: number, music: number) {
    this.masterVolume = master;
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(master, this.ctx.currentTime);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(music, this.ctx.currentTime);
    }
  }

  // --- WEAPON SOUNDS ---
  public playShoot(type: WeaponType) {
    if (!this.ctx || !this.sfxGain) this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;

    if (type === 'sniper') {
      // High caliber sniper blast: Sub punch + White noise explosion + long metallic reverb tail
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.35);
      oscGain.gain.setValueAtTime(0.9, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.5);

      this.playNoiseBurst(0.4, 1800, 1.0);
    } else if (type === 'rifle') {
      // Assault rifle punch: snappy mid-low punch
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      oscGain.gain.setValueAtTime(0.8, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.16);

      this.playNoiseBurst(0.12, 3200, 0.7);
    } else if (type === 'smg') {
      // High-speed light SMG burst
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
      oscGain.gain.setValueAtTime(0.5, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.09);

      this.playNoiseBurst(0.08, 4800, 0.5);
    } else {
      // Pistol crisp crack
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.14);
      oscGain.gain.setValueAtTime(0.65, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.15);

      this.playNoiseBurst(0.1, 2800, 0.6);
    }
  }

  private playNoiseBurst(duration: number, filterFreq: number, gainVol: number) {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / bufferSize));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(gainVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  public playReload() {
    if (!this.ctx || !this.sfxGain) this.init();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Mag out click
    this.playTone(800, 0.05, 'triangle', 0.3, t);
    // Slide rack
    setTimeout(() => {
      if (this.ctx) {
        this.playTone(550, 0.08, 'sawtooth', 0.4, this.ctx.currentTime);
        this.playTone(1100, 0.06, 'sine', 0.3, this.ctx.currentTime + 0.04);
      }
    }, 450);
  }

  public playHitMarker(isHeadshot: boolean = false) {
    if (!this.ctx || !this.sfxGain) this.init();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    if (isHeadshot) {
      // High pitched double ping
      this.playTone(2200, 0.06, 'sine', 0.5, t);
      this.playTone(3300, 0.1, 'sine', 0.6, t + 0.03);
    } else {
      // Standard crisp hit tick
      this.playTone(1400, 0.04, 'triangle', 0.4, t);
    }
  }

  public playDamageTaken() {
    if (!this.ctx || !this.sfxGain) this.init();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Low heartbeat impact
    this.playTone(90, 0.2, 'sawtooth', 0.6, t);
  }

  public playFootstep(isSprinting: boolean = false) {
    if (!this.ctx || !this.sfxGain) this.init();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const pitch = isSprinting ? 180 + Math.random() * 40 : 140 + Math.random() * 30;
    this.playTone(pitch, 0.05, 'sine', isSprinting ? 0.25 : 0.15, t);
  }

  public playJump() {
    if (!this.ctx || !this.sfxGain) this.init();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.15);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playLootPickup() {
    if (!this.ctx || !this.sfxGain) this.init();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Sci-fi power chime
    this.playTone(523.25, 0.08, 'sine', 0.35, t); // C5
    this.playTone(659.25, 0.08, 'sine', 0.35, t + 0.07); // E5
    this.playTone(783.99, 0.16, 'sine', 0.45, t + 0.14); // G5
  }

  public playZoneWarning() {
    if (!this.ctx || !this.sfxGain) this.init();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Sci-fi klaxon horn
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(260, t + 0.4);
    osc.frequency.linearRampToValueAtTime(220, t + 0.8);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.9);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.9);
  }

  public playVictory() {
    if (!this.ctx || !this.sfxGain) this.init();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Fanfare chords
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.6, 'triangle', 0.4, t + idx * 0.12);
    });
  }

  private playTone(freq: number, dur: number, type: OscillatorType, vol: number, startTime: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(startTime);
    osc.stop(startTime + dur);
  }

  // --- DYNAMIC ADRENALINE SYNTH SOUNDTRACK ---
  public startMusic(track: 'lobby' | 'battle') {
    if (!this.ctx || !this.musicGain) this.init();
    if (this.isMusicPlaying && this.currentMusicTrack === track) return;
    this.stopMusic();

    this.isMusicPlaying = true;
    this.currentMusicTrack = track;

    let step = 0;
    const bpm = track === 'battle' ? 128 : 96;
    const intervalMs = (60 / bpm) * 1000 / 2; // 8th notes

    // Dynamic procedural synth loop
    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.isMusicPlaying) return;
      const t = this.ctx.currentTime;

      if (track === 'battle') {
        // High tempo cyber battle bass & rhythm
        const bassNotes = [55, 55, 65.41, 55, 49, 49, 73.42, 65.41]; // A1, C2, G1, D2
        const bassFreq = bassNotes[step % bassNotes.length];

        // Sub-bass hit on downbeats
        if (step % 2 === 0) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(bassFreq, t);
          g.gain.setValueAtTime(0.25, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          osc.connect(g);
          g.connect(this.musicGain);
          osc.start(t);
          osc.stop(t + 0.22);
        }

        // Cyber Arpeggio lead
        const arpNotes = [220, 261.63, 329.63, 392, 440, 523.25, 440, 329.63];
        const arpFreq = arpNotes[(step * 3) % arpNotes.length];
        if (step % 2 === 1) {
          const lead = this.ctx.createOscillator();
          const leadG = this.ctx.createGain();
          lead.type = 'square';
          lead.frequency.setValueAtTime(arpFreq, t);
          leadG.gain.setValueAtTime(0.06, t);
          leadG.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          lead.connect(leadG);
          leadG.connect(this.musicGain);
          lead.start(t);
          lead.stop(t + 0.14);
        }

        // Hi-hat tick
        if (step % 2 === 1) {
          this.playNoiseBurst(0.02, 8000, 0.08);
        }
      } else {
        // Lobby chill futuristic ambient groove
        const lobbyBass = [65.41, 65.41, 77.78, 65.41, 58.27, 58.27, 87.31, 77.78];
        if (step % 4 === 0) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(lobbyBass[(step / 4) % lobbyBass.length], t);
          g.gain.setValueAtTime(0.2, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          osc.connect(g);
          g.connect(this.musicGain);
          osc.start(t);
          osc.stop(t + 0.52);
        }

        if (step % 4 === 2) {
          const pad = this.ctx.createOscillator();
          const padG = this.ctx.createGain();
          pad.type = 'triangle';
          pad.frequency.setValueAtTime(261.63 + (step % 8) * 20, t);
          padG.gain.setValueAtTime(0.05, t);
          padG.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          pad.connect(padG);
          padG.connect(this.musicGain);
          pad.start(t);
          pad.stop(t + 0.42);
        }
      }

      step++;
    }, intervalMs);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    this.currentMusicTrack = null;
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const sound = new SoundSystem();
