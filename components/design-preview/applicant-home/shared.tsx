"use client";

import { useState, useSyncExternalStore } from "react";
import { Bookmark, Bell } from "@/components/applicant/icons";
import { JobCover } from "@/components/applicant/primitives";
import type { ApplicantJob } from "@/lib/applicant/jobs";
import { personaNames } from "@/lib/applicant/avatar";
import { computeProfileCompleteness, useApplicantStore } from "@/lib/applicant/service";
import { describeApplicationStatus } from "@/lib/applicant/status";
import { formatDate, formatDueLabel, formatTime, weekdayName } from "@/lib/applicant/time";
import { APPLICATION_STAGES, type Application } from "@/lib/applicant/types";

/* ---------- data (read-only: same store the real Home reads) ---------- */

function useGreeting() {
  // Server and first client paint say "Hello"; the time-of-day greeting loads right after.
  return useSyncExternalStore(
    () => () => {},
    () => {
      const h = new Date().getHours();
      return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    },
    () => "Hello",
  );
}

export function useHomeData(jobs: ApplicantJob[]) {
  const store = useApplicantStore();
  const { profile, applications, interviews, documents } = store;
  const completeness = computeProfileCompleteness(profile, documents);
  const submitted = applications
    .filter((a) => a.lifecycle !== "draft")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const current = submitted.find((a) => a.next) ?? submitted[0] ?? null;
  const interview = interviews.find((v) => v.status === "scheduled" && v.scheduledAt) ?? null;
  const docsDue = documents.filter((d) => d.category === "pre-employment" && d.status === "action-required");
  const nextDue = docsDue
    .map((d) => d.due)
    .filter((d): d is string => Boolean(d))
    .sort()[0];
  const roles = [...jobs.filter((j) => !j.closed)].sort((a, b) => Number(Boolean(b.match)) - Number(Boolean(a.match)) || a.daysAgo - b.daysAgo);
  return {
    greeting: useGreeting(),
    first: personaNames("f").first,
    completeness,
    submitted,
    current,
    interview,
    docsDue,
    nextDue,
    roles,
  };
}

/* ---------- small helpers ---------- */

export function closingSoon(job: ApplicantJob): boolean {
  const t = Date.parse(job.closes.replace(/^Closes\s+/, ""));
  if (Number.isNaN(t)) return false;
  const days = (t - Date.now()) / 86_400_000;
  return days >= -1 && days <= 6;
}

export function jobTag(job: ApplicantJob): string | null {
  return job.match ?? (closingSoon(job) ? "Closing soon" : null);
}

export function when(iso: string) {
  return `${weekdayName(iso)}, ${formatDate(iso)} · ${formatTime(iso)}`;
}
export { formatDueLabel, describeApplicationStatus, APPLICATION_STAGES };

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function interviewParts(label: string) {
  const [role, company] = label.split(" · ");
  return { role: role || "", company: company || "Beeliv" };
}

/* ---------- pieces used by both options ---------- */

export function BellButton({ dot }: { dot?: boolean }) {
  return (
    <button type="button" className="dp-iconbtn" aria-label="Notifications">
      <Bell className="size-[22px]" strokeWidth={1.7} />
      {dot ? <i className="dp-dot" aria-hidden="true" /> : null}
    </button>
  );
}

export function SaveButton({ title }: { title: string }) {
  const [on, setOn] = useState(false);
  return (
    <button type="button" className="dp-save" aria-pressed={on} aria-label={`${on ? "Unsave" : "Save"} ${title}`} onClick={() => setOn(!on)}>
      <span className="dp-save-in">
        <Bookmark className="size-[17px]" strokeWidth={1.8} style={on ? { fill: "currentColor" } : undefined} />
      </span>
    </button>
  );
}

/** Thin progress bar. `pct` 0-100. */
export function Thin({ pct, label }: { pct: number; label: string }) {
  return (
    <span className="dp-thin" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <i style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} />
    </span>
  );
}

export function appProgress(a: Application) {
  const total = APPLICATION_STAGES.length;
  return { pct: Math.round(((a.stage + 1) / total) * 100), stage: a.stage + 1, total, name: APPLICATION_STAGES[a.stage] ?? "In review" };
}

export function Cover({ job }: { job: ApplicantJob }) {
  return <JobCover image={job.image} department={job.department} className="dp-cover-fill" />;
}

/** Facts line shared by all job cards: type and pay, always present. */
export function jobFacts(job: ApplicantJob) {
  return { type: job.employmentType, pay: job.pay ?? "Pay on request" };
}
