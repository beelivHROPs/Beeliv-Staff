"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// Genuinely missing piece (not a Gluestack/NativeWind port) — Base UI (this
// project's actual primitives library) ships a Toast primitive for free.
// A standalone manager (not the useToastManager() hook) so any component,
// including plain client components with no toast context of their own,
// can call `toast.add({...})` directly — e.g. ProfileAvatarUpload's photo
// picker confirming a selection.
export const toast = ToastPrimitive.createToastManager()

const TYPE_CLASSES: Record<string, string> = {
  success: "border-l-4 border-l-success",
  error: "border-l-4 border-l-destructive",
  warning: "border-l-4 border-l-warning",
}

/** Mount once near the root (app/layout.tsx) — everything else just calls
 *  `toast.add({ title, description, type })` from anywhere. */
export function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toast}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed top-4 right-4 z-100 mx-auto flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  )
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()
  return toasts.map((t) => (
    <ToastPrimitive.Root
      key={t.id}
      toast={t}
      className={cn(
        "relative rounded-lg border border-border bg-card p-4 pr-9 shadow-lg transition-all duration-200 data-ending-style:opacity-0 data-starting-style:-translate-y-2 data-starting-style:opacity-0",
        t.type ? TYPE_CLASSES[t.type] : undefined
      )}
    >
      {t.title ? (
        <ToastPrimitive.Title className="text-sm font-semibold text-foreground">
          {t.title}
        </ToastPrimitive.Title>
      ) : null}
      {t.description ? (
        <ToastPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
          {t.description}
        </ToastPrimitive.Description>
      ) : null}
      <ToastPrimitive.Close
        aria-label="Dismiss"
        className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-3.5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ))
}
