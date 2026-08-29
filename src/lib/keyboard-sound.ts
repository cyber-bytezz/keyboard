/**
 * Web Audio keycap sound engine.
 *
 * Every sound is synthesized at runtime — no audio files, no CDN. A press is
 * built from three layered voices that mirror how a real linear switch sounds:
 *
 *   1. "click"  – a very short filtered noise transient (plastic-on-plastic)
 *   2. "thock"  – a damped low sine/triangle body resonance (the case cavity)
 *   3. "rattle" – tiny extra noise tail, only on stabilised keys (space, shift…)
 *
 * The release (key coming back up) is a quieter, brighter, shorter version.
 * Pitch is derived deterministically from the key code so each keycap has its
 * own voice, and larger keys sound deeper (bigger cavity under the cap).
 */

type PressOptions = {
  /** Key identifier — drives deterministic pitch variation. */
  code: string;
  /** Key width in units (1 = 1u). Wider keys sound deeper + rattle. */
  width?: number;
  /** Velocity 0..1 — pointer press vs. keyboard repeat. */
  velocity?: number;
};

const STORAGE_KEY = "bmk:sound-enabled";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = true;

/** Stable 0..1 hash so a given keycap always sounds the same. */
function hash01(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.9;

  // Gentle bus compression so rapid typing never clips.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 24;
  comp.ratio.value = 6;
  comp.attack.value = 0.002;
  comp.release.value = 0.12;

  master.connect(comp);
  comp.connect(ctx.destination);

  // 1s of white noise, reused by every transient.
  const len = Math.floor(ctx.sampleRate);
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  return ctx;
}

function noiseBurst(
  ac: AudioContext,
  dest: AudioNode,
  opts: {
    at: number;
    duration: number;
    gain: number;
    freq: number;
    q: number;
    type?: BiquadFilterType;
  },
) {
  if (!noiseBuffer) return;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;

  const filter = ac.createBiquadFilter();
  filter.type = opts.type ?? "bandpass";
  filter.frequency.value = opts.freq;
  filter.Q.value = opts.q;

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, opts.at);
  g.gain.exponentialRampToValueAtTime(Math.max(opts.gain, 0.0002), opts.at + 0.0015);
  g.gain.exponentialRampToValueAtTime(0.0001, opts.at + opts.duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(opts.at);
  src.stop(opts.at + opts.duration + 0.02);
}

function bodyTone(
  ac: AudioContext,
  dest: AudioNode,
  opts: { at: number; freq: number; duration: number; gain: number; type: OscillatorType },
) {
  const osc = ac.createOscillator();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.freq * 1.6, opts.at);
  osc.frequency.exponentialRampToValueAtTime(opts.freq, opts.at + 0.03);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, opts.at);
  g.gain.exponentialRampToValueAtTime(Math.max(opts.gain, 0.0002), opts.at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, opts.at + opts.duration);

  osc.connect(g);
  g.connect(dest);
  osc.start(opts.at);
  osc.stop(opts.at + opts.duration + 0.02);
}

/** Bottom-out: the sound of pressing a keycap down. */
export function playKeyDown({ code, width = 1, velocity = 1 }: PressOptions) {
  if (!enabled) return;
  const ac = getContext();
  if (!ac || !master) return;

  const v = Math.min(Math.max(velocity, 0.2), 1);
  const rnd = hash01(code);
  const wide = Math.min(width, 7);
  // Bigger caps = deeper cavity.
  const base = (168 - wide * 9) * (0.94 + rnd * 0.14);
  const at = ac.currentTime + 0.001;

  // 1. plastic click transient
  noiseBurst(ac, master, {
    at,
    duration: 0.028,
    gain: 0.16 * v,
    freq: 2600 + rnd * 1400,
    q: 0.9,
    type: "bandpass",
  });
  // 2. high-frequency edge, gives it "snap"
  noiseBurst(ac, master, {
    at,
    duration: 0.012,
    gain: 0.09 * v,
    freq: 6200 + rnd * 2000,
    q: 0.7,
    type: "highpass",
  });
  // 3. case thock
  bodyTone(ac, master, {
    at,
    freq: base,
    duration: 0.085 + wide * 0.008,
    gain: 0.24 * v,
    type: "sine",
  });
  bodyTone(ac, master, {
    at: at + 0.002,
    freq: base * 2.02,
    duration: 0.05,
    gain: 0.08 * v,
    type: "triangle",
  });
  // 4. stabiliser rattle on wide keys
  if (width >= 2) {
    noiseBurst(ac, master, {
      at: at + 0.006,
      duration: 0.045,
      gain: 0.05 * v * Math.min(width / 6, 1),
      freq: 1500 + rnd * 900,
      q: 2.4,
      type: "bandpass",
    });
  }
}

/** Key coming back up — quieter, brighter, shorter. */
export function playKeyUp({ code, width = 1 }: PressOptions) {
  if (!enabled) return;
  const ac = getContext();
  if (!ac || !master) return;
  const rnd = hash01(code);
  const at = ac.currentTime + 0.001;

  noiseBurst(ac, master, {
    at,
    duration: 0.018,
    gain: 0.07,
    freq: 3600 + rnd * 1800,
    q: 1.1,
    type: "bandpass",
  });
  bodyTone(ac, master, {
    at,
    freq: (230 - Math.min(width, 7) * 8) * (0.95 + rnd * 0.1),
    duration: 0.035,
    gain: 0.07,
    type: "sine",
  });
}

/** Soft tick used when a keycap is hovered. */
export function playHover(code: string) {
  if (!enabled) return;
  const ac = getContext();
  if (!ac || !master) return;
  noiseBurst(ac, master, {
    at: ac.currentTime + 0.001,
    duration: 0.012,
    gain: 0.022,
    freq: 4200 + hash01(code) * 2200,
    q: 1.4,
    type: "bandpass",
  });
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(next: boolean) {
  enabled = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* storage may be unavailable */
    }
  }
  if (next) {
    const ac = getContext();
    if (ac?.state === "suspended") void ac.resume();
  }
}

/** Read the persisted preference. Call from an effect (browser only). */
export function loadSoundPreference() {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    enabled = raw !== "0";
  } catch {
    enabled = true;
  }
  return enabled;
}

/** Warm up the audio graph on the first user gesture. */
export function primeAudio() {
  getContext();
}
