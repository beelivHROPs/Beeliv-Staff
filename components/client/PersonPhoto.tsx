"use client";

import Image from "next/image";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ClientAvatar } from "./ClientAvatar";

/**
 * A staff member's or candidate's avatar circle that opens their photo when
 * clicked. Only the picture shows; when there is no photo the same space says
 * "No profile photo". It is a span, not a button, so it can sit inside the row
 * links and clickable table rows around it: the click is kept from triggering
 * them.
 */
export function PersonPhoto({
  name,
  photoUrl,
  size = 38,
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
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
        <ClientAvatar name={name} photoUrl={photoUrl} size={size} />
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-auto max-w-[min(calc(420px*var(--ps-zoom,1)),calc(100vw-2rem))] gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Photo of {name}</DialogTitle>
          <DialogDescription className="sr-only">{photoUrl ? "Profile photo" : "No profile photo"}</DialogDescription>
          {photoUrl ? (
            <Image src={photoUrl} alt={`Photo of ${name}`} width={840} height={840} unoptimized className="block aspect-square w-full object-cover" />
          ) : (
            <div className="ps-nophoto flex aspect-square w-[min(calc(380px*var(--ps-zoom,1)),calc(100vw-2rem))] items-center justify-center bg-[#F8F1F5] p-6 text-center">
              <p className="text-[calc(18px*var(--ps-zoom,1))] font-semibold text-[#686672]">No profile photo</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
