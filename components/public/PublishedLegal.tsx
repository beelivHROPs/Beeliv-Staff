"use client";

/**
 * Privacy / Terms page. Shows the current PUBLISHED version (version + effective date)
 * when one exists, otherwise keeps the existing placeholder. Never shows a draft. Plain
 * text only (rendered as text, never HTML). Mock only: the data comes from the
 * agreements adapter, which has nothing published unless the dev-only
 * `?demo=agreements-sample` sample is on or Operations published in this same browser
 * session. Wording is Beeliv's: nothing here writes it.
 */
import { LegalPlaceholder } from "@/components/public/LegalPlaceholder";
import { PageHeader } from "@/components/public/PageHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { MenuProvider } from "@/components/public/SiteHeader";
import { Btn } from "@/components/public/kit";
import { Eyebrow } from "@/components/public/primitives";
import { usePublicDocument } from "@/lib/admin/agreements/hooks";
import { formatDate } from "@/lib/applicant/time";
import { ROUTES } from "@/lib/public-site/content";

export function PublishedLegal({ id, title, eyebrow }: { id: "privacy" | "terms"; title: string; eyebrow: string }) {
  const live = usePublicDocument(id);
  const doc = live.data;
  if (!doc) return <LegalPlaceholder title={title} eyebrow={eyebrow} />;
  return (
    <MenuProvider>
      <PageHeader activeHref="" />
      <main className="mx-auto max-w-[calc(1440*var(--u))]">
        <article className="flex flex-col gap-[18px] px-5 pt-10 pb-20 wf-d:max-w-[820px] wf-d:gap-[22px] wf-d:px-[calc(80*var(--u))] wf-d:pt-16">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="ps-serif [--fs-d:48] [--fs-m:30]">{doc.title}</h1>
          <p className="ps-bd !text-[15px] opacity-80">
            Version {doc.version.replace(/^v/, "")} · Effective {formatDate(doc.effectiveAt)}
          </p>
          <div className="ps-bd !text-[17px] whitespace-pre-wrap">{doc.body}</div>
          <div className="flex flex-col gap-3 pt-1.5 wf-d:flex-row wf-d:gap-3.5">
            <Btn href={ROUTES.contact} label="Contact Beeliv" variant="bp" />
            <Btn href="/" label="Back to home" variant="bo" />
          </div>
        </article>
      </main>
      <SiteFooter />
    </MenuProvider>
  );
}
