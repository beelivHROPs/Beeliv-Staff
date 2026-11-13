/**
 * Presentation meta for the shared notification set: which TINT and ICON a catalogue event gets,
 * and the default action label. Tints carry meaning (project lead, 2026-10-19):
 *   sand      you owe something (upload, accept, respond)
 *   sage      good news (verified, approved, placed)
 *   lavender  waiting or general information
 *   rose      only for urgent problems (interview changed or cancelled, security)
 * Colours come from the per-app `--ap-*` tokens, so each app (and its dark mode) gets its own palette.
 */
import {
  Award,
  Bell,
  BriefcaseBusiness,
  Calendar,
  CalendarCheck,
  CircleAlert,
  Clock3,
  FileCheck2,
  FilePenLine,
  FileText,
  Mail,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  Users,
  Video,
  type LucideIcon,
} from "@/components/applicant/icons";
import type { GlyphName, GlyphWeight, TileTint } from "@/components/shared/icons";
import type { EventCode } from "@/lib/notifications/catalog";
import type { SharedNotification } from "@/lib/notifications/types";
import { BookOpen, ClipboardList, Megaphone } from "./icons";

export type NotifTone = "lavender" | "sand" | "sage" | "rose" | "plain";

/**
 * Tint + ink per tone. Dark mode follows because every colour is a token.
 * Project lead (2026-10-24): NO yellow or sand in notifications. Ordinary items sit on the app's own page
 * colour with a hairline ("plain"), information is lavender, and green carries what matters (action needed, offers, verified).
 * "sand" stays in the type for older callers but now renders as that green.
 */
const GREEN = "bg-[color-mix(in_srgb,var(--ap-ok-bg)_80%,transparent)] text-(--ap-ok)";
export const NOTIF_TONE: Record<NotifTone, string> = {
  lavender: "bg-[color-mix(in_srgb,var(--ap-lilac)_85%,var(--ap-tint-soft))] text-(--ap-violet)",
  sand: GREEN,
  sage: GREEN,
  rose: "bg-[color-mix(in_srgb,var(--ap-rose-bg)_75%,transparent)] text-(--ap-rose)",
  plain: "border border-(--ap-line) bg-(--ap-bg,var(--ap-surface,#fff)) text-(--ap-violet)",
};

/** Kinds whose severity would mislead the tint (nothing is owed). */
const TONE_OVERRIDE: Partial<Record<EventCode, NotifTone>> = {
  "shift.updated": "lavender",
  "assignment.changed": "sage",
  "interview.today": "lavender",
  "interview.reminder_interviewer": "lavender",
};

export function toneFor(n: Pick<SharedNotification, "kind" | "severity">): NotifTone {
  const o = TONE_OVERRIDE[n.kind];
  if (o) return o;
  if (n.severity === "urgent") return "rose";
  // Green is reserved for what matters (action needed); confirmations such as "verified" or "scheduled" stay on the plain surface.
  if (n.severity === "attention") return "sage";
  if (n.severity === "success") return "plain";
  return "plain";
}

const ICON: Partial<Record<EventCode, LucideIcon>> = {
  "security.notice": ShieldCheck,
  "account.invitation": Mail,
  "agreement.reacceptance": FilePenLine,
  "application.received": FileCheck2,
  "application.status_changed": Sparkles,
  "application.not_selected": FileText,
  "interview.scheduled": Calendar,
  "interview.changed": CalendarCheck,
  "interview.cancelled": CircleAlert,
  "interview.reminder": Clock3,
  "interview.reminder_interviewer": Clock3,
  "interview.today": Calendar,
  "document.requested": Upload,
  "document.verified": ShieldCheck,
  "document.reminder": CircleAlert,
  "document.resubmitted": FileCheck2,
  "offer.sent": Award,
  "placement.confirmed": BriefcaseBusiness,
  "resumption.date": CalendarCheck,
  "client.approval": ShieldCheck,
  "talent_pool.notice": Users,
  "shift.updated": Calendar,
  "assignment.changed": BriefcaseBusiness,
  "leave.updated": Sun,
  "leave.request": Sun,
  "sop.assigned": BookOpen,
  "training.assigned": Video,
  "announcement.published": Megaphone,
  "client.request": ClipboardList,
  "client.request_updated": ClipboardList,
  "client.candidates_ready": Users,
  "client.recruitment_progress": Users,
  "client.compliance": ShieldCheck,
  "client.compliance_expiring": ShieldCheck,
  "client.attendance_alert": Clock3,
  "approval.waiting": ClipboardList,
};

export const iconFor = (kind: EventCode): LucideIcon => ICON[kind] ?? Bell;

/** Icon direction B (Applicant and Staff only, opt-in via `tiles`): the bold glyph for a notification tile. */
const GLYPH: Partial<Record<EventCode, { glyph: GlyphName; weight?: GlyphWeight }>> = {
  "security.notice": { glyph: "shield" },
  "document.verified": { glyph: "shield" },
  "client.approval": { glyph: "shield" },
  "client.compliance": { glyph: "shield" },
  "client.compliance_expiring": { glyph: "shield" },
  "account.invitation": { glyph: "alert-bell", weight: "bold" },
  "agreement.reacceptance": { glyph: "upload" },
  "application.received": { glyph: "briefcase" },
  "application.status_changed": { glyph: "briefcase" },
  "application.not_selected": { glyph: "briefcase" },
  "interview.scheduled": { glyph: "calendar" },
  "interview.changed": { glyph: "calendar" },
  "interview.today": { glyph: "calendar" },
  "interview.cancelled": { glyph: "alert-bell", weight: "bold" },
  "interview.reminder": { glyph: "clock" },
  "interview.reminder_interviewer": { glyph: "clock" },
  "document.requested": { glyph: "upload" },
  "document.reminder": { glyph: "upload" },
  "document.resubmitted": { glyph: "upload" },
  "offer.sent": { glyph: "medal", weight: "duotone" },
  "placement.confirmed": { glyph: "briefcase" },
  "resumption.date": { glyph: "calendar" },
  "assignment.changed": { glyph: "briefcase" },
  "shift.updated": { glyph: "calendar" },
  "leave.updated": { glyph: "calendar" },
  "leave.request": { glyph: "calendar" },
  "sop.assigned": { glyph: "clipboard" },
  "training.assigned": { glyph: "medal", weight: "duotone" },
  "client.request": { glyph: "clipboard" },
  "client.request_updated": { glyph: "clipboard" },
  "approval.waiting": { glyph: "clipboard" },
  "client.attendance_alert": { glyph: "clock" },
  "announcement.published": { glyph: "alert-bell", weight: "bold" },
};

export function glyphFor(kind: EventCode): { glyph: GlyphName; weight: GlyphWeight } {
  const g = GLYPH[kind];
  return { glyph: g?.glyph ?? "alert-bell", weight: g?.weight ?? (g ? "fill" : "bold") };
}

/** Tile tint in the card's tone family: green cards get a sage tile, everything else lavender. No gold, no yellow. */
export const tileTintFor = (tone: NotifTone): TileTint => (tone === "sage" || tone === "sand" ? "sage" : "lavender");

/** Default action text when the app does not supply its own. */
const LABEL: Partial<Record<EventCode, string>> = {
  "document.requested": "Upload document",
  "document.reminder": "Upload document",
  "document.resubmitted": "Review document",
  "interview.scheduled": "View interview",
  "interview.changed": "View interview",
  "interview.cancelled": "View interview",
  "interview.reminder": "View interview",
  "interview.today": "View interview",
  "interview.reminder_interviewer": "View interview",
  "interview.cant_attend": "View interview",
  "offer.sent": "View offer",
  "agreement.reacceptance": "Review agreement",
  "shift.updated": "View schedule",
  "sop.assigned": "View SOP",
  "training.assigned": "View training",
  "leave.updated": "View leave",
  "leave.request": "Review request",
  "client.request": "Review request",
  "client.request_updated": "View request",
  "client.candidates_ready": "Review candidates",
  "client.recruitment_progress": "View progress",
  "client.compliance": "View documents",
  "client.compliance_expiring": "View documents",
  "client.attendance_alert": "View attendance",
  "application.new": "View application",
  "application.status_changed": "View application",
  "approval.waiting": "Review approval",
  "inbox.assigned": "Open item",
};

export const defaultActionLabel = (kind: EventCode): string => LABEL[kind] ?? "View";

/** "40 min ago", "5 hrs ago", "Yesterday", "3 days ago", then "24 Sep". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  const min = Math.max(0, Math.round((now - t) / 60_000));
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "hr" : "hrs"} ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export const isToday = (iso: string): boolean => startOfDay(new Date(iso)) === startOfDay(new Date());
