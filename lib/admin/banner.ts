/**
 * Admin banner image: Beeliv uploads its own banner for the Overview hero (no waiting for stock photos).
 * Demo storage = this browser only (a small resized data URL in localStorage). The real adapter will
 * upload the file to storage and keep the URL on the workspace; components only use this hook.
 */
import { useEffect, useSyncExternalStore } from "react";

const KEY = "bv-admin-banner";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_WIDTH = 1600;

let value: string | null = null;
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    value = window.localStorage.getItem(KEY);
  } catch {
    value = null;
  }
  emit();
}

export function useAdminBanner(): string | null {
  const v = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => value,
    () => null,
  );
  useEffect(hydrate, []);
  return v;
}

export function clearAdminBanner() {
  value = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Memory only.
  }
  emit();
}

/** Validates, resizes (max 1600px wide, JPEG) and stores the picture. Returns an error message, or null when saved. */
export async function setAdminBannerFromFile(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return "Please choose a picture (JPG, PNG or WebP).";
  if (file.size > MAX_BYTES) return "That picture is larger than 8 MB. Please choose a smaller one.";
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", 0.82);
    value = url;
    try {
      window.localStorage.setItem(KEY, url);
    } catch {
      // Too big for storage: keep it for this visit only.
    }
    emit();
    return null;
  } catch {
    return "We couldn't read that picture. Please try another one.";
  }
}
