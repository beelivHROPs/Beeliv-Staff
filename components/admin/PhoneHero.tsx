"use client";

/**
 * Phone-only (<768px) opener for Admin lists, the approved mid-ground look
 * (docs/design-references/admin-midground-2026-10-26.html, phone 2):
 *   - ONE gentle hero card (white to rose) with the list's key figure: small caps label, big number,
 *     optional delta / meaning line, optional segmented range control, optional thin chart (children).
 *   - CountCards: three pastel cards (mint, sand, rose), only for lists with natural status counts.
 * The page name lives in the shared top bar, so there is no title here. Every number is passed in from the
 * page's existing counts; nothing new is fetched. Desktop is untouched.
 */
import type { ReactNode } from "react";

export type HeroSegment = { key: string; label: string; value: number; color?: string };
const COLORS = ["#c24a86", "#e0a15a", "#5fa58a", "#9886ea", "#8b2252", "#c9b8f1"];

/** Small segmented control (1W / 1M / 1Y style) for the hero's right corner. */
export function HeroRange<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="ml-auto inline-flex rounded-full bg-(--ap-tint) p-[3px]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)} className={`inline-flex min-h-8 items-center rounded-full px-3 text-[13px] font-bold ${on ? "ad-grad shadow-[0_4px_10px_rgba(139,34,82,.25)]" : "text-(--ap-muted)"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function PhoneHero({ hero, figure, unit, line, segments, side, action, children }: { eyebrow?: string; title?: string; hero: string; figure: number | string; unit?: string; line?: string; segments?: HeroSegment[]; side?: { value: number | string; label: string }; action?: ReactNode; children?: ReactNode }) {
  const shown = (segments ?? []).filter((s) => s.value > 0);
  const total = shown.reduce((a, s) => a + s.value, 0);
  return (
    <section aria-label={hero} className="mb-3 rounded-[26px] bg-linear-to-br from-(--ap-surface) to-(--ap-hero-to,var(--ap-tint)) px-4 pt-4 pb-3 shadow-[0_10px_28px_rgba(139,34,82,.10)] min-[768px]:hidden">
      <div className="flex min-h-8 items-center">
        <p className="m-0 text-[13px] font-bold tracking-[.08em] text-(--ap-violet) uppercase">{hero}</p>
        {action}
      </div>
      <div className="mt-2 flex items-stretch gap-4">
        <div className="min-w-0 flex-1">
          <p className="m-0 flex items-baseline gap-2">
            <b className="text-[44px] leading-none font-extrabold tracking-[-.03em] text-(--ap-ink) tabular-nums">{figure}</b>
            {unit ? <span className="text-[14px] font-semibold text-(--ap-muted)">{unit}</span> : null}
          </p>
          {line ? <p className="mt-1.5 mb-0 text-[14px] text-(--ap-muted)">{line}</p> : null}
        </div>
        {side ? (
          <>
            <div className="w-px bg-(--ap-line)" aria-hidden="true" />
            <div className="flex shrink-0 flex-col justify-center text-[13px] text-(--ap-muted)">
              <b className="text-[28px] leading-none font-bold text-(--ap-ink) tabular-nums">{side.value}</b>
              <span className="mt-1">{side.label}</span>
            </div>
          </>
        ) : null}
      </div>
      {total > 0 ? (
        <div role="img" aria-label={shown.map((s) => `${s.value} ${s.label}`).join(", ")} className="mt-4 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-(--ap-line-2)">
          {shown.map((s, i) => (
            <span key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color ?? COLORS[i % COLORS.length] }} className="h-full first:rounded-l-full last:rounded-r-full" />
          ))}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Three pastel count cards: number over small label. Pass the list's natural status counts only. */
export function CountCards({ items, onPick }: { items: { key: string; label: string; value: number; tone: "mint" | "sand" | "rose" }[]; onPick?: (key: string) => void }) {
  return (
    <div className="mb-3 grid grid-cols-3 gap-2.5 min-[768px]:hidden">
      {items.slice(0, 3).map((c) => {
        const body = (
          <>
            <b className="block text-[26px] leading-none font-extrabold tabular-nums">{c.value}</b>
            <span className="mt-1.5 block text-[13px] font-bold opacity-80">{c.label}</span>
          </>
        );
        const cls = `ad-count ad-count-${c.tone} rounded-[20px] p-3 text-left`;
        return onPick ? (
          <button key={c.key} type="button" onClick={() => onPick(c.key)} className={cls}>
            {body}
          </button>
        ) : (
          <div key={c.key} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
