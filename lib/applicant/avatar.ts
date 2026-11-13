/**
 * Applicant avatar + demo persona store — ported from the wireframe
 * (beeliv-website/applicant/index.html: AVSVG / AVM / AVN, avHTML(), W(),
 * heroImg(), promoImg(), `st.av`, `st.photo`, `st.gender`).
 *
 * - `av`: which illustrated avatar is shown — "f" (woman), "m" (man) or
 *   "n" (initials tile). An uploaded `photo` (data URL) overrides all three.
 * - `gender`: the wireframe's demo persona switch (Sarah / David Okafor),
 *   which also swaps the hero and sidebar-promo cutouts. Frontend-only.
 *
 * Persisted to localStorage (key "bv-av", as in the wireframe) and exposed
 * through useSyncExternalStore so every avatar on screen updates together.
 */
import { useEffect, useSyncExternalStore } from "react";

export type AvatarChoice = "f" | "m" | "n";
export type Persona = "f" | "m";
export type AvatarState = { av: AvatarChoice; photo: string | null; gender: Persona };

const KEY = "bv-av";
const DEFAULT_STATE: AvatarState = { av: "f", photo: null, gender: "f" };
let state: AvatarState = DEFAULT_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode / quota) - keep in memory only.
  }
}
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<AvatarState>;
    state = {
      av: parsed.av === "m" || parsed.av === "n" ? parsed.av : "f",
      photo: typeof parsed.photo === "string" ? parsed.photo : null,
      gender: parsed.gender === "m" ? "m" : "f",
    };
    emit();
  } catch {
    // Corrupt storage - keep defaults.
  }
}

export function useAvatarState(): AvatarState {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    // Server HTML and the first client render both use the default, so they
    // always match (reading the saved choice here caused a hydration mismatch
    // that left avatars blank on phones). The saved state loads right after.
    () => DEFAULT_STATE,
  );
  useEffect(hydrate, []);
  return snap;
}

function set(next: Partial<AvatarState>) {
  state = { ...state, ...next };
  persist();
  emit();
}

/** Pick an illustrated/initials avatar (clears any uploaded photo). */
export function chooseAvatar(av: AvatarChoice) {
  set({ av, photo: null });
}
/** Use an uploaded image (data URL) as the avatar. */
export function setAvatarPhoto(photo: string) {
  set({ photo });
}
/** Wireframe persona switch; the default avatar follows it unless a photo/initials is chosen. */
export function setPersona(gender: Persona) {
  set({ gender, av: state.photo || state.av === "n" ? state.av : gender });
}

/** Wireframe W(): the demo persona's names. */
export function personaNames(gender: Persona) {
  return gender === "m"
    ? { first: "David", full: "David Okafor", legal: "David Chinedu Okafor", email: "david.okafor@example.com", initials: "DO" }
    : { first: "Sarah", full: "Sarah Okafor", legal: "Sarah Chioma Okafor", email: "sarah.okafor@example.com", initials: "SO" };
}

/** Wireframe heroImg() / promoImg(). */
export function heroImage(gender: Persona) {
  return gender === "m" ? "/images/applicant/hero-cutout-m.webp" : "/images/applicant/hero-cutout.webp";
}
export function promoImage(gender: Persona) {
  return gender === "m" ? "/images/applicant/hero-cutout.webp" : "/images/applicant/sidebar-cutout.webp";
}

/**
 * Default avatar: one neutral "person" silhouette in the brand plum, used for
 * everyone (project lead: the illustrated woman/man avatars looked off - "use
 * a default emoji (person) for both male and female"). "f" and "m" both map
 * to it so saved choices keep working; an uploaded photo still wins.
 */
export const PERSON_SVG = '<svg viewBox="0 0 96 96" aria-hidden="true"><rect width="96" height="96" fill="#F3E6FA"/><circle cx="48" cy="38" r="17" fill="#5B087B"/><path d="M14 96c0-20 15.2-32 34-32s34 12 34 32z" fill="#5B087B"/></svg>';

/**
 * Gives an avatar SVG's gradient ids a per-instance suffix. Without it every
 * avatar on the page points at the FIRST copy's gradients - and when that
 * copy sits in a hidden element (the sidebar on phones) the browser paints
 * nothing, leaving an empty circle.
 */
export function withUniqueIds(svg: string, key: string): string {
  const k = key.replace(/[^a-zA-Z0-9_-]/g, "");
  return svg.replace(/id="([\w-]+)"/g, `id="$1-${k}"`).replace(/url\(#([\w-]+)\)/g, `url(#$1-${k})`);
}

/* Avatar artwork. "n" (initials) is from the wireframe (AVN). */
export const AVATAR_SVG: Record<AvatarChoice, string> = {
  f: PERSON_SVG,
  m: PERSON_SVG,
  n: '<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="avgn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8A0AA3"/><stop offset=".6" stop-color="#5B087B"/><stop offset="1" stop-color="#250044"/></linearGradient></defs><rect width="96" height="96" fill="url(#avgn)"/><text x="48" y="58" text-anchor="middle" font-family="Karla,system-ui,sans-serif" font-size="30" font-weight="700" fill="#fff">SO</text></svg>',
};

/** Downscale an uploaded photo so the data URL comfortably fits in localStorage. */
export function readAndResize(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
