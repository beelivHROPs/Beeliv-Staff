import type { LucideIcon } from "@/components/applicant/icons";

/**
 * The one icon tile used across Admin: a solid circle with a white line icon
 * (same style as the Client overview tiles). Brand tone follows the HR role
 * colour through --ap-violet; the others are the shared semantic colours.
 * Solid fills carry white in dark mode too (admin.css keeps them).
 */
export type DiscTone = "brand" | "ok" | "pending" | "info" | "urgent";

const TONE: Record<DiscTone, string> = {
  brand: "bg-(--ap-violet) text-white",
  ok: "bg-[#15803D] text-white",
  pending: "bg-[#C98A00] text-white",
  info: "bg-[#2563EB] text-white",
  urgent: "bg-[#C8102E] text-white",
};

export function Disc({ icon: Icon, tone = "brand", className = "size-10" }: { icon: LucideIcon; tone?: DiscTone; className?: string }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full ${TONE[tone]} ${className}`}>
      <Icon className="size-[19px]" />
    </span>
  );
}
