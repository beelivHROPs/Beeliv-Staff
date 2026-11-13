import type { ComponentType, SVGProps } from "react";

export type PremiumIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

/** Round white icon holder that sits on any tint. Decorative: pair it with text. */
export function IconDisc({ icon: I, size = 44, className = "" }: { icon: PremiumIcon; size?: number; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-(--ap-surface,#fff) text-(--ap-violet,#5b087b) shadow-[0_2px_6px_rgba(41,32,82,.12)] ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <I className="size-[46%]" aria-hidden="true" />
    </span>
  );
}
