"use client";

/**
 * Invitations tab (docs/contracts/auth-and-invitations.md section 4). Two
 * SEPARATE chips per row: invitation status (pending / accepted / expired /
 * revoked) and delivery status (not sent / queued / sent / failed). Actions
 * follow the contract table:
 *   pending + not sent      -> Send invitation, Edit email, Revoke
 *   pending + sent          -> Resend (cooldown until retryAt), Revoke
 *   pending + failed        -> Retry sending (cooldown), Edit email, Revoke
 *   expired / revoked       -> Issue replacement
 *   accepted                -> Manage access
 * Invitations are never sent automatically. Nothing is emailed in the demo.
 */
import { playAdminSound } from "@/lib/admin/sound";
import { useEffect, useState } from "react";
import { ANY, BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, HEAD_ROW, ListCard, ListToolbar, TABLE_CARD, TH, useBatch } from "@/components/admin/listKit";
import { Restricted } from "@/components/admin/offers/parts";
import { CancelButton, FIELD_LABEL, PrimaryButton, ReasonSheet, SheetFrame } from "@/components/admin/offers/Sheet";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { ShowMore } from "@/components/admin/ShowMore";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { Mail, Search, X } from "@/components/applicant/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { StatusChip } from "@/components/client/StatusChip";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { formatDate, formatRelativePast } from "@/lib/applicant/time";
import { AccessLinkSheet } from "./AccessLinkSheet";
import { createAccessLink, replaceInvitation, resendInvitation, revokeInvitation, sendInvitation, updateInvitationEmail, useInvitations } from "@/lib/admin/team-access/hooks";
import type { AccessLink, Invitation, InvitationKind, InvitationStatus, TeamCapabilities } from "@/lib/admin/team-access/types";
import { DELIVERY_LABEL, DELIVERY_TONE, INVITE_LABEL, INVITE_ORDER, INVITE_TONE, KIND_LABEL, TEAM_HREF } from "./meta";

const COLS = "grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_190px]";
const MANAGE_TAB: Record<InvitationKind, string> = { internal: "internal", client: "clients", staff: "accounts" };

/** Re-renders once a second while a cooldown is running, so Resend enables itself at retryAt. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}
const LINK_UNKNOWN = "We could not confirm the link was created. Reload this page, then create a new link.";
const wait = (ms: number) => (ms >= 60_000 ? `${Math.ceil(ms / 60_000)} min` : `${Math.max(1, Math.ceil(ms / 1000))} s`);

export function InvitationsList({ caps, onNotice }: { caps: TeamCapabilities; onNotice: (n: { kind: "ok" | "error"; text: string }) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvitationStatus | "all">("all");
  const [kind, setKind] = useState<InvitationKind | "">("");
  const live = useInvitations({ search, status: status === "all" ? "" : status, kind });
  const [last, setLast] = useState<typeof live.data>(null);
  if (live.data && live.data !== last) setLast(live.data);
  const page = live.data ?? last;
  const { limit, more } = useBatch(`${search}|${status}|${kind}`);
  const [revoking, setRevoking] = useState<Invitation | null>(null);
  const [editing, setEditing] = useState<Invitation | null>(null);
  const [shownLink, setShownLink] = useState<{ name: string; link: AccessLink } | null>(null);
  const [busy, setBusy] = useState(false);
  const [unknownLinks, setUnknownLinks] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const now = useNow(!!page?.rows.some((r) => r.delivery.retryAt));
  const narrowed = !!search || !!kind || status !== "all";
  const clear = () => {
    setSearch("");
    setKind("");
    setStatus("all");
  };

  if (live.status === "error") return <ErrorPanel title="We could not load the invitations" retry={live.retry} />;
  if (live.status === "restricted") return <Restricted what="Invitations" />;
  if (!page)
    return (
      <div role="status" aria-busy="true" aria-label="Loading invitations" className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="ap-shimmer h-[72px] rounded-2xl" />
        ))}
      </div>
    );
  if (page.workspaceEmpty) {
    return (
      <div className={EMPTY_CARD}>
        <EmptyState icon={Mail} title="No invitations yet" description="Invitations you create appear here with their status and delivery. Email delivery is connected later." />
      </div>
    );
  }

  const canFor = (k: InvitationKind) => (k === "internal" ? caps.canInviteInternal : k === "client" ? caps.canInviteClient : caps.canInviteStaff);
  const fail = () => onNotice({ kind: "error", text: "That did not go through. Nothing was changed." });

  async function send(i: Invitation) {
    const ok = await confirmAction({
      tone: "neutral",
      title: `Send the invitation to ${i.name}?`,
      description: "Invitations are never sent automatically. This sends it now.",
      points: ["Email delivery is connected later, so in the demo this is recorded only."],
      confirmLabel: "Send invitation",
    });
    if (!ok) return;
    try {
      await sendInvitation(i.id);
      playAdminSound("saved");
      onNotice({ kind: "ok", text: `The invitation to ${i.name} was sent (recorded only).` });
    } catch {
      fail();
    }
  }
  async function resend(i: Invitation) {
    const retry = i.delivery.status === "failed";
    const ok = await confirmAction({
      tone: "neutral",
      title: retry ? `Retry sending to ${i.name}?` : `Resend the invitation to ${i.name}?`,
      description: "The same link is sent again. The button then stays disabled for a short cooldown.",
      points: ["Email delivery is connected later, so nothing is sent yet."],
      confirmLabel: retry ? "Retry sending" : "Resend",
    });
    if (!ok) return;
    try {
      await resendInvitation(i.id);
      playAdminSound("saved");
      onNotice({ kind: "ok", text: `The invitation to ${i.name} was ${retry ? "sent again" : "resent"} (recorded only).` });
    } catch (e) {
      if (e instanceof Error && e.message === "cooldown") onNotice({ kind: "error", text: "Please wait for the cooldown to finish before resending." });
      else fail();
    }
  }
  async function makeLink(i: Invitation) {
    if (busy) return; // a double click cannot submit twice (discrete clicks re-render between taps)
    setBusy(true);
    try {
      if (unknownLinks.includes(i.id)) {
        onNotice({ kind: "error", text: LINK_UNKNOWN });
        return;
      }
      const again = i.delivery.status === "copied";
      const ok = await confirmAction({
        tone: "neutral",
        title: again ? `Create a new access link for ${i.name}?` : `Create an access link for ${i.name}?`,
        description: "You share the link yourself. It is shown once and works one time.",
        points: again ? ["The previous link stops working."] : undefined,
        confirmLabel: "Create access link",
      });
      if (!ok) return;
      try {
        const link = await createAccessLink(i.id, i.revision);
        playAdminSound("saved");
        setShownLink({ name: i.name, link });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "cooldown") onNotice({ kind: "error", text: "Please wait a moment before creating another link." });
        else if (msg === "outcome_unknown" || msg === "outcome-unknown") {
          // Never retried with the same request: the person must reload, then create a new link.
          setUnknownLinks((l) => [...l, i.id]);
          onNotice({ kind: "error", text: LINK_UNKNOWN });
        } else fail();
      }
    } finally {
      setBusy(false);
    }
  }
  async function replace(i: Invitation) {
    const ok = await confirmAction({
      tone: "neutral",
      title: `Issue a replacement for ${i.name}?`,
      description: "A new invitation is created with a new link and expiry. It is not sent until you choose Send invitation.",
      confirmLabel: "Issue replacement",
    });
    if (!ok) return;
    try {
      await replaceInvitation(i.id);
      playAdminSound("saved");
      onNotice({ kind: "ok", text: `A replacement invitation for ${i.name} was created. It has not been sent yet.` });
    } catch {
      fail();
    }
  }
  async function revoke(reason: string) {
    if (!revoking) return;
    setBusy(true);
    setErr(null);
    try {
      await revokeInvitation(revoking.id, reason);
      playAdminSound("rejected");
      onNotice({ kind: "ok", text: `The invitation to ${revoking.name} was revoked.` });
      setRevoking(null);
    } catch {
      setErr("That did not go through. Nothing was changed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function saveEmail(email: string) {
    if (!editing) return;
    setBusy(true);
    setErr(null);
    try {
      await updateInvitationEmail(editing.id, email);
      onNotice({ kind: "ok", text: `The address for ${editing.name} was changed. The invitation has not been sent yet.` });
      setEditing(null);
    } catch (e) {
      setErr(e instanceof Error && e.message === "duplicate" ? "Another pending invitation already uses that address." : "That did not go through. Nothing was changed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Primary action as a visible button (so a cooldown can show); the rest in the menu. */
  const actionsFor = (i: Invitation) => {
    const can = canFor(i.kind);
    const left = i.delivery.retryAt ? Date.parse(i.delivery.retryAt) - now : 0;
    const inCooldown = left > 0;
    const menu: { label: string; onSelect?: () => void; href?: string; tone?: "default" | "danger" }[] = [];
    let primary: React.ReactNode = null;
    const btn = "ap-btn ap-btn-s ap-btn-sm whitespace-nowrap";
    if (i.status === "accepted") {
      menu.push({ label: "Manage access", href: `${TEAM_HREF}?tab=${MANAGE_TAB[i.kind]}` });
    } else if (can && (i.status === "expired" || i.status === "revoked")) {
      primary = (
        <button type="button" className={btn} onClick={() => void replace(i)}>
          Issue replacement
        </button>
      );
    } else if (can && i.status === "pending") {
      const edit = {
        label: "Edit email",
        onSelect: () => {
          setErr(null);
          setEditing(i);
        },
      };
      const revokeItem = {
        label: "Revoke",
        tone: "danger" as const,
        onSelect: () => {
          setErr(null);
          setRevoking(i);
        },
      };
      const linkItem = { label: i.delivery.status === "copied" ? "Create a new access link" : "Create access link", onSelect: () => void makeLink(i) };
      if (i.delivery.status === "not-sent") {
        primary = (
          <button type="button" className={btn} onClick={() => void send(i)}>
            Send invitation
          </button>
        );
        menu.push(linkItem, edit, revokeItem);
      } else {
        const label = i.delivery.status === "failed" ? "Retry sending" : "Resend";
        primary = i.delivery.status === "copied" ? (
          <button type="button" className={btn} disabled={inCooldown} onClick={() => void makeLink(i)}>
            {inCooldown ? `New link in ${wait(left)}` : "New access link"}
          </button>
        ) : (
          <button type="button" className={btn} disabled={inCooldown} onClick={() => void resend(i)}>
            {inCooldown ? `${label} in ${wait(left)}` : label}
          </button>
        );
        if (i.delivery.status !== "copied") menu.push(linkItem);
        if (i.delivery.status === "failed") menu.push(edit);
        menu.push(revokeItem);
      }
    }
    return (
      <div className="flex items-center gap-1.5">
        {primary}
        {menu.length ? <RowMenu label={`More actions for the invitation to ${i.name}`} items={menu} /> : null}
      </div>
    );
  };
  const dates = (i: Invitation) => (i.status === "pending" ? `Expires ${formatDate(i.expiresAt)}` : i.status === "expired" ? `Expired ${formatDate(i.expiresAt)}` : `Created ${formatDate(i.invitedAt)}`);
  const deliveryCell = (i: Invitation) => (
    <div className="min-w-0">
      <StatusChip tone={DELIVERY_TONE[i.delivery.status]}>{DELIVERY_LABEL[i.delivery.status]}</StatusChip>
      <span className="mt-1 block truncate text-[12px] leading-snug text-(--ap-muted)" title={i.delivery.failureReason ?? undefined}>
        {i.delivery.status === "copied" ? `Link created ${formatRelativePast(i.delivery.lastAttemptAt ?? "")}, shared by you` : i.delivery.lastAttemptAt ? `Sent ${formatRelativePast(i.delivery.lastAttemptAt)}, delivery: ${i.delivery.status}` : "Nothing sent yet"}
        {i.delivery.failureReason ? `. ${i.delivery.failureReason}` : ""}
      </span>
    </div>
  );
  const shown = page.rows.slice(0, limit);

  return (
    <div>
      <ListCard flat title="Invitations" summary={`${page.total} ${page.total === 1 ? "invitation" : "invitations"}${narrowed ? " match your filters" : ""}`}>
      <ListToolbar
        tabsLabel="Filter invitations by status"
        tabs={INVITE_ORDER.map((st) => ({ key: st, label: st === "all" ? "All" : INVITE_LABEL[st], count: page.statusCounts[st] }))}
        tab={status}
        onTab={(k: InvitationStatus | "all") => setStatus(k)}
        search={{ value: search, onChange: setSearch, label: "Search invitations", placeholder: "Search name, email or role" }}
        filters={[{ key: "kind", label: "Invitation type", value: kind || ANY, onChange: (v) => setKind(v === ANY ? "" : (v as InvitationKind)), options: [{ value: ANY, label: "All types" }, ...(Object.keys(KIND_LABEL) as InvitationKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))] }]}
        sort={null}
      />
      <div className={`@container transition-opacity ${live.status === "loading" ? "opacity-60" : ""}`}>
        {page.total === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={Search}
              title="No invitations match these filters"
              description="Check the spelling, or clear a filter."
              action={
                narrowed ? (
                  <button type="button" onClick={clear} className="ap-btn ap-btn-s ap-btn-sm">
                    <X className="size-4" aria-hidden="true" /> Clear search and filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <div role="table" aria-label="Invitations" className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[1000px]:block`}>
              <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW}`}>
                <span role="columnheader" className={TH}>Invitee</span>
                <span role="columnheader" className={TH}>Role / scope</span>
                <span role="columnheader" className={TH}>Invitation</span>
                <span role="columnheader" className={TH}>Delivery</span>
                <span role="columnheader" className={TH}>Actions</span>
              </div>
              {shown.map((i) => (
                <div key={i.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[68px]`}>
                  <div role="cell" className="min-w-0 leading-tight">
                    <span className="block truncate text-[15px] font-bold" title={i.name}>{i.name}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={i.email}>{i.email}</span>
                  </div>
                  <div role="cell" className="min-w-0 leading-tight">
                    <span className="block truncate text-[14px] text-(--ap-ink-2)" title={i.roleLabel}>{i.roleLabel}{i.jobTitle ? ` · ${i.jobTitle}` : ""}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-(--ap-muted)" title={i.scopeLabel}>{KIND_LABEL[i.kind]} · {i.scopeLabel}</span>
                  </div>
                  <div role="cell" className="min-w-0">
                    <StatusChip tone={INVITE_TONE[i.status]}>{INVITE_LABEL[i.status]}</StatusChip>
                    <span className="mt-1 block truncate text-[12px] text-(--ap-muted)">{dates(i)}{i.resendCount ? `, resent ${i.resendCount}x` : ""}</span>
                  </div>
                  <div role="cell" className="min-w-0">{deliveryCell(i)}</div>
                  <div role="cell">{actionsFor(i)}</div>
                </div>
              ))}
            </div>
            <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4 @min-[1000px]:hidden`}>
              {shown.map((i) => (
                <li key={i.id} className={CARD_ITEM}>
                  <div className="min-w-0 leading-tight">
                    <span className="block truncate text-[15px] font-bold">{i.name}</span>
                    <span className="block truncate text-[13px] text-(--ap-muted)" title={i.email}>{i.email}</span>
                  </div>
                  <p className="mt-1.5 truncate text-[13px] text-(--ap-muted)" title={`${i.roleLabel}, ${i.scopeLabel}`}><b className="text-(--ap-ink-2)">{KIND_LABEL[i.kind]}</b> · {i.roleLabel}{i.jobTitle ? ` · ${i.jobTitle}` : ""} · {i.scopeLabel}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusChip tone={INVITE_TONE[i.status]}>{INVITE_LABEL[i.status]}</StatusChip>
                    <span className="text-[12px] text-(--ap-muted)">{dates(i)}</span>
                  </div>
                  <div className="mt-2">{deliveryCell(i)}</div>
                  <div className="mt-2.5">{actionsFor(i)}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <ShowMore shown={limit} total={page.total} onMore={more} onClear={narrowed ? clear : null} />
      <p className="mt-3 text-[13px] text-(--ap-muted)">Invitations are never sent automatically. Email delivery is connected later, so sending is recorded only.</p>
      </ListCard>

      {shownLink ? <AccessLinkSheet name={shownLink.name} link={shownLink.link} onClose={() => setShownLink(null)} /> : null}
      {editing ? <EmailSheet inv={editing} busy={busy} error={err} onCancel={() => setEditing(null)} onSubmit={saveEmail} /> : null}
      {revoking ? (
        <ReasonSheet
          title={`Revoke the invitation to ${revoking.name}`}
          description="The link stops working. You can issue a replacement later."
          label="Reason for revoking"
          confirmLabel="Revoke invitation"
          danger
          busy={busy}
          error={err}
          onCancel={() => setRevoking(null)}
          onSubmit={revoke}
        />
      ) : null}
    </div>
  );
}

function EmailSheet({ inv, busy, error, onCancel, onSubmit }: { inv: Invitation; busy: boolean; error: string | null; onCancel: () => void; onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState(inv.email);
  const ok = /^\S+@\S+\.\S+$/.test(email.trim()) && email.trim().toLowerCase() !== inv.email;
  return (
    <SheetFrame
      title={`Edit the email for ${inv.name}`}
      description="The invitation goes back to Not sent. Choose Send invitation again once the address is right."
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <CancelButton onClick={onCancel} disabled={busy} />
          <PrimaryButton disabled={!ok || busy} onClick={() => onSubmit(email.trim())}>
            {busy ? "Working..." : "Save address"}
          </PrimaryButton>
        </>
      }
    >
      <label htmlFor="inv-email" className={FIELD_LABEL}>
        Email address
      </label>
      <input id="inv-email" type="email" className="ap-input mt-1.5" value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} />
      {error ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : null}
    </SheetFrame>
  );
}
