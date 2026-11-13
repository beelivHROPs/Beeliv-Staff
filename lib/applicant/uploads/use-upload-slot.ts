"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { PickedFile, SlotView } from "./controller";
import { IDLE } from "./state";
import { getUploadController } from "./runtime";
import type { UploadSlot } from "./types";

const SERVER_VIEW: SlotView = { state: IDLE };

/** State and actions for one upload slot. State is shared by every component that asks for the same slot. */
export function useUploadSlot(slot: UploadSlot) {
  const c = getUploadController();
  const view = useSyncExternalStore(c.subscribe, () => c.getView(slot), () => SERVER_VIEW);
  useEffect(() => {
    c.hydrate(slot); // after mount, so server and first client render agree
  }, [c, slot]);
  return {
    state: view.state,
    notice: view.notice,
    pick: useCallback((f: PickedFile) => c.pick(slot, f), [c, slot]),
    retry: useCallback((f?: PickedFile) => c.retry(slot, f), [c, slot]),
    cancel: useCallback(() => c.cancel(slot), [c, slot]),
    startOver: useCallback(() => c.startOver(slot), [c, slot]),
    dismiss: useCallback(() => c.dismiss(slot), [c, slot]),
    hasFile: () => c.hasFile(slot),
  };
}

/** Read-only view of all three slots (for the Apply page summary). */
export function useUploadSlotStates() {
  const c = getUploadController();
  const cv = useSyncExternalStore(c.subscribe, () => c.getView("cv"), () => SERVER_VIEW);
  const photo = useSyncExternalStore(c.subscribe, () => c.getView("passport-photo"), () => SERVER_VIEW);
  const id = useSyncExternalStore(c.subscribe, () => c.getView("valid-id"), () => SERVER_VIEW);
  useEffect(() => {
    c.hydrate("cv");
    c.hydrate("passport-photo");
    c.hydrate("valid-id");
  }, [c]);
  return { cv: cv.state, "passport-photo": photo.state, "valid-id": id.state } as const;
}
