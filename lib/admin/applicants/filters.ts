/**
 * Presentation helpers for the Applicants list: tab labels and the URL
 * contract (?stage= ?vacancy= ?client= ?recruiter= ?q= ?page=).
 *
 * Which stages each tab covers is NOT in the spec. The mock adapter applies a
 * provisional mapping (see mock.ts) and it needs Beeliv confirmation.
 */
import { APPLICATION_STAGES } from "@/lib/applicant/types";
import type { StageTab } from "./types";

export const STAGE_TABS: { key: StageTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "documentation", label: "Documentation" },
  { key: "approval", label: "Approval" },
  { key: "talent-pool", label: "Talent Pool" },
];

const TAB_KEYS = new Set<string>(STAGE_TABS.map((t) => t.key));

/** Stage dropdown: the 8 locked stages by index, plus the two retained statuses. */
export const STAGE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All stages" },
  ...APPLICATION_STAGES.map((label, i) => ({ value: String(i), label })),
  { value: "hold", label: "On hold" },
  { value: "rejected", label: "Rejected" },
];

/**
 * ?stage= accepts the tab keys above plus the stage slugs the HR Overview
 * links with (lib/admin/links.ts). Slugs with a matching tab select the tab;
 * the rest select that exact stage in the dropdown.
 */
const SLUG_TO_TAB: Record<string, StageTab> = {
  application: "new",
  "review-shortlisting": "shortlisted",
  "interview-assessment": "interview",
  "selection-approval": "approval",
};
const SLUG_TO_STAGE: Record<string, string> = { verification: "4", "staff-onboarding": "6", assignment: "7", "approved-placed": "placed" };

export function resolveStageParam(raw: string): { tab: StageTab; stage: string } {
  if (TAB_KEYS.has(raw)) return { tab: raw as StageTab, stage: "" };
  if (SLUG_TO_TAB[raw]) return { tab: SLUG_TO_TAB[raw], stage: "" };
  if (SLUG_TO_STAGE[raw]) return { tab: "all", stage: SLUG_TO_STAGE[raw] };
  return { tab: "all", stage: "" };
}

export const PAGE_SIZE = 10;

export const stageLabel = (i: number) => APPLICATION_STAGES[i] ?? APPLICATION_STAGES[0];
