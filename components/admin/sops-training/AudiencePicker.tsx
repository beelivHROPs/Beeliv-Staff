"use client";

/**
 * Audience picker used by SOPs, Training, Agreements and Announcements. All
 * lists (clients, outlets, roles, departments) are configurable adapter data,
 * never hard-coded here. "All staff" is one switch; otherwise pick any of the
 * groups. The matching rule (a person must match every group that has a
 * selection) is PROVISIONAL and needs Beeliv confirmation, and the hint says so.
 */
import { Check } from "@/components/applicant/icons";

export interface AudienceValue {
  allStaff: boolean;
  clientIds: string[];
  outletIds: string[];
  roleIds: string[];
  departmentIds?: string[];
}
type Option = { id: string; name: string };

function Group({ label, options, selected, onToggle, empty }: { label: string; options: Option[]; selected: string[]; onToggle: (id: string) => void; empty?: string }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 p-0 text-[13px] font-bold text-(--ap-muted)">{label}</legend>
      {options.length === 0 ? (
        <p className="text-[13px] text-(--ap-muted)">{empty ?? "Nothing to choose from."}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const on = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(o.id)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[14px] font-semibold transition-colors ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) bg-(--ap-surface) text-(--ap-ink-2) hover:bg-(--ap-tint)"}`}
              >
                {on ? <Check className="size-3.5" aria-hidden="true" /> : null}
                {o.name}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export function AudiencePicker<T extends AudienceValue>({
  idPrefix,
  value,
  onChange,
  clients,
  roles,
  departments,
  error,
  extra,
}: {
  idPrefix: string;
  value: T;
  onChange: (v: T) => void;
  clients: { id: string; name: string; outlets: Option[] }[];
  roles: Option[];
  /** Pass only where departments apply (SOPs, training, agreements). */
  departments?: Option[];
  error?: string;
  extra?: React.ReactNode;
}) {
  const pickClient = (id: string) => {
    const clientIds = toggle(value.clientIds, id);
    const allowed = clients.filter((c) => !clientIds.length || clientIds.includes(c.id)).flatMap((c) => c.outlets.map((o) => o.id));
    onChange({ ...value, clientIds, outletIds: value.outletIds.filter((o) => allowed.includes(o)) });
  };
  const outlets = clients.filter((c) => !value.clientIds.length || value.clientIds.includes(c.id)).flatMap((c) => c.outlets);
  return (
    <div data-ap-field>
      <label htmlFor={`${idPrefix}-all`} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-semibold text-(--ap-ink)">
        <input
          id={`${idPrefix}-all`}
          type="checkbox"
          className="size-4"
          checked={value.allStaff}
          onChange={(e) => onChange({ ...value, allStaff: e.target.checked })}
          aria-describedby={error ? `${idPrefix}-err` : undefined}
          aria-invalid={error ? true : undefined}
        />
        All staff
      </label>
      {value.allStaff ? null : (
        <div className="mt-2 flex flex-col gap-4 rounded-xl border border-(--ap-line-2) p-4">
          <Group label="Clients" options={clients} selected={value.clientIds} onToggle={pickClient} />
          <Group label="Outlets" options={outlets} selected={value.outletIds} onToggle={(id) => onChange({ ...value, outletIds: toggle(value.outletIds, id) })} />
          <Group label="Roles" options={roles} selected={value.roleIds} onToggle={(id) => onChange({ ...value, roleIds: toggle(value.roleIds, id) })} />
          {departments ? <Group label="Departments" options={departments} selected={value.departmentIds ?? []} onToggle={(id) => onChange({ ...value, departmentIds: toggle(value.departmentIds ?? [], id) })} /> : null}
          <p className="text-[13px] text-(--ap-muted)">A person is included when they match every group you fill in (any one value within a group). This matching rule needs Beeliv confirmation.</p>
        </div>
      )}
      {extra}
      {error ? (
        <p id={`${idPrefix}-err`} role="alert" className="mt-1.5 text-[13px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
