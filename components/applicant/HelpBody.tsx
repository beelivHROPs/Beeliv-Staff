"use client";

/**
 * Help & support. Every answer below is grounded in project documents —
 * docs/BEELIV-SOURCE-OF-TRUTH.md §3 (8 confirmed stages) and §7 (terms,
 * incl. the placement fee), docs/requirements/beeliv-recruitment-and-job-
 * listings-2026-09-29.md (profile reuse, documents at application vs after
 * selection, talent pool). Contact details are the ones the public site
 * already publishes (lib/public-site/contact-content.ts). Don't add answers
 * that promise timelines or policies Beeliv hasn't confirmed.
 */
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { FieldError, useFlagInvalid } from "./form-feedback";
import { ArrowRight, BriefcaseBusiness, CalendarCheck2, ChevronDown, Files, Mail, MapPin, Phone, type LucideIcon } from "@/components/applicant/icons";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { CONTACT_INFO } from "@/lib/public-site/contact-content";
import { APPLICATION_STAGES } from "@/lib/applicant/types";
import { PageHeading } from "./primitives";
import { SectionCard } from "./SectionCard";
import { SelectMenu } from "./SelectMenu";

export type Faq = { q: string; a: React.ReactNode; keywords: string };

export const FAQS: Faq[] = [
  {
    q: "What happens after I apply?",
    keywords: "stages process next step review shortlist interview status",
    a: (
      <>
        <p>Every application moves through the same stages:</p>
        <ol className="mt-2 flex list-none flex-wrap gap-1.5 p-0">
          {APPLICATION_STAGES.map((s, i) => (
            <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-(--ap-tint) px-2.5 py-1 text-[13px] font-semibold text-(--ap-violet)">
              <span className="tabular-nums">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="mt-2">
          You can see exactly where each application is under <Link href="/applicant/applications">My Applications</Link>.
        </p>
      </>
    ),
  },
  {
    q: "Do I have to fill in my details for every job?",
    keywords: "profile reuse again repeat details",
    a: (
      <p>
        No. Your profile and saved documents are reused automatically, so each new application only asks for what that role needs. Keep them up to date in{" "}
        <Link href="/applicant/profile">Profile</Link>.
      </p>
    ),
  },
  {
    q: "Which documents do I need, and when?",
    keywords: "documents cv id nin guarantor reference certificate upload",
    a: (
      <>
        <p>
          <b>To apply:</b> your CV, a passport photograph and a valid ID.
        </p>
        <p className="mt-1.5">
          <b>Only after you&apos;re selected:</b> guarantor information, a reference letter, relevant certificates and any other employment documents Beeliv asks for.
        </p>
        <p className="mt-1.5">
          Manage everything under <Link href="/applicant/documents">Documents</Link>.
        </p>
      </>
    ),
  },
  {
    q: "Can I save an application and finish it later?",
    keywords: "draft save later continue resume",
    a: <p>Yes. Your draft saves as you go. Pick it up any time from My Applications — you won&apos;t create a duplicate by applying to the same job again.</p>,
  },
  {
    q: "I wasn't selected. Is that the end?",
    keywords: "rejected not selected talent pool unsuccessful",
    a: <p>Not necessarily. Beeliv keeps unsuccessful applicants in its talent pool and may contact you when a similar role opens at another outlet.</p>,
  },
  {
    q: "Are there any fees?",
    keywords: "fee cost pay charge placement money",
    a: (
      <p>
        Applying is free. If you are directly recruited and successfully placed into employment through Beeliv HR, a one-off placement fee of 20% of your first-month emolument applies, as communicated and agreed during the
        recruitment process. It is a one-time charge, not a monthly fee.
      </p>
    ),
  },
  {
    q: "Who can see my documents?",
    keywords: "privacy share employer documents who sees",
    a: <p>Your documents are only shared with employers once Beeliv has verified them.</p>,
  },
  {
    q: "How do I change my phone number or address?",
    keywords: "change update phone address email details",
    a: (
      <p>
        Update your contact details in <Link href="/applicant/profile">Profile</Link>. Your sign-in email is changed from <Link href="/applicant/settings">Settings</Link>.
      </p>
    ),
  },
];

const TOPICS = ["My application", "Documents", "Interviews", "My account", "Something else"];

export function HelpBody() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(FAQS[0].q);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter((f) => `${f.q} ${f.keywords}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      <PageHeading title="Help & support" subtitle="Answers to common questions, and how to reach the Beeliv team." />

      {/* Quick links */}
      <div className="mb-5 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
        <QuickLink href="/applicant/applications" icon={BriefcaseBusiness} title="Track an application" sub="See every stage and what's next" />
        <QuickLink href="/applicant/documents" icon={Files} title="Documents" sub="Upload or replace a file" />
        <QuickLink href="/applicant/interviews" icon={CalendarCheck2} title="Interviews" sub="Dates, times and how to join" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1240px]:grid-cols-1">
        <SectionCard id="h-faq" title="Common questions">
          <SearchBar className="mb-3" search={{ value: query, onChange: setQuery, label: "Search help", placeholder: "Search help, e.g. documents, fees" }} />
          {shown.length ? (
            <ul className="m-0 list-none p-0">
              {shown.map((f) => (
                <FaqItem key={f.q} faq={f} open={open === f.q} onToggle={() => setOpen(open === f.q ? null : f.q)} />
              ))}
            </ul>
          ) : (
            <p className="ap-sm py-3">No answers match that. Try another word, or message us below.</p>
          )}
        </SectionCard>

        <aside className="flex min-w-0 flex-col gap-5">
          <SectionCard id="h-contact" title="Contact Beeliv" aside>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              <ContactRow href={CONTACT_INFO.phone.href} icon={Phone} label="Call us" value={CONTACT_INFO.phone.value} />
              <ContactRow href={CONTACT_INFO.email.href} icon={Mail} label="Email us" value={CONTACT_INFO.email.value} />
              <ContactRow icon={MapPin} label="Office" value={CONTACT_INFO.office.city} />
            </ul>
          </SectionCard>
          <MessageCard />
        </aside>
      </div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, sub }: { href: string; icon: LucideIcon; title: string; sub: string }) {
  return (
    <Link href={href} className="ap-card ap-card-hover flex items-center gap-3.5 p-4 text-(--ap-ink)!">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[15px]">{title}</b>
        <span className="block text-[13px] text-(--ap-muted)">{sub}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-(--ap-violet)" aria-hidden="true" />
    </Link>
  );
}

function FaqItem({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <li className="border-t border-(--ap-line-2) first:border-t-0">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className="flex w-full items-center gap-3 py-3.5 text-left">
        <b className="flex-1 text-[15px] font-bold text-(--ap-ink)">{faq.q}</b>
        <ChevronDown className={`size-[18px] shrink-0 text-(--ap-muted) transition-transform duration-200 ${open ? "rotate-180 text-(--ap-violet)" : ""}`} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={id}
            key="a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            style={{ overflow: "hidden" }}
          >
            <div className="pb-4 text-[15px] leading-[1.65] text-(--ap-ink-2) [&_a]:font-bold [&_a]:text-(--ap-violet)">{faq.a}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

function ContactRow({ href, icon: Icon, label, value }: { href?: string; icon: LucideIcon; label: string; value: string }) {
  const inner = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-(--ap-muted)">{label}</span>
        <b className="block truncate text-[15px] text-(--ap-ink)">{value}</b>
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <a href={href} className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-(--ap-line-2)">
          {inner}
        </a>
      ) : (
        <div className="flex items-center gap-3 p-1.5">{inner}</div>
      )}
    </li>
  );
}

/** Opens the applicant's email app with the message pre-filled (no backend needed). */
function MessageCard() {
  const [topic, setTopic] = useState("");
  const [msg, setMsg] = useState("");
  const ready = topic && msg.trim().length > 4;
  const [tried, setTried] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const flag = useFlagInvalid(boxRef);
  const topicBad = tried && !topic;
  const msgBad = tried && msg.trim().length <= 4;
  const href = `${CONTACT_INFO.email.href}?subject=${encodeURIComponent(`Applicant support: ${topic}`)}&body=${encodeURIComponent(msg.trim())}`;
  return (
    <SectionCard id="h-message" title="Send a message" aside>
      <div ref={boxRef} className="flex flex-col gap-3.5">
        <div data-ap-field className="flex flex-col gap-1.5">
          <label htmlFor="h-topic" className="text-sm font-semibold text-(--ap-ink-2)">
            What&apos;s it about?
          </label>
          <SelectMenu id="h-topic" placeholder="Choose a topic" value={topic} options={TOPICS} onChange={setTopic} invalid={topicBad} describedBy={topicBad ? "h-topic-err" : undefined} />
          <FieldError id="h-topic-err">{topicBad ? "Choose what your message is about." : null}</FieldError>
        </div>
        <div data-ap-field className="flex flex-col gap-1.5">
          <label htmlFor="h-msg" className="text-sm font-semibold text-(--ap-ink-2)">
            Your message
          </label>
          <textarea id="h-msg" className="ap-input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Tell us what you need help with" maxLength={1000} aria-invalid={msgBad ? true : undefined} aria-describedby={msgBad ? "h-msg-err" : undefined} />
          <FieldError id="h-msg-err">{msgBad ? "Write a few words about what you need." : null}</FieldError>
        </div>
        <a
          href={ready ? href : undefined}
          onClick={(e) => {
            if (ready) return;
            e.preventDefault();
            setTried(true);
            flag();
          }}
          className="ap-btn ap-btn-p ap-btn-hero text-white!"
        >
          <Mail className="size-[18px]" aria-hidden="true" />
          Send via email
        </a>
        <p className="ap-sm">This opens your email app with your message ready to send to {CONTACT_INFO.email.value}.</p>
      </div>
    </SectionCard>
  );
}
