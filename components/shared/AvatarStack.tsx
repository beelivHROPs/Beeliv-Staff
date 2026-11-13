import Image from "next/image";

// Unsplash photo IDs — found via a search for Black professional
// portraits/headshots (project-lead request, 2026-09-04). IMPORTANT: these
// were selected from AI-generated text descriptions of search results, not
// visually confirmed by Claude — there's no image-viewing step in that
// pipeline. Check the live result and swap out anything that doesn't fit.
// `?w=150&h=150&fit=crop&crop=faces` requests a small pre-cropped square
// centered on the face, per Unsplash's own image-parameter API.
const AVATAR_PHOTO_IDS = [
  "1614023342667-6f060e9d1e04",
  "1642257859842-c95f9fa8121d",
  "1636144896336-b056be4a8dfe",
  "1645736593932-2c877741fd6c",
  "1609436132311-e4b0c9370469",
];

/**
 * Decorative avatar stack — public hero only.
 *
 * STATUS CHANGE (2026-09-04): this was illustrated-only (gradient silhouette
 * busts, no photos) per an explicit project-lead decision made twice —
 * "not a trust/social-proof claim... no real, sourced user count or real
 * photos to back one." Overridden this session, also explicitly, in favor
 * of real stock photos (Unsplash License — free for commercial use). These
 * are real, consenting stock-photo subjects, but they are NOT Beeliv staff
 * or applicants — flag this plainly to anyone reviewing before it goes in
 * front of Beeliv or any real client; swap for real, consented photography
 * (or revert to the illustrated version) before then. Still no count text,
 * no "trusted by X" line, no star rating — that part of the original
 * rationale (no fabricated trust CLAIM) stands regardless of which avatar
 * treatment is used.
 */
export function AvatarStack() {
  return (
    <div aria-hidden="true" className="flex items-center">
      {AVATAR_PHOTO_IDS.map((id, i) => (
        <div
          key={id}
          className={`overflow-hidden rounded-full ring-4 ring-background ${i === 0 ? "" : "-ml-2.5"}`}
        >
          <Image
            src={`https://images.unsplash.com/photo-${id}?w=150&h=150&fit=crop&crop=faces&auto=format&q=60`}
            alt=""
            width={32}
            height={32}
            unoptimized
            className="size-8 object-cover"
          />
        </div>
      ))}
    </div>
  );
}
