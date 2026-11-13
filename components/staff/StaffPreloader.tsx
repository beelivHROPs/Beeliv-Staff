"use client";

/**
 * Staff action preloader - same behaviour as the Applicant preloader
 * (components/applicant/Preloader.tsx: short rotating phrases while real work
 * runs, never longer than the work plus a small minimum), with Staff copy and
 * Staff colours. The Applicant version has applicant-only copy kinds, so this
 * is its own small store rather than an edit to that file.
 */
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { newsreader } from "@/components/applicant/fonts";

export type StaffPreloadKind = "check-in" | "check-out" | "accept-agreement" | "save";

const PHRASES: Record<StaffPreloadKind, string[]> = {
  "check-in": ["Recording your check-in", "Letting your outlet know", "Have a great shift"],
  "check-out": ["Recording your check-out", "Wrapping up your shift", "Thanks for today"],
  "accept-agreement": ["Recording your acceptance", "Updating your onboarding", "Almost there"],
  save: ["Saving your changes", "Almost done"],
};
const MIN_MS: Record<StaffPreloadKind, number> = { "check-in": 900, "check-out": 900, "accept-agreement": 800, save: 700 };
const PHRASE_MS = 800;

type Req = { id: number; kind: StaffPreloadKind };
let current: Req | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function reducedMotion(): boolean {
  return document.documentElement.hasAttribute("data-ap-reduce-motion") || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Runs `work` behind the overlay and resolves with its result. */
export async function withStaffPreloader<T>(kind: StaffPreloadKind, work: () => Promise<T> | T): Promise<T> {
  const id = ++seq;
  current = { id, kind };
  emit();
  const min = reducedMotion() ? 300 : MIN_MS[kind];
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

export function StaffPreloaderHost() {
  const req = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
  return <AnimatePresence>{req ? <Overlay key={req.id} kind={req.kind} /> : null}</AnimatePresence>;
}

function Overlay({ kind }: { kind: StaffPreloadKind }) {
  const list = PHRASES[kind];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, list.length - 1)), PHRASE_MS);
    return () => clearInterval(t);
  }, [list.length]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label={list[i]}
      className={`staff-preloader ${newsreader.variable} fixed inset-0 z-[140] flex flex-col items-center justify-center px-6 text-center`}
      style={{ background: "radial-gradient(900px 500px at 50% 35%, #f1eefa 0%, #f8f7fa 60%)", fontFamily: 'var(--font-sans), "Karla", system-ui, sans-serif' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      transition={{ duration: 0.22 }}
    >
      <div className="relative mb-7 flex size-28 items-center justify-center">
        <motion.span className="absolute inset-0 rounded-full border-2 border-[rgba(79,58,168,.2)]" animate={{ scale: [1, 1.12, 1], opacity: [0.9, 0.35, 0.9] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.span className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#4f3aa8] border-r-[#6954c8]" animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} />
        <span className="flex size-20 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(41,32,82,.12)]">
          <Image src="/images/beeliv-logo-full-colour.png" alt="" width={197} height={207} className="staff-logo-light h-12 w-auto" />
          <Image src="/images/beeliv-logo-white.png" alt="" width={517} height={540} className="staff-logo-dark hidden h-12 w-auto" />
        </span>
      </div>
      <div className="relative h-[64px] w-full max-w-[520px] overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={i}
            className="absolute inset-x-0 top-0 text-[30px] leading-[1.15] font-medium text-[#0f0b18] max-[767px]:text-[25px]"
            style={{ fontFamily: 'var(--font-newsreader), system-ui, "Segoe UI", sans-serif' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {list[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="mt-2 text-[13px] font-semibold tracking-[.12em] text-[#5f5968] uppercase">Beeliv Hospitality</p>
    </motion.div>
  );
}
