/**
 * Applicant notifications: per-kind glyph + tile tone (docs/BEELIV-RECRUITMENT-SPEC.md §7), shared by
 * the Notifications page and the Overview notification card. Notifications
 * without a `kind` (older saved data) fall back to their coarse `icon`.
 */
import {
  Award,
  BriefcaseBusiness,
  Calendar,
  CalendarCheck,
  CircleAlert,
  Clock3,
  FileCheck2,
  FilePenLine,
  FileText,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "@/components/applicant/icons";
import type { AppNotification, NotificationIcon, NotificationKind } from "@/lib/applicant/types";
import type { TileTone } from "./SectionCard";

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  "application-received": FileCheck2,
  shortlisted: Sparkles,
  "interview-invitation": Calendar,
  "interview-reminder": Clock3,
  "document-request": FilePenLine,
  "documentation-reminder": CircleAlert,
  "documents-verified": ShieldCheck,
  "client-approval": ShieldCheck,
  offer: Award,
  placement: BriefcaseBusiness,
  "resumption-date": CalendarCheck,
  // Gentle: a plain document glyph, never an alert/cross.
  "not-selected": FileText,
  "talent-pool": Users,
};

/** Coarse-glyph fallback (the wireframe's original LU map). */
const ICON: Record<NotificationIcon, LucideIcon> = {
  sign: FilePenLine,
  shieldok: ShieldCheck,
  cal: Calendar,
  file: FileText,
  calcheck: CalendarCheck,
  spark: Sparkles,
};

/** Wireframe tile tones: requests amber, confirmations green, interviews rose, updates violet. */
const ICON_TILE: Record<NotificationIcon, TileTone> = {
  sign: "a",
  shieldok: "ok",
  cal: "r",
  file: "v",
  calcheck: "ok",
  spark: "v",
};

/** Per-kind tile, following the same scheme. "Not selected" stays neutral violet, never red. */
const KIND_TILE: Record<NotificationKind, TileTone> = {
  "application-received": "v",
  shortlisted: "ok",
  "interview-invitation": "r",
  "interview-reminder": "r",
  "document-request": "a",
  "documentation-reminder": "a",
  "documents-verified": "ok",
  "client-approval": "ok",
  offer: "ok",
  placement: "ok",
  "resumption-date": "ok",
  "not-selected": "v",
  "talent-pool": "v",
};

export function notificationIcon(n: Pick<AppNotification, "kind" | "icon">): LucideIcon {
  return n.kind ? KIND_ICON[n.kind] : ICON[n.icon];
}

export function notificationTile(n: Pick<AppNotification, "kind" | "icon">): TileTone {
  return n.kind ? KIND_TILE[n.kind] : ICON_TILE[n.icon];
}
