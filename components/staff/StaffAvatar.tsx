"use client";

import { useId } from "react";
import Image from "next/image";
import { PERSON_SVG, useAvatarState, withUniqueIds } from "@/lib/applicant/avatar";

/**
 * Staff avatar: the person's photo (from the backend, or the one they
 * uploaded on the Applicant side - same account), otherwise the default
 * person icon recoloured into the Staff indigo-violet. One avatar type only.
 */
const STAFF_COLOURS: [string, string][] = [
  ["#5B087B", "#4F3AA8"], // clothing / mid gradient
  ["#250044", "#292052"], // dark clothing / deep gradient
  ["#8A0AA3", "#6954C8"], // initials gradient start
  ["#F3E6FA", "#EEEAFB"], // background light
  ["#DCC3EC", "#D6CEF2"],
  ["#EFE6F7", "#EEEAFB"],
  ["#D5C2E8", "#D6CEF2"],
  ["#E3CFF0", "#DCD4F4"], // default person background (lower)
];

function staffSvg(svg: string): string {
  let out = svg;
  for (const [from, to] of STAFF_COLOURS) out = out.split(from).join(to);
  // Own gradient ids so they never clash with an Applicant avatar on the same page.
  return out.replace(/id="(avg\w*)"/g, 'id="s$1"').replace(/url\(#(avg\w*)\)/g, "url(#s$1)");
}

export function StaffAvatar({ photoUrl, size = 38, className = "" }: { name?: string; photoUrl?: string | null; size?: number; className?: string }) {
  const { photo } = useAvatarState();
  const uid = useId();
  const src = photo ?? photoUrl;
  const ring = "shadow-[0_0_0_2px_#fff,0_0_0_3.5px_rgba(193,172,117,.75),0_4px_10px_rgba(41,32,82,.22)]";

  if (src) {
    return (
      <span aria-hidden="true" className={`inline-flex shrink-0 overflow-hidden rounded-full ${ring} ${className}`} style={{ width: size, height: size }}>
        <Image src={src} alt="" width={size} height={size} unoptimized className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 overflow-hidden rounded-full bg-(--ap-tint) [&>svg]:size-full ${ring} ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: withUniqueIds(staffSvg(PERSON_SVG), uid) }}
    />
  );
}
