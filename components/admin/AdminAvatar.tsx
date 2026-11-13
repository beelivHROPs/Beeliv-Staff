"use client";

import Image from "next/image";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ADMIN_ROLE_CLASS } from "./nav";

/** Same name, same colour, everywhere. Six palette slots; the phone CSS in app/admin/admin.css paints them (desktop keeps the soft tint). */
export const AVATAR_SLOTS = 6;
export function avatarSlot(name: string): number {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % AVATAR_SLOTS;
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

/** Allowed type scale only (11-17px). */
const fontFor = (size: number) => (size <= 32 ? 12 : size <= 44 ? 13 : size <= 56 ? 15 : 17);

/**
 * Admin avatar: a photo when the backend supplies one, otherwise initials on a
 * soft tile. With `viewable`, clicking it opens the person's photo in a dialog
 * (or "No profile photo"), same behaviour as the Client app's PersonPhoto. It
 * is a span, not a button, so it can sit inside row links and clickable rows:
 * the click is kept from reaching them. The signed-in user's own avatar in the
 * top bar / sidebar stays non-viewable.
 */
export function AdminAvatar({ name, photoUrl, size = 38, className = "", viewable = false }: { name: string; photoUrl?: string | null; size?: number; className?: string; viewable?: boolean }) {
  const [open, setOpen] = useState(false);
  const face = photoUrl ? (
    <span aria-hidden="true" className={`inline-flex shrink-0 overflow-hidden rounded-full ${viewable ? "" : className}`} style={{ width: size, height: size }}>
      <Image src={photoUrl} alt="" width={size} height={size} unoptimized className="size-full object-cover" />
    </span>
  ) : (
    <span
      aria-hidden="true"
      data-av={avatarSlot(name)}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-(--ap-tint-2) font-bold text-(--ap-plum) ${viewable ? "" : className}`}
      style={{ width: size, height: size, fontSize: fontFor(size) }}
    >
      {initials(name)}
    </span>
  );
  if (!viewable) return face;

  const stop = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label={`View photo of ${name}`}
        onClick={(e) => {
          stop(e);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            stop(e);
            setOpen(true);
          }
        }}
        className={`relative inline-flex shrink-0 cursor-zoom-in rounded-full max-[767px]:before:absolute max-[767px]:before:-inset-1 max-[767px]:before:content-[''] transition-transform hover:scale-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet) ${className}`}
      >
        {face}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`applicant-shell admin-theme ${ADMIN_ROLE_CLASS} w-auto max-w-[min(420px,calc(100vw-2rem))] gap-0 overflow-hidden border-(--ap-line) bg-(--ap-surface) p-0 text-(--ap-ink)`}>
          <DialogTitle className="sr-only">Photo of {name}</DialogTitle>
          <DialogDescription className="sr-only">{photoUrl ? "Profile photo" : "No profile photo"}</DialogDescription>
          {photoUrl ? (
            <Image src={photoUrl} alt={`Photo of ${name}`} width={840} height={840} unoptimized className="block aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square w-[min(380px,calc(100vw-2rem))] items-center justify-center bg-(--ap-tint-soft) p-6 text-center">
              <p className="text-[17px] font-semibold text-(--ap-muted)">No profile photo</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
