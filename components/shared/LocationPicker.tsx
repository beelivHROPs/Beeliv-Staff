"use client";

/**
 * State -> Local Government -> nearest junction. Our replacement for a Google
 * Maps address search, used wherever a business or person gives a location.
 * State and LGA are the dashboard's own dropdown (SelectMenu); the junction is
 * a type-or-pick field (suggestions where we know the area, free text always).
 * The value is one string - "Junction, LGA, State", or with `street`:
 * "12 Aminu Kano Cres (near Wuse Junction), LGA, State" - so forms need no new fields.
 */
import { useId, useMemo, useState } from "react";
import { FieldError } from "@/components/public/auth/fields";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { junctionSuggestions } from "@/lib/applicant/places";
import { STATES, lgasOf } from "@/lib/shared/nigeria-locations";

function parse(value: string, withStreet: boolean) {
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  const state = STATES.includes(parts[parts.length - 1] ?? "") ? parts.pop()! : "";
  const lga = state && lgasOf(state).includes(parts[parts.length - 1] ?? "") ? parts.pop()! : "";
  const rest = parts.join(", ");
  if (!withStreet) return { state, lga, street: "", junction: rest };
  const m = /^(.*?)(?:s*(near (.*)))?$/.exec(rest);
  return { state, lga, street: m?.[1] ?? rest, junction: m?.[2] ?? "" };
}
function compose(st: string, j: string, l: string, s: string, withStreet: boolean) {
  const place = withStreet ? [st.trim(), j.trim() ? `(near ${j.trim()})` : ""].filter(Boolean).join(" ") : j.trim();
  return [place, l, s].filter(Boolean).join(", ");
}

export function LocationPicker({
  idPrefix,
  value,
  onChange,
  error,
  fieldClass = "rq-f",
  noteClass = "rq-opt",
  street,
  invalid,
}: {
  idPrefix: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  /** Wrapper class that gives each label the form's label style (rq-f / cf-f). */
  fieldClass?: string;
  /** Class for the small "· Pick or type it" note beside a label. */
  noteClass?: string;
  /** Adds a house number / street field on top (for full addresses). */
  street?: { placeholder: string };
  /** Marks the required fields invalid without showing a message. */
  invalid?: boolean;
}) {
  const withStreet = !!street;
  const [init] = useState(() => parse(value, withStreet));
  const [st, setSt] = useState(init.street);
  const [state, setState] = useState(init.state);
  const [lga, setLga] = useState(init.lga);
  const [junction, setJunction] = useState(init.junction);
  const [focus, setFocus] = useState(false);
  const listId = useId();
  const errId = `${idPrefix}-err`;

  const suggestions = useMemo(() => (state ? junctionSuggestions(state, lga) : []), [state, lga]);
  const shown = suggestions
    .filter((s) => s.toLowerCase().includes(junction.trim().toLowerCase()))
    .slice(0, 8);

  function update(s: string, l: string, j: string, streetText = st) {
    setState(s);
    setLga(l);
    setJunction(j);
    setSt(streetText);
    onChange(compose(streetText, j, l, s, withStreet));
  }

  return (
    <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[640px]:gap-[18px]">
      {street && (
        <div className={`${fieldClass} min-[640px]:col-span-2`}>
          <label htmlFor={idPrefix}>House number and street</label>
          <input
            id={idPrefix}
            className="ap-input"
            value={st}
            maxLength={120}
            autoComplete="street-address"
            placeholder={street.placeholder}
            aria-invalid={invalid && !st.trim() ? true : undefined}
            onChange={(e) => update(state, lga, junction, e.target.value)}
          />
        </div>
      )}
      <div className={fieldClass}>
        <label htmlFor={`${idPrefix}-state`}>State</label>
        <SelectMenu
          id={`${idPrefix}-state`}
          value={state}
          placeholder="Select a state"
          options={STATES}
          invalid={(!!error || !!invalid) && !state}
          describedBy={error ? errId : undefined}
          onChange={(v) => update(v, "", "")}
        />
      </div>
      <div className={fieldClass}>
        <label htmlFor={`${idPrefix}-lga`}>Local government</label>
        <SelectMenu
          id={`${idPrefix}-lga`}
          value={lga}
          placeholder={state ? "Select local government" : "Select a state first"}
          options={[...lgasOf(state)]}
          invalid={(!!error || !!invalid) && !!state && !lga}
          onChange={(v) => update(state, v, junction)}
        />
      </div>
      <div className={`${fieldClass} relative min-[640px]:col-span-2`}>
        <label htmlFor={`${idPrefix}-junction`}>
          Nearest junction <span className={noteClass}> · Pick or type it</span>
        </label>
        <input
          id={`${idPrefix}-junction`}
          className="ap-input"
          value={junction}
          maxLength={120}
          autoComplete="off"
          role="combobox"
          aria-expanded={focus && shown.length > 0}
          aria-controls={listId}
          placeholder={lga ? "e.g. Ikorodu Garage" : "Pick or type a junction"}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => {
            setFocus(true);
            update(state, lga, e.target.value);
          }}
        />
        {focus && shown.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="ap-pop-in absolute top-[calc(100%+6px)] left-0 z-50 max-h-60 w-full overflow-y-auto overscroll-contain rounded-2xl border border-(--ap-line) bg-white p-1.5 shadow-[0_18px_40px_rgba(37,0,68,.14)]"
          >
            {shown.map((s) => (
              <li
                key={s}
                role="option"
                aria-selected={s === junction}
                onMouseDown={(e) => {
                  e.preventDefault();
                  update(state, lga, s);
                  setFocus(false);
                }}
                className="flex min-h-11 cursor-pointer items-center rounded-[10px] px-3 py-2 text-[15px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-tint)"
              >
                {s}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="min-[640px]:col-span-2">
        <FieldError id={errId}>{error}</FieldError>
      </div>
    </div>
  );
}
