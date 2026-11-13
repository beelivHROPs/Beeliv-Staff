/**
 * Hospitality sound voices for the Admin (HR + Operations) and Client apps.
 * Everything is synthesised with the Web Audio API, so there are no audio files.
 * Ported from the approved design preview (components/design-preview/sound-lab).
 * Pure sound design: no gating, no preferences. See lib/admin/sound.ts for the rules
 * about WHEN a voice may play.
 *
 * Each voice schedules its notes on `out` starting at time `t` and returns its length in seconds.
 */

export type VoiceId =
  | "serviceBell"
  | "doorChime"
  | "softChime"
  | "corkPop"
  | "tableTap"
  | "gong"
  | "glassClink"
  | "woodBlock"
  | "cutleryTick"
  | "marimba"
  | "pageTurn"
  | "softPop"
  | "plateThud"
  | "rejectThud"
  | "errorBump"
  | "tap"
  | "welcomeClient"
  | "welcomeAdmin";

type Env = { t: number; dur: number; gain: number; attack?: number };

/** A single sine/triangle partial with an exponential decay. */
function partial(c: AudioContext, out: AudioNode, freq: number, type: OscillatorType, { t, dur, gain, attack = 0.004 }: Env) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** A struck-metal / glass voice: inharmonic partials, the higher ones dying faster. */
function bell(c: AudioContext, out: AudioNode, freq: number, t: number, dur: number, gain: number, ratios = [1, 2.76, 5.4, 8.93], weights = [1, 0.5, 0.26, 0.12]) {
  ratios.forEach((r, i) => partial(c, out, freq * r, "sine", { t, dur: dur / (1 + i * 0.7), gain: gain * weights[i] }));
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function noise(c: AudioContext, out: AudioNode, t: number, dur: number, gain: number, filter: BiquadFilterType, freq: number, q = 0.8, sweepTo?: number) {
  const s = c.createBufferSource();
  s.buffer = noiseBuffer(c, dur + 0.05);
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out);
  s.start(t);
  s.stop(t + dur + 0.05);
}

export const VOICES: Record<VoiceId, (c: AudioContext, out: AudioNode, t: number) => number> = {
  /** Hotel front-desk bell, two rings. */
  serviceBell(c, out, t) {
    bell(c, out, 2093, t, 1.1, 0.34, [1, 2.4, 4.1, 6.2], [1, 0.55, 0.3, 0.14]);
    bell(c, out, 2093, t + 0.32, 1.4, 0.34, [1, 2.4, 4.1, 6.2], [1, 0.55, 0.3, 0.14]);
    return 1.8;
  },
  /** Two warm notes, like a guest arriving. */
  doorChime(c, out, t) {
    bell(c, out, 659.25, t, 1.1, 0.26, [1, 2, 3.01], [1, 0.35, 0.12]);
    bell(c, out, 523.25, t + 0.3, 1.5, 0.26, [1, 2, 3.01], [1, 0.35, 0.12]);
    return 1.9;
  },
  /** A gentler, higher two-note chime: the quietest ringtone choice. */
  softChime(c, out, t) {
    bell(c, out, 880, t, 0.9, 0.16, [1, 2, 3.0], [1, 0.25, 0.08]);
    bell(c, out, 1174.7, t + 0.22, 1.2, 0.16, [1, 2, 3.0], [1, 0.25, 0.08]);
    return 1.5;
  },
  /** Cork pop, a soft fizz, then a rising chime: the one celebratory sound. */
  corkPop(c, out, t) {
    noise(c, out, t, 0.06, 0.55, "bandpass", 900, 1.2);
    partial(c, out, 190, "sine", { t, dur: 0.14, gain: 0.5, attack: 0.002 });
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.2);
    for (let i = 0; i < 6; i++) noise(c, out, t + 0.08 + i * 0.07, 0.12, 0.07 * (1 - i * 0.12), "highpass", 5200 + Math.random() * 1500, 0.7);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(c, out, f, t + 0.55 + i * 0.13, 0.9, 0.2, [1, 2, 3.0], [1, 0.3, 0.1]));
    return 1.8;
  },
  /** A spoon tapped on a glass, three times. */
  tableTap(c, out, t) {
    [0, 0.24, 0.48].forEach((d) => bell(c, out, 2637, t + d, 0.32, 0.22, [1, 2.32, 4.25], [1, 0.45, 0.2]));
    return 0.95;
  },
  /** One low polite gong. */
  gong(c, out, t) {
    bell(c, out, 110, t, 3.2, 0.34, [1, 1.5, 2.0, 2.74, 4.1], [1, 0.7, 0.5, 0.3, 0.14]);
    noise(c, out, t, 0.08, 0.08, "lowpass", 900);
    return 3.2;
  },
  /** Two glasses touching. */
  glassClink(c, out, t) {
    bell(c, out, 3520, t, 0.45, 0.2, [1, 1.58, 2.3, 3.4], [1, 0.6, 0.35, 0.2]);
    bell(c, out, 4698, t + 0.012, 0.35, 0.14, [1, 1.52, 2.1], [1, 0.5, 0.25]);
    return 0.6;
  },
  /** Soft wood-block pop. */
  woodBlock(c, out, t) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(980, t);
    o.frequency.exponentialRampToValueAtTime(620, t + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.45, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.15);
    noise(c, out, t, 0.02, 0.1, "bandpass", 2400, 1);
    return 0.2;
  },
  /** Tiny fork-on-plate tick. */
  cutleryTick(c, out, t) {
    noise(c, out, t, 0.025, 0.2, "highpass", 6000, 0.7);
    partial(c, out, 3100, "sine", { t, dur: 0.06, gain: 0.14, attack: 0.001 });
    partial(c, out, 4300, "sine", { t: t + 0.09, dur: 0.05, gain: 0.08, attack: 0.001 });
    return 0.2;
  },
  /** Mellow mallet note. */
  marimba(c, out, t) {
    partial(c, out, 523.25, "sine", { t, dur: 0.7, gain: 0.4, attack: 0.002 });
    partial(c, out, 523.25 * 4, "sine", { t, dur: 0.12, gain: 0.14, attack: 0.001 });
    partial(c, out, 659.25, "sine", { t: t + 0.18, dur: 0.8, gain: 0.34, attack: 0.002 });
    partial(c, out, 659.25 * 4, "sine", { t: t + 0.18, dur: 0.12, gain: 0.1, attack: 0.001 });
    return 1.1;
  },
  /** Soft bubble pop: a short, rounded rising blip. Replaces the ticks for saved / success. */
  softPop(c, out, t) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(980, t + 0.045);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.38, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.16);
    partial(c, out, 1960, "sine", { t: t + 0.02, dur: 0.05, gain: 0.05, attack: 0.002 });
    return 0.2;
  },
  /** Saved or sent: a soft page-turn tick. */
  pageTurn(c, out, t) {
    noise(c, out, t, 0.12, 0.16, "bandpass", 1800, 0.9, 5200);
    partial(c, out, 1320, "sine", { t: t + 0.1, dur: 0.07, gain: 0.1, attack: 0.002 });
    return 0.25;
  },
  /** Approved or shortlisted: a plate set down, with a warm tail. */
  plateThud(c, out, t) {
    partial(c, out, 150, "sine", { t, dur: 0.18, gain: 0.5, attack: 0.002 });
    noise(c, out, t, 0.05, 0.12, "lowpass", 700);
    bell(c, out, 784, t + 0.04, 0.55, 0.12, [1, 2, 3], [1, 0.3, 0.1]);
    return 0.7;
  },
  /** Rejected or removed: short, low and neutral. */
  rejectThud(c, out, t) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.16);
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.25);
    return 0.3;
  },
  /** Error or blocked: a muted double bump. */
  errorBump(c, out, t) {
    [0, 0.11].forEach((d) => partial(c, out, 175, "sine", { t: t + d, dur: 0.1, gain: 0.4, attack: 0.002 }));
    return 0.3;
  },
  /** Tap or toggle: very quiet. */
  tap(c, out, t) {
    partial(c, out, 1250, "sine", { t, dur: 0.035, gain: 0.12, attack: 0.001 });
    return 0.1;
  },
  /** Welcome: clients. A warm three-note arpeggio. */
  welcomeClient(c, out, t) {
    [523.25, 659.25, 783.99].forEach((f, i) => bell(c, out, f, t + i * 0.17, 1.1, 0.2, [1, 2, 3.0], [1, 0.32, 0.1]));
    return 1.6;
  },
  /** Welcome: Admin and Operations. Calm and lower. */
  welcomeAdmin(c, out, t) {
    bell(c, out, 329.63, t, 1.3, 0.22, [1, 2, 3.0, 4.2], [1, 0.4, 0.15, 0.06]);
    bell(c, out, 493.88, t + 0.26, 1.6, 0.22, [1, 2, 3.0, 4.2], [1, 0.4, 0.15, 0.06]);
    return 1.9;
  },
};
