"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function FirstAdminSetup() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const token = window.location.hash.slice(1);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { setError("Open the complete setup link supplied to you."); return; }
    if (password.length < 12 || password !== confirmation) { setError("Use at least 12 characters and make sure both passwords match."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/first-admin", { method: "POST", credentials: "same-origin", cache: "no-store", referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, code: code.trim(), password }), signal: AbortSignal.timeout(45000) });
      const result = await response.json();
      if (!response.ok || result.ok !== true || result.destination !== "/admin/setup") throw new Error("setup_unconfirmed");
      setCode(""); setPassword(""); setConfirmation("");
      window.history.replaceState(null, "", "/admin/first-setup");
      router.replace("/admin/setup");
    } catch { setError("We couldn't confirm setup. Check your link and separate code, then retry with the same password. You can also try signing in if your account was created."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-12">
    <form onSubmit={submit} className="w-full space-y-5 rounded-3xl border border-(--ap-line-2) bg-(--ap-surface) p-6">
      <h1 className="text-3xl font-bold">Set up your Admin account</h1>
      <p className="text-sm text-(--ap-muted)">Enter the code provided separately from your setup link and choose a password. Next, complete your details, agreements and authenticator setup.</p>
      <label className="block text-sm font-semibold">Setup code<input required autoComplete="off" spellCheck={false} className="ap-input mt-2 block w-full" value={code} maxLength={16} disabled={busy} onChange={e => setCode(e.target.value)} /></label>
      <label className="block text-sm font-semibold">Password<input required type="password" autoComplete="new-password" minLength={12} maxLength={256} className="ap-input mt-2 block w-full" value={password} disabled={busy} onChange={e => setPassword(e.target.value)} /></label>
      <label className="block text-sm font-semibold">Confirm password<input required type="password" autoComplete="new-password" minLength={12} maxLength={256} className="ap-input mt-2 block w-full" value={confirmation} disabled={busy} onChange={e => setConfirmation(e.target.value)} /></label>
      {error ? <p role="alert" className="text-sm">{error}</p> : null}
      <button type="submit" disabled={busy} className="ap-btn ap-btn-p w-full">{busy ? "Setting up…" : "Continue setup"}</button>
      <a className="block text-center text-sm underline" href="/admin/login">Already started? Sign in</a>
    </form>
  </main>;
}
