"use client";

import { useEffect } from "react";
import { applyClientTheme, clearClientTheme } from "@/lib/client/theme";

/**
 * Marks <html> with `client-app` while the Client area is mounted, so the
 * Client token overrides in app/client/client.css also reach layers that
 * portal to <body> (confirm dialog, sheets, popovers). Also restores the saved
 * dark mode. Presentation only.
 */
export function ClientThemeFlag() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("client-app");
    applyClientTheme();
    return () => {
      root.classList.remove("client-app");
      clearClientTheme();
    };
  }, []);
  return null;
}
