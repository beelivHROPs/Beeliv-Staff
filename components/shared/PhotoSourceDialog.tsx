"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * "Add your photo" pop-up with two choices: Upload photo (pick a file) or
 * Take photo (live camera, then Capture). Where the browser can't open a live
 * camera (an http address on a phone, or no camera permission) "Take photo"
 * falls back to the phone's own camera through a capture file input.
 * Hands the chosen picture back as a File; the caller validates and resizes.
 * Themed like the app it opens in (Applicant plum, Staff violet, Client wine,
 * and each app's dark mode): the pop-up is portalled outside the app shell, so
 * it carries the `applicant-shell` class that gives portalled layers the same
 * --ap-* tokens as the page behind it.
 */
type Mode = "choose" | "camera";

const OPTION =
  "flex min-h-14 w-full items-center gap-3.5 rounded-2xl border border-(--ap-line) bg-(--ap-surface) px-4 py-3 text-left text-[16px] font-semibold text-(--ap-ink) transition-colors hover:bg-(--ap-tint) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)";

function Icon({ d }: { d: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </span>
  );
}

export function PhotoSourceDialog({
  open,
  onOpenChange,
  onFile,
  currentPhoto,
  onRemove,
}: {
  /** Shown as a quiet "Remove photo" option when there is a current photo. The caller closes this dialog and asks to confirm. */
  onRemove?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFile: (file: File) => void;
  /** The picture already on the account. When set, the pop-up reads "Change photo" and shows it. */
  currentPhoto?: string | null;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>("choose");
  const [error, setError] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Leaving the page always switches the camera off.
  useEffect(() => stopCamera, []);

  // Closing (any way) switches the camera off and puts the pop-up back on its first screen.
  function handleOpenChange(next: boolean) {
    if (!next) {
      stopCamera();
      setMode("choose");
      setError(null);
    }
    onOpenChange(next);
  }

  async function takePhoto() {
    setError(null);
    const canLive = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;
    if (!canLive) {
      captureRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setMode("camera");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError("We couldn't open the camera. Allow camera access, or upload a photo instead.");
    }
  }

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // Centre square crop; mirrored on screen, saved the right way round.
    ctx.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, size, size);
    c.toBlob(
      (blob) => {
        if (!blob) return;
        onFile(new File([blob], "camera-photo.jpg", { type: "image/jpeg" }));
        handleOpenChange(false);
      },
      "image/jpeg",
      0.9,
    );
  }

  const picked = (f: File | undefined) => {
    if (!f) return;
    onFile(f);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="applicant-shell max-w-[min(400px,calc(100vw-2rem))] gap-4 border border-(--ap-line) bg-(--ap-surface) p-5 text-(--ap-ink)">
        <DialogTitle className="text-[20px] font-bold text-(--ap-ink)">{currentPhoto ? "Change photo" : "Add your photo"}</DialogTitle>
        <DialogDescription className="text-[14px] text-(--ap-muted)">
          {mode === "camera"
            ? "Line yourself up in the middle, then press Capture."
            : currentPhoto
              ? "Pick a new picture to replace the current one."
              : "Choose how you'd like to add your photo."}
        </DialogDescription>

        {mode === "choose" ? (
          <div className="flex flex-col gap-2.5">
            {currentPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentPhoto} alt="Your current photo" className="mx-auto mb-1 size-28 rounded-full border-4 border-(--ap-line) object-cover" />
            ) : null}
            <button type="button" className={OPTION} onClick={() => uploadRef.current?.click()}>
              <Icon d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              {currentPhoto ? "Upload a new photo" : "Upload photo"}
            </button>
            <button type="button" className={OPTION} onClick={() => void takePhoto()}>
              <Icon d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
              {currentPhoto ? "Take a new photo" : "Take photo"}
            </button>
            {currentPhoto && onRemove ? (
              <button type="button" onClick={onRemove} className="flex min-h-12 items-center justify-center rounded-full text-[15px] font-bold text-(--ap-rose) hover:bg-(--ap-rose-bg)">
                Remove photo
              </button>
            ) : null}
            {error ? (
              <p role="alert" className="text-[13px] font-semibold text-(--ap-rose)">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-2xl bg-black">
              <video ref={videoRef} playsInline muted className="aspect-square w-full -scale-x-100 object-cover" />
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setMode("choose");
                }}
                className="ap-btn ap-btn-s h-12 flex-1 text-[15px] font-semibold"
              >
                Back
              </button>
              <button type="button" onClick={capture} className="ap-btn ap-btn-p h-12 flex-1 text-[15px] font-semibold text-white!">
                Capture
              </button>
            </div>
          </div>
        )}

        <input ref={uploadRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Choose a photo from your device" onChange={(e) => { picked(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={captureRef} type="file" accept="image/*" capture="user" className="sr-only" tabIndex={-1} aria-label="Take a photo with your camera" onChange={(e) => { picked(e.target.files?.[0]); e.target.value = ""; }} />
      </DialogContent>
    </Dialog>
  );
}
