"use client";

/**
 * "Add from a list" picker for fields that take several values (roles needed,
 * training topics). The dashboard dropdown adds an item as a removable chip;
 * "Other" reveals a text box so anything not listed can still be written in.
 * The value is one comma-separated string, so forms need no new fields.
 */
import { useState } from "react";
import { FieldError } from "@/components/public/auth/fields";
import { SelectMenu } from "@/components/applicant/SelectMenu";

const OTHER = "Other";
const split = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

export function MultiPicker({
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  otherPlaceholder = "Type it here, then press Add",
  maxLength = 500,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder: string;
  error?: string | null;
  otherPlaceholder?: string;
  maxLength?: number;
}) {
  const items = split(value);
  const [other, setOther] = useState(false);
  const [text, setText] = useState("");
  const errId = `${id}-err`;

  const commit = (list: string[]) => onChange(list.join(", ").slice(0, maxLength));
  const add = (v: string) => {
    const t = v.replace(/,/g, " ").trim();
    if (t && !items.some((i) => i.toLowerCase() === t.toLowerCase())) commit([...items, t]);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <SelectMenu
        id={id}
        value=""
        placeholder={placeholder}
        options={[...options.filter((o) => !items.includes(o)), OTHER]}
        invalid={!!error}
        describedBy={error ? errId : undefined}
        onChange={(v) => (v === OTHER ? setOther(true) : add(v))}
      />
      {other ? (
        <div className="flex gap-2">
          <input
            className="ap-input"
            value={text}
            maxLength={80}
            placeholder={otherPlaceholder}
            aria-label="Other"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(text);
                setText("");
              }
            }}
          />
          <button
            type="button"
            className="ps-btn ps-bp !h-12 shrink-0 !px-5 !text-[15px]"
            onClick={() => {
              add(text);
              setText("");
            }}
          >
            Add
          </button>
        </div>
      ) : null}
      {items.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {items.map((i) => (
            <li
              key={i}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-(--ap-tint) py-1 pr-1.5 pl-3.5 text-[14px] font-semibold text-(--ap-violet)"
            >
              {i}
              <button
                type="button"
                aria-label={`Remove ${i}`}
                onClick={() => commit(items.filter((x) => x !== i))}
                className="flex size-6 items-center justify-center rounded-full border-0 bg-transparent text-(--ap-violet) hover:bg-(--ap-tint-2)"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <FieldError id={errId}>{error}</FieldError>
    </div>
  );
}
