import type { ReactNode } from "react";
import { GlassIcon, glassForIcon, type GlassName } from "@/components/shared/icons";
import { IconDisc, type PremiumIcon } from "./IconDisc";
import { LIFT, TONE, type Tone } from "./tones";

/** Designed empty or error state: icon disc, one plain line, optional one action. */
export function StateCard({ icon, title, text, action, tone = "lavender", error = false, className = "", glass }: { icon: PremiumIcon; title: string; text?: string; action?: ReactNode; tone?: Exclude<Tone, "plain">; error?: boolean; className?: string; /** Opt-in glass hero icon for large empty states (not errors). */ glass?: GlassName }) {
  return (
    <div role={error ? "alert" : "status"} className={`flex flex-col items-center gap-3 rounded-[22px] px-6 py-9 text-center ${TONE[tone]} ${LIFT} ${className}`}>
      {!error && (glass ?? glassForIcon(icon, title)) ? <GlassIcon name={(glass ?? glassForIcon(icon, title))!} size={96} /> : <IconDisc icon={icon} size={56} />}
      <p className="text-[18px] leading-snug font-bold text-(--ap-ink,#11111b)">{title}</p>
      {text ? <p className="max-w-[300px] text-[15px] leading-snug text-(--ap-ink-2,#3a3845)">{text}</p> : null}
      {action ? <div className="mt-1 w-full max-w-[280px]">{action}</div> : null}
    </div>
  );
}

/** Skeleton block (the app-wide shimmer, 22px radius). Give it a height, e.g. className="h-28". */
export function Sk({ className = "" }: { className?: string }) {
  return <div className={`ap-shimmer rounded-[22px] ${className}`} aria-hidden="true" />;
}
