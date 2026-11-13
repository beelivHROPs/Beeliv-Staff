"use client";

import { ArrowRight, Check, ChevronRight, Clock3, FileCheck2, MapPin, UserRound, Video } from "@/components/applicant/icons";
import type { ApplicantJob } from "@/lib/applicant/jobs";
import { BellButton, Cover, SaveButton, Thin, appProgress, describeApplicationStatus, formatDueLabel, initialsOf, interviewParts, jobFacts, jobTag, useHomeData, when } from "./shared";

/** Option B: calmer and list-led. Profile card, To do list, interview, vertical job rows. */
export function OptionB({ jobs }: { jobs: ApplicantJob[] }) {
  const d = useHomeData(jobs);
  const iv = d.interview;
  const ivParts = iv ? interviewParts(iv.applicationLabel) : null;
  const pct = d.completeness.percent;
  const done = pct >= 100;

  const todo: { icon: typeof UserRound; title: string; sub: string }[] = [
    ...d.docsDue.map((x) => ({
      icon: FileCheck2,
      title: `Upload ${x.name.charAt(0).toLowerCase()}${x.name.slice(1)}`,
      sub: x.due ? formatDueLabel(x.due) : "Required document",
    })),
    ...d.completeness.missing.map((m) => ({ icon: UserRound, title: m, sub: "Profile" })),
  ].slice(0, 4);

  return (
    <div className="dp-b">
      <header className="dp-top dp-top-b">
        <div>
          <p className="dp-greet">{d.greeting},</p>
          <h1 className="dp-name">{d.first}</h1>
        </div>
        <BellButton dot />
      </header>

      {/* Profile completion: kept from the current design, calmer */}
      <section className="dp-pad dp-sec" aria-label="Profile completion">
        <div className="dp-prof">
          <div className="dp-prof-top">
            <span className="dp-ring" aria-hidden="true">
              <svg viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="4" />
                <circle cx="26" cy="26" r="22" fill="none" stroke="#C1AC75" strokeWidth="4" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`} transform="rotate(-90 26 26)" />
              </svg>
              {done ? <Check className="size-5" strokeWidth={2.4} /> : <b>{pct}%</b>}
            </span>
            <div className="dp-grow">
              <p className="dp-prof-k">Profile completion</p>
              <h2 className="dp-prof-t">{done ? "Profile complete" : `${pct}% complete`}</h2>
              <p className="dp-prof-s">{d.completeness.summary}</p>
            </div>
          </div>
          {done ? null : (
            <button type="button" className="dp-pill dp-pill-light">
              Finish profile <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      {/* To do */}
      <section className="dp-pad dp-sec" aria-label="To do">
        <div className="dp-sechead">
          <h2 className="dp-h2">To do</h2>
          {todo.length ? <span className="dp-count">{todo.length} open</span> : null}
        </div>
        <ul className="dp-box dp-list">
          {todo.length === 0 ? (
            <li className="dp-empty">You are all caught up. Nothing needs your attention.</li>
          ) : (
            todo.map((t) => (
              <li key={t.title}>
                <button type="button" className="dp-row">
                  <t.icon className="size-5 dp-row-ic" strokeWidth={1.6} aria-hidden="true" />
                  <span className="dp-grow">
                    <b className="dp-t">{t.title}</b>
                    <span className="dp-sub dp-block">{t.sub}</span>
                  </span>
                  <ChevronRight className="size-[18px] dp-chev" aria-hidden="true" />
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Upcoming interview */}
      <section className="dp-pad dp-sec" aria-label="Upcoming interview">
        <div className="dp-sechead">
          <h2 className="dp-h2">Upcoming interview</h2>
        </div>
        <div className="dp-box">
          {iv?.scheduledAt && ivParts ? (
            <div className="dp-iv">
              <h3 className="dp-t dp-iv-t">Interview with {ivParts.company}</h3>
              <p className="dp-sub">{ivParts.role} position</p>
              <dl className="dp-dl">
                <div>
                  <dt>
                    <Clock3 className="size-4" strokeWidth={1.7} aria-hidden="true" /> When
                  </dt>
                  <dd>{when(iv.scheduledAt)} WAT</dd>
                </div>
                <div>
                  <dt>
                    <Video className="size-4" strokeWidth={1.7} aria-hidden="true" /> Where
                  </dt>
                  <dd>{/google meet/i.test(iv.mode ?? "") ? "Virtual (Google Meet)" : iv.mode}</dd>
                </div>
              </dl>
              <button type="button" className="dp-pill">
                Join interview <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <p className="dp-empty">Nothing scheduled. When an interview is booked, the date, time and link show here.</p>
          )}
        </div>
      </section>

      {/* Roles for you */}
      <section className="dp-pad dp-sec" aria-label="Roles for you">
        <div className="dp-sechead">
          <h2 className="dp-h2">Roles for you</h2>
          <button type="button" className="dp-link">
            See all
          </button>
        </div>
        <ul className="dp-box dp-list">
          {d.roles.slice(0, 3).map((j) => (
            <li key={j.id}>
              <JobRowB job={j} />
            </li>
          ))}
        </ul>
      </section>

      {/* Applications */}
      <section className="dp-pad dp-sec" aria-label="Your applications">
        <div className="dp-sechead">
          <h2 className="dp-h2">Your applications</h2>
          <button type="button" className="dp-link">
            See all
          </button>
        </div>
        <ul className="dp-box dp-list">
          {d.submitted.slice(0, 3).map((a) => {
            const p = appProgress(a);
            const st = describeApplicationStatus(a);
            return (
              <li key={a.id}>
                <button type="button" className="dp-approw">
                  <span className="dp-logo dp-logo-sq" aria-hidden="true">
                    {initialsOf(a.company)}
                  </span>
                  <span className="dp-grow">
                    <b className="dp-t">{a.role}</b>
                    <span className="dp-sub dp-block">
                      {a.company} · {a.location}
                    </span>
                    <Thin pct={p.pct} label={`${a.role} progress`} />
                    <span className="dp-sub dp-block dp-sm">
                      Stage {p.stage} of {p.total} · <span className="dp-strong">{st.label}</span>
                    </span>
                  </span>
                  <ChevronRight className="size-[18px] dp-chev" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <div className="dp-end" />
    </div>
  );
}

function JobRowB({ job }: { job: ApplicantJob }) {
  const tag = jobTag(job);
  const f = jobFacts(job);
  return (
    <div className="dp-jobB">
      <button type="button" className="dp-jobB-main">
        <span className="dp-thumb">
          <Cover job={job} />
        </span>
        <span className="dp-grow">
          {tag ? <span className={`dp-tag dp-tag-inline ${tag === "Closing soon" ? "dp-tag-gold" : ""}`}>{tag}</span> : null}
          <b className="dp-t dp-jobB-t">{job.role}</b>
          <span className="dp-sub dp-block">
            {job.company} · <MapPin className="dp-inl" strokeWidth={1.7} aria-hidden="true" />
            {job.location}
          </span>
          <span className="dp-facts">
            {f.type}
            <i aria-hidden="true">·</i>
            <b>{f.pay}</b>
          </span>
          <span className="dp-posted">{job.postedLabel}</span>
        </span>
      </button>
      <SaveButton title={job.role} />
    </div>
  );
}
