"use client";

/**
 * Forms are occasional (a check-in or quiz Beeliv sends after someone has worked a while), so they have no menu item
 * (lead 2026-11-24, approved board). Instead:
 *   - FormPrompt: a centred pop-up when a form is waiting, at most once a day, never over a form or the check-in screen.
 *   - FormHomeCard: a small "1 form to complete" card on Home until it is sent.
 *   - CompletedForms: finished forms listed under Warnings & Records.
 * Live (real users): forms have no backend yet, so there are no forms and nothing shows. Never sample forms.
 */
import { Dialog } from "@base-ui/react/dialog";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FileCheck2 } from "@/components/applicant/icons";
import { newsreader } from "@/components/applicant/fonts";
import { useIsClient } from "@/components/applicant/motion";
import { estimateMinutes, statusOf, useDraftsFor } from "@/components/applicant/tests/taker";
import { listPublishedFor, useFormsVersion, type ParticipantForm } from "@/lib/forms/participant-store";
import { staffMode } from "@/lib/staff/mode";
import { useStaffProfile } from "@/lib/staff/hooks";
import { ActionPill, Dot, PANEL } from "../kit";

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** Forms sent to this person, split into waiting (not sent yet) and done. Empty for real users until forms have a backend. */
export function useStaffFormQueue(): { ready: boolean; waiting: ParticipantForm[]; done: ParticipantForm[] } {
  useFormsVersion();
  const isClient = useIsClient();
  const { data: profile } = useStaffProfile();
  const live = staffMode() === "live";
  // New staff in onboarding have no forms yet; onboarding steps live on Home.
  const forms = !isClient || live || !profile || profile.accountStatus === "onboarding" ? [] : listPublishedFor("staff");
  const drafts = useDraftsFor(profile?.id ?? "", forms.map((f) => f.id));
  const waiting = forms.filter((f) => statusOf(drafts[f.id]) !== "submitted");
  const done = forms.filter((f) => statusOf(drafts[f.id]) === "submitted");
  return { ready: isClient && !!profile, waiting, done };
}

const SEEN_KEY = "beeliv.staff.formPrompt";
const today = () => new Date().toISOString().slice(0, 10);
function seenToday(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === today();
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, today());
  } catch {
    /* private window: the pop-up may show again, which is harmless */
  }
}

/** Screens the pop-up never covers: a form being taken, check-in, setup and help. */
const QUIET = /^\/staff\/(forms|attendance|setup|help)(\/|$)/;

function FormArt() {
  return (
    <span aria-hidden="true" className="mx-auto mb-3 flex h-[84px] w-[104px] items-center justify-center rounded-[24px] bg-[radial-gradient(circle_at_50%_45%,rgba(201,164,92,.42),rgba(201,164,92,.1)_55%,transparent_70%),linear-gradient(160deg,#efe9fb,#f8f5fd)] text-(--ap-violet)">
      <FileCheck2 className="size-11" aria-hidden="true" />
    </span>
  );
}

export function FormPrompt() {
  const pathname = usePathname();
  const { ready, waiting } = useStaffFormQueue();
  const [open, setOpen] = useState(false);
  const first = waiting[0];

  useEffect(() => {
    if (!ready || !first || QUIET.test(pathname) || seenToday()) return;
    const t = setTimeout(() => {
      markSeen();
      setOpen(true);
    }, 600); // let the page settle first
    return () => clearTimeout(t);
  }, [ready, first, pathname]);

  if (!first) return null;
  const many = waiting.length > 1;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-[rgba(17,17,27,.42)] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={`applicant-shell staff-theme ${newsreader.variable} fixed top-1/2 left-1/2 z-[71] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[24px] bg-(--ap-surface,#fff) px-5 pt-6 pb-5 text-center shadow-[0_30px_70px_rgba(20,10,40,.35)] outline-none transition-[opacity,transform] duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none min-[768px]:px-7 min-[768px]:pt-7`}
        >
          <FormArt />
          <Dialog.Title className="ap-serif m-0 text-[21px] leading-tight font-bold text-(--ap-ink)">
            {many ? `You have ${waiting.length} forms to complete` : "You have a form to complete"}
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 mb-0 text-[14px] leading-snug text-(--ap-muted)">
            <b className="block text-[15px] text-(--ap-ink)">{first.title}</b>
            About {plural(estimateMinutes(first), "minute")} · {plural(first.questions.length, "question")}
          </Dialog.Description>
          <div className="mt-5 flex items-center gap-2.5">
            <Dialog.Close className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-white px-5 text-[15px] font-bold text-(--ap-ink) shadow-[inset_0_0_0_1.5px_var(--ap-line)] transition-colors hover:bg-(--ap-tint) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
              Later
            </Dialog.Close>
            <ActionPill href={`/staff/forms/${first.id}`} icon={FileCheck2} compact className="min-w-0 flex-1" ariaLabel={`Start now: ${first.title}`}>
              Start now
            </ActionPill>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Home: stays until every waiting form is sent. */
export function FormHomeCard() {
  const { waiting } = useStaffFormQueue();
  const first = waiting[0];
  if (!first) return null;
  return (
    <section aria-label="Forms to complete" className="flex flex-wrap items-center gap-3.5 rounded-[22px] border border-[#ddd3f3] bg-[linear-gradient(135deg,#f3effc,#fff)] p-4 min-[768px]:p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-(--ap-violet) text-white">
        <FileCheck2 className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 leading-snug">
        <b className="block text-[16px] text-(--ap-ink)">{plural(waiting.length, "form")} to complete</b>
        <span className="block truncate text-[14px] text-(--ap-muted)">{first.title}</span>
      </div>
      <ActionPill href={`/staff/forms/${first.id}`} icon={FileCheck2} compact fit className="max-[520px]:w-full" ariaLabel={`Start: ${first.title}`}>
        Start
      </ActionPill>
    </section>
  );
}

/** Warnings & Records: forms already sent. Nothing when there are none. */
export function CompletedForms() {
  const { done } = useStaffFormQueue();
  if (done.length === 0) return null;
  return (
    <section aria-labelledby="completed-forms" className={`${PANEL} p-4 min-[768px]:p-5`}>
      <h2 id="completed-forms" className="m-0 mb-2 text-[18px] font-bold text-(--ap-ink)">Completed forms</h2>
      <ul className="m-0 list-none p-0">
        {done.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-3 border-t border-(--ap-line-2) py-3 first:border-t-0">
            <div className="min-w-0 flex-1 leading-snug">
              <b className="block text-[15px] text-(--ap-ink)">{f.title}</b>
              <span className="text-[13px] text-(--ap-muted)">{plural(f.questions.length, "question")}</span>
            </div>
            <Dot tone="ok">Sent</Dot>
            <ActionPill href={`/staff/forms/${f.id}/done`} variant="outline" compact fit arrow={false} ariaLabel={`View: ${f.title}`}>
              View
            </ActionPill>
          </li>
        ))}
      </ul>
    </section>
  );
}
