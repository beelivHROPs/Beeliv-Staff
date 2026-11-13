"use client";

import { useEffect } from "react";

const BASE = 1440;
const MAX = 3840;
const BASE_H = 800;

/**
 * Screens wider than the 1440 design width get the whole public site zoomed
 * up by width / 1440 (images, text, spacing - everything), so large monitors
 * and laptops show the same composition with no side margins. Height-limited on
 * ultrawide screens. Sets --ps-zoom, which public-site.css applies to .public-site.
 */
export function ScreenScale() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      // Height-limited too, so ultrawide screens do not over-zoom; the layout
      // then gets extra width instead (see --u in public-site.css).
      const z = w > BASE ? Math.min(Math.min(w, MAX) / BASE, Math.max(1, h / BASE_H)) : 1;
      root.style.setProperty("--ps-zoom", z.toFixed(4));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--ps-zoom");
    };
  }, []);
  return null;
}
