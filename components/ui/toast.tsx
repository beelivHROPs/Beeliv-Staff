"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { Bell, Check, CircleAlert, X } from "@/components/applicant/icons"
import { cn } from "@/lib/utils"
import { playAdminSound, soundForToast, type SoundName } from "@/lib/admin/sound"

// Base UI toast with a standalone manager, so any client component can call
// `toast.add({ title, description, type })` directly.
export const toast = ToastPrimitive.createToastManager()

/**
 * Confirmation style (project lead, 2026-09-29): a solid pill at the BOTTOM
 * CENTRE with white text, coloured by meaning, shared by the Applicant and
 * Staff apps.
 *   success -> green   error -> red   warning -> amber   (none) -> deep indigo
 * On phones it sits above the apps' bottom navigation.
 */
const TONE: Record<string, { bg: string; Icon: typeof Check }> = {
  success: { bg: "bg-[#15803d]", Icon: Check },
  error: { bg: "bg-[#be123c]", Icon: CircleAlert },
  warning: { bg: "bg-[#b45309]", Icon: CircleAlert },
  info: { bg: "bg-[#2a2140]", Icon: Bell },
}

/** Mount once near the root (app/layout.tsx). */
export function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toast}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed inset-x-0 bottom-[calc(108px+env(safe-area-inset-bottom,0px))] z-[140] mx-auto flex w-[calc(100%-2rem)] max-w-[440px] flex-col items-center gap-2 min-[768px]:bottom-7">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  )
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()
  // Sound cue for each NEW toast (errors, "Saved" confirmations). Silent everywhere except the Admin and
  // Client apps: playAdminSound checks the <html> app class itself, so Applicant / Staff are unaffected.
  const heard = React.useRef<Set<string>>(new Set())
  React.useEffect(() => {
    for (const t of toasts) {
      if (heard.current.has(t.id)) continue
      heard.current.add(t.id)
      // A toast may name its own sound (`data: { sound: "approved" }`); otherwise it is mapped from its type / title.
      const own = (t.data as { sound?: SoundName } | undefined)?.sound
      const name = own ?? soundForToast(t.type, t.title)
      if (name) playAdminSound(name)
    }
  }, [toasts])
  return toasts.map((t) => {
    const tone = TONE[t.type ?? "info"] ?? TONE.info
    const Icon = tone.Icon
    return (
      <ToastPrimitive.Root
        key={t.id}
        toast={t}
        // A confirmation is a live-region message, not a dialog (Base UI's default role is "dialog"): status for
        // success/info/warning, alert for errors.
        role={t.type === "error" ? "alert" : "status"}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-2xl py-3 pr-11 pl-3.5 text-white shadow-[0_14px_34px_-10px_rgba(17,17,27,.45)] transition-all duration-300 ease-out data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-3 data-starting-style:opacity-0",
          tone.bg
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/18" aria-hidden="true">
          <Icon className="size-[18px]" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          {t.title ? <ToastPrimitive.Title className="text-[15px] leading-snug font-bold text-white">{t.title}</ToastPrimitive.Title> : null}
          {t.description ? (
            <ToastPrimitive.Description className="mt-0.5 text-[13px] leading-snug text-white/85">{t.description}</ToastPrimitive.Description>
          ) : null}
        </div>
        <ToastPrimitive.Close
          aria-label="Dismiss"
          className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-white/80 before:absolute before:-inset-2 before:content-[''] transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="size-4" />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
    )
  })
}
