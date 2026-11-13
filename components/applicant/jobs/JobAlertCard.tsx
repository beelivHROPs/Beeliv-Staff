"use client";

import { useState } from "react";
import { Bell, Mail } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { setJobAlert, useJobAlert, type AlertFreq } from "./alert-store";

const FREQS: AlertFreq[] = ["Instant", "Daily", "Weekly"];

function Criteria({ items, className = "my-3.5" }: { items: string[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((c) => (
        <span key={c} className="inline-flex h-7 items-center rounded-full border border-(--ap-line) bg-transparent px-2.5 text-[13px] font-semibold text-(--ap-ink-2)">
          {c}
        </span>
      ))}
    </div>
  );
}

/**
 * Wireframe jobAlert() (.jalert2): three states - off (Create alert), edit
 * (criteria + frequency segmented control + channel picks) and on (criteria,
 * live stats, delivery line, Edit alert + switch).
 */
export function JobAlertCard({
  criteria,
  matchCount,
  newThisWeek,
  className = "",
}: {
  criteria: string[];
  matchCount: number;
  newThisWeek: number;
  className?: string;
}) {
  const alert = useJobAlert();
  const [edit, setEdit] = useState(false);
  const btn = "ap-btn mt-4 w-full";

  return (
    <section
      aria-label="Job alerts"
      className={`ax-box p-4 ${className}`}>
      <div className="relative flex items-center gap-3">
        <Bell className="size-5 shrink-0 text-(--ap-ink-2)" strokeWidth={1.7} aria-hidden="true" />
        <div className="min-w-0 flex-1 leading-[1.3]">
          <b className="block text-base font-bold">Job alerts</b>
          <span className="text-[13px] text-(--ap-muted)">{alert.on ? `On · ${alert.freq.toLowerCase()}` : "Get new roles before others"}</span>
        </div>
        {alert.on ? (
          <button
            type="button"
            role="switch"
            aria-checked="true"
            aria-label="Turn job alert off"
            onClick={() => {
              setJobAlert({ ...alert, on: false });
              setEdit(false);
              toast.add({ title: "Job alert turned off" });
            }}
            className="ap-switch before:absolute before:-inset-x-1 before:-inset-y-2 before:content-['']"
          />
        ) : null}
      </div>

      {!alert.on ? (
        <>
          <p className="ap-bd mt-3.5 mb-3 text-(--ap-ink-2)">
            Save this search and we&apos;ll email you when a matching role opens. Off until you create it. You can stop these at any time.
          </p>
          <Criteria items={criteria} />
          <button
            type="button"
            onClick={() => {
              setJobAlert({ ...alert, on: true });
              setEdit(true);
            }}
            className={`${btn} ap-btn-p ap-btn-hero`}
          >
            <Bell className="size-[18px]" strokeWidth={1.6} aria-hidden="true" />
            Create alert
          </button>
        </>
      ) : edit ? (
        <>
          <div className="relative mt-3.5">
            <span className="block text-[13px] font-semibold text-(--ap-ink-2)">Alert me about</span>
            <Criteria items={criteria} className="mt-2 mb-1" />
            <span className="text-[13px] text-(--ap-faint)">Change the filters to update this alert.</span>
          </div>
          <div className="relative mt-3.5">
            <span className="block text-[13px] font-semibold text-(--ap-ink-2)">How often</span>
            <div className="ap-seg mt-2 flex w-full" role="group" aria-label="How often">
              {FREQS.map((f) => (
                <button key={f} type="button" aria-pressed={alert.freq === f} onClick={() => setJobAlert({ ...alert, freq: f })} className="min-w-0 flex-1">
                  {f}
                </button>
              ))}
            </div>
          </div>
          <p className="relative mt-3.5 flex items-center gap-1.5 text-[13px] text-(--ap-muted)">
            <Mail className="size-[15px] shrink-0" strokeWidth={1.6} aria-hidden="true" />
            Alerts are sent to your email address. You can stop these at any time.
          </p>
          <button
            type="button"
            onClick={() => {
              setEdit(false);
              toast.add({
                title: `Alert saved. We'll send new matches ${alert.freq === "Instant" ? "as they open" : alert.freq.toLowerCase()}.`,
                type: "success",
              });
            }}
            className={`${btn} ap-btn-p ap-btn-hero`}
          >
            Save alert
          </button>
        </>
      ) : (
        <>
          <Criteria items={criteria} />
          <div className="relative mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-(--ap-line-2) px-3 py-2.5">
              <b className="block text-xl font-bold tracking-[-0.01em] text-(--ap-ink) tabular-nums">{matchCount}</b>
              <span className="text-[13px] text-(--ap-muted)">role{matchCount === 1 ? "" : "s"} match now</span>
            </div>
            <div className="rounded-xl bg-(--ap-line-2) px-3 py-2.5">
              <b className="block text-xl font-bold tracking-[-0.01em] text-(--ap-ink) tabular-nums">{newThisWeek}</b>
              <span className="text-[13px] text-(--ap-muted)">new this week</span>
            </div>
          </div>
          <div className="mb-3.5 flex items-center gap-[7px] text-[13px] text-(--ap-muted)">
            <Mail className="size-[15px] shrink-0" strokeWidth={1.6} aria-hidden="true" />
            Sent by email · {alert.freq} · You can stop these at any time
          </div>
          <button
            type="button"
            onClick={() => setEdit(true)}
            className={`${btn} ap-btn-o`}
          >
            Edit alert
          </button>
        </>
      )}
    </section>
  );
}
