"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, Mail, MessageSquareText, Phone } from "@/components/applicant/icons";
import { Field, Pick } from "@/components/applicant/apply/parts";
import { invalidAttrs, useFlagInvalid } from "@/components/applicant/form-feedback";
import { PageHeading } from "@/components/applicant/primitives";
import { toast } from "@/components/ui/toast";
import { PilotLink } from "@/components/shared/PilotLink";
import { useClientSession } from "@/lib/client/hooks";
import { NEW_REQUEST_HREF } from "@/lib/client/links";
import { AnalyticsPanel, ChartErrorState, ChartSkeleton } from "../charts";
import { ClientAvatar } from "../ClientAvatar";

/** Support reasons from the brief (section 30). The list is presentation; routing them is the backend's job (TBD). */
const REASONS = ["Staffing request", "Recruitment question", "Staff concern", "Document / compliance issue", "Schedule issue", "Access change request", "Report a problem", "Other"] as const;
type Reason = (typeof REASONS)[number];

const MIN = 10;
const MAX = 1000;

/**
 * Client Support (brief section 30): personal to Beeliv, not a generic FAQ.
 * "Your Beeliv team" shows the assigned contact; channels appear ONLY when
 * Beeliv has approved them (currently null in the fixture), so nothing is
 * invented. The contact form has no backend yet - submitting shows a
 * confirmation toast and nothing is sent.
 */
export function SupportBody({ initialReason }: { initialReason?: string }) {
  const preset = (REASONS as readonly string[]).includes(initialReason ?? "") ? (initialReason as Reason) : "";
  return (
    <div>
      <PageHeading title="Support" subtitle="Reach your Beeliv team, or find a quick answer." />
      <div className="grid grid-cols-1 items-start gap-4 min-[1101px]:grid-cols-[minmax(0,1fr)_400px] min-[1101px]:gap-5">
        <div className="order-2 flex min-w-0 flex-col gap-4 min-[1101px]:order-1 min-[1101px]:gap-5">
          <ContactForm initialReason={preset} />
          <Faq />
        </div>
        <div className="order-1 min-w-0 min-[1101px]:order-2">
          <TeamCard />
        </div>
      </div>
    </div>
  );
}

function TeamCard() {
  const { data, status, retry } = useClientSession();
  const team = data?.team;
  return (
    <AnalyticsPanel title="Your Beeliv team" subtitle="Your main contact at Beeliv">
      {status === "loading" ? <ChartSkeleton height={150} label="Loading your Beeliv team" /> : null}
      {status === "error" || status === "restricted" ? <ChartErrorState retry={retry} height={150} title="We couldn't load your team" /> : null}
      {status === "ready" && team ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3.5">
            <ClientAvatar name={team.name} size={56} />
            <div className="min-w-0 leading-tight">
              <b className="block truncate text-[18px] text-(--ap-ink)">{team.name}</b>
              <span className="block text-[14px] text-(--ap-muted)">{team.role}, Beeliv Hospitality</span>
            </div>
          </div>
          {team.phone || team.email ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {team.phone ? (
                <li>
                  <a href={`tel:${team.phone.replace(/\s/g, "")}`} className="ap-btn ap-btn-s w-full justify-start">
                    <Phone className="size-4" aria-hidden="true" /> {team.phone}
                  </a>
                </li>
              ) : null}
              {team.email ? (
                <li>
                  <a href={`mailto:${team.email}`} className="ap-btn ap-btn-s w-full justify-start wrap-anywhere">
                    <Mail className="size-4 shrink-0" aria-hidden="true" /> {team.email}
                  </a>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="rounded-xl bg-(--ap-tint-soft) px-3.5 py-3 text-[14px] leading-snug text-(--ap-ink-2)">Contact details are shared by Beeliv. Use the form to reach your team in the meantime.</p>
          )}
          <p className="border-t border-(--ap-line-2) pt-3 text-[13px] text-(--ap-muted)">
            Need more people?{" "}
            <Link href={NEW_REQUEST_HREF} className="font-bold text-(--ap-violet)">
              Request staff
            </Link>{" "}
            instead of messaging.
          </p>
        </div>
      ) : null}
    </AnalyticsPanel>
  );
}

function ContactForm({ initialReason }: { initialReason: Reason | "" }) {
  const ref = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(ref);
  const [reason, setReason] = useState<Reason | "">(initialReason);
  const [message, setMessage] = useState("");
  const [tried, setTried] = useState(false);
  const msgId = useId();

  const reasonErr = tried && !reason ? "Choose what this is about." : undefined;
  const trimmed = message.trim();
  const msgErr = tried && trimmed.length === 0 ? "Write a short message." : tried && trimmed.length < MIN ? `Add a little more detail (at least ${MIN} characters).` : undefined;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!reason || trimmed.length < MIN) {
      flag();
      return;
    }
    // No backend yet: nothing is sent. The wording says so.
    toast.add({ title: "Message noted", description: "Messages reach the Beeliv team once Support is connected to the live system." });
    setReason("");
    setMessage("");
    setTried(false);
  }

  return (
    <AnalyticsPanel title="Contact Beeliv" subtitle="Tell us what it's about so the right person picks it up">
      <form ref={ref} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="What is this about?" error={reasonErr}>
          <div role="group" aria-label="Reason for contacting Beeliv" className="flex flex-wrap gap-2" {...invalidAttrs(!!reasonErr)}>
            {REASONS.map((r) => (
              <Pick key={r} pressed={reason === r} onClick={() => setReason(r)}>
                {r}
              </Pick>
            ))}
          </div>
        </Field>
        <Field label="Message" htmlFor={msgId} error={msgErr}>
          <textarea
            id={msgId}
            rows={5}
            maxLength={MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Give us the details, such as the outlet, role or date involved."
            className="ap-input resize-y text-base"
            aria-invalid={msgErr ? true : undefined}
            aria-describedby={msgErr ? `${msgId}-err` : undefined}
          />
          <span className="text-right text-[12px] text-(--ap-faint) tabular-nums">
            {message.length} / {MAX}
          </span>
        </Field>
        <p className="text-[13px] text-(--ap-muted)">Please don&apos;t include passwords or bank details.</p>
        <button type="submit" className="ap-btn ap-btn-p h-12 self-start text-white! max-[480px]:w-full">
          <MessageSquareText className="size-4" aria-hidden="true" /> Send message
        </button>
      </form>
    </AnalyticsPanel>
  );
}

export type Q = { q: string; a: ReactNode };
export const FAQ: Q[] = [
  {
    q: "How do I ask Beeliv for more staff?",
    a: (
      <p>
        Open <Link href={NEW_REQUEST_HREF}>Workforce Requests</Link> and start a request. It doesn&apos;t publish a vacancy; Beeliv reviews it and updates you there.
      </p>
    ),
  },
  {
    q: "Where do I see candidates Beeliv has shortlisted?",
    a: (
      <p>
        In <PilotLink href="/client/recruitment">Recruitment</PilotLink>. Only candidates Beeliv HR deliberately submits for your review appear, and your feedback informs Beeliv&apos;s final decision.
      </p>
    ),
  },
  {
    q: "What do the attendance figures mean?",
    a: (
      <p>
        They show your scheduled staff for a day by status. Open <PilotLink href="/client/attendance">Attendance</PilotLink> to see who is behind each number.
      </p>
    ),
  },
  {
    q: "Why can't I see identity or bank details for my staff?",
    a: (
      <p>
        Identity and banking documents are kept by Beeliv and aren&apos;t shown to clients. <PilotLink href="/client/compliance">Documents &amp; Compliance</PilotLink> lists operational documents such as food-safety certificates.
      </p>
    ),
  },
  {
    q: "Can I see or make payments here?",
    a: (
      <p>
        <PilotLink href="/client/payroll">Payroll</PilotLink> shows the pay schedule only. Payment amounts are not shown and payments are not made from this app.
      </p>
    ),
  },
];

function Faq() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div id="faq" className="scroll-mt-[90px]">
    <AnalyticsPanel title="Quick answers">
      <ul className="m-0 list-none p-0">
        {FAQ.map((f) => (
          <FaqItem key={f.q} faq={f} open={open === f.q} onToggle={() => setOpen(open === f.q ? null : f.q)} />
        ))}
      </ul>
    </AnalyticsPanel>
    </div>
  );
}

function FaqItem({ faq, open, onToggle }: { faq: Q; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <li className="border-t border-(--ap-line-2) first:border-t-0">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className="flex min-h-12 w-full items-center gap-3 py-3 text-left">
        <b className="flex-1 text-[15px] font-bold text-(--ap-ink)">{faq.q}</b>
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
