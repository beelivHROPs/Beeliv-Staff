"use client";

import { useEffect, useState } from "react";
import { play, setVolume, startRing, stopRing, type SoundId } from "./synth";

type Row = { id: SoundId; name: string; event: string };

const SECTIONS: { title: string; hint: string; rows: Row[] }[] = [
  {
    title: "The big moments",
    hint: "Louder and longer, because they matter most.",
    rows: [
      { id: "corkPop", name: "Cork pop and chime", event: "Offer accepted / placement confirmed (the only celebration)" },
      { id: "doorChime", name: "Door chime", event: "Approval waiting for Operations" },
      { id: "tableTap", name: "Spoon on glass", event: "Interview starting soon" },
      { id: "gong", name: "Polite gong", event: "Overdue (5 days)" },
    ],
  },
  {
    title: "Everyday notifications",
    hint: "Short, played once.",
    rows: [
      { id: "glassClink", name: "Glass clink", event: "New application" },
      { id: "woodBlock", name: "Wood-block pop", event: "New message" },
      { id: "cutleryTick", name: "Cutlery tick", event: "Test completed" },
      { id: "marimba", name: "Marimba", event: "Reminder" },
    ],
  },
  {
    title: "Action feedback",
    hint: "Tiny and quiet, confirming what you just did.",
    rows: [
      { id: "softPop", name: "Soft pop", event: "Saved or sent (new)" },
      { id: "pageTurn", name: "Page turn (old tick)", event: "Previously saved or sent" },
      { id: "plateThud", name: "Plate set down", event: "Approved or shortlisted" },
      { id: "rejectThud", name: "Low thud", event: "Rejected or removed" },
      { id: "errorBump", name: "Double bump", event: "Error or blocked" },
      { id: "tap", name: "Tap", event: "Tap or toggle" },
    ],
  },
  {
    title: "Welcome sound (on sign-in)",
    hint: "One soft chime when someone signs in. Same family, a different voice per app.",
    rows: [
      { id: "welcomeTalent", name: "Welcome: applicants and staff", event: "Two soft rising notes" },
      { id: "welcomeClient", name: "Welcome: clients", event: "A warm three-note arpeggio" },
      { id: "welcomeAdmin", name: "Welcome: Admin and Operations", event: "Calm and lower" },
    ],
  },
];

export function SoundLab() {
  const [vol, setVol] = useState(0.7);
  const [ringing, setRinging] = useState(false);
  const [last, setLast] = useState<SoundId | null>(null);

  useEffect(() => {
    setVolume(vol);
  }, [vol]);
  useEffect(() => () => stopRing(), []);

  return (
    <main className="sl-wrap">
      <header className="sl-head">
        <p className="sl-eyebrow">Design preview · not part of the app</p>
        <h1>Sound Lab</h1>
        <p className="sl-lead">
          The proposed Beeliv sound identity: sounds from the world of service. Tap any row to listen. These are generated in the browser, so real recordings of a bell, glass and cork would sound richer.
        </p>
        <label className="sl-vol">
          <span>Volume</span>
          <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(Number(e.target.value))} aria-label="Volume" />
        </label>
      </header>

      <section className="sl-box" aria-labelledby="sl-ring">
        <h2 id="sl-ring">Ringtone: new client request</h2>
        <p className="sl-hint">A hotel service bell, two rings, repeating up to 3 times until someone acknowledges the request.</p>
        <div className="sl-ring">
          {ringing ? (
            <button
              type="button"
              className="sl-btn sl-btn-s"
              onClick={() => {
                stopRing();
                setRinging(false);
              }}
            >
              Acknowledge (stop)
            </button>
          ) : (
            <button
              type="button"
              className="sl-btn"
              onClick={() => {
                setRinging(true);
                startRing(() => setRinging(false));
              }}
            >
              ▶ Ring
            </button>
          )}
          <span className="sl-hint">{ringing ? "Ringing…" : "Plays up to 3 times, about 8 seconds."}</span>
        </div>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.title} className="sl-box" aria-label={s.title}>
          <h2>{s.title}</h2>
          <p className="sl-hint">{s.hint}</p>
          <ul className="sl-list">
            {s.rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`sl-row ${last === r.id ? "is-last" : ""}`}
                  onClick={() => {
                    play(r.id);
                    setLast(r.id);
                  }}
                >
                  <span className="sl-play" aria-hidden="true">
                    ▶
                  </span>
                  <span className="sl-txt">
                    <b>{r.name}</b>
                    <span>{r.event}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="sl-foot">
        Controls the real apps would have: master volume, mute, per-category on and off, quiet hours (urgent requests still ring), and a ringtone picker with preview.
      </p>
    </main>
  );
}
