"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createUploadController, type UploadController } from "./controller";
import { createLiveUploadTransport } from "./live-transport";
import { createMockTransport } from "./mock-transport";
import { parseScenarioSwitch } from "./runtime";
import { scopedUploadStore } from "./scoped-storage";
import { browserSessionStore } from "./storage";
import { createUnavailableTransport } from "./transport";
import type { UploadProviderConfig } from "./server-config";

const UploadContext = createContext<UploadController | null>(null);
const SCENARIO_KEY = "bv-upload-scenario-v1";

function previewScenario(): ReturnType<typeof parseScenarioSwitch> {
  if (typeof window === "undefined") return null;
  try {
    const selected = new URLSearchParams(window.location.search).get("uploads");
    if (selected) window.sessionStorage.setItem(SCENARIO_KEY, selected);
    return parseScenarioSwitch(selected ?? window.sessionStorage.getItem(SCENARIO_KEY));
  } catch { return null; }
}

function makeController(config: UploadProviderConfig): UploadController {
  const transport = config.mode === "live" ? createLiveUploadTransport(config.storageOrigin)
    : config.mode === "preview" ? createMockTransport({ scenario: previewScenario() ?? "ok" })
      : createUnavailableTransport();
  const storage = config.mode === "live" ? scopedUploadStore(config.sessionScope)
    : config.mode === "preview" ? browserSessionStore() : null;
  return createUploadController({ getTransport: () => transport, storage, pollMs: 3000 });
}

export function ApplicantUploadProvider({ config, children }: { config: UploadProviderConfig; children: ReactNode }) {
  const [controller] = useState(() => makeController(config));
  useEffect(() => () => controller.dispose(), [controller]);
  return <UploadContext.Provider value={controller}>{children}</UploadContext.Provider>;
}

export function useApplicantUploadController(): UploadController {
  const controller = useContext(UploadContext);
  if (!controller) throw new Error("applicant_upload_provider_missing");
  return controller;
}
