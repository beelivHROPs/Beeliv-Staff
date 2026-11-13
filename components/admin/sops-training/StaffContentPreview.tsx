"use client";

/**
 * "How staff see this": a read-only rendering of an SOP / training course /
 * agreement in the Staff app's own presentation (section rail + reading card
 * for SOPs, header facts + purpose + content + progress for training, accept
 * card for agreements), built from the Staff app's own pieces (CARD,
 * SectionCard, Chip, ProgressBar, ImageRoom, ap-* type classes).
 *
 * It mirrors the Staff reader instead of importing SopReader because that
 * component is bound to the Staff data service and /staff routes: using it here
 * would record real progress. Nothing in this preview is saved; every staff
 * action is disabled. The PDF and video slots are the project lead's locked
 * template; the Staff reader has no slot for them yet (Staff-app follow-up).
 */
import { ArrowRight, Eye, ExternalLink, FileText, ShieldCheck, Video } from "@/components/applicant/icons";
import { SANDBOX_OPEN, SANDBOX_TRUSTED, embedFor } from "@/components/staff/sops/embed";
import { safeHttpsUrl } from "@/lib/staff/sops/derive";
import { Chip, DETAIL_TITLE, ProgressBar } from "@/components/applicant/primitives";
import { CARD, SectionCard } from "@/components/applicant/SectionCard";
import { ImageRoom } from "@/components/staff/ImageRoom";
import type { ContentDetail } from "@/lib/admin/sops-training/types";
import { formatYmd, KIND_WORD } from "./meta";

export function StaffContentPreview({ d }: { d: ContentDetail }) {
  return (
    <div>
      <div className="ap-card mb-4 flex items-start gap-3 rounded-2xl p-4" role="note">
        <Eye className="mt-0.5 size-5 shrink-0 text-(--ap-violet)" aria-hidden="true" />
        <p className="min-w-0 text-[14px] leading-snug text-(--ap-ink-2)">
          <b>Preview.</b> This is how staff see this {KIND_WORD[d.kind]} in the Staff app
          {d.status === "published" ? "" : d.liveVersion ? `. Staff still see ${d.liveVersion} until ${d.version} is published` : ". Staff cannot see it until it is published"}. Nothing is saved from here.
        </p>
      </div>
      <div className="@container rounded-[20px] border border-dashed border-(--ap-line) p-3 min-[768px]:p-5">
        {d.kind === "sop" ? <SopPreview d={d} /> : d.kind === "training" ? <TrainingPreview d={d} /> : <AgreementPreview d={d} />}
      </div>
    </div>
  );
}

/** The optional PDF viewer + download and the optional video slot. */
function Attachments({ d }: { d: ContentDetail }) {
  const showPdf = !!d.pdf && !d.video;
  if (!showPdf && !d.video) return null;
  return (
    <div className="mt-5 flex flex-col gap-3">
      {showPdf && d.pdf ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-(--ap-line) p-3.5">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-[14px] break-words text-(--ap-ink)">{d.pdf.fileName}</b>
            <span className="text-[12px] text-(--ap-muted)">PDF link</span>
          </div>
          {d.pdf.url ? (
            <a href={d.pdf.url} target="_blank" rel="noopener noreferrer" className="ap-btn ap-btn-s ap-btn-sm">
              <Eye className="size-4" aria-hidden="true" /> Open PDF
            </a>
          ) : null}
        </div>
      ) : null}
      {d.video ? (
        <div className="overflow-hidden rounded-2xl border border-(--ap-line)">
          {/* 16:9 player frame with a play button; the demo stores no file, so the button is only a picture of the player. */}
          <div className="relative flex aspect-video w-full items-center justify-center bg-[linear-gradient(135deg,var(--ap-tint),var(--ap-tint-2))] text-(--ap-violet)">
            <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-(--ap-violet) text-white shadow-(--ap-shadow) min-[768px]:size-[72px]">
              <svg viewBox="0 0 24 24" className="ml-1 size-7 fill-current" aria-hidden="true">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
              </svg>
            </span>
            <span className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-black/35 px-3.5 py-2 text-[12px] font-semibold text-white">
              <span aria-hidden="true">Play</span>
              <span aria-hidden="true" className="h-1 flex-1 rounded-full bg-white/35"><span className="block h-full w-0 rounded-full bg-white" /></span>
              <span aria-hidden="true">0:00</span>
            </span>
          </div>
          <p className="px-3.5 py-3 text-[13px] break-all text-(--ap-muted)">{d.video.mode === "link" ? `Video link: ${d.video.url}` : `Video: ${d.video.fileName}`}</p>
        </div>
      ) : null}
    </div>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="mt-3 flex flex-col gap-3">
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="ap-bd">
          {p}
        </p>
      ))}
    </div>
  );
}

function SopPreview({ d }: { d: ContentDetail }) {
  // Staff SOPs are links: the saved video link, else the saved PDF link. Same 16:9 / framed reader as the Staff app.
  const link = d.video?.mode === "link" ? d.video.url : d.pdf?.url;
  const href = link ? safeHttpsUrl(link) : null;
  const embed = href ? embedFor(href, d.video ? "video" : "document") : null;
  const video = embed?.mode === "video";
  const Kind = d.video ? Video : FileText;
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet)">
          <Kind className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="text-[17px] font-bold break-words text-(--ap-ink)">{d.title}</h2>
          <p className="text-[14px] text-(--ap-muted)">
            {d.category} · {d.video ? "Video" : "Document"} · {d.version}
            {d.required ? " · Needs sign-off" : ""}
            {d.effectiveDate ? ` · Effective ${formatYmd(d.effectiveDate)}` : ""}
          </p>
        </div>
      </div>
      {embed && href ? (
        <div className="flex flex-col gap-2">
          {/* One frame height for every kind of item, as in the Staff reader. */}
          <div className={`flex h-[min(64dvh,680px)] min-h-[340px] items-center justify-center overflow-hidden rounded-[22px] border border-(--ap-line) ${video ? "bg-black max-[767px]:h-auto max-[767px]:min-h-0" : "bg-white"}`}>
            <iframe
              src={embed.src}
              title={`${d.title} (${embed.host})`}
              sandbox={embed.trusted ? SANDBOX_TRUSTED : SANDBOX_OPEN}
              referrerPolicy={embed.trusted ? "strict-origin-when-cross-origin" : "no-referrer"}
              allow={video ? "fullscreen; picture-in-picture; encrypted-media" : undefined}
              allowFullScreen={video}
              className={video ? "aspect-video w-[min(100%,calc(min(64dvh,680px)*16/9))] border-0 bg-black max-[767px]:w-full" : "size-full border-0 bg-white"}
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="flex min-w-0 items-center gap-2 text-[14px] text-(--ap-muted)">
              <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">From {embed.host}</span>
            </p>
            <a href={href} target="_blank" rel="noopener noreferrer" className="ap-btn ap-btn-s ap-btn-sm">
              <ExternalLink className="size-4" aria-hidden="true" /> Open in a new tab
            </a>
          </div>
        </div>
      ) : (
        <div className={`${CARD} mx-auto w-full max-w-[560px] text-center`}>
          <p className="text-[16px] font-bold text-(--ap-ink)">{href ? "This one opens in its own tab" : "No link added yet"}</p>
          <p className="mt-1 text-[14px] text-(--ap-muted)">{href ? "It can't be shown inside the app, so staff are sent to it in a new tab." : "Add a document or video link on the edit screen. Staff open SOPs from a link."}</p>
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="ap-btn ap-btn-p mt-4 h-12 w-full">
              <ExternalLink className="size-4" aria-hidden="true" /> Open in a new tab
            </a>
          ) : null}
        </div>
      )}
      {d.summary ? <p className="w-full text-[16px] leading-relaxed text-(--ap-ink-2)">{d.summary}</p> : null}
    </div>
  );
}

const TYPE_LABEL = { course: "Course", video: "Video", document: "Document", practical: "Practical" } as const;

function TrainingPreview({ d }: { d: ContentDetail }) {
  const facts: [string, string][] = [
    ["Category", d.category],
    ["Format", `${TYPE_LABEL[d.trainingType]}${d.durationMinutes ? ` - ${d.durationMinutes} min` : ""}`],
    ["Due", d.dueDate ? formatYmd(d.dueDate) : "No due date"],
  ];
  return (
    <div>
      <header className={`${CARD} mb-5`}>
        <div className="mb-3 flex flex-wrap gap-2">
          <Chip tone="violet">Training</Chip>
          <Chip tone="violet">Assigned</Chip>
          {d.required ? <Chip tone="warn">Required</Chip> : null}
        </div>
        <h2 className={DETAIL_TITLE}>{d.title}</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 @min-[560px]:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="ap-label text-(--ap-muted)">{k}</dt>
              <dd className="ap-sm mt-1 rounded-xl border border-(--ap-line) bg-(--ap-tint-soft) px-3 py-2 font-semibold break-words text-(--ap-ink)">{v}</dd>
            </div>
          ))}
        </dl>
      </header>
      <div className="flex flex-col gap-5 @min-[860px]:grid @min-[860px]:grid-cols-[minmax(0,1fr)_300px] @min-[860px]:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <SectionCard title="Purpose">
            <p className="ap-bd">{d.summary || "No description yet."}</p>
          </SectionCard>
          <SectionCard title="Content">
            {d.sections.map((s) => (
              <div key={s.id} className="mb-4 last:mb-0">
                <b className="ap-title block">{s.title}</b>
                <Paragraphs text={s.body} />
              </div>
            ))}
            {d.sections.length === 0 && !d.video ? <ImageRoom src={null} icon={FileText} className="h-[140px] w-full rounded-2xl" iconClassName="size-10" /> : null}
            <Attachments d={d} />
          </SectionCard>
        </div>
        <SectionCard title="Your progress" aside>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="ap-label text-(--ap-muted)">{d.dueDate ? `Due ${formatYmd(d.dueDate)}` : "No due date"}</span>
            <span className="ap-label text-(--ap-muted)">0%</span>
          </div>
          <ProgressBar percent={0} label="Preview progress" />
          <button type="button" disabled title="Preview only" className="ap-btn ap-btn-p mt-5 h-12 w-full">
            Start training <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </SectionCard>
      </div>
    </div>
  );
}

function AgreementPreview({ d }: { d: ContentDetail }) {
  return (
    <div className="mx-auto max-w-[680px]">
      <SectionCard title={d.title}>
        <div className="mb-3 flex flex-wrap gap-2">
          <Chip tone="violet">Agreement</Chip>
          <Chip tone="mute">{d.version}</Chip>
          {d.required ? <Chip tone="warn">Required</Chip> : null}
        </div>
        <p className="ap-bd">{d.summary || "No summary yet."}</p>
        {d.sections.map((s) => (
          <div key={s.id} className="mt-4 rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) p-4">
            <b className="ap-title block">{s.title}</b>
            <Paragraphs text={s.body} />
          </div>
        ))}
        <Attachments d={d} />
        <label className="mt-5 flex items-start gap-2.5 text-[15px] text-(--ap-ink-2)">
          <input type="checkbox" disabled className="mt-1 size-4" /> I have read and accept this agreement.
        </label>
        <button type="button" disabled title="Preview only" className="ap-btn ap-btn-p mt-4 h-12 w-full">
          Accept
        </button>
      </SectionCard>
    </div>
  );
}
