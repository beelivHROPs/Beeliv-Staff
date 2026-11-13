"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, ChevronDown } from "@/components/applicant/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { outletImage } from "@/lib/client/assets";
import { ALL_SCOPE, scopeLabel, setOutletScope, useOutletState } from "@/lib/client/outlet";
import { Store } from "./icons";

/**
 * The outlet switcher (brief section 6). Not decoration: choosing a scope
 * re-fetches every screen through lib/client/outlet.ts. It only ever lists
 * scopes the session returned, i.e. what this user is authorised for - and the
 * backend re-checks that on every request. A user with a single outlet sees a
 * plain, non-interactive label.
 */
export function OutletSwitcher({ compact = false, theme }: { compact?: boolean; theme: string }) {
  const { outlets, clientName, scope } = useOutletState();
  const [open, setOpen] = useState(false);
  if (scope === null || outlets.length === 0) return null;

  const label = scopeLabel(scope, { outlets, clientName });
  const short = scope === ALL_SCOPE ? "All outlets" : label;
  const current = outlets.find((o) => o.id === scope);
  const trigger = `inline-flex h-11 min-w-0 items-center gap-2 rounded-xl border border-(--ap-line) bg-white px-3 text-sm font-semibold text-(--ap-ink) ${compact ? "max-w-[46vw]" : "max-w-[260px]"}`;

  const face = (
    <>
      {current ? (
        <span className="relative size-6 shrink-0 overflow-hidden rounded-md bg-(--ap-tint)">
          <Image src={outletImage(current)} alt="" fill sizes="24px" className="object-cover" />
        </span>
      ) : (
        <Store className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
      )}
      <span className="min-w-0 truncate">{short}</span>
    </>
  );

  if (outlets.length === 1) {
    return (
      <span className={trigger} aria-label={`Outlet: ${label}`}>
        {face}
      </span>
    );
  }

  const options = [{ id: ALL_SCOPE as string, name: `All outlets`, sub: `${outlets.length} outlets`, img: null as string | null }, ...outlets.map((o) => ({ id: o.id, name: o.name, sub: o.location, img: outletImage(o) }))];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={`${trigger} hover:bg-(--ap-line-2)`} aria-label={`Outlet: ${label}. Change outlet`}>
        {face}
        <ChevronDown className="size-4 shrink-0 text-(--ap-muted)" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align={compact ? "center" : "end"} className={`${theme} w-[min(320px,calc(100vw-24px))] bg-white! p-2`}>
        <b className="block px-2.5 pt-1.5 pb-1 text-[12px] font-bold tracking-[.12em] text-(--ap-muted) uppercase">{clientName}</b>
        <div role="listbox" aria-label="Outlet" className="flex flex-col">
          {options.map((o) => {
            const on = o.id === scope;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  setOutletScope(o.id);
                  setOpen(false);
                }}
                className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2.5 py-1.5 text-left hover:bg-(--ap-line-2) ${on ? "bg-(--ap-tint)" : ""}`}
              >
                {o.img ? (
                  <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-(--ap-tint)">
                    <Image src={o.img} alt="" fill sizes="36px" className="object-cover" />
                  </span>
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--ap-tint) text-(--ap-violet)">
                    <Store className="size-[18px]" aria-hidden="true" />
                  </span>
                )}
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-[15px]">{o.name}</b>
                  <span className="block truncate text-[13px] text-(--ap-muted)">{o.sub}</span>
                </span>
                {on ? <Check className="size-4 shrink-0 text-(--ap-violet)" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
