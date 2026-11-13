"use client";

import { useState } from "react";

type Item = { id: string; label: string; html: string };

/** Dev-only viewer: each draft email in an isolated frame at phone or desktop width, light or dark background. */
export function EmailPreview({ items }: { items: Item[] }) {
  const [id, setId] = useState(items[0]?.id ?? "");
  const [wide, setWide] = useState(false);
  const [dark, setDark] = useState(false);
  const cur = items.find((i) => i.id === id) ?? items[0];
  const btn = (on: boolean) => ({
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid #d8cdb6",
    background: on ? "#5b087b" : "#fff",
    color: on ? "#fff" : "#1d1a16",
    font: "inherit",
    fontWeight: 600,
    cursor: "pointer",
  });
  return (
    <main style={{ minHeight: "100vh", background: "#faf6ee", padding: "20px 16px 60px", fontFamily: "system-ui, sans-serif", color: "#1d1a16" }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#756d60", fontWeight: 700 }}>Design preview · not part of the app</p>
      <h1 style={{ margin: "4px 0 6px", fontSize: 28 }}>Email drafts</h1>
      <p style={{ margin: "0 0 14px", maxWidth: 640, fontSize: 14.5, lineHeight: 1.5 }}>
        Sample values only. Sender and reply addresses, the logo address and the final wording need Beeliv&apos;s approval. Nothing here is sent.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {items.map((i) => (
          <button key={i.id} type="button" onClick={() => setId(i.id)} style={btn(i.id === id)} aria-pressed={i.id === id}>
            {i.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button type="button" onClick={() => setWide(false)} style={btn(!wide)}>Phone width</button>
        <button type="button" onClick={() => setWide(true)} style={btn(wide)}>Desktop width</button>
        <button type="button" onClick={() => setDark((d) => !d)} style={btn(dark)}>Dark background</button>
      </div>
      {cur ? (
        <div style={{ display: "flex", justifyContent: "center", background: dark ? "#14101a" : "#e9e3d6", padding: 16, borderRadius: 14 }}>
          <iframe
            key={cur.id + String(dark)}
            title={cur.label}
            sandbox=""
            srcDoc={cur.html}
            style={{ width: wide ? 720 : 390, maxWidth: "100%", height: 760, border: 0, borderRadius: 10, background: dark ? "#14101a" : "#fff", colorScheme: dark ? "dark" : "light" }}
          />
        </div>
      ) : null}
    </main>
  );
}
