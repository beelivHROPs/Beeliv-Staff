import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Bumped alongside the Button/Card size increase this session:
        // shadcn's own reference Input is h-9/px-3 (checked against
        // github.com/shadcn-ui/ui) — this project's h-8/px-2.5 default was
        // already a tier below that. Going to h-10/px-3 here instead of
        // shadcn's own h-9 to line up with the new dashboard Button default
        // (also h-10), so an input sitting next to a button in the same row
        // (search bars, form rows) matches height; the auth screens' h-11
        // inputs stay one tier above this, same as `hero` vs default Button.
        "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
