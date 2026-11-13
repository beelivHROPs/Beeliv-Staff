import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "@/components/applicant/icons";

/**
 * Small building blocks for the calm Applicant skin (see "AX" in app/applicant/applicant.css).
 * Everything here is plain markup + the `ax-*` classes: hairline containers, rows, small labels.
 * Nothing nests a card in a card, nothing carries a shadow or a coloured icon circle.
 */

/** Small uppercase label above a group, with an optional quiet "See all" link on the right. */
export function AxLabel({ children, href, linkLabel = "See all", className = "" }: { children: ReactNode; href?: string; linkLabel?: string; className?: string }) {
  return (
    <div className={`mb-2 flex items-baseline justify-between gap-3 ${className}`}>
      <h2 className="ax-label m-0">{children}</h2>
      {href ? (
        <Link href={href} className="ax-link">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

/** One hairline container; children are rows separated by hairlines. */
export function AxGroup({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`ax-group ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** A tappable row (>= 60px): leading slot, title + one sub line, trailing slot (default chevron). */
export function AxRow({
  href,
  leading,
  title,
  sub,
  trailing,
  chevron = true,
}: {
  href?: string;
  leading?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
}) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug font-semibold text-(--ap-ink)">{title}</span>
        {sub ? <span className="mt-0.5 block text-[13.5px] leading-snug text-(--ap-muted)">{sub}</span> : null}
      </span>
      {trailing}
      {href && chevron ? <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" /> : null}
    </>
  );
  return href ? (
    <Link href={href} className="ax-row">
      {body}
    </Link>
  ) : (
    <div className="ax-row">{body}</div>
  );
}

/** Company initials in a quiet square (no colour circle). */
export function AxInitials({ name, size = 44 }: { name: string; size?: number }) {
  const words = name.replace(/^the\s+/i, "").split(/\s+/).filter(Boolean);
  const text = ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
  return (
    <span aria-hidden="true" className="ax-thumb" style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}>
      {text}
    </span>
  );
}

/** Plain two-column facts list in one hairline container (label left, value right). */
export function AxFacts({ rows, className = "", bare = false }: { rows: [string, ReactNode][]; className?: string; /** No box of its own: use inside a container that already has one. */ bare?: boolean }) {
  return (
    <dl className={`${bare ? "m-0 border-t border-(--ap-line-2)" : "ax-group m-0"} ${className}`}>
      {rows.map(([k, v]) => (
        <div key={k} className={`flex items-baseline justify-between gap-4 py-3 text-[14px] ${bare ? "" : "px-3.5"}`}>
          <dt className="shrink-0 text-(--ap-muted)">{k}</dt>
          <dd className="m-0 text-right font-semibold wrap-anywhere text-(--ap-ink)">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
