"use client";

/**
 * Staff Help & support. Contacts are the ones the public site already
 * publishes plus the assignment's own Beeliv/HR contact and supervisor (from
 * the data layer). FAQ answers only point to where things live in the app -
 * they promise no policy, timeline or rule Beeliv hasn't confirmed (leave,
 * attendance and correction rules are TBD per the brief).
 */
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { ChevronDown, Mail, MapPin, Phone } from "@/components/applicant/icons";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { PilotLink } from "@/components/shared/PilotLink";
import { CONTACT_INFO } from "@/lib/public-site/contact-content";
import { useCurrentAssignment } from "@/lib/staff/hooks";
import type { Contact } from "@/lib/staff/types";
import { ActionPill, HERO_SURFACE, HeroDeco, Panel } from "../kit";

export type Faq = { q: string; a: React.ReactNode; keywords: string };

export const FAQS: Faq[] = [
  {
    q: "Where can I see my shifts?",
    keywords: "schedule shift roster today week upcoming",
    a: <p>Open <PilotLink href="/staff/schedule">Schedule</PilotLink> for today, this week and what&apos;s coming up. If a shift changes, you&apos;ll get a notification.</p>,
  },
  {
    q: "How do I check in or out?",
    keywords: "attendance check in clock out",
    a: <p>Use the attendance card on <Link href="/staff">Home</Link> or open <PilotLink href="/staff/attendance">Attendance</PilotLink>. If something looks wrong on your record, contact Beeliv.</p>,
  },
  {
    q: "How do I request leave?",
    keywords: "leave holiday time off request",
    a: <p>Go to <PilotLink href="/staff/leave">Leave</PilotLink> and start a request. You can follow its status there.</p>,
  },
  {
    q: "Beeliv asked me for a document. Where do I upload it?",
    keywords: "documents upload certificate request replace",
    a: <p>Open <Link href="/staff/documents">Documents</Link>. Anything Beeliv needs from you is marked there.</p>,
  },
  {
    q: "Where are my SOPs and training?",
    keywords: "sop training learning assigned acknowledge",
    a: <p>Everything assigned to you is under <PilotLink href="/staff/sops-training">SOPs &amp; Training</PilotLink>.</p>,
  },
  {
    q: "How do I update my phone number or contact details?",
    keywords: "profile phone contact change update details",
    a: <p>You can edit your preferred name and phone in <Link href="/staff/profile">Profile</Link>. For anything marked &ldquo;Managed by Beeliv&rdquo;, contact Beeliv.</p>,
  },
  {
    q: "Is my NIN or bank information visible in the app?",
    keywords: "nin bank banking identity sensitive privacy secure",
    a: <p>No. Identity and banking details are held securely by Beeliv and aren&apos;t displayed in the app. To update them, contact Beeliv.</p>,
  },
  {
    q: "Do I need a separate login for the Staff Hub?",
    keywords: "login account password applicant sign in same",
    a: <p>No. It&apos;s the same Beeliv account you already use. Manage it in <Link href="/staff/settings">Settings</Link>.</p>,
  },
];

export function HelpBody() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(FAQS[0].q);
  const { data: assignment } = useCurrentAssignment();
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? FAQS.filter((f) => `${f.q} ${f.keywords}`.toLowerCase().includes(q)) : FAQS;
  }, [query]);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2">
      <h1 className="sr-only">Help &amp; support</h1>
      {/* The one rich block: how can we help, with the search and the two ways to reach Beeliv. */}
      <section aria-label="Get help" className={`${HERO_SURFACE} p-5 min-[768px]:p-7`}>
        <HeroDeco />
        <p className="inline-flex items-center rounded-full bg-white/16 px-3 py-1 text-[14px] font-semibold">Help &amp; support</p>
        <h2 className="mt-3 text-[28px] leading-[1.1] font-bold min-[768px]:text-[34px]">How can we help?</h2>
        <p className="mt-2 max-w-[52ch] text-[16px] text-white/85">Search the answers below, or reach the Beeliv team directly.</p>
        <SearchBar className="mt-5 max-w-[560px]" search={{ value: query, onChange: setQuery, label: "Search help", placeholder: "Search help, e.g. leave, documents" }} />
        <div className="mt-5 flex flex-col gap-3 min-[560px]:flex-row">
          <ActionPill href={CONTACT_INFO.phone.href} icon={Phone} fit className="max-[559px]:w-full">
            Call {CONTACT_INFO.phone.value}
          </ActionPill>
          <ActionPill href={CONTACT_INFO.email.href} icon={Mail} variant="outline" fit className="max-[559px]:w-full">
            Email us
          </ActionPill>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 min-[1000px]:grid-cols-[minmax(0,1fr)_360px]">
        <Panel id="h-faq" title="Common questions">
          {shown.length ? (
            <ul className="m-0 list-none p-0">
              {shown.map((f) => (
                <FaqItem key={f.q} faq={f} open={open === f.q} onToggle={() => setOpen(open === f.q ? null : f.q)} />
              ))}
            </ul>
          ) : (
            <p className="py-3 text-[16px] text-(--ap-muted)">No answers match that. Try another word, or contact Beeliv.</p>
          )}
        </Panel>

        <aside className="flex min-w-0 flex-col gap-5">
          {assignment && (assignment.beelivContact || assignment.supervisor) ? (
            <Panel id="h-team" title="Your contacts">
              <ul className="m-0 flex list-none flex-col divide-y divide-(--ap-line-2) p-0">
                {assignment.beelivContact ? <PersonRow c={assignment.beelivContact} /> : null}
                {assignment.supervisor ? <PersonRow c={assignment.supervisor} /> : null}
              </ul>
            </Panel>
          ) : null}
          <Panel id="h-office" title="Beeliv office">
            <p className="flex items-center gap-2 text-[16px] text-(--ap-ink-2)">
              <MapPin className="size-5 shrink-0 text-(--ap-violet)" aria-hidden="true" />
              {CONTACT_INFO.office.city}
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function FaqItem({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <li className="border-t border-(--ap-line-2) first:border-t-0">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className="flex min-h-14 w-full items-center gap-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
        <b className="flex-1 text-[16px] font-bold text-(--ap-ink)">{faq.q}</b>
        <ChevronDown className={`size-[18px] shrink-0 text-(--ap-muted) transition-transform duration-200 ${open ? "rotate-180 text-(--ap-violet)" : ""}`} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div id={id} key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 38 }} style={{ overflow: "hidden" }}>
            <div className="pb-4 text-[15px] leading-[1.65] text-(--ap-ink-2) [&_a]:font-bold [&_a]:text-(--ap-violet)">{faq.a}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

/** A named contact from the current assignment. Only shows the channels that exist. */
function PersonRow({ c }: { c: Contact }) {
  const round = "flex size-11 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet) transition-colors hover:bg-(--ap-tint-2) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:ring-offset-2 focus-visible:outline-none";
  return (
    <li className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 leading-snug">
        <b className="block truncate text-[16px] text-(--ap-ink)">{c.name}</b>
        <span className="block truncate text-[14px] text-(--ap-muted)">{c.title}</span>
      </div>
      {c.phone ? (
        <a href={`tel:${c.phone.replace(/\s/g, "")}`} aria-label={`Call ${c.name}`} className={round}>
          <Phone className="size-5" aria-hidden="true" />
        </a>
      ) : null}
      {c.email ? (
        <a href={`mailto:${c.email}`} aria-label={`Email ${c.name}`} className={round}>
          <Mail className="size-5" aria-hidden="true" />
        </a>
      ) : null}
    </li>
  );
}

