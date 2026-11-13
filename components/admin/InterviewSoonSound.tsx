"use client";

import { useEffect, useRef } from "react";
import { useInterviews } from "@/lib/admin/interviews/hooks";
import type { InterviewRow, InterviewsQuery } from "@/lib/admin/interviews/types";
import { playAdminSound } from "@/lib/admin/sound";

/**
 * Sound-only helper mounted once inside AdminShell (renders nothing). Once a minute it looks at the upcoming
 * interviews (through the interviews adapter) and plays the "interviewSoon" sound the first time one is due to
 * start within the next 10 minutes. Once per interview id per session. Interviews already in the past are
 * ignored, and nothing plays on first paint (the first check is one minute after mount). The Interviews pages
 * already show the time and "upcoming" status, so the sound is never the only signal.
 */
const QUERY: InterviewsQuery = { search: "", tab: "upcoming", stageId: "", vacancyId: "", interviewerId: "", range: null, sort: "soonest", page: 1, pageSize: 100 };
const WINDOW_MS = 10 * 60 * 1000;
const heard = new Set<string>(); // module level: once per interview id per session

export function InterviewSoonSound() {
  const live = useInterviews(QUERY);
  const rows = useRef<InterviewRow[]>([]);
  useEffect(() => {
    rows.current = live.data?.rows ?? [];
  }, [live.data]);
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      let fire = false;
      for (const r of rows.current) {
        if (r.status !== "scheduled" || !r.at || heard.has(r.id)) continue;
        const left = Date.parse(r.at) - now;
        if (left > 0 && left <= WINDOW_MS) {
          heard.add(r.id);
          fire = true;
        }
      }
      if (fire) playAdminSound("interviewSoon");
    };
    const t = window.setInterval(check, 60_000);
    return () => window.clearInterval(t);
  }, []);
  return null;
}
