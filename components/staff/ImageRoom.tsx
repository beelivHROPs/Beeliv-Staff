import Image from "next/image";
import type { LucideIcon } from "@/components/applicant/icons";
import { Store } from "./icons";

/**
 * A ROOM for real photography: shows `src` when the backend/CMS supplies one,
 * otherwise the branded Staff placeholder (indigo tint, dot pattern, glyph) -
 * the same pattern the Applicant app uses for job/department art.
 */
export function ImageRoom({
  src,
  alt = "",
  icon: Icon = Store,
  className = "",
  iconClassName = "size-9",
}: {
  src: string | null;
  alt?: string;
  icon?: LucideIcon;
  className?: string;
  iconClassName?: string;
}) {
  if (src) {
    return (
      <span className={`relative block overflow-hidden bg-(--ap-line-2) ${className}`}>
        <Image src={src} alt={alt} fill sizes="240px" className="object-cover" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`staff-room relative flex items-center justify-center overflow-hidden text-(--ap-violet) ${className}`}
      style={{ background: "radial-gradient(rgba(79,58,168,.14) 1px, transparent 1.2px) 0 0 / 9px 9px, linear-gradient(135deg, #f6f3ff, #e2dcf5)" }}
    >
      <span className="absolute -top-[12%] -right-[12%] size-1/2 rounded-full bg-white/40" />
      <Icon className={`relative ${iconClassName}`} strokeWidth={1.4} />
    </span>
  );
}
