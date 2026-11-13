/**
 * Interface sounds for the ADMIN app (HR + Operations) and the CLIENT app only.
 * Hospitality sound identity approved by the project lead (2026-10-13). Never in Applicant, Staff or the
 * public site. The voices are synthesised in the browser (lib/sound/synth.ts), so there are no audio files.
 *
 * SOUND MAP (name -> voice -> where it is used; also in docs/ADMIN-USER-FLOW.md)
 *   notify          glass clink      new notification (AdminShell, ClientShell)
 *   message         wood block       new inbox item (AdminShell); client: request approved / new candidate
 *   ringtone        service bell     new unread CLIENT REQUEST notification (Admin), up to 3 rings,
 *                                    stopRingtone() / Escape / opening Client requests. Voice is a setting
 *                                    (Service bell, Door chime, Soft chime).
 *   approvalWaiting door chime       an approval is waiting (hook; Ops)
 *   interviewSoon   spoon on glass   an interview is about to start (hook)
 *   overdue         polite gong      Operations Home: overdue count went up (once)
 *   placement       cork pop         offer accepted / placement confirmed (hook: no mock flow has the event yet)
 *   approved        plate thud       Operations approval: Approve confirmed
 *   rejected        low thud         Operations approval: Reject confirmed
 *   saved           soft pop         Send back confirmed, Assign HR confirmed, and every "Saved" / "sent" toast
 *   success         soft pop         generic confirmation (same voice as saved)
 *   testCompleted   soft pop         a test was completed (hook)
 *   reminder        marimba          reminders (hook)
 *   error           double bump      error toasts, Operations notices (error / conflict), shared ErrorPanel
 *   select / tap    tap              very quiet toggles
 *   welcomeAdmin    low two notes    sign-in success, Admin portal (playWelcome)
 *   welcomeClient   three notes      sign-in success, Client portal (playWelcome)
 *
 * RULES
 *   - Every sound has a visible cue as well; sound is never the only signal.
 *   - Plays only when <html> has class `admin-app` or `client-app`, after a user gesture (browser autoplay rule),
 *     when Sounds is on, volume > 0, the sound's category is on and it is not quiet hours.
 *     Only exception: playWelcome(), which runs on the sign-in page (no app class there) and checks the portal instead.
 *   - Notification-type sounds may still play in a background tab; confirmations and errors do not.
 *   - Master volume = prefs.volume scaled 1.4x (the sounds were tuned at 0.7), capped at 1.
 *   - Never throws, never blocks. Preferences are kept on this device (localStorage) for now.
 */
import { useSyncExternalStore } from "react";
import { VOICES, type VoiceId } from "@/lib/sound/synth";

export type SoundName =
  | "notify"
  | "message"
  | "success"
  | "error"
  | "select"
  | "reminder"
  | "ringtone"
  | "approvalWaiting"
  | "interviewSoon"
  | "overdue"
  | "placement"
  | "approved"
  | "rejected"
  | "saved"
  | "testCompleted"
  | "welcomeAdmin"
  | "welcomeClient";

export type SoundCategory = "messages" | "alerts" | "actions" | "errors" | "welcome";
export type RingtoneChoice = "serviceBell" | "doorChime" | "softChime";

export const SOUND_CATEGORIES: { key: SoundCategory; label: string; detail: string }[] = [
  { key: "messages", label: "New notifications and messages", detail: "A glass clink or wood block when something new arrives." },
  { key: "alerts", label: "Alerts and reminders", detail: "Client requests, approvals waiting, interviews soon, overdue items." },
  { key: "actions", label: "Confirmations", detail: "Saved, approved, rejected, placement confirmed." },
  { key: "errors", label: "Errors", detail: "A low double bump when something could not be done." },
  { key: "welcome", label: "Welcome on sign-in", detail: "A short greeting when you sign in." },
];

export const RINGTONE_OPTIONS: { value: RingtoneChoice; label: string }[] = [
  { value: "serviceBell", label: "Service bell" },
  { value: "doorChime", label: "Door chime" },
  { value: "softChime", label: "Soft chime" },
];

export interface SoundPrefs {
  on: boolean;
  /** 0 to 1. */
  volume: number;
  /** Per-category switches (all on by default). */
  categories: Record<SoundCategory, boolean>;
  /** No sounds between `from` and `to` (24h "HH:MM", may cross midnight). */
  quiet: { on: boolean; from: string; to: string };
  ringtone: RingtoneChoice;
}

const KEY = "bv-admin-sound";
const DEFAULTS: SoundPrefs = {
  on: true,
  volume: 0.5,
  categories: { messages: true, alerts: true, actions: true, errors: true, welcome: true },
  quiet: { on: false, from: "22:00", to: "07:00" },
  ringtone: "serviceBell",
};

const CATEGORY: Record<SoundName, SoundCategory> = {
  notify: "messages",
  message: "messages",
  ringtone: "alerts",
  approvalWaiting: "alerts",
  interviewSoon: "alerts",
  overdue: "alerts",
  reminder: "alerts",
  success: "actions",
  saved: "actions",
  approved: "actions",
  rejected: "actions",
  placement: "actions",
  testCompleted: "actions",
  select: "actions",
  error: "errors",
  welcomeAdmin: "welcome",
  welcomeClient: "welcome",
};

const VOICE: Record<Exclude<SoundName, "ringtone">, VoiceId> = {
  notify: "glassClink",
  message: "woodBlock",
  success: "softPop",
  saved: "softPop",
  error: "errorBump",
  select: "tap",
  reminder: "marimba",
  approvalWaiting: "doorChime",
  interviewSoon: "tableTap",
  overdue: "gong",
  placement: "corkPop",
  approved: "plateThud",
  rejected: "rejectThud",
  testCompleted: "softPop",
  welcomeAdmin: "welcomeAdmin",
  welcomeClient: "welcomeClient",
};

/** The notification-style sounds are still allowed when the tab is in the background (that is when you would miss them). */
const WORKS_IN_BACKGROUND: SoundName[] = ["notify", "message", "reminder", "ringtone", "approvalWaiting", "interviewSoon", "overdue"];

let prefs: SoundPrefs = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<SoundPrefs>;
      prefs = {
        on: p.on ?? DEFAULTS.on,
        volume: typeof p.volume === "number" ? Math.min(1, Math.max(0, p.volume)) : DEFAULTS.volume,
        categories: { ...DEFAULTS.categories, ...(p.categories ?? {}) },
        quiet: {
          on: p.quiet?.on ?? DEFAULTS.quiet.on,
          from: p.quiet?.from && HHMM.test(p.quiet.from) ? p.quiet.from : DEFAULTS.quiet.from,
          to: p.quiet?.to && HHMM.test(p.quiet.to) ? p.quiet.to : DEFAULTS.quiet.to,
        },
        ringtone: p.ringtone === "doorChime" || p.ringtone === "softChime" || p.ringtone === "serviceBell" ? p.ringtone : DEFAULTS.ringtone,
      };
      emit();
    }
  } catch {
    // Storage unavailable: keep the defaults.
  }
}

export function useSoundPrefs(): SoundPrefs {
  const snap = useSyncExternalStore(
    (cb) => {
      hydrate();
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => prefs,
    () => DEFAULTS,
  );
  return snap;
}

/** Shallow-merges, except `categories` and `quiet` which merge one level deeper. */
export function setSoundPrefs(next: Partial<Omit<SoundPrefs, "categories" | "quiet">> & { categories?: Partial<SoundPrefs["categories"]>; quiet?: Partial<SoundPrefs["quiet"]> }) {
  hydrate();
  prefs = {
    ...prefs,
    ...next,
    categories: { ...prefs.categories, ...(next.categories ?? {}) },
    quiet: { ...prefs.quiet, ...(next.quiet ?? {}) },
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Memory only.
  }
  emit();
}

/* ---- audio ---- */

let ctx: AudioContext | null = null;
let unlocked = false;

/** True on the pages where a person is about to be in the Admin or Client app (so the audio engine can be warmed inside the gesture). */
function onSoundPortalPath() {
  const { pathname, search } = window.location;
  if (pathname.startsWith("/admin") || pathname.startsWith("/client")) return true;
  if (pathname === "/login") {
    const portal = new URLSearchParams(search).get("portal");
    return portal === "admin" || portal === "client";
  }
  return false;
}

if (typeof window !== "undefined") {
  const unlock = () => {
    unlocked = true;
    // Create/resume the context INSIDE the gesture (Safari is strict), but only where these sounds can play.
    if (onSoundPortalPath()) context();
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

function context(): AudioContext | null {
  if (typeof window === "undefined" || !unlocked) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** Master gain: the preview was tuned at 0.7, so the saved volume is scaled 1.4x and capped at 1. */
const masterGain = (volume: number) => Math.min(1, volume * 1.4);

/** Plays one voice through its own master gain (so each play is scaled by the volume setting). Returns its length in seconds. */
function playVoice(voice: VoiceId): number {
  const c = context();
  if (!c) return 0;
  try {
    const master = c.createGain();
    master.gain.value = masterGain(prefs.volume);
    master.connect(c.destination);
    const len = VOICES[voice](c, master, c.currentTime + 0.02);
    window.setTimeout(() => {
      try {
        master.disconnect();
      } catch {
        // Already gone.
      }
    }, (len + 0.5) * 1000);
    return len;
  } catch {
    // Never let a sound break the page.
    return 0;
  }
}

function inQuietHours(): boolean {
  if (!prefs.quiet.on) return false;
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const from = toMin(prefs.quiet.from);
  const to = toMin(prefs.quiet.to);
  if (from === to) return false;
  return from < to ? cur >= from && cur < to : cur >= from || cur < to;
}

function inSoundApp() {
  const cl = document.documentElement.classList;
  return cl.contains("admin-app") || cl.contains("client-app");
}

/* ---- ringtone (new client request): service bell etc., up to 3 rings ---- */

const MAX_RINGS = 3;
let ringTimer: ReturnType<typeof setTimeout> | null = null;
let ringStop: (() => void) | null = null;

const ringListeners = new Set<() => void>();
const isRinging = () => ringTimer !== null || ringStop !== null;

/** True while the client-request ringtone is ringing (lets the UI offer an "Acknowledge" button). */
export function useRinging(): boolean {
  return useSyncExternalStore(
    (cb) => {
      ringListeners.add(cb);
      return () => {
        ringListeners.delete(cb);
      };
    },
    isRinging,
    () => false,
  );
}

/** Stops a ringing ringtone (acknowledged). Safe to call any time. */
export function stopRingtone() {
  const was = isRinging();
  if (ringTimer) clearTimeout(ringTimer);
  ringTimer = null;
  ringStop?.();
  ringStop = null;
  if (was) ringListeners.forEach((l) => l());
}

function startRingtone() {
  if (ringTimer || ringStop) return; // already ringing
  let n = 0;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") stopRingtone();
  };
  document.addEventListener("keydown", onKey);
  ringStop = () => document.removeEventListener("keydown", onKey);
  ringListeners.forEach((l) => l());
  const ring = () => {
    ringTimer = null;
    if (n >= MAX_RINGS || !prefs.on || prefs.volume <= 0 || inQuietHours()) {
      stopRingtone();
      return;
    }
    n += 1;
    const len = playVoice(prefs.ringtone);
    ringTimer = setTimeout(ring, (Math.max(len, 1) + 0.9) * 1000);
  };
  ring();
}

/* ---- public API ---- */

export interface PlayOptions {
  /** Settings "Preview": ignores category switches and quiet hours (still needs Sounds on and volume above 0). */
  preview?: boolean;
}

export function playAdminSound(name: SoundName, options?: PlayOptions) {
  try {
    if (typeof document === "undefined") return;
    hydrate();
    if (!prefs.on || prefs.volume <= 0) return;
    if (!inSoundApp()) return;
    if (!options?.preview) {
      if (!prefs.categories[CATEGORY[name]]) return;
      if (inQuietHours()) return;
    }
    if (document.hidden && !WORKS_IN_BACKGROUND.includes(name)) return;
    if (name === "ringtone") {
      if (options?.preview) {
        stopRingtone();
        playVoice(prefs.ringtone);
      } else if (context()) startRingtone();
      return;
    }
    playVoice(VOICE[name]);
  } catch {
    // Never let a sound break the page.
  }
}

/** Settings: preview one ringtone choice (a single ring) without changing the saved choice. */
export function previewRingtone(choice: RingtoneChoice) {
  try {
    hydrate();
    if (!prefs.on || prefs.volume <= 0 || typeof document === "undefined" || !inSoundApp()) return;
    stopRingtone();
    playVoice(choice);
  } catch {
    // Never let a sound break the page.
  }
}

/**
 * Welcome sound on sign-in success. ONLY for the Admin and Client portals (never talent / staff). The sign-in
 * page has no `admin-app` / `client-app` class, so this has its own gate: portal + Sounds on + welcome category
 * + not quiet hours + a prior user gesture (the submit click / Enter key counts).
 */
export function playWelcome(portal: string) {
  try {
    if (portal !== "admin" && portal !== "client") return;
    if (typeof document === "undefined") return;
    hydrate();
    if (!prefs.on || prefs.volume <= 0 || !prefs.categories.welcome || inQuietHours()) return;
    playVoice(portal === "admin" ? "welcomeAdmin" : "welcomeClient");
  } catch {
    // Never let a sound break the page.
  }
}

/** Maps a toast to a sound: errors -> error, "Saved" / "sent" style confirmations -> saved. Used by the shared toaster. */
export function soundForToast(type: string | undefined, title: unknown): SoundName | null {
  if (type === "error") return "error";
  if (type === "success") return "saved";
  if (typeof title === "string" && /\b(saved|sent)\b/i.test(title)) return "saved";
  return null;
}
