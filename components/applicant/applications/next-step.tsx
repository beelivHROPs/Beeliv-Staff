/**
 * Plain-language "what happens next" for an application, used on phones by
 * Home and My Applications (UI kit review, 2026-10-19). Presentation only:
 * every line is derived from fields the app already has (lifecycle, next
 * action, scheduled interview, pending documents), never stored.
 */
import type { Application, ApplicantDocument, Interview } from "@/lib/applicant/types";
import type { ChipTone } from "./shared";
import { UnderReviewBadge } from "../UnderReviewBadge";

const WAT = "Africa/Lagos";

/** "Tue 3 Nov, 10:00" in West Africa Time (24-hour, so there is no AM/PM to misread). */
export function interviewWhen(iso: string): string {
  const d = new Date(iso);
  const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-GB", { timeZone: WAT, ...o });
  const weekday = part({ weekday: "short" });
  const day = part({ day: "numeric" });
  const month = part({ month: "short" }).replace("Sept", "Sep");
  const time = part({ hour: "2-digit", minute: "2-digit", hour12: false });
  return `${weekday} ${day} ${month}, ${time}`;
}

/** "Friday 23 October at 10:00" in West Africa Time, in plain words. */
export function interviewSentence(iso: string): string {
  const d = new Date(iso);
  const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-GB", { timeZone: WAT, ...o });
  return `${part({ weekday: "long" })} ${part({ day: "numeric" })} ${part({ month: "long" })} at ${part({ hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

/** The pre-employment documents HR is waiting on for this application. */
function pendingDocs(a: Application, documents: ApplicantDocument[]) {
  return documents.filter((d) => d.forApplicationId === a.id && d.status === "action-required");
}

/** First line of an application card: what the applicant should know or do next. */
export function nextStepLine(a: Application, interviews: Interview[], documents: ApplicantDocument[]): string {
  switch (a.lifecycle) {
    case "draft":
      return "Finish your application";
    case "withdrawn":
      return "You withdrew this application";
    case "not_selected":
      return "Not selected this time";
    case "in_talent_pool":
      return "Kept in the talent pool for similar roles";
    case "completed":
      return "You have been placed";
    default:
      break;
  }
  const docs = pendingDocs(a, documents);
  if (docs.length === 1) {
    const n = docs[0].name;
    return `Upload your ${n.charAt(0).toLowerCase()}${n.slice(1)}`;
  }
  if (docs.length > 1) return `Upload ${docs.length} documents`;
  const iv = interviews.find((v) => v.applicationId === a.id && v.status === "scheduled" && v.scheduledAt);
  if (iv?.scheduledAt) return `Interview on ${interviewWhen(iv.scheduledAt)}`;
  if (a.next) return a.next.label;
  return "Waiting for HR";
}

const DOT: Record<ChipTone, string> = {
  warn: "bg-(--ap-warn)",
  ok: "bg-(--ap-ok)",
  info: "bg-(--ap-violet)",
  violet: "bg-(--ap-violet)",
  mute: "bg-(--ap-faint)",
};

/** Status as a small dot and a word (not a filled pill), per the UI kit review. */
/** "Under review" becomes the hourglass highlight (UnderReviewBadge); `animate` is false for all but one badge per screen. */
export function StatusDot({ tone, children, animate = true, color }: { tone: ChipTone; children: string; animate?: boolean; /** Stage colour (lib/applicant/stage-tone.ts); wins over the tone. */ color?: string }) {
  if (children === "Under review") return <UnderReviewBadge size="sm" animate={animate} />;
  return (
    <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-(--ap-ink-2)">
      <span className={`size-2 shrink-0 rounded-full ${color ? "" : DOT[tone]}`} style={color ? { backgroundColor: color } : undefined} aria-hidden="true" />
      {children}
    </span>
  );
}
