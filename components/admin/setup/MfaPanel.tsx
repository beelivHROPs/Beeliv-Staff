"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "@/components/applicant/icons";
import { CHIP, Field, INPUT_CLS } from "@/components/applicant/apply/parts";
import type { SetupAdapter } from "@/lib/admin/setup/adapter";
import { type MfaEnrollment, type MfaFactor, setupErrorText } from "@/lib/admin/setup/types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)";
const BTN = "ap-btn text-[15px] font-semibold";

/** Raw provider SVG is never injected: it becomes an image data URL. Anything else is refused. */
function qrSrc(qr: string | null): string | null {
  if (!qr) return null;
  if (qr.startsWith("data:image/")) return qr;
  if (qr.trimStart().startsWith("<svg")) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`;
  return null;
}

/**
 * Admin authenticator (TOTP) step, built against auth-setup-wire.md
 * mfa-status / mfa-enroll / mfa-verify / mfa-cancel-enrollment.
 * The QR / manual key live only in this
 * component's memory and vanish on cancel, success or navigation.
 * Never offers to replace or remove a verified device (no such endpoint).
 */
export function MfaPanel({ onVerified, service, embedded = false }: { onVerified: () => void; service: SetupAdapter; preview?: boolean; /** Inside the setup step card, which already shows the title and reason: drop the repeated icon, title and intro. */ embedded?: boolean }) {
  const [factors, setFactors] = useState<MfaFactor[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "enroll" | "verify" | "cancel">(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadFailed(false);
    service.mfaStatus().then(setFactors, () => setLoadFailed(true));
  }, [service]);
  // Load once on mount; setState happens inside the promise callbacks.
  useEffect(() => {
    let live = true;
    service.mfaStatus().then(
      (f) => live && setFactors(f),
      () => live && setLoadFailed(true),
    );
    return () => {
      live = false;
    };
  }, [service]);

  const verified = factors?.find((f) => f.status === "verified") ?? null;
  const pending = factors?.find((f) => f.status === "unverified") ?? null;
  const codeOk = /^\d{6}$/.test(code);

  async function run(kind: "enroll" | "verify" | "cancel", fn: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(setupErrorText(e));
    } finally {
      setBusy(null);
    }
  }

  const enroll = () => run("enroll", async () => setEnrollment(await service.mfaEnroll()));
  const verify = (factorId: string) =>
    run("verify", async () => {
      await service.mfaVerify(factorId, code);
      // Only reachable on a real server success: clear secrets, reload setup, then finish.
      setEnrollment(null);
      setCode("");
      onVerified();
    });
  const cancel = (factorId: string) =>
    run("cancel", async () => {
      await service.mfaCancel(factorId);
      setEnrollment(null);
      setCode("");
      load();
    });

  const codeField = (id: string, factorId: string) => (
    <div className="mt-4 max-w-[320px]">
      <Field label="Six-digit code from your app" htmlFor={id} hint="Six digits. It changes every 30 seconds.">
        <input id={id} className={`${INPUT_CLS} tracking-[.3em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
      </Field>
      <button type="button" disabled={!codeOk || busy !== null} onClick={() => void verify(factorId)} className={`${BTN} ap-btn-p mt-3 text-white! ${FOCUS}`}>
        {busy === "verify" ? "Checking..." : "Verify code"}
      </button>
    </div>
  );

  const qr = enrollment ? qrSrc(enrollment.qrCode) : null;

  return (
    <div className="flex items-start gap-3">
      {embedded ? null : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {embedded ? null : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-[16px]">Authenticator app (two-step sign-in)</b>
              <span className={CHIP.mute}>Required</span>
            </div>
            <p className="ap-bd mt-1.5">Every Admin, HR and Operations account must use an authenticator app. Entering a code proves this sign-in only; Beeliv still confirms completion.</p>
          </>
        )}

        {loadFailed ? (
          <div role="alert" className="mt-3">
            <p className="ap-bd">We couldn&apos;t check your authenticator status.</p>
            <button type="button" onClick={load} className={`${BTN} ap-btn-s mt-2 ${FOCUS}`}>
              Try again
            </button>
          </div>
        ) : factors === null ? (
          <div role="status" aria-busy="true" aria-label="Checking authenticator status" className="ap-sk-box mt-3 h-14 rounded-xl" />
        ) : enrollment ? (
          <div className="mt-4 rounded-2xl border border-(--ap-line) p-4">
            <b className="text-[15px]">Add this account to your authenticator app</b>
            <div className="mt-3 flex flex-wrap gap-5">
              <div>
                {qr ? (
                  <Image src={qr} alt="QR code to scan with your authenticator app" width={176} height={176} unoptimized className="rounded-xl border border-(--ap-line)" />
                ) : (
                  <div role="status" aria-busy="true" aria-label="Setting up your authenticator" className="ap-sk-box size-44 rounded-xl" />
                )}
              </div>
              {enrollment.secret ? (
                <div className="min-w-0 flex-1 basis-[220px]">
                  <p className="ap-sm">Cannot scan? Type this key into your app instead.</p>
                  <p className="mt-1.5 rounded-xl bg-(--ap-tint-soft) px-3.5 py-3 font-mono text-[15px] break-all">{enrollment.secret}</p>
                  <p className="ap-sm mt-2">Keep this key private. It is shown once and is not stored on this page.</p>
                </div>
              ) : (
                <p className="ap-sm min-w-0 flex-1 basis-[220px]">Setting up your authenticator...</p>
              )}
            </div>
            {codeField("adm-mfa-code-new", enrollment.factorId)}
            <button type="button" disabled={busy !== null} onClick={() => void cancel(enrollment.factorId)} className={`${BTN} ap-btn-s mt-3 ${FOCUS}`}>
              {busy === "cancel" ? "Cancelling..." : "Cancel this setup"}
            </button>
          </div>
        ) : verified ? (
          <div className="mt-4 rounded-2xl border border-(--ap-line) p-4">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-[15px]">{verified.name ?? "Authenticator app"}</b>
              <span className={CHIP.ok}>Device already added</span>
            </div>
            <p className="ap-bd mt-1.5">This account already has an authenticator. Enter a current code to confirm this sign-in. A new device is never added silently; ask Beeliv if you lost your device.</p>
            {codeField("adm-mfa-code-existing", verified.id)}
          </div>
        ) : pending ? (
          <div className="mt-4 rounded-2xl border border-(--ap-line) p-4">
            <b className="text-[15px]">An earlier setup was never finished</b>
            <p className="ap-bd mt-1.5">Cancel it, then start again to get a new QR code. Nothing from the earlier attempt is kept.</p>
            <button type="button" disabled={busy !== null} onClick={() => void cancel(pending.id)} className={`${BTN} ap-btn-p mt-3 text-white! ${FOCUS}`}>
              {busy === "cancel" ? "Cancelling..." : "Cancel earlier setup"}
            </button>
          </div>
        ) : (
          <button type="button" disabled={busy !== null} onClick={() => void enroll()} className={`${BTN} ap-btn-p mt-3 text-white! ${FOCUS}`}>
            {busy === "enroll" ? "Preparing..." : "Set up authenticator"}
          </button>
        )}

        <div aria-live="polite">
          {error ? (
            <p role="alert" className="mt-3 rounded-xl bg-(--ap-rose-bg) px-3.5 py-2.5 text-[15px] text-(--ap-rose)">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
