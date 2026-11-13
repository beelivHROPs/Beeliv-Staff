/**
 * Replaces a switch for a REQUIRED message (lib/notifications/catalog.ts, `required: true`).
 * A quiet label, not a disabled switch: there is nothing to decide. The title attribute
 * carries the one-line reason for people who hover or use a screen reader.
 */
export function AlwaysSent({ label }: { label: string }) {
  return (
    <span
      title="Needed to use your account or to avoid missing something important, so it can't be switched off."
      aria-label={`${label}: always sent`}
      className="inline-flex h-7 shrink-0 items-center rounded-full bg-(--ap-line-2) px-3 text-[13px] font-semibold whitespace-nowrap text-(--ap-ink-2)"
    >
      Always sent
    </span>
  );
}
