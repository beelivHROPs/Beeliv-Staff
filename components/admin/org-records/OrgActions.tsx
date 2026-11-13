"use client";

/**
 * Entry points for the org-records actions. Each renders nothing unless (a) the Admin role may do it
 * (lib/admin/role-access.ts, presentation only: the server and database re-check) and (b) the server says the
 * live backend is on with writes enabled. In local mock mode they are absent, so mock screens are unchanged.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionsMenu } from "@/components/admin/applicants/ActionsMenu";
import { Plus } from "@/components/applicant/icons";
import { orgRecordsWritesAvailable } from "@/lib/admin/org-records/mode";
import { orgErrorMessage } from "@/lib/admin/org-records/transport";
import { createClient, createOutlet, createStaff, deactivateClient, deactivateOutlet, updateClient, type ClientFields } from "@/lib/admin/org-records/writes";
import { useCan, type AdminCapability } from "@/lib/admin/role-access";
import { ClientSheet, DeactivateSheet, OutletSheet, StaffSheet } from "./OrgSheets";

const BTN = "ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold max-[767px]:h-11 max-[767px]:px-4 max-[767px]:text-[14px]";

/** One write at a time, with a plain-language error and a busy flag. Never retries by itself. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(work: () => Promise<unknown>): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      await work();
      return true;
    } catch (e) {
      setError(orgErrorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run, clear: () => setError(null) };
}
const useAllowed = (cap: AdminCapability) => useCan(cap) && orgRecordsWritesAvailable();

export function AddClientButton({ hrefFor }: { hrefFor: (clientId: string) => string }) {
  const allowed = useAllowed("clients.create");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const a = useAction();
  if (!allowed) return null;
  return (
    <>
      <button type="button" onClick={() => { a.clear(); setOpen(true); }} className={BTN}>
        <Plus className="size-4" aria-hidden="true" /> Add client
      </button>
      {open ? (
        <ClientSheet
          mode="add" busy={a.busy} error={a.error} onCancel={() => setOpen(false)}
          onSubmit={async (v) => {
            let id = "";
            if (await a.run(async () => { id = (await createClient(v)).clientId; })) { setOpen(false); router.push(hrefFor(id)); }
          }}
        />
      ) : null}
    </>
  );
}

export function AddStaffButton() {
  const allowed = useAllowed("staff.create");
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const a = useAction();
  if (!allowed) return null;
  return (
    <>
      <button type="button" onClick={() => { a.clear(); setDone(null); setOpen(true); }} className={BTN}>
        <Plus className="size-4" aria-hidden="true" /> Add staff member
      </button>
      {done ? <span role="status" className="text-[13px] font-semibold text-(--ap-ink-2)">{done}</span> : null}
      {open ? (
        <StaffSheet
          busy={a.busy} error={a.error} onCancel={() => setOpen(false)}
          onSubmit={async (v) => {
            let ref = "";
            if (await a.run(async () => { ref = (await createStaff(v)).reference; })) { setOpen(false); setDone(`Added. Staff ID ${ref}.`); }
          }}
        />
      ) : null}
    </>
  );
}

type Business = { type: string; city: string; address: string };

/** "Manage" menu on a client page: Edit details, Add outlet, Deactivate. */
export function ClientAdminMenu({ client }: { client: { id: string; name: string; status: string; business: Business } }) {
  const allowed = useAllowed("clients.create");
  const [sheet, setSheet] = useState<"edit" | "outlet" | "deactivate" | null>(null);
  const a = useAction();
  if (!allowed || client.status === "inactive") return null;
  const open = (s: "edit" | "outlet" | "deactivate") => { a.clear(); setSheet(s); };
  const before: ClientFields = { name: client.name, businessType: client.business.type, city: client.business.city, address: client.business.address };
  return (
    <>
      <ActionsMenu
        label="Manage"
        items={[
          { label: "Edit details", onSelect: () => open("edit") },
          { label: "Add outlet", onSelect: () => open("outlet") },
          { label: "Deactivate client", tone: "danger", onSelect: () => open("deactivate") },
        ]}
      />
      {sheet === "edit" ? (
        <ClientSheet
          mode="edit" initial={before} busy={a.busy} error={a.error} onCancel={() => setSheet(null)}
          onSubmit={async (v) => {
            const patch = changed(before, v);
            if (Object.keys(patch).length === 0) return setSheet(null);
            if (await a.run(() => updateClient(client.id, patch))) setSheet(null);
          }}
        />
      ) : null}
      {sheet === "outlet" ? (
        <OutletSheet clientName={client.name} busy={a.busy} error={a.error} onCancel={() => setSheet(null)} onSubmit={async (v) => { if (await a.run(() => createOutlet(client.id, v))) setSheet(null); }} />
      ) : null}
      {sheet === "deactivate" ? (
        <DeactivateSheet
          title={`Deactivate ${client.name}?`} confirmLabel="Deactivate client" busy={a.busy} error={a.error} onCancel={() => setSheet(null)}
          description="Its outlets are deactivated too and it can no longer receive new placements. This is refused while anyone is placed there. Nothing is deleted."
          onSubmit={async (reason) => { if (await a.run(() => deactivateClient(client.id, reason))) setSheet(null); }}
        />
      ) : null}
    </>
  );
}

/** "Deactivate outlet" on an outlet page (editing stays with the existing Edit details sheet). */
export function OutletAdminMenu({ clientId, outlet }: { clientId: string; outlet: { id: string; name: string; status: string } }) {
  const allowed = useAllowed("clients.create");
  const [open, setOpen] = useState(false);
  const a = useAction();
  if (!allowed || outlet.status === "inactive") return null;
  return (
    <>
      <ActionsMenu label="Manage" items={[{ label: "Deactivate outlet", tone: "danger", onSelect: () => { a.clear(); setOpen(true); } }]} />
      {open ? (
        <DeactivateSheet
          title={`Deactivate ${outlet.name}?`} confirmLabel="Deactivate outlet" busy={a.busy} error={a.error} onCancel={() => setOpen(false)}
          description="It can no longer receive new placements. This is refused while anyone is placed there. Nothing is deleted."
          onSubmit={async (reason) => { if (await a.run(() => deactivateOutlet(clientId, outlet.id, reason))) setOpen(false); }}
        />
      ) : null}
    </>
  );
}

/** Only the fields that actually changed (the server refuses an empty patch). */
function changed(before: ClientFields, after: ClientFields): Partial<ClientFields> {
  const out: Partial<ClientFields> = {};
  (Object.keys(before) as (keyof ClientFields)[]).forEach((k) => { if (after[k].trim() !== before[k]) out[k] = after[k]; });
  return out;
}
