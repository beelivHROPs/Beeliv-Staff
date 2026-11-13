"use client";

/** Small shared pieces for the Announcements screens. Section / Facts / Restricted are reused from the Vacancies screens. */
import { StatusChip } from "@/components/client/StatusChip";
import { PhonePill, pillTone } from "@/components/admin/PhoneDetail";
import type { AnnouncementStatus, ReceiptStatus } from "@/lib/admin/announcements/types";
import { RECEIPT_LABEL, RECEIPT_TONE, STATUS_LABEL, STATUS_TONE } from "./meta";

export { Facts, Restricted, Section } from "@/components/admin/vacancies/parts";
export { ActivityTimeline } from "@/components/admin/sops-training/parts";

export function AnnouncementStatusChip({ status }: { status: AnnouncementStatus }) {
  return <StatusChip tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusChip>;
}

export function ReceiptChip({ status }: { status: ReceiptStatus }) {
  return <StatusChip tone={RECEIPT_TONE[status]}>{RECEIPT_LABEL[status]}</StatusChip>;
}

/** Phone detail pill (spec colours). */
export function AnnouncementStatusPill({ status }: { status: AnnouncementStatus }) {
  return <PhonePill tone={pillTone(STATUS_TONE[status])}>{STATUS_LABEL[status]}</PhonePill>;
}
