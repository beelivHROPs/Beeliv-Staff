import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MAX_UPLOAD_SIZE_MB } from "@/lib/constraints";
import { DISABLED_FIELD_TITLE, DISABLED_UPLOAD_TITLE } from "./constants";

/**
 * Small, locally-scoped label+field wrappers for the Documentation wizard —
 * not a new entry in ui-ux-framework.md §12's shared-component inventory,
 * just DRY composition of the already-approved Input primitive (components/
 * ui/input.tsx) and the disabled-field convention already used in app/login/
 * page.tsx and app/apply/[id]/page.tsx. Kept local to components/applicant/
 * documentation rather than components/shared, since nothing outside this
 * feature needs them.
 *
 * Every field is a disabled structural placeholder — this is Stage 1, no
 * Supabase Auth/database/storage wiring exists. Field-by-field requiredness
 * is not confirmed anywhere (docs/requirements.md §5), so nothing here is
 * marked required/optional or validated — every field renders plain and
 * equally-weighted.
 */

// Derived from label, not a separate prop — labels are unique within any
// one caller's fields, so this is enough to give every label/field pair a
// real htmlFor/id association (found missing via a QA sweep).
function idFor(label: string) {
  return `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function TextField({
  label,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
}) {
  const id = idFor(label);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
      <Input
        id={id}
        type={type}
        disabled
        title={DISABLED_FIELD_TITLE}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  );
}

export function SelectField({
  label,
  options,
  defaultValue,
}: {
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  const id = idFor(label);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
      {/* Plain native <select>, styled to match Input's visual treatment —
          no new select primitive introduced, per the task brief's own
          allowance for this handful of naturally-enumerated fields. */}
      <select
        id={id}
        disabled
        title={DISABLED_FIELD_TITLE}
        defaultValue={defaultValue ?? ""}
        className="mt-1 h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base text-foreground outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm"
      >
        <option value="" disabled>
          Select...
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextAreaField({
  label,
  defaultValue,
  placeholder,
}: {
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const id = idFor(label);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
      <textarea
        id={id}
        disabled
        title={DISABLED_FIELD_TITLE}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={3}
        className="mt-1 w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
      />
    </div>
  );
}

export function FileUploadField({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  const id = idFor(label);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
      <div className="mt-1 flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
          {/* Confirmed constraint (database-architecture.md §10) — accepted
              file *formats* are not confirmed anywhere, so none is stated
              or implied here. */}
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Max file size: {MAX_UPLOAD_SIZE_MB}MB
          </p>
        </div>
        <Button
          id={id}
          type="button"
          size="sm"
          variant="outline"
          disabled
          title={DISABLED_UPLOAD_TITLE}
        >
          Upload
        </Button>
      </div>
    </div>
  );
}
