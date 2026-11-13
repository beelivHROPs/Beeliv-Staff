"use client";

/**
 * The applicant's avatar: their uploaded photo, otherwise the default person
 * icon (project lead: one avatar type, no initials / illustrated options).
 * Reactive - every avatar on screen updates together (lib/applicant/avatar.ts).
 */
import { useId } from "react";
import Image from "next/image";
import { PERSON_SVG, useAvatarState, withUniqueIds } from "@/lib/applicant/avatar";

export function Avatar({ size = 38, className }: { size?: number; className?: string }) {
  const { photo } = useAvatarState();
  const uid = useId();
  return (
    <span
      aria-hidden="true"
      className={
        "inline-flex shrink-0 overflow-hidden rounded-full border-2 border-white bg-(--ap-tint) shadow-[0_0_0_1px_var(--ap-line)] [&>svg]:size-full " +
        (className ?? "")
      }
      style={{ width: size, height: size }}
      {...(photo
        ? { children: <Image src={photo} alt="" width={size} height={size} unoptimized className="size-full object-cover" /> }
        : { dangerouslySetInnerHTML: { __html: withUniqueIds(PERSON_SVG, uid) } })}
    />
  );
}
