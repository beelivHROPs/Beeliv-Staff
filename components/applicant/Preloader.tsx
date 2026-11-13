"use client";

/**
 * Path-aware preloader (project lead, 2026-09-29). Shows short, rotating
 * phrases while the backend does real work — creating the account after
 * sign-up, loading an existing account after login, or saving an important
 * action — so people stay engaged instead of staring at a blank screen.
 *
 * Words depend on HOW the person arrived:
 *   sign-up (Get Started)        → new account set-up
 *   sign-up from a job           → new account + that job's application
 *   login (general)              → welcome back
 *   login from a job             → welcome back + that job's application
 * and on the action: submit application / documentation, accept offer,
 * activate staff access.
 *
 * It never adds dead time: it stays up only while the work is running, with a
 * short minimum so the first phrase can be read (≈1.4s entry, ≈1s actions).
 * The auth forms tag the redirect with `from=signup|login` (+ `job=`); the
 * shell reads it once, shows the entry preloader, then strips the param.
 */
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { newsreader } from "./fonts";

export type PreloadKind =
  | "signup"
  | "signup-job"
  | "login"
  | "login-job"
  | "submit-application"
  | "submit-documentation"
  | "accept-offer"
  | "activate-staff";

type Vars = { name?: string; role?: string; company?: string; /** Skip the first N phrases (continuing a preloader started on the auth page). */ startAt?: number };

function phrases(kind: PreloadKind, v: Vars): string[] {
  const job = v.role ? `${v.role}${v.company ? ` at ${v.company}` : ""}` : "your chosen role";
  const hi = v.name ? `, ${v.name}` : "";
  switch (kind) {
    case "signup":
      return ["Creating your Beeliv account", "Setting up your applicant workspace", "Getting hospitality roles ready for you", "You're in — welcome to Beeliv"];
    case "signup-job":
      return ["Creating your Beeliv account", `Saving your spot for ${job}`, "Starting your application draft", "Let's get you hired"];
    case "login":
      return [`Welcome back${hi}`, "Syncing your applications", "Checking for new updates", "Finding fresh roles for you"];
    case "login-job":
      return [`Welcome back${hi}`, `Opening ${job}`, "Restoring your saved progress", "Picking up where you left off"];
    case "submit-application":
      return ["Sending your application", "Attaching your saved documents", "Letting the Beeliv team know"];
    case "submit-documentation":
      return ["Securing your documentation", "Preparing it for verification", "Almost done"];
    case "accept-offer":
      return ["Recording your acceptance", "Letting the Beeliv team know", "Starting your onboarding"];
    case "activate-staff":
      return ["Confirming your placement", "Adding staff access to your account", "Getting your Staff Hub ready"];
  }
}

/** Each phrase stays ~1.4s so it can actually be read (project lead: "too fast"). */
const PHRASE_MS = 1400;
/** Minimum time on screen = long enough to show every phrase once (the last one holds). */
const MIN_MS: Record<PreloadKind, number> = {
  signup: 5500,
  "signup-job": 5500,
  login: 5000,
  "login-job": 5000,
  "submit-application": 4000,
  "submit-documentation": 4000,
  "accept-offer": 4000,
  "activate-staff": 4000,
};

type Req = { id: number; kind: PreloadKind; vars: Vars };
let current: Req | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function reducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return document.documentElement.hasAttribute("data-ap-reduce-motion") || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Runs `work` behind the preloader and resolves with its result. The overlay
 * stays up for max(work, minimum) — never longer.
 */
export async function withPreloader<T>(kind: PreloadKind, vars: Vars, work: () => Promise<T> | T): Promise<T> {
  const id = ++seq;
  current = { id, kind, vars };
  emit();
  const remaining = vars.startAt ? Math.max(1, phrases(kind, vars).length - vars.startAt) : 0;
  const min = reducedMotion() ? 300 : remaining ? remaining * PHRASE_MS + 200 : MIN_MS[kind];
  try {
    const [result] = await Promise.all([Promise.resolve().then(work), new Promise((r) => setTimeout(r, min))]);
    return result as T;
  } finally {
    if (current?.id === id) {
      current = null;
      emit();
    }
  }
}

/** Mounted once in AppShell. */
export function PreloaderHost() {
  const req = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
  return <AnimatePresence>{req ? <Overlay key={req.id} req={req} /> : null}</AnimatePresence>;
}

function Overlay({ req }: { req: Req }) {
  return <PreloaderScreen kind={req.kind} vars={req.vars} />;
}

/**
 * The preloader screen itself. Self-contained colours/fonts (no dependency on
 * the dashboard's applicant.css), so the public login/sign-up pages can show it
 * the moment the form succeeds — it then covers the navigation into the
 * dashboard, where the shell continues it (`startAt`) until the account is ready.
 * Phrases advance every ~0.9s and hold on the last one.
 */
export function PreloaderScreen({ kind, vars }: { kind: PreloadKind; vars: Vars }) {
  const all = phrases(kind, vars);
  const list = vars.startAt ? all.slice(Math.min(vars.startAt, all.length - 1)) : all;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, list.length - 1)), PHRASE_MS);
    return () => clearInterval(t);
  }, [list.length]);
  const pct = ((i + 1 + (all.length - list.length)) / all.length) * 100;

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label={list[i]}
      className={`${newsreader.variable} fixed inset-0 z-[140] flex flex-col items-center justify-center px-6 text-center`}
      style={{ background: "radial-gradient(900px 500px at 50% 35%, #f6effa 0%, #faf9f7 60%)", fontFamily: 'var(--font-sans), "Karla", system-ui, sans-serif' }}
      initial={{ opacity: vars.startAt ? 1 : 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
      transition={{ duration: 0.25 }}
    >
      {/* Logo inside a slowly breathing ring */}
      <div className="relative mb-8 flex size-28 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-[rgba(138,10,163,.18)]"
          animate={{ scale: [1, 1.12, 1], opacity: [0.9, 0.35, 0.9] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#5b087b] border-r-[#8a0aa3]"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
        <span className="flex size-20 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(37,0,68,.10)]">
          <Image src="/images/beeliv-logo-full-colour.png" alt="" width={197} height={207} priority className="h-12 w-auto" />
        </span>
      </div>

      {/* Rotating phrase */}
      <div className="relative h-[72px] w-full max-w-[520px] overflow-hidden max-[767px]:h-[84px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={i}
            className="absolute inset-x-0 top-0 text-[34px] leading-[1.15] font-medium text-[#11111b] max-[767px]:text-[26px]"
            style={{ fontFamily: 'var(--font-newsreader), system-ui, "Segoe UI", sans-serif', fontOpticalSizing: "auto" }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {list[i]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-4 h-1 w-40 overflow-hidden rounded-full bg-[#eae2f1]" aria-hidden="true">
        <motion.i className="block h-full rounded-full bg-[linear-gradient(90deg,#8a0aa3,#5b087b)]" animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <p className="mt-3 text-[13px] font-semibold tracking-[.12em] text-[#686672] uppercase">Beeliv Hospitality</p>
    </motion.div>
  );
}
