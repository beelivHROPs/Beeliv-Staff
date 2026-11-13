"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@/lib/utils"

// Genuinely missing piece (not a Gluestack/NativeWind port) — Base UI (this
// project's actual primitives library) ships a Popover primitive for free.

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  sideOffset = 8,
  align = "center",
  collisionPadding,
  children,
  ...props
}: PopoverPrimitive.Popup.Props & {
  sideOffset?: number
  align?: "start" | "center" | "end"
  /** Keep the popup this far from the viewport edges (e.g. clear of a sticky top bar). Unset = library default. */
  collisionPadding?: PopoverPrimitive.Positioner.Props["collisionPadding"]
}) {
  return (
    <PopoverPrimitive.Portal>
      {/* z-[150]: above the app's own sheets/dialogs (z-[130]) and the agreement reader (z-[140]) so pickers opened inside them are never hidden behind. */}
      <PopoverPrimitive.Positioner className="z-[150]" sideOffset={sideOffset} align={align} collisionPadding={collisionPadding}>
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 w-72 rounded-lg border border-border bg-card p-0 text-foreground shadow-lg outline-none transition-[transform,scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
