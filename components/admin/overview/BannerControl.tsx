"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { MoreMenu, type MoreItem } from "@/components/admin/standard";
import { Plus } from "@/components/applicant/icons";
import { NEW_VACANCY_HREF } from "@/lib/admin/links";
import { clearAdminBanner, setAdminBannerFromFile, useAdminBanner } from "@/lib/admin/banner";

/**
 * Overview hero background + the "Change banner" control. Beeliv uploads its own picture; until then the soft gradient shows.
 * `fallbackUrl` is the picture the adapter supplies (if any); an uploaded one wins.
 */
/** True when a banner photo (uploaded or the default) is showing. */
export function useHasBanner(fallbackUrl: string | null): boolean {
  const stored = useAdminBanner();
  return Boolean(stored ?? fallbackUrl);
}

export function HeroBanner({ fallbackUrl }: { fallbackUrl: string | null }) {
  const stored = useAdminBanner();
  const url = stored ?? fallbackUrl;
  if (!url) return null;
  return (
    <>
      <Image src={url} alt="" fill unoptimized sizes="100vw" className="object-cover" />
      {/* Dark "cloud" over the photo so the greeting and the Today list stay readable on any banner (the text switches to light in Greeting). */}
      <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(100deg,rgba(18,8,24,.86)_0%,rgba(18,8,24,.7)_50%,rgba(18,8,24,.48)_100%)]" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgba(18,8,24,.55),transparent)]" />
    </>
  );
}

/** "Add banner" / "Change banner" / "Remove": sits under the greeting text (not on top of the hero). */
export function BannerButton() {
  const stored = useAdminBanner();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(await setAdminBannerFromFile(file));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      <button type="button" onClick={() => input.current?.click()} className="ap-btn ap-btn-p h-10 rounded-full px-5 text-[14px] text-white!">
        {stored ? "Change banner" : "Add banner"}
      </button>
      {stored ? (
        <button type="button" onClick={clearAdminBanner} className="ap-btn h-10 rounded-full border-(--ap-line)! bg-transparent! px-4 text-[14px] text-(--ap-ink-2)! hover:bg-(--ap-tint-soft)!">
          Remove
        </button>
      ) : null}
      {error ? <p role="alert" className="text-[13px] text-(--ap-muted)">{error}</p> : null}
    </div>
  );
}

/**
 * Home's one quiet "..." menu: New vacancy (when the role may create one) and the banner
 * actions (Add / Change / Remove). Same banner behaviour as BannerButton, moved out of the
 * greeting so the greeting carries a single primary action. Sits above the greeting panel,
 * outside its photo-text colour scope, so the popover stays readable on any banner.
 */
export function HomeMore({ canCreate }: { canCreate: boolean }) {
  const stored = useAdminBanner();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  async function pick(file: File | undefined) {
    if (!file) return;
    setError(await setAdminBannerFromFile(file));
  }
  const items: MoreItem[] = [
    ...(canCreate ? [{ key: "new-vacancy", label: "New vacancy", icon: Plus, href: NEW_VACANCY_HREF }] : []),
    { key: "banner", label: stored ? "Change banner" : "Add banner", onSelect: () => input.current?.click() },
    ...(stored ? [{ key: "banner-remove", label: "Remove banner", onSelect: clearAdminBanner }] : []),
  ];
  return (
    <div className="-my-2 flex items-center gap-3">
      {error ? <p role="alert" className="text-[13px] text-(--ap-muted)">{error}</p> : null}
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      <MoreMenu label="More: new vacancy and banner" sections={[{ items }]} />
    </div>
  );
}
