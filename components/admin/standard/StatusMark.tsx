/**
 * Status as a small dot plus a word, not a filled coloured pill. Colour is
 * reserved for what needs attention (warn, bad); everything else stays quiet.
 * Tones are the same names the Client StatusChip uses, so a chip can be swapped
 * for a mark without re-mapping statuses.
 */
import type { ReactNode } from "react";
import type { ChipTone } from "@/components/client/StatusChip";

const DOT: Record<ChipTone, string> = {
  ok: "bg-(--ap-ok)",
  warn: "bg-(--ap-warn)",
  bad: "bg-(--ap-rose)",
  info: "bg-(--ap-info)",
  plum: "bg-(--ap-violet)",
  mute: "bg-(--ap-faint)",
};
const WORD: Record<ChipTone, string> = {
  ok: "text-(--ap-ink-2)",
  warn: "text-(--ap-warn)",
  bad: "text-(--ap-rose)",
  info: "text-(--ap-ink-2)",
  plum: "text-(--ap-ink-2)",
  mute: "text-(--ap-muted)",
};

export function StatusMark({ tone, children, className = "" }: { tone: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span data-tone={tone} className={`ad-mark inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap ${WORD[tone]} ${className}`}>
      <span aria-hidden="true" className={`ad-mark-dot size-2 shrink-0 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}
