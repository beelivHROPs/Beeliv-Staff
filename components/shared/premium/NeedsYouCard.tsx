import type { ReactNode } from "react";
import { IconDisc, type PremiumIcon } from "./IconDisc";
import { LIFT, TONE, type Tone } from "./tones";

/**
 * "This needs you": tinted card with an icon disc, a plain line, and exactly ONE action
 * (pass the shared button as `action`). Default tone is sand (you owe something).
 * Use `rose` only for urgent. Do not stack more than two on one screen.
 */
export function NeedsYouCard({ icon, title, text, action, tone = "sand", className = "" }: { icon: PremiumIcon; title: string; text?: string; action?: ReactNode; tone?: Exclude<Tone, "plain">; className?: string }) {
  return (
    <section aria-label={title} className={`flex flex-col gap-3 rounded-[22px] p-4 ${TONE[tone]} ${LIFT} ${className}`}>
      <div className="flex items-start gap-3">
        <IconDisc icon={icon} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-snug font-bold text-(--ap-ink,#11111b)">{title}</p>
          {text ? <p className="mt-0.5 text-[14px] leading-snug text-(--ap-ink-2,#3a3845)">{text}</p> : null}
        </div>
      </div>
      {action ? <div>{action}</div> : null}
    </section>
  );
}
