"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";

const OPTION_BUTTON_CLASS =
  "w-full rounded-full border border-primary py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5";

/**
 * Profile-photo picker — client-side preview only. No Supabase Storage (or
 * any backend) is wired in yet in this Stage 1 slice, so a selected photo
 * previews via a local object URL and is never uploaded/persisted; it
 * reverts to the illustrated Avatar fallback on refresh. Matches every
 * other profile-page control in this pass (disabled Save/Cancel) in being
 * structural rather than functional, except this one honestly *is*
 * interactive since the preview itself needs no server.
 *
 * Bottom-sheet picker (project-lead reference: a Telegram-style "Photo"
 * sheet with a preview and two explicit options) rather than a bare file
 * input — "Take a Photo" uses a separate input with `capture` so mobile
 * browsers open the camera directly instead of the general OS chooser.
 */
export function ProfileAvatarUpload({ name }: { name: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setOpen(false);
    toast.add({
      title: "Photo updated",
      description: "This is a preview only — nothing is uploaded or saved yet.",
      type: "success",
    });
  }

  const previewImg = preview ? (
    <span className="shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--gold),0_2px_6px_rgb(193_172_117_/_0.35)] inline-block h-[60px] w-[60px] overflow-hidden rounded-full">
      {/* eslint-disable-next-line @next/next/no-img-element -- a locally
          generated blob: URL, not a static/remote asset next/image can
          optimize or size ahead of time. */}
      <img src={preview} alt={name} className="h-full w-full object-cover" />
    </span>
  ) : null;

  return (
    <>
      <div className="relative inline-block h-[60px] w-[60px] shrink-0">
        {previewImg ?? <Avatar name={name} size="lg" ring />}
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={preview ? "Change photo" : "Upload photo"}
          aria-label={preview ? "Change photo" : "Upload photo"}
          className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Camera className="h-3 w-3" />
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-sm gap-0 rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Photo</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center gap-6 px-4 pt-4 pb-6">
            {preview ? (
              <span className="shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--gold),0_2px_6px_rgb(193_172_117_/_0.35)] inline-block h-28 w-28 shrink-0 overflow-hidden rounded-full">
                {/* eslint-disable-next-line @next/next/no-img-element -- see note above */}
                <img src={preview} alt={name} className="h-full w-full object-cover" />
              </span>
            ) : (
              <Avatar name={name} size="xl" ring />
            )}
            <div className="flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className={OPTION_BUTTON_CLASS}
              >
                Select from Album
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className={OPTION_BUTTON_CLASS}
              >
                Take a Photo
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
