"use client";

/**
 * Phone-only Admin editor pieces (rules at the end of app/admin/admin.css, ".pf-*" and [data-pform]).
 * Everything here renders or folds below 768px only; from 768px up the old desktop form is untouched.
 *
 *   <PhoneFormHead>  round back button + short title (drops the phone top bar and tab bar for the page).
 *   <FoldSection>    a form section: a normal card on desktop; on phones a white card with a counted title and a
 *                    one-line summary, ONE open at a time (opening one closes the others). A section that holds an
 *                    invalid field opens itself, so a validation message is never hidden.
 *   <Choice>         same props as SelectMenu: pill choices on phones (2 to 5 options), the usual menu on desktop.
 *   <MoreOptions>    advanced fields behind one "More options" row on phones (always open on desktop).
 *   .pf-bar          class for the form's button row: becomes the sticky bottom bar on phones.
 */
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft } from "@/components/applicant/icons";
import { SelectMenu, type SelectOption } from "@/components/applicant/SelectMenu";

const OPEN_EVENT = "pf-open";

/** Wrapper for the whole editor on phones: marks the form so the phone rules apply and keeps the last field above the bar. */
export function PhoneFormHead({ backHref, backLabel, title }: { backHref: string; backLabel: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 min-[768px]:hidden" data-pform="">
      <span data-admin-nonav="" hidden />
      <Link href={backHref} aria-label={`Back to ${backLabel}`} className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-(--ap-surface) text-(--ap-ink) shadow-[0_4px_12px_rgba(60,30,80,0.12)] active:scale-95">
        <ChevronLeft className="size-[18px]" aria-hidden="true" />
      </Link>
      <h1 className="min-w-0 flex-1 text-[22px] leading-tight font-extrabold break-words text-(--ap-ink)">{title}</h1>
    </div>
  );
}

export function FoldSection({ title, summary, right, children, className = "", startClosed, forceOpen, noNumber }: { title: string; summary?: string; right?: ReactNode; children: ReactNode; className?: string; startClosed?: boolean; forceOpen?: boolean; noNumber?: boolean }) {
  const defaultOpen = false;
  const id = useId();
  const [userOpen, setOpen] = useState(!!defaultOpen);
  // forceOpen: a section whose fields show an error stays open on phones.
  const open = userOpen || !!forceOpen;
  const el = useRef<HTMLElement | null>(null);
  const first = useRef(false);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const form = () => node.closest("[data-pform-body]");
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ form: Element | null; id: string }>).detail;
      if (d.form === form() && d.id !== id) setOpen(false);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    // A section that holds an invalid field opens itself, so the message is never hidden.
    const watch = new MutationObserver(() => {
      if (node.querySelector('[aria-invalid="true"], [data-ap-invalid], [data-invalid-pills], p[id$="-err"]')) setOpen(true);
    });
    watch.observe(node, { subtree: true, attributes: true, attributeFilter: ["aria-invalid", "data-ap-invalid", "data-invalid-pills"], childList: true });
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      watch.disconnect();
    };
  }, [id]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { form: el.current?.closest("[data-pform-body]") ?? null, id } }));
  }

  return (
    <section
      ref={(node) => {
        el.current = node;
        // The first section of a form starts open.
        if (node && !first.current) {
          first.current = true;
          if (node.closest("[data-pform-body]")?.querySelector("[data-pf-sec]:not([data-pf-closed])") === node && !defaultOpen && !startClosed) setOpen(true);
        }
      }}
      data-pf-sec=""
      data-pf-closed={startClosed ? "" : undefined}
      data-pf-nonum={noNumber ? "" : undefined}
      className={`ap-card min-w-0 rounded-[20px] p-5 max-[767px]:p-0 min-[768px]:p-6 ${className}`}
    >
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 max-[767px]:hidden">
        <h2 className="ap-serif text-[18px] leading-tight">{title}</h2>
        {right}
      </div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={toggle} className="pf-sechead flex w-full items-center gap-3 text-left min-[768px]:hidden">
        {noNumber ? null : <span className="pf-num" aria-hidden="true" />}
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] leading-tight font-extrabold break-words text-(--ap-ink)">{title}</span>
          {summary ? <span className="mt-0.5 line-clamp-1 text-[14px] leading-snug break-words text-(--ap-muted)">{summary}</span> : null}
        </span>
        <ChevronDown className={`size-[18px] shrink-0 text-(--ap-muted) transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div id={id} className={open ? "max-[767px]:px-4 max-[767px]:pb-5" : "max-[767px]:hidden"}>
        {right ? <div className="mb-3 min-[768px]:hidden">{right}</div> : null}
        {children}
      </div>
    </section>
  );
}

/** Marks the form body: sections inside it fold one-at-a-time and the bottom bar gets room. */
export function PhoneFormBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div data-pform="" data-pform-body="" className={`${className} max-[767px]:pb-44`}>
      <span data-admin-nonav="" hidden />
      {children}
    </div>
  );
}

/** Pill choices on phones, the SelectMenu on desktop (same props as SelectMenu). */
export function Choice({ id, value, options, onChange, placeholder, invalid, describedBy, label }: { id?: string; value: string; options: SelectOption[]; onChange: (v: string) => void; placeholder?: string; invalid?: boolean; describedBy?: string; label?: string }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  // Long lists stay a menu (a bottom sheet on phones); pills are for a handful of options.
  if (opts.length > 6) return <SelectMenu id={id} value={value} options={options} onChange={onChange} placeholder={placeholder} invalid={invalid} describedBy={describedBy} label={label} />;
  return (
    <>
      <div className="max-[767px]:hidden">
        <SelectMenu id={id} value={value} options={options} onChange={onChange} placeholder={placeholder} invalid={invalid} describedBy={describedBy} label={label} />
      </div>
      <div role="radiogroup" aria-label={label ?? placeholder} aria-describedby={describedBy} data-invalid-pills={invalid ? "" : undefined} className="flex flex-wrap gap-2 min-[768px]:hidden">
        {opts.length === 0 ? <p className="text-[14px] text-(--ap-muted)">{placeholder ?? "Nothing to choose from."}</p> : null}
        {opts.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className="pf-pill" data-on={value === o.value ? "" : undefined}>
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}

/** Advanced fields behind one folded row on phones; always open from 768px up. */
export function MoreOptions({ title = "More options", children }: { title?: string; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const watch = new MutationObserver(() => {
      if (node.querySelector('[aria-invalid="true"], [data-ap-invalid]')) setOpen(true);
    });
    watch.observe(node, { subtree: true, attributes: true, attributeFilter: ["aria-invalid", "data-ap-invalid"], childList: true });
    return () => watch.disconnect();
  }, []);
  return (
    <div ref={box} className="min-[768px]:contents">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="pf-more flex min-h-12 w-full items-center gap-2 text-left text-[15px] font-extrabold text-(--ap-violet) min-[768px]:hidden">
        <span className="min-w-0 flex-1">{title}</span>
        <ChevronDown className={`size-[18px] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div id={id} className={open ? "mt-3 flex flex-col gap-4 min-[768px]:contents" : "max-[767px]:hidden min-[768px]:contents"}>
        {children}
      </div>
    </div>
  );
}
