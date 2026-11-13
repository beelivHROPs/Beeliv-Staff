"use client";

import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";

/**
 * Wireframe mobile filters bottom sheet (#sheet → sheet("filters")): scrim,
 * 22px-radius white sheet with a grab bar, "Filters" + Reset all, the same
 * filter body, and a sticky "Show N roles" footer.
 *
 * Portalled into the `.applicant-shell` element so the dashboard's scoped
 * tokens and Newsreader font apply inside it. Improvement over the wireframe:
 * it also opens at tablet width (768–1040px), where the wireframe shows the
 * Filters button but its sheet CSS only exists <=767px (a dead button).
 */
export function FiltersSheet({
  open,
  onOpenChange,
  container,
  onReset,
  resultCount,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: HTMLElement | null;
  onReset: () => void;
  resultCount: number;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-[rgba(17,17,27,.36)] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          aria-label="Filters"
          className="fixed inset-x-0 bottom-0 z-[71] mx-auto max-h-[86vh] w-full overflow-y-auto overscroll-contain rounded-t-[22px] bg-white px-4 pt-2.5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] transition-transform duration-[250ms] ease-[cubic-bezier(.2,.7,.2,1)] outline-none data-ending-style:translate-y-full data-starting-style:translate-y-full min-[768px]:max-w-[560px] min-[768px]:px-6"
        >
          <div aria-hidden="true" className="mx-auto mb-3.5 h-1 w-10 rounded-sm bg-(--ap-line)" />
          <div className="mb-1 flex items-center justify-between gap-3">
            <Dialog.Title className="ap-serif m-0 text-[25px]">Filters</Dialog.Title>
            <button type="button" onClick={onReset} className="min-h-9 text-sm font-bold text-(--ap-violet) hover:text-(--ap-plum)">
              Reset all
            </button>
          </div>
          {children}
          <div className="sticky bottom-0 mt-2 bg-white pt-3 pb-1">
            <Dialog.Close className="ap-btn ap-btn-p w-full">
              Show {resultCount} role{resultCount === 1 ? "" : "s"}
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
