import Image from "next/image";
import { initials } from "@/lib/client/format";

/**
 * Client-app avatar: a photo when the backend supplies one, otherwise the
 * person's initials on a soft plum tile. Decorative (the name is always
 * written next to it).
 */
export function ClientAvatar({ name, photoUrl, size = 38, className = "" }: { name: string; photoUrl?: string | null; size?: number; className?: string }) {
  if (photoUrl) {
    return (
      <span aria-hidden="true" className={`inline-flex shrink-0 overflow-hidden rounded-full ${className}`} style={{ width: size, height: size }}>
        <Image src={photoUrl} alt="" width={size} height={size} unoptimized className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-(--ap-tint-2) font-bold text-(--ap-violet) ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }}
    >
      {initials(name)}
    </span>
  );
}
