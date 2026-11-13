/**
 * ONE place for stage colour (project lead decision, 2026-10-26). The step ring, the 8-segment stage bar and the status
 * dot all read it, so they always agree. Two colours only:
 *   the lowest stages (up to the middle)   PURPLE
 *   from the middle up to the highest      GREEN, and green on completion
 *   not selected / withdrawn               GREY (closed: not a stage)
 */
import type { Application } from "./types";

export type StageTone = "purple" | "green" | "grey";

export const STAGE_COLOR: Record<StageTone, string> = {
  purple: "var(--ap-violet, #5b087b)",
  green: "var(--ap-ok, #15803d)",
  grey: "var(--ap-muted, #8a8394)",
};

export function stageTone(a: Pick<Application, "lifecycle" | "stage">): StageTone {
  if (a.lifecycle === "not_selected" || a.lifecycle === "withdrawn") return "grey";
  if (a.lifecycle === "completed") return "green";
  // Two colours only (project lead, 2026-10-26): purple for the first half of the journey, green from the middle up.
  if (a.stage <= 3) return "purple";
  return "green";
}

export const stageColor = (a: Pick<Application, "lifecycle" | "stage">): string => STAGE_COLOR[stageTone(a)];
