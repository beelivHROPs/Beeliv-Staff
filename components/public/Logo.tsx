import Image from "next/image";
import { LOGOS, type LogoKey } from "@/lib/public-site/assets";
import { cn } from "@/lib/utils";
import { T } from "./primitives";

/**
 * Beeliv logo slot. The wireframe sizes are kept (className), and the real
 * artwork is swapped in via lib/public-site/assets.ts (LOGOS). Until then the
 * slot shows the wireframe's outlined placeholder tile.
 *
 * `tone` sets the placeholder's colours to suit the surface it sits on.
 *
 * `unoptimized`: Next's image optimizer (sharp/libvips) corrupts this PNG's
 * alpha channel when transcoding it to WebP for real browsers - transparent
 * areas come back solid black. Bypassing the optimizer serves the real,
 * already-clean static PNG directly. Confirmed via /_next/image returning a
 * broken WebP only when an Accept: image/webp header is sent, while the
 * static /images/... path is always correct.
 */
export function Logo({
  kind,
  className,
  tone = "brand",
  eager = false,
}: {
  kind: LogoKey;
  className?: string;
  tone?: "brand" | "light";
  /** Header logos are above the fold (often the largest paint): load them eagerly. */
  eager?: boolean;
}) {
  // Widened from the `as const` literal type: now that every LOGOS entry has
  // a real `src`, TS narrows the placeholder branch below to `never` without
  // this - kept general so a future logo variant can still go back to null.
  const cfg: { src: string | null; alt: string; label: string } = LOGOS[kind];
  if (cfg.src) {
    return (
      <span className={cn("relative block shrink-0", className)}>
        <Image
          src={cfg.src}
          alt={cfg.alt}
          fill
          unoptimized
          sizes="200px"
          loading={eager ? "eager" : undefined}
          className="object-contain object-left"
        />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={cfg.alt}
      className={cn(
        "ps-logo",
        tone === "light" &&
          "!border-white/50 !bg-transparent !text-white",
        className,
      )}
    >
      <T>{cfg.label}</T>
    </span>
  );
}
