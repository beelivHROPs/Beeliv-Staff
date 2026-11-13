/**
 * Homepage FAQ — public entry surface. Every answer is grounded in an
 * already-confirmed fact — no invented timelines, no "usually takes X days"
 * promises, since none is confirmed anywhere (recruitment-workflow.md §E
 * explicitly leaves timing/duration open). Prioritized around what a real
 * applicant actually wonders about (cost, privacy) over generic UX-flow
 * questions — a first pass here was too generic, this is the revision.
 * Native <details>/<summary> — zero JS, no new dependency, fully
 * keyboard/screen-reader accessible by default.
 *
 * Open/close height animates via the CSS-only `grid-template-rows: 0fr →
 * 1fr` technique (not the newer `interpolate-size` property, which is
 * Chromium-only right now and would leave Firefox/Safari visitors with no
 * animation at all) — researched this session specifically because
 * `<details>` has no animation by default and snaps instantly, which read
 * as noticeably cheaper than reference sites (Stripe/Linear). Still no new
 * dependency: Base UI (this project's actual primitives library) does ship
 * an Accordion, but at 5 static items it adds no capability native
 * `<details>` doesn't already have for free.
 */
const FAQ_ITEMS = [
  {
    // docs/BEELIV-SOURCE-OF-TRUTH.md §7, Terms & Declarations item 5 — the
    // "may apply" conditional wording is kept deliberately, not overstated
    // as a guaranteed charge.
    question: "Is there a fee to apply?",
    answer:
      "No. You can explore available positions and submit an application without paying an application fee. However, for candidates who are directly recruited and successfully placed into employment through Beeliv HR, a one-off placement fee of 20% of the applicable first-month emolument may apply, as communicated and agreed during the recruitment and placement process. This is a one-time placement charge and is not a recurring monthly fee.",
  },
  {
    // docs/BEELIV-SOURCE-OF-TRUTH.md §8 — Assigned HR (own outlet,
    // authorized) / Head of Operations (broader, authorized) / Client
    // (not unless specifically authorized).
    question: "Who can see my personal and sensitive information?",
    answer:
      "Beeliv takes the protection of sensitive personal information seriously. Access to information such as identification documents and bank details is restricted based on authorized roles and operational requirements. Authorized HR personnel may access relevant information within their assigned operational scope, while management may have broader access where necessary. Clients and outlet representatives do not automatically have access to sensitive personal documentation unless specifically authorized.",
  },
  {
    question: "When will I need to provide sensitive information such as my NIN or bank details?",
    answer:
      "Sensitive information is not required when you first explore available positions. Where required, information such as identification and banking details will be requested during the appropriate documentation stage of the recruitment process. You will be guided when additional information or documentation is required.",
  },
  {
    question: "Can I check the status of my application?",
    answer:
      "Yes. Once you have created an account and submitted an application, you can sign in to your applicant portal to view your application status and receive updates about your progress. We will also notify you when an important action or update requires your attention.",
  },
  {
    question: "What happens if my application isn't successful?",
    answer:
      "If you do not meet the requirements for a particular stage of the recruitment process, your application may not proceed further. Your application history may still be retained for Beeliv's recruitment records in accordance with its applicable record-management and privacy practices. A decision not to proceed with an application does not necessarily prevent you from applying for other suitable opportunities in the future.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      aria-label="Frequently asked questions"
      className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-12 sm:px-6"
    >
      <h2 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
        Frequently asked questions
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Everything you need to know before starting your application.
      </p>
      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground marker:content-none">
              {item.question}
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            {/* Outer grid row animates 0fr → 1fr (the actual height
                transition); inner overflow-hidden clips the answer text
                while that row is still collapsed/animating. Padding lives
                on the <p> itself so it collapses to nothing when closed
                instead of leaving a fixed gap (no more separate open:pb-4). */}
            <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-open:grid-rows-[1fr]">
              <div className="overflow-hidden">
                <p className="pt-2 text-sm text-muted-foreground">{item.answer}</p>
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
