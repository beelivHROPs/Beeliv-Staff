"use client";

import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { Check, ChefHat, ChevronRight, FileText, ShieldCheck, Sparkles, Video, Wine } from "@/components/applicant/icons";
import { ActionPill, confirmAction } from "../kit";
import { StatusMark } from "@/components/admin/standard";
import { toast } from "@/components/ui/toast";
import { dueLabel } from "@/lib/staff/format";
import { acknowledgeSOP, openSop } from "@/lib/staff/service";
import { SOP_STATUS_LABEL, safeHttpsUrl, sopMeta, sopStatus } from "@/lib/staff/sops/derive";
import type { SopItem, SopKind } from "@/lib/staff/sops/types";
import { BookOpen, Coffee, Globe } from "../icons";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

export const KIND_ICON: Record<SopKind, Icon> = { document: FileText, video: Video, page: Globe };

/** Soft tints that already exist as tokens (light and dark). Chosen by category name so a category keeps its colour. */
const TINTS = [
  "bg-(--ap-tint) text-(--ap-violet)",
  "bg-[color-mix(in_srgb,var(--ap-warn-bg)_55%,transparent)] text-(--ap-warn)",
  "bg-[color-mix(in_srgb,var(--ap-ok-bg)_70%,transparent)] text-(--ap-ok)",
];
export function tintFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return TINTS[h % TINTS.length];
}

/** Row icon tint carries the status: lavender = new, sand = waiting for you, sage = done. */
export const STATUS_TINT: Record<"new" | "sign-off" | "read", string> = { new: TINTS[0], "sign-off": TINTS[1], read: TINTS[2] };

const CATEGORY_ICON: Record<string, Icon> = { Service: Coffee, Kitchen: ChefHat, Safety: ShieldCheck, Hygiene: Sparkles, Bar: Wine };
export const categoryIcon = (name: string): Icon => CATEGORY_ICON[name] ?? BookOpen;

/** Opens the link in the person's own tab and records the read receipt. Never blocks the open if saving fails. */
export function recordOpen(item: SopItem) {
  openSop(item.id).catch(() => toast.add({ title: "We couldn't save that you read this", description: "Open it again when you have a signal.", type: "error" }));
}

/** Sign-off: confirm, then record. Only offered after the SOP has been opened. */
export async function signOff(item: SopItem): Promise<boolean> {
  const ok = await confirmAction({
    tone: "neutral",
    title: `Sign off "${item.title}"?`,
    description: "Your sign-off is recorded against your Beeliv account.",
    acknowledge: "I have read and understood this SOP.",
    confirmLabel: "Sign off",
  });
  if (!ok) return false;
  try {
    await acknowledgeSOP(item.id);
    toast.add({ title: "Signed off", type: "success" });
    return true;
  } catch {
    toast.add({ title: "We couldn't save that", description: "Please try again.", type: "error" });
    return false;
  }
}

/** The progress ring: arc = share read. Colours come from the parent through currentColor / the two props. */
export function ProgressRing({ read, total, size = 72, track = "var(--ap-tint-2)", arc = "var(--ap-violet)", text = "text-(--ap-ink)" }: { read: number; total: number; size?: number; track?: string; arc?: string; text?: string }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const share = total === 0 ? 0 : read / total;
  return (
    <div className={`relative shrink-0 ${text}`} style={{ width: size, height: size }} role="img" aria-label={`${read} of ${total} read`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={arc} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - share)} className="sop-ring-arc" style={{ ["--sop-c" as string]: c }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[17px] font-bold tabular-nums" aria-hidden="true">
        {read}
        <span className="text-[13px] font-semibold opacity-70">/{total}</span>
      </span>
    </div>
  );
}

/**
 * One lesson-style row. The row is a real link (https only, new tab, noopener)
 * so long-press and middle-click work; opening it records the read receipt.
 * Only a SOP that is waiting for its sign-off carries the extra button.
 */
export function SopRow({ item }: { item: SopItem }) {
  const status = sopStatus(item);
  const href = safeHttpsUrl(item.url);
  const Kind = KIND_ICON[item.kind];
  const tone = status === "new" ? "plum" : status === "sign-off" ? "warn" : "ok";
  const due = item.dueDate && status !== "read" ? dueLabel(item.dueDate) : null;
  const body = (
    <>
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${STATUS_TINT[status]}`}>
        <Kind className="size-[22px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[16px] leading-snug font-semibold text-(--ap-ink)">{item.title}</b>
        <span className="mt-0.5 block text-[14px] text-(--ap-muted)">
          {item.category} · {sopMeta(item)}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <StatusMark tone={tone}>{href ? SOP_STATUS_LABEL[status] : "Link unavailable"}</StatusMark>
          {due ? <span className={`text-[14px] tabular-nums ${item.required ? "font-semibold text-(--ap-warn)" : "text-(--ap-muted)"}`}>{due}</span> : null}
        </span>
      </span>
      {href ? <ChevronRight className="size-[18px] shrink-0 text-(--ap-faint)" aria-hidden="true" /> : null}
    </>
  );
  const shell = "flex min-h-[72px] items-center gap-3.5 rounded-[20px] px-3 py-3";
  return (
    <li className="rounded-[20px] border border-(--ap-line) bg-(--ap-surface,#fff) transition-colors has-[a:hover]:border-(--ap-tint-2)">
      {href ? (
        <Link href={`/staff/sops-training/${item.id}`} className={`${shell} focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none`} aria-label={`${item.title}. ${sopMeta(item)}. ${SOP_STATUS_LABEL[status]}. Opens the reader.`}>
          {body}
        </Link>
      ) : (
        <div className={shell}>{body}</div>
      )}
      {status === "sign-off" ? (
        <div className="px-3 pb-3">
          <ActionPill variant="outline" compact arrow={false} icon={Check} className="w-full justify-center" onClick={() => void signOff(item)}>
            I&apos;ve read this, sign off
          </ActionPill>
        </div>
      ) : null}
    </li>
  );
}

export function SectionTitle({ children, count, id }: { children: ReactNode; count?: number; id?: string }) {
  return (
    <h2 id={id} className="mb-3 flex items-baseline gap-2 text-[18px] font-bold text-(--ap-ink)">
      {children}
      {count !== undefined ? <span className="text-[14px] font-semibold text-(--ap-muted) tabular-nums">{count}</span> : null}
    </h2>
  );
}
