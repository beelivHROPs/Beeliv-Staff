import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { PhonePill } from "@/components/admin/PhoneDetail";
import { Chip } from "@/components/applicant/primitives";
import { StatusMark } from "@/components/admin/standard";
import { APPLICATION_STAGES } from "@/lib/applicant/types";
import type { ApplicantRow } from "@/lib/admin/applicants/types";

/** Person avatar (initials in lists; clicking opens the photo dialog). Renders through AdminAvatar. */
export function InitialsAvatar({ name, size = 40, photoUrl, viewable = true }: { name: string; size?: number; photoUrl?: string | null; viewable?: boolean }) {
  return <AdminAvatar name={name} photoUrl={photoUrl} size={size} viewable={viewable} />;
}

/** Short chip wording per locked stage (presentation only; the full name is in the title and the rail). */
const STAGE_SHORT = ["Application", "Shortlisting", "Interview", "Documentation", "Verification", "Approval", "Onboarding", "Assignment"] as const;
const STAGE_TONE = ["info", "info", "violet", "warn", "warn", "warn", "ok", "ok"] as const;

/** Current stage chip. Hold, Rejected and Talent Pool are retained statuses shown instead of the stage. */
export function StageChip({ row }: { row: Pick<ApplicantRow, "stage" | "status" | "shortlisted"> }) {
  if (row.status === "hold") return <Chip tone="warn">On hold</Chip>;
  if (row.status === "rejected") return <Chip tone="mute">Rejected</Chip>;
  if (row.status === "talent-pool") return <Chip tone="violet">Talent pool</Chip>;
  const label = row.stage === 1 && row.shortlisted ? "Shortlisted" : STAGE_SHORT[row.stage] ?? STAGE_SHORT[0];
  return (
    <span title={APPLICATION_STAGES[row.stage]}>
      <Chip tone={STAGE_TONE[row.stage] ?? "info"}>{label}</Chip>
    </span>
  );
}

/** Quiet list version of StageChip: a dot and a word, colour only for "On hold". Same wording and statuses as StageChip. */
export function StageMark({ row }: { row: Pick<ApplicantRow, "stage" | "status" | "shortlisted"> }) {
  if (row.status === "hold") return <StatusMark tone="warn">On hold</StatusMark>;
  if (row.status === "rejected") return <StatusMark tone="mute">Rejected</StatusMark>;
  if (row.status === "talent-pool") return <StatusMark tone="plum">Talent pool</StatusMark>;
  const label = row.stage === 1 && row.shortlisted ? "Shortlisted" : STAGE_SHORT[row.stage] ?? STAGE_SHORT[0];
  return (
    <span title={APPLICATION_STAGES[row.stage]}>
      <StatusMark tone={row.stage >= 6 ? "ok" : "plum"}>{label}</StatusMark>
    </span>
  );
}

/** Phone detail pill (spec colours: mint / sand / rose). Same wording and statuses as StageChip. */
export function StagePill({ row }: { row: Pick<ApplicantRow, "stage" | "status" | "shortlisted"> }) {
  if (row.status === "hold") return <PhonePill tone="wt">On hold</PhonePill>;
  if (row.status === "rejected") return <PhonePill tone="bad">Rejected</PhonePill>;
  if (row.status === "talent-pool") return <PhonePill tone="wt">Talent pool</PhonePill>;
  const label = row.stage === 1 && row.shortlisted ? "Shortlisted" : STAGE_SHORT[row.stage] ?? STAGE_SHORT[0];
  return <PhonePill tone={row.stage >= 6 ? "ok" : "wt"}>{label}</PhonePill>;
}
