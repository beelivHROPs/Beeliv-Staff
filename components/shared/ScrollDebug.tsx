"use client";

import { useEffect, useState } from "react";

/**
 * Diagnostic for "the page moves sideways / the fixed bars move" on a real phone. Add ?debug=scroll to any URL (non-production only).
 * It shows what the browser reports (page width vs screen, zoom, how far the visible area has been panned, which element scrolls)
 * and outlines in red every element that sticks out past the right edge. Remove it once the cause is fixed.
 */
export function ScrollDebug() {
  const [on, setOn] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    // Diagnostics only: neither ?debug=scroll nor ?fix=body may run in a production build.
    if (process.env.NODE_ENV === "production") return;
    // Read the query string after mount so the server and first client render match.
    const t = window.setTimeout(() => {
      const q = new URLSearchParams(window.location.search);
      if (q.get("debug") === "scroll") setOn(true);
      // ?fix=body : test switch. The body becomes the scroller and the browser window itself no longer scrolls or bounces.
      if (q.get("fix") === "body") document.documentElement.classList.add("bv-body-scroll");
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!on) return;
    const marked: HTMLElement[] = [];
    const tick = () => {
      const de = document.documentElement;
      const vv = window.visualViewport;
      const W = de.clientWidth;
      marked.forEach((e) => (e.style.outline = ""));
      marked.length = 0;
      let wide = "";
      document.querySelectorAll<HTMLElement>("body *").forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.right > W + 1 && e.dataset.scrollDebug !== "1") {
          let clipped = false;
          for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && p.getBoundingClientRect().right <= W + 1) {
              clipped = true;
              break;
            }
          }
          if (!clipped) {
            e.style.outline = "2px solid red";
            marked.push(e);
            if (!wide) wide = `${e.tagName}.${String(e.className).slice(0, 40)} right=${Math.round(r.right)}`;
          }
        }
      });
      setInfo(
        [
          `inner ${window.innerWidth}x${window.innerHeight}  html ${de.clientWidth}x${de.clientHeight}`,
          `scrollW ${de.scrollWidth}  bodyW ${document.body.scrollWidth}`,
          `scrollX ${Math.round(window.scrollX)}  scrollY ${Math.round(window.scrollY)}`,
          `zoom ${vv ? vv.scale.toFixed(2) : "n/a"}  pan ${vv ? `${Math.round(vv.offsetLeft)},${Math.round(vv.offsetTop)}` : "n/a"}  vv ${vv ? `${Math.round(vv.width)}x${Math.round(vv.height)}` : "n/a"}`,
          `scroller ${document.scrollingElement === de ? "html" : "other"}  body-ox ${getComputedStyle(document.body).overflowX}`,
          `wide: ${wide || "none"}`,
        ].join("\n"),
      );
    };
    tick();
    const t = window.setInterval(tick, 500);
    window.addEventListener("scroll", tick, { passive: true });
    window.visualViewport?.addEventListener("scroll", tick);
    window.visualViewport?.addEventListener("resize", tick);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("scroll", tick);
      window.visualViewport?.removeEventListener("scroll", tick);
      window.visualViewport?.removeEventListener("resize", tick);
      marked.forEach((e) => (e.style.outline = ""));
    };
  }, [on]);

  if (!on) return null;
  return (
    <pre
      data-scroll-debug="1"
      style={{ position: "fixed", left: 4, top: 4, zIndex: 2147483647, margin: 0, padding: 6, maxWidth: "92vw", font: "11px/1.3 monospace", color: "#0f0", background: "rgba(0,0,0,.82)", borderRadius: 6, pointerEvents: "none", whiteSpace: "pre-wrap" }}
    >
      {info}
    </pre>
  );
}
