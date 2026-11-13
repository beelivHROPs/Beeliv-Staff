"use client";

import { ArrowRight, BriefcaseBusiness, ChevronRight, Clock3, FileCheck2, FolderOpen, Layers, MapPin, Search, UserRound, Video } from "@/components/applicant/icons";
import type { ApplicantJob } from "@/lib/applicant/jobs";
import { BellButton, Cover, SaveButton, Thin, appProgress, describeApplicationStatus, formatDueLabel, initialsOf, interviewParts, jobFacts, jobTag, useHomeData, when } from "./shared";

/** Option A: visual and softer. Hero "Next up", quick menu, sideways progress + job cards. */
export function OptionA({ jobs }: { jobs: ApplicantJob[] }) {
  const d = useHomeData(jobs);
  const iv = d.interview;
  const ivParts = iv ? interviewParts(iv.applicationLabel) : null;
  const nextAction = d.current?.next ?? null;
  const pct = d.completeness.percent;
  const active = d.submitted.length;

  return (
    <div className="dp-a">
      <header className="dp-top">
        <div className="dp-who">
          <span className="dp-avatar" aria-hidden="true">
            {initialsOf(`${d.first} Okafor`)}
          </span>
          <div>
            <p className="dp-greet">{d.greeting},</p>
            <h1 className="dp-name">{d.first}</h1>
          </div>
        </div>
        <BellButton dot />
      </header>

      <div className="dp-pad">
        <label className="dp-search">
          <Search className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />
          <span className="dp-sr">Search roles</span>
          <input type="search" placeholder="Search roles, places, venues" />
        </label>
      </div>

      {/* Hero: one soft-tinted card, one main action */}
      <section className="dp-pad dp-sec" aria-label="Next up">
        <div className="dp-hero">
          <p className="dp-eyebrow">Next up</p>
          {iv?.scheduledAt && ivParts ? (
            <>
              <div className="dp-hero-row">
                <span className="dp-date" aria-hidden="true">
                  <small>{new Date(iv.scheduledAt).toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}</small>
                  <b>{new Date(iv.scheduledAt).getDate()}</b>
                </span>
                <div className="dp-grow">
                  <h2 className="dp-hero-title">Interview with {ivParts.company}</h2>
                  <p className="dp-sub">{ivParts.role} position</p>
                </div>
              </div>
              <ul className="dp-meta">
                <li>
                  <Clock3 className="size-4" strokeWidth={1.7} aria-hidden="true" />
                  {when(iv.scheduledAt)} WAT
                </li>
                <li>
                  <Video className="size-4" strokeWidth={1.7} aria-hidden="true" />
                  {/google meet/i.test(iv.mode ?? "") ? "Virtual (Google Meet)" : iv.mode}
                </li>
              </ul>
              <div className="dp-hero-actions">
                <button type="button" className="dp-pill">
                  Join interview <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
                </button>
                <button type="button" className="dp-pill-2">
                  Details
                </button>
              </div>
            </>
          ) : nextAction ? (
            <>
              <h2 className="dp-hero-title">{nextAction.label}</h2>
              <p className="dp-sub">{nextAction.detail}</p>
              <div className="dp-hero-actions">
                <button type="button" className="dp-pill">
                  {nextAction.ctaLabel} <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="dp-hero-title">Find your next role</h2>
              <p className="dp-sub">Applying takes about 10 minutes and saves as you go.</p>
              <div className="dp-hero-actions">
                <button type="button" className="dp-pill">
                  Browse jobs <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Quick menu: four labelled shortcuts, single-colour line icons */}
      <nav className="dp-pad dp-sec dp-quick" aria-label="Quick menu">
        {[
          { icon: BriefcaseBusiness, label: "Jobs" },
          { icon: Layers, label: "Applications", n: active },
          { icon: FolderOpen, label: "Documents", n: d.docsDue.length },
          { icon: UserRound, label: "Profile" },
        ].map((q) => (
          <button key={q.label} type="button" className="dp-q">
            <span className="dp-q-ic">
              <q.icon className="size-[24px]" strokeWidth={1.6} aria-hidden="true" />
              {q.n ? <i className="dp-q-n">{q.n}</i> : null}
            </span>
            <span className="dp-q-l">{q.label}</span>
          </button>
        ))}
      </nav>

      {/* Sideways progress cards */}
      <section className="dp-sec" aria-label="Your progress">
        <h2 className="dp-h2 dp-pad">Your progress</h2>
        <div className="dp-hscroll">
          <button type="button" className="dp-stat">
            <span className="dp-stat-k">
              <FileCheck2 className="size-4" strokeWidth={1.7} aria-hidden="true" /> Documents due
            </span>
            <b className="dp-stat-v">{d.docsDue.length ? `${d.docsDue.length} to upload` : "All sent"}</b>
            <span className="dp-stat-s">{d.nextDue ? formatDueLabel(d.nextDue) : "Nothing needed"}</span>
          </button>
          <button type="button" className="dp-stat">
            <span className="dp-stat-k">
              <UserRound className="size-4" strokeWidth={1.7} aria-hidden="true" /> Profile
            </span>
            <b className="dp-stat-v">{pct}% complete</b>
            <Thin pct={pct} label="Profile completion" />
            <span className="dp-stat-s">{d.completeness.missing[0] ? `Next: ${d.completeness.missing[0]}` : "All set"}</span>
          </button>
          <button type="button" className="dp-stat">
            <span className="dp-stat-k">
              <Layers className="size-4" strokeWidth={1.7} aria-hidden="true" /> Applications
            </span>
            <b className="dp-stat-v">{active} active</b>
            <span className="dp-stat-s">{d.current ? `${d.current.role}, ${d.current.company}` : "Start your first"}</span>
          </button>
        </div>
      </section>

      {/* Roles for you */}
      <section className="dp-sec" aria-label="Roles for you">
        <div className="dp-sechead dp-pad">
          <h2 className="dp-h2">Roles for you</h2>
          <button type="button" className="dp-link">
            See all
          </button>
        </div>
        <div className="dp-hscroll dp-snap">
          {d.roles.slice(0, 4).map((j) => (
            <JobCardA key={j.id} job={j} />
          ))}
        </div>
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
                  <span className="dp-logo" aria-hidden="true">
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

function JobCardA({ job }: { job: ApplicantJob }) {
  const tag = jobTag(job);
  const f = jobFacts(job);
  return (
    <article className="dp-jobA">
      <div className="dp-photo">
        <Cover job={job} />
        {tag ? <span className={`dp-tag ${tag === "Closing soon" ? "dp-tag-gold" : ""}`}>{tag}</span> : null}
        <SaveButton title={job.role} />
      </div>
      <button type="button" className="dp-jobA-body">
        <b className="dp-t">{job.role}</b>
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
      </button>
    </article>
  );
}
