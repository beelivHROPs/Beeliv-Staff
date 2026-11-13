"use client";

/**
 * Re-acceptance gate (project-lead decision 2, 2026-10-18). When a required agreement
 * has a new published version, the person sees ONLY this page until they accept it:
 * no navigation, no search, no business data and none of the app's business hooks run
 * (the shell renders this INSTEAD of its inner shell, like the setup-only branch).
 * Allowed: read the text, accept, sign out. Public pages (Privacy, Terms) never block.
 *
 * Presentation only. The real block is server-side (a per-person pending version and a
 * route guard); here the pending list comes from lib/reaccept/store.ts, which exists only
 * in the server-decided preview/demo mode.
 */
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Check, FileText } from "@/components/applicant/icons";
import { ReadButton } from "@/components/shared/agreements/AgreementReader";
import { acceptReaccept, useReaccept, type ReacceptApp } from "@/lib/reaccept/store";

const APP_NAME: Record<ReacceptApp, string> = { admin: "Beeliv Admin", client: "Beeliv Client", staff: "Beeliv Staff" };
const SIGN_IN: Record<ReacceptApp, string> = { admin: "/admin/login", client: "/client/login", staff: "/staff/login" };

export function ReacceptGate({ app, isOps = false, themeClass, children }: { app: ReacceptApp; isOps?: boolean; themeClass: string; children: ReactNode }) {
  const { pending } = useReaccept(app, isOps);
  if (pending.length === 0) return <>{children}</>;
  return <GateScreen key={`${pending[0].docId}-${pending[0].version}`} app={app} item={pending[0]} remaining={pending.length} themeClass={themeClass} />;
}

function GateScreen({ app, item, remaining, themeClass }: { app: ReacceptApp; item: ReturnType<typeof useReaccept>["pending"][number]; remaining: number; themeClass: string }) {
  const [read, setRead] = useState(false);
  const [busy, setBusy] = useState(false);
  const version = item.version.replace(/^v/, "");
  const canAccept = item.body !== null && item.body.trim() !== "";

  function accept() {
    setBusy(true);
    try {
      acceptReaccept(app, item);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh/var(--ps-zoom,1))] bg-(--ap-bg,transparent)">
      <header className="mx-auto flex h-[72px] w-full max-w-[920px] items-center justify-between gap-3 px-4">
        <Image src="/images/beeliv-logo-full-colour.png" alt="Beeliv Hospitality" width={197} height={207} priority className="h-[48px] w-auto" />
        <Link href={SIGN_IN[app]} className="ap-btn ap-btn-s h-10 rounded-full px-4 text-[14px] font-semibold">
          Sign out
        </Link>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-[920px] px-4 pt-4 pb-20 min-[768px]:pt-8">
        <section className="ap-card relative overflow-hidden rounded-[22px] p-5 min-[768px]:p-8" aria-labelledby="reaccept-title">
          <span className="absolute inset-x-0 top-0 h-1 bg-(--ap-violet)" aria-hidden="true" />
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-(--ap-tint) px-2.5 py-1 text-[12px] font-bold tracking-[.08em] text-(--ap-violet) uppercase">
            <FileText className="size-3.5" aria-hidden="true" />
            Needs your acceptance
          </span>
          <h1 id="reaccept-title" className="ap-serif mt-3 text-[30px] leading-tight min-[768px]:text-[34px]">
            Please review and accept the updated {item.title} (version {version})
          </h1>
          <p className="ap-bd mt-2 max-w-[62ch]">{APP_NAME[app]} stays closed until you accept this update. Nothing else changes about your account.</p>

          <div className="mt-5 rounded-[14px] border-l-4 border-(--ap-violet) bg-(--ap-tint) px-4 py-3">
            <b className="block text-[14px] font-bold text-(--ap-violet)">What changed</b>
            <p className="mt-0.5 text-[15px] leading-[1.55] whitespace-pre-wrap text-(--ap-ink)">{item.changeNote || "No note was added."}</p>
          </div>

          {canAccept ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ReadButton title={item.title} version={item.version} body={item.body} themeClass={themeClass} onRead={() => setRead(true)} />
              <span className="ap-sm text-(--ap-muted)" aria-live="polite">
                {read ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="size-4" aria-hidden="true" /> You have read it.
                  </span>
                ) : (
                  "Read it first. Then you can accept."
                )}
              </span>
            </div>
          ) : (
            <p className="ap-bd mt-5 rounded-xl bg-(--ap-tint-soft) px-3.5 py-3 text-(--ap-muted)">Wording pending from Beeliv. There is nothing to accept yet.</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={accept} disabled={busy || !canAccept || !read} className="ap-btn ap-btn-p h-12 rounded-full px-7 text-[15px] font-semibold text-white! disabled:opacity-50">
              Accept and continue
            </button>
            {remaining > 1 ? <span className="ap-sm text-(--ap-muted)">{remaining - 1} more to review after this one.</span> : null}
          </div>
          <p className="ap-sm mt-5 text-(--ap-muted)">Need help or have a question? Contact Beeliv before you accept.</p>
        </section>
      </main>
    </div>
  );
}
