"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, ChevronDown, ChevronLeft, LogOut, RefreshCw } from "@/components/applicant/icons";
import { INPUT_CLS } from "@/components/applicant/apply/parts";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { FieldError } from "@/components/applicant/form-feedback";
import { SubmitButton } from "@/components/public/auth/fields";
import "@/app/(public)/(auth)/auth.css";
import { PhoneInput } from "@/components/applicant/form-fields";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { toast } from "@/components/ui/toast";
import { ReadButton } from "@/components/shared/agreements/AgreementReader";
import { SetupFailureNotice } from "@/components/shared/SetupFailureNotice";
import { SetupStateGate } from "@/components/shared/SetupStateGate";
import { ConflictNotice, OutcomeUnknownNotice } from "@/components/shared/states";
import { useSetup } from "@/lib/admin/setup/hooks";
import type { SetupAdapter } from "@/lib/admin/setup/adapter";
import { type AdminSetup, SetupActionError, type SetupAgreement } from "@/lib/admin/setup/types";
import type { AuthMode } from "@/lib/auth/mode";
import { authPaths } from "@/lib/auth/portals";
import type { Portal } from "@/lib/auth/types";
import { phoneError } from "@/lib/phone/phone";
import { usePortalSignOut } from "@/lib/ui/use-portal-sign-out";
import type { GlyphName } from "@/components/shared/icons/BoldTile";
import { firstName, heroSurface, JOURNEY_FOCUS as FOCUS, JourneyHeroDeco, JourneyRing, type RailRow, StepRail } from "./journey";

// The auth screens' button (au-btn-hero) reads the public-site tokens; map them to this app's own colours.
const AU_VARS = { "--beeliv-purple": "var(--ap-violet)", "--deep-plum": "var(--ap-plum)", "--muted-text": "var(--ap-muted)", "--ps-ease": "cubic-bezier(0.22, 1, 0.36, 1)" } as CSSProperties;

/**
 * The ONE guided account setup + onboarding page for every invited person (Client, Admin, Staff).
 *
 * Layout (docs/ONBOARDING-FLOW-MERGED-2026-11-12.md, look from the approved Staff onboarding journey):
 *   Desktop (1024px and up): two columns. Left, sticky: the hero (welcome, one honest line) and the progress panel
 *     (ring, the ordered steps done / now / upcoming, and the "After setup" profile items greyed). Right: ONE step at a
 *     time in a spacious card, eyebrow + H2 + one-line reason, Back on the left and ONE primary action bottom right.
 *   Below 1024px: one column. Compact hero with the ring and "Step X of N", done steps as one line each with Edit,
 *     the current step card, a collapsible "All steps" list, and a sticky bottom bar holding Back and the primary action.
 *
 * Steps: Your details; each required agreement (only when Beeliv has published wording; explicit Accept after reading);
 *   each optional agreement with published wording (Accept or "No thanks", never blocking); Admin: the authenticator.
 *   Saving a step moves to the next one; when every step is done the setup finishes by itself.
 * "Complete your profile" items are never blocking; here they are a greyed "After setup" preview (the pending person
 *   cannot reach those screens yet); after setup they are the Getting started card on Home (GettingStarted.tsx).
 *
 * Unchanged on purpose: the setup requests (setup / setup-profile / setup-agreement / setup-finish with
 * the revision per request) and the finish rule. The UI navigates ONLY after the server says `active`.
 * Outcome-unknown, conflict and typed-failure notices are the shared ones.
 * Left out of setup: documents, bank/NIN. They are never blocking.
 */
export type ProfileStepPreview = { id: string; title: string; why: string };

export type AccountSetupProps = {
  portal: Extract<Portal, "client" | "admin" | "staff">;
  mode: AuthMode;
  service: SetupAdapter;
  /** e.g. "Beeliv Client". */
  brand: string;
  /** What opens when setup is done, e.g. "Your client workspace". */
  what: string;
  /** Where the person goes once the server confirms setup is complete. */
  home: string;
  /** Contact link; defaults to the public contact page. */
  supportHref?: string;
  /** Theme classes for the agreement reader portal (Admin passes ADMIN_THEME). */
  themeClass?: string;
  /** Admin only: renders the mandatory authenticator step. Call onVerified after it succeeds. */
  renderSecurity?: (ctx: { onVerified: () => void; preview: boolean }) => ReactNode;
  /** The non-blocking "Complete your profile" steps this app will offer on Home. Empty for Admin. */
  profileSteps?: ProfileStepPreview[];
};

export function AccountSetup(props: AccountSetupProps) {
  const { portal, mode, service } = props;
  const live = useSetup(service);
  const paths = authPaths(portal);
  const ready = live.status !== "loading" && live.data && live.data.state === "pending-setup";
  return (
    <div className={`mx-auto min-h-dvh w-full px-4 pt-4 pb-6 min-[768px]:px-8 min-[768px]:pt-8 min-[1024px]:pb-16 ${ready ? "max-w-[1120px]" : "max-w-[640px]"}`}>
      {live.status === "loading" ? (
        <div role="status" aria-busy="true" aria-label="Loading account setup" className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-12 min-[1024px]:grid min-[1024px]:grid-cols-[minmax(0,380px)_minmax(0,1fr)] min-[1024px]:items-start min-[1024px]:gap-8">
          <h1 className="sr-only">Account setup</h1>
          <div className="flex flex-col gap-5">
            <div className="ap-sk-box h-[150px] rounded-[26px] min-[1024px]:h-[220px]" />
            <div className="ap-sk-box h-[260px] rounded-[22px] max-[1023px]:hidden" />
          </div>
          <div className="ap-sk-box h-[380px] rounded-[22px]" />
        </div>
      ) : !live.data ? (
        <div className="pt-4">
          <h1 className="sr-only">Account setup</h1>
          <ErrorPanel title="We couldn't load your account setup" retry={live.retry} />
        </div>
      ) : live.data.state !== "pending-setup" ? (
        <SetupStateGate state={live.data.state} what={props.what} portal={portal} home={props.home} checkHref={`${props.home}/setup`} signInHref={paths.loginPath} supportHref={props.supportHref} />
      ) : (
        <SetupFlow {...props} data={live.data} setData={live.setData} reload={live.retry} mode={mode} />
      )}
    </div>
  );
}

/**
 * The steps, in order. "agree-N" is the Nth REQUIRED agreement; "opt-N" the Nth OPTIONAL one (only when Beeliv has
 * published its wording). Optional agreements are answered with Accept or "No thanks"; either answer completes the step,
 * so they never stop anyone getting in (the server does not require them at Finish).
 */
type StepId = "details" | "secure" | `agree-${number}` | `opt-${number}`;
type Pending = { kind: "details"; name: string; phone: string } | { kind: "agreement"; id: string; accepted: boolean } | { kind: "finish" };

const requiredOf = (d: AdminSetup) => d.agreements.filter((a) => a.required);
const optionalOf = (d: AdminSetup) => d.agreements.filter((a) => !a.required && a.body !== null);
const detailsOk = (d: AdminSetup) => d.fullName.trim() !== "" && !phoneError(d.phone);

/**
 * Which steps exist. The required-agreement steps only exist when there is wording to read; with none published
 * they are skipped so setup is not stuck on a dead screen. Skipping never accepts anything: the server still decides at
 * Finish and shows its own reasons if an agreement is required.
 */
function buildSteps(d: AdminSetup, hasSecurity: boolean): StepId[] {
  const readable = d.contentReady && requiredOf(d).length > 0;
  return [
    "details",
    ...(readable ? requiredOf(d).map((_, i) => `agree-${i}` as const) : []),
    ...optionalOf(d).map((_, i) => `opt-${i}` as const),
    ...(d.mfa.required && hasSecurity ? (["secure"] as const) : []),
  ];
}

function agreementOf(id: StepId, d: AdminSetup): SetupAgreement | undefined {
  if (id.startsWith("agree-")) return requiredOf(d)[Number(id.slice(6))];
  if (id.startsWith("opt-")) return optionalOf(d)[Number(id.slice(4))];
  return undefined;
}

function isDone(id: StepId, d: AdminSetup): boolean {
  if (id === "details") return detailsOk(d);
  if (id === "secure") return d.mfa.verified;
  const a = agreementOf(id, d);
  if (id.startsWith("opt-")) return a?.response === true || a?.response === false;
  return a?.response === true;
}

/** Title, one-line reason, tile glyph and the one-line summary once done. */
function stepInfo(id: StepId, d: AdminSetup): { title: string; why: string; glyph: GlyphName; summary: string } {
  if (id === "details") return { title: "Your details", why: "So your Beeliv team knows who you are and can reach you.", glyph: "profile", summary: detailsOk(d) ? `${d.fullName} · ${d.phone}` : "About a minute" };
  if (id === "secure") return { title: "Secure your account", why: "Admin access needs a code from an authenticator app on your phone. It keeps your account and your team's records safe.", glyph: "shield", summary: d.mfa.verified ? "Authenticator added" : "Needed for admin access" };
  const a = agreementOf(id, d);
  const optional = id.startsWith("opt-");
  return {
    title: a?.title ?? "Agreement",
    why: optional ? "Optional. Accept it or say no thanks; either way you can carry on." : "Beeliv needs your agreement before you start. Read the full text, then accept.",
    glyph: "clipboard",
    summary: a?.response === true ? "Accepted" : a?.response === false ? "No thanks" : optional ? "Optional" : "Read, then accept",
  };
}

const CARD = "rounded-[22px] border border-(--ap-line) bg-(--ap-surface,#fff) shadow-[0_1px_2px_rgba(0,0,0,.04),0_14px_28px_-16px_rgba(0,0,0,.18)]";
// The hero pill reads dark text on the light dark-mode fill (Staff and Client dark mode).
const DARK_BTN = "[html[data-staff-theme=dark]_&_.au-btn]:!text-[#1c1740] [html[data-client-theme=dark]_&_.au-btn]:!text-[#1c1740] [html[data-staff-theme=dark]_&_.au-btn:hover]:!bg-(--ap-violet-2) [html[data-client-theme=dark]_&_.au-btn:hover]:!bg-(--ap-violet-2)";

function SetupFlow({ data, setData, reload, service, mode, portal, brand, what, home, supportHref, themeClass, renderSecurity, profileSteps = [] }: AccountSetupProps & { data: AdminSetup; setData: (d: AdminSetup) => void; reload: () => void }) {
  const router = useRouter();
  const signInHref = authPaths(portal).loginPath;
  const preview = mode === "preview" && process.env.NODE_ENV !== "production";
  const signOut = usePortalSignOut(portal, { tone: "neutral", icon: LogOut, title: "Sign out of Beeliv?", description: "You'll be signed out of your Beeliv account on this device. Sign back in any time.", confirmLabel: "Sign out", cancelLabel: "Stay signed in" }, confirmAction);

  const steps = buildSteps(data, Boolean(renderSecurity));
  const doneCount = steps.filter((s) => isDone(s, data)).length;
  const allDone = doneCount === steps.length;
  const currentId = steps.find((s) => !isDone(s, data)) ?? null;

  /** The ONE step on screen. null = follow the first unfinished step (or the finish card when all are done). */
  const [viewId, setViewId] = useState<StepId | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [readHint, setReadHint] = useState(false);
  const [responding, setResponding] = useState(false);
  const [name, setName] = useState(data.fullName);
  const [phone, setPhone] = useState(data.phone);
  const [tried, setTried] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [failure, setFailure] = useState<SetupActionError | null>(null);
  const [unknown, setUnknown] = useState<{ pending: Pending; supportRef?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [saved, setSaved] = useState("");
  const autoStarted = useRef(false);

  const nameErr = name.trim() ? undefined : "Enter your full name.";
  const phoneErr = phoneError(phone) ?? undefined;

  const shown: StepId | null = viewId && steps.includes(viewId) ? viewId : currentId;
  const shownIndex = shown ? steps.indexOf(shown) : -1;

  /** Show a step, bring the card into view and move focus to its heading (keyboard and screen-reader users follow the move). */
  function goTo(id: StepId | null) {
    setViewId(id);
    setReadHint(false);
    setAllOpen(false);
    requestAnimationFrame(() => {
      const el = document.getElementById("su-step-title");
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.5) el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.focus({ preventScroll: true });
    });
  }
  /** After a step is saved: show the next unfinished step (or the finish card; the finish then runs by itself). */
  function advanceFrom(d: AdminSetup) {
    goTo(buildSteps(d, Boolean(renderSecurity)).find((s) => !isDone(s, d)) ?? null);
  }

  function fail(e: unknown, pending: Pending): boolean {
    if (e instanceof SetupActionError && e.code === "conflict") {
      setConflict(true);
      return true;
    }
    if (e instanceof SetupActionError && e.code === "outcome_unknown") {
      setUnknown({ pending, supportRef: e.supportRef });
      setCheckMsg(null);
      setCanRetry(false);
      return true;
    }
    if (e instanceof SetupActionError) {
      setFailure(e);
      return true;
    }
    return false;
  }

  async function saveDetails() {
    if (nameErr || phoneErr) {
      setTried(true);
      return;
    }
    setFailure(null);
    setBusy(true);
    try {
      const next = await service.saveProfile({ fullName: name.trim(), phone });
      setData(next);
      setSaved("Your details are saved.");
      advanceFrom(next);
    } catch (e) {
      if (!fail(e, { kind: "details", name: name.trim(), phone })) toast.add({ title: "We couldn't save that", description: "Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function respond(a: SetupAgreement, accepted: boolean) {
    // Absent wording is never submitted.
    if (a.body === null) return;
    setFailure(null);
    setResponding(true);
    try {
      const next = await service.respondAgreement(a.id, accepted);
      setData(next);
      if (accepted || !a.required) {
        setSaved(`${a.title}: ${accepted ? "accepted" : "no thanks"}.`);
        advanceFrom(next);
      }
    } catch (e) {
      if (!fail(e, { kind: "agreement", id: a.id, accepted })) toast.add({ title: "We couldn't record that", description: "Please try again.", type: "error" });
    } finally {
      setResponding(false);
    }
  }

  async function finish() {
    setFailure(null);
    setBlocked(null);
    setAttempted(true);
    setBusy(true);
    try {
      const res = await service.finish();
      if (res.ok && res.setup.state === "active") {
        // Navigate ONLY after the server confirmed completion.
        router.replace(home);
        return;
      }
      if (res.setup) setData(res.setup);
      setBlocked(res.ok ? ["Beeliv has not confirmed your setup yet."] : res.reasons);
    } catch (e) {
      if (!fail(e, { kind: "finish" })) toast.add({ title: "We couldn't check your setup", description: "Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  /** Reconcile first: re-read, report what is there, retry only when asked. Never replays. */
  async function checkCompletion() {
    if (!unknown) return;
    setChecking(true);
    try {
      const fresh = await service.getSetup();
      setData(fresh);
      const p = unknown.pending;
      const done = p.kind === "details" ? fresh.fullName === p.name && fresh.phone === p.phone : p.kind === "agreement" ? fresh.agreements.find((a) => a.id === p.id)?.response === p.accepted : fresh.state === "active";
      if (done) {
        setUnknown(null);
        if (p.kind === "finish") router.replace(home);
        else advanceFrom(fresh);
      } else {
        setCheckMsg(p.kind === "finish" ? "Checked: your setup is still not complete. You can try again." : "Checked: that change was not saved. You can try again.");
        setCanRetry(true);
      }
    } catch {
      setCheckMsg("We still can't reach Beeliv. Check your connection, then check again.");
    } finally {
      setChecking(false);
    }
  }

  function retryUnknown() {
    const p = unknown?.pending;
    setUnknown(null);
    if (!p) return;
    if (p.kind === "details") void saveDetails();
    else if (p.kind === "agreement") {
      const a = data.agreements.find((x) => x.id === p.id);
      if (a) void respond(a, p.accepted);
    } else void finish();
  }

  // The last step is done (or there was nothing to do): finish by itself, once. The server still decides;
  // we only navigate on "active". A failed or uncertain finish is retried only by the person ("Try again" / the notice).
  useEffect(() => {
    if (allDone && !autoStarted.current && !unknown && !conflict) {
      autoStarted.current = true;
      void finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  /** Local preview only: forget the details this device saved for the preview, then load setup again. */
  function startAgain() {
    try {
      window.localStorage.removeItem(`bv-${portal}-setup-mock`);
    } catch {
      // Nothing saved, or storage blocked: reloading still starts fresh.
    }
    window.location.reload();
  }

  const working = allDone && (busy || !attempted); // the automatic finish is running (or about to)
  const first = firstName(data.fullName);
  const pendingCount = steps.length - doneCount;
  const minutes = pendingCount <= 1 ? "About a minute." : "About 5 minutes.";
  const line = working
    ? "Setting up your account. One moment, we'll take you in as soon as it's ready."
    : blocked
      ? "Almost there. One thing needs a look before we can take you in."
      : `A few quick steps and ${what.charAt(0).toLowerCase() + what.slice(1)} is ready. ${minutes} We save as you go.`;
  const position = shown ? `Step ${shownIndex + 1} of ${steps.length}` : "All steps done";
  const info = shown ? stepInfo(shown, data) : null;
  const optionalStep = Boolean(shown?.startsWith("opt-"));
  const nextOpen = steps.find((s) => !isDone(s, data) && s !== shown);

  const rows: RailRow[] = steps.map((id) => {
    const s = stepInfo(id, data);
    const done = isDone(id, data);
    const opt = id.startsWith("opt-");
    const here = id === shown;
    return {
      id,
      title: s.title,
      summary: done ? s.summary : undefined,
      state: here ? "current" : done ? "done" : "todo",
      glyph: s.glyph,
      tag: here ? { tone: "info", word: done ? "Editing" : "Now" } : done ? { tone: "ok", word: "Done" } : opt ? { tone: "mute", word: "Optional" } : { tone: "warn", word: "Required" },
    };
  });
  const laterRows: RailRow[] = profileSteps.map((p) => ({ id: `later-${p.id}`, title: p.title, state: "later", glyph: "profile", tag: { tone: "mute", word: "After setup" } }));
  const openRow = (id: string) => goTo(id as StepId);

  const back =
    shownIndex > 0 ? (
      <button type="button" onClick={() => goTo(steps[shownIndex - 1])} className={`inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-tint-soft) hover:text-(--ap-violet) ${FOCUS}`}>
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back
      </button>
    ) : null;

  const help = (
    <p className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-[15px] text-(--ap-muted)">
      <span>
        Need a hand?{" "}
        <Link href={supportHref ?? "/contact"} className={`inline-block py-1.5 font-semibold !text-(--ap-violet) underline underline-offset-2 ${FOCUS}`}>
          Contact Beeliv
        </Link>
      </span>
      {preview ? (
        <button type="button" onClick={startAgain} className={`inline-flex items-center gap-1.5 py-1.5 text-[14px] font-semibold text-(--ap-muted) hover:text-(--ap-violet) ${FOCUS}`}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Start again
        </button>
      ) : null}
    </p>
  );

  const railBody = (
    <>
      <StepRail rows={rows} onOpen={openRow} label="Set up your account" />
      {laterRows.length > 0 ? (
        <div className="mt-2 border-t border-(--ap-line-2) pt-3">
          <p className="px-3 text-[14px] font-bold text-(--ap-ink-2)">After setup</p>
          <p className="mb-1 px-3 text-[13px] leading-snug text-(--ap-muted)">Add these from your Home once you are in. They never stop you getting in.</p>
          <StepRail rows={laterRows} onOpen={() => undefined} label="Complete your profile, after setup" />
        </div>
      ) : null}
    </>
  );

  /** The footer of the step card: Back on the left, ONE primary action on the right. Below 1024px it is a sticky bottom bar. */
  const actionBar = (primary: ReactNode, secondary?: ReactNode) =>
    primary || secondary || back ? (
      <div className="z-30 flex items-center gap-2 max-[1023px]:fixed max-[1023px]:inset-x-0 max-[1023px]:bottom-0 max-[1023px]:border-t max-[1023px]:border-(--ap-line) max-[1023px]:bg-(--ap-surface,#fff) max-[1023px]:px-4 max-[1023px]:pt-3 max-[1023px]:pb-[calc(12px+env(safe-area-inset-bottom))] max-[1023px]:shadow-[0_-10px_24px_-18px_rgba(0,0,0,.35)] min-[1024px]:mt-8 min-[1024px]:border-t min-[1024px]:border-(--ap-line-2) min-[1024px]:pt-5">
        {back}
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 min-[1024px]:flex-none">
          {secondary}
          {primary ? <div className="min-w-0 flex-1 [&_.au-btn]:mt-0 min-[480px]:w-60 min-[480px]:flex-none">{primary}</div> : null}
        </div>
      </div>
    ) : null;

  /** One step's content and its action bar. The card is one form, so Enter runs the primary action. */
  function stepBody(): { content: ReactNode; bar: ReactNode; formSubmit?: () => void } {
    if (!shown) {
      if (working) {
        return {
          content: (
            <div role="status" className="flex items-center gap-3 rounded-2xl bg-(--ap-tint-soft) p-4 text-[16px] text-(--ap-ink-2)">
              <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-(--ap-tint-2) border-t-(--ap-violet) motion-reduce:animate-none" aria-hidden="true" />
              Checking your setup with Beeliv...
            </div>
          ),
          bar: null,
        };
      }
      if (blocked) {
        return {
          content: (
            <div role="alert" className="rounded-2xl bg-(--ap-tint-soft) p-4">
              <ul className="list-disc pl-5 text-[15px] leading-relaxed text-(--ap-ink-2)">
                {blocked.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ),
          bar: actionBar(<SubmitButton label="Try again" pendingLabel="Checking..." pending={busy} />),
          formSubmit: () => {
            if (!busy) void finish();
          },
        };
      }
      return { content: null, bar: null };
    }
    if (shown === "details") {
      const unchanged = detailsOk(data) && name.trim() === data.fullName && phone === data.phone;
      return {
        content: (
          <div className="flex flex-col gap-5 min-[1024px]:max-w-[520px]">
            <div className="flex flex-col gap-2">
              <label htmlFor="setup-name" className="text-[15px] font-semibold text-(--ap-ink)">
                Full name
              </label>
              <input
                id="setup-name"
                className={`${INPUT_CLS} !h-13 !text-[16px] ${FOCUS}`}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                placeholder="e.g. Amaka Okafor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                aria-invalid={(tried || nameTouched) && nameErr ? true : undefined}
                aria-describedby={(tried || nameTouched) && nameErr ? "setup-name-err" : undefined}
              />
              <FieldError id="setup-name-err">{tried || nameTouched ? nameErr : undefined}</FieldError>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="setup-phone" className="text-[15px] font-semibold text-(--ap-ink)">
                Phone number
              </label>
              <PhoneInput quiet id="setup-phone" value={phone} onChange={setPhone} invalid={tried && Boolean(phoneErr)} />
              <span className="text-[14px] leading-snug text-(--ap-muted)">Each phone number can be used on one account only.</span>
              <FieldError id="setup-phone-err">{tried ? phoneErr : undefined}</FieldError>
            </div>
          </div>
        ),
        bar: actionBar(<SubmitButton label="Continue" pendingLabel="Saving..." pending={busy} />),
        formSubmit: () => {
          if (busy) return;
          // Nothing changed on a step that is already saved: just move on, no second write.
          if (unchanged) advanceFrom(data);
          else void saveDetails();
        },
      };
    }
    if (shown === "secure") {
      return {
        content: renderSecurity?.({
          onVerified: () =>
            void service.getSetup().then(
              (d) => {
                setData(d);
                setSaved("Authenticator added.");
                advanceFrom(d);
              },
              () => reload(),
            ),
          preview,
        }),
        bar: actionBar(null),
      };
    }
    const a = agreementOf(shown, data);
    if (!a) return { content: null, bar: actionBar(null) };
    const read = readIds.includes(a.id) || a.response === true;
    const acceptedRequired = a.response === true && !optionalStep;
    return {
      content: <AgreementCard a={a} themeClass={themeClass} read={read} hint={readHint && !read} onRead={() => setReadIds((r) => (r.includes(a.id) ? r : [...r, a.id]))} />,
      bar: actionBar(
        a.body === null ? null : acceptedRequired ? <SubmitButton label="Continue" pendingLabel="Continue" pending={false} /> : <SubmitButton label="Accept" pendingLabel="Saving..." pending={responding} blocked={!read} />,
        optionalStep && a.body !== null ? (
          <button type="button" disabled={responding} onClick={() => void respond(a, false)} className={`inline-flex h-12 shrink-0 items-center rounded-full px-4 text-[15px] font-semibold text-(--ap-ink) shadow-[inset_0_0_0_1.5px_var(--ap-line)] hover:shadow-[inset_0_0_0_1.5px_var(--ap-violet)] disabled:opacity-60 ${FOCUS}`}>
            No thanks
          </button>
        ) : undefined,
      ),
      formSubmit: () => {
        if (responding || a.body === null) return;
        if (acceptedRequired) return advanceFrom(data);
        if (!read) return setReadHint(true);
        void respond(a, true);
      },
    };
  }

  const body = stepBody();
  const doneElsewhere = steps.filter((s) => s !== shown && isDone(s, data));
  const ringLabel = `${doneCount} of ${steps.length} steps done`;

  return (
    <div className="flex flex-col gap-5 max-[1023px]:pb-28" style={AU_VARS}>
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-bold tracking-[0.01em] text-(--ap-violet)">{brand}</span>
        <button type="button" onClick={() => void signOut()} className={`inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[15px] text-(--ap-muted) hover:text-(--ap-violet) ${FOCUS}`}>
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </button>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {saved}
      </div>

      <div className="flex flex-col gap-5 min-[1024px]:grid min-[1024px]:grid-cols-[minmax(0,380px)_minmax(0,1fr)] min-[1024px]:items-start min-[1024px]:gap-8">
        {/* Left: welcome + progress, sticky on desktop. Below 1024px only the compact welcome shows here. */}
        <aside aria-label="Your progress" className="flex min-w-0 flex-col gap-5 min-[1024px]:sticky min-[1024px]:top-6">
          <section aria-labelledby="journey-title" className={`${heroSurface(portal)} p-5 min-[1024px]:p-6`}>
            <JourneyHeroDeco />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="inline-flex items-center rounded-full bg-white/16 px-3 py-1 text-[13px] font-semibold min-[1024px]:text-[14px]">Account setup</p>
                <h1 id="journey-title" className="mt-3 text-[24px] leading-[1.12] font-bold min-[1024px]:text-[28px]">
                  {first ? `Welcome, ${first}` : `Welcome to ${brand}`}
                </h1>
                <p className="mt-1.5 text-[15px] font-semibold text-white/88 tabular-nums min-[1024px]:hidden">{position}</p>
              </div>
              <span className="min-[1024px]:hidden">
                <JourneyRing value={doneCount / steps.length} size={64} stroke={6} track="rgba(255,255,255,.22)" arc="#fff" label={ringLabel}>
                  <b className="text-[16px] leading-none text-white tabular-nums">
                    {doneCount}/{steps.length}
                  </b>
                </JourneyRing>
              </span>
            </div>
            <p className="mt-2 text-[16px] leading-normal text-white/88 max-[1023px]:hidden" aria-live="polite">
              {line}
            </p>
          </section>

          <section aria-labelledby="su-rail-title" className={`${CARD} overflow-hidden max-[1023px]:hidden`}>
            <div className="flex items-center gap-4 border-b border-(--ap-line-2) p-5">
              <JourneyRing value={doneCount / steps.length} size={68} stroke={7} label={ringLabel}>
                {allDone ? (
                  <Check className="size-7 text-(--ap-ok)" strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <b className="text-[17px] leading-none text-(--ap-ink) tabular-nums">
                    {doneCount}/{steps.length}
                  </b>
                )}
              </JourneyRing>
              <div className="min-w-0">
                <h2 id="su-rail-title" className="text-[18px] leading-tight font-bold text-(--ap-ink) tabular-nums">
                  {allDone ? "All steps done" : `${doneCount} of ${steps.length} done`}
                </h2>
                <p className="mt-0.5 text-[14px] leading-snug text-(--ap-ink-2)">{allDone ? "Then you are in." : nextOpen ? `Then: ${stepInfo(nextOpen, data).title}` : "Last step. Then you are in."}</p>
              </div>
            </div>
            <div className="p-2">{railBody}</div>
          </section>
          <div className="max-[1023px]:hidden">{help}</div>
        </aside>

        {/* Right: the ONE current step. */}
        <div className="flex min-w-0 flex-col gap-4">
          {conflict ? <ConflictNotice onReload={reload} /> : null}
          {failure ? <SetupFailureNotice error={failure} signInHref={signInHref} onElapsed={() => setFailure(null)} /> : null}
          {unknown ? <OutcomeUnknownNotice onCheck={() => void checkCompletion()} checking={checking} onRetry={canRetry ? retryUnknown : undefined} resultMessage={checkMsg} supportRef={unknown.supportRef} /> : null}

          {doneElsewhere.length > 0 ? (
            <ul aria-label="Done" className={`${CARD} flex flex-col divide-y divide-(--ap-line-2) min-[1024px]:hidden`}>
              {doneElsewhere.map((id) => {
                const s = stepInfo(id, data);
                return (
                  <li key={id} className="flex items-center gap-3 py-1.5 pr-2 pl-4">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--ap-ok-bg) text-(--ap-ok)" aria-hidden="true">
                      <Check className="size-4" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-(--ap-ink-2)">
                      <b className="font-semibold text-(--ap-ink)">{s.title}</b>
                      <span className="sr-only">, done</span> · {s.summary}
                    </span>
                    <button type="button" onClick={() => goTo(id)} aria-label={`Edit ${s.title}`} className={`h-11 shrink-0 rounded-full px-3 text-[14px] font-semibold text-(--ap-violet) hover:bg-(--ap-tint-soft) ${FOCUS}`}>
                      Edit
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <section aria-labelledby="su-step-title" className={`${CARD} p-5 min-[768px]:p-7 min-[1024px]:flex min-[1024px]:min-h-[460px] min-[1024px]:flex-col min-[1024px]:p-9`}>
            <form
              noValidate
              className="flex flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                body.formSubmit?.();
              }}
            >
              <div key={shown ?? "finish"} className="ap-step-fwd flex flex-col gap-6">
                <div>
                  <p className="ap-eb mb-2 tabular-nums max-[1023px]:hidden">{position}</p>
                  <h2 id="su-step-title" tabIndex={-1} className="text-[24px] leading-tight font-bold text-(--ap-ink) outline-none min-[1024px]:text-[30px]">
                    {info ? info.title : working ? "Setting up your account" : blocked ? "Almost there" : "Finishing your setup"}
                  </h2>
                  <p className="mt-2 max-w-[56ch] text-[16px] leading-normal text-(--ap-ink-2)">{info ? info.why : working ? "One moment. We'll take you in as soon as Beeliv confirms it." : blocked ? "Beeliv could not finish your setup yet. Here is why." : "Your steps are done. We're checking your setup with Beeliv."}</p>
                </div>
                {body.content}
              </div>
              <div className={`mt-auto ${DARK_BTN}`}>{body.bar}</div>
            </form>
          </section>

          <div className={`${CARD} min-[1024px]:hidden`}>
            <button type="button" aria-expanded={allOpen} aria-controls="su-all-steps" onClick={() => setAllOpen((v) => !v)} className={`flex min-h-14 w-full items-center gap-3 rounded-[22px] px-4 py-2 text-left ${FOCUS}`}>
              <span className="min-w-0 flex-1">
                <b className="block text-[16px] text-(--ap-ink)">All steps</b>
                <span className="block text-[14px] text-(--ap-muted) tabular-nums">
                  {doneCount} of {steps.length} done{laterRows.length > 0 ? ` · ${laterRows.length} more after setup` : ""}
                </span>
              </span>
              <ChevronDown className={`size-5 shrink-0 text-(--ap-muted) transition-transform duration-200 motion-reduce:transition-none ${allOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            <div id="su-all-steps" hidden={!allOpen} className="border-t border-(--ap-line-2) p-2">
              {allOpen ? railBody : null}
            </div>
          </div>
          <div className="min-[1024px]:hidden">{help}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * One agreement. Real wording comes from the server; absent wording (body null) shows a notice only:
 * nothing to read, accept or submit. Reading is not acceptance: the explicit Accept in the action bar is.
 * The short summary is the first paragraph of Beeliv's own wording (nothing is written for them).
 */
function AgreementCard({ a, themeClass, read, hint, onRead }: { a: SetupAgreement; themeClass?: string; read: boolean; hint: boolean; onRead: () => void }) {
  const summary = a.body ? a.body.trim().split(/\n\s*\n/)[0] : null;
  if (a.body === null) return <p className="ap-bd rounded-xl bg-(--ap-tint-soft) px-3.5 py-3 text-(--ap-muted)">Beeliv will publish the wording soon. You will be able to read and accept it then.</p>;
  return (
    <div data-ap-field className="flex flex-col gap-4">
      {summary ? <p className="ap-bd line-clamp-6 rounded-2xl bg-(--ap-tint-soft) px-4 py-3.5 text-(--ap-ink-2)">{summary}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <ReadButton title={a.title} version={a.version} body={a.body} themeClass={themeClass} onRead={onRead} />
        {a.response === true ? (
          <span className="ap-label inline-flex items-center gap-1 font-bold text-(--ap-ok)">
            <Check className="size-3.5" aria-hidden="true" /> Accepted
          </span>
        ) : a.response === false ? (
          <span className="ap-sm text-(--ap-muted)">You said no thanks. You can still accept.</span>
        ) : read ? (
          <span className="ap-sm inline-flex items-center gap-1 text-(--ap-ok)">
            <Check className="size-3.5" aria-hidden="true" /> Read
          </span>
        ) : (
          <span className={`ap-sm ${hint ? "font-semibold text-(--ap-rose)" : "text-(--ap-muted)"}`} role={hint ? "alert" : undefined}>
            Read it first, then you can accept.
          </span>
        )}
      </div>
    </div>
  );
}
