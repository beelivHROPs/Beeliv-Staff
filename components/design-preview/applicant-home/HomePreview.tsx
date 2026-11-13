"use client";

import { useState } from "react";
import type { ApplicantJob } from "@/lib/applicant/jobs";
import { OptionA } from "./OptionA";
import { OptionB } from "./OptionB";

type Which = "a" | "b" | "current";
const TABS: { id: Which; label: string }[] = [
  { id: "a", label: "Option A" },
  { id: "b", label: "Option B" },
  { id: "current", label: "Current" },
];

export function HomePreview({ jobs, initial }: { jobs: ApplicantJob[]; initial: Which }) {
  const [which, setWhich] = useState<Which>(initial);
  return (
    <div className="dp-stage">
      <div className="dp-phone">
        <div className="dp-switch-wrap">
          <div className="dp-switch" role="tablist" aria-label="Design option">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={which === t.id} className="dp-switch-btn" onClick={() => setWhich(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="dp-screen">
          {which === "a" ? <OptionA jobs={jobs} /> : which === "b" ? <OptionB jobs={jobs} /> : <CurrentNote />}
        </div>
      </div>
    </div>
  );
}

function CurrentNote() {
  return (
    <div className="dp-pad dp-current">
      <p className="dp-eyebrow">Current (reference)</p>
      <h1 className="dp-h1">Current Home</h1>
      <p className="dp-body">Current Home: open /applicant on this same device to compare. Nothing in the real app has been changed.</p>
    </div>
  );
}
