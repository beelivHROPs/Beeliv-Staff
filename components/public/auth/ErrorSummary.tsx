"use client";

import { useEffect, useRef } from "react";
import { AlertIcon } from "./AuthIcons";

/**
 * Error summary for the auth forms (shared-states.md rule 5): role="alert",
 * keyboard focus moves here when `focusKey` changes (increment it on each
 * failed submit), and each problem links to its field. Inline field errors stay
 * as they are; this is the single place a screen reader lands first.
 */
export function ErrorSummary({
  title,
  items = [],
  focusKey,
}: {
  title: string;
  /** `fieldId` is the input's id; omit for a general (non-field) message. */
  items?: { fieldId?: string; message: string }[];
  focusKey: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusKey > 0) ref.current?.focus();
  }, [focusKey]);

  return (
    <div ref={ref} role="alert" tabIndex={-1} className="au-summary">
      <p className="flex items-start gap-2 font-medium">
        <span className="mt-0.5 shrink-0">
          <AlertIcon size={16} />
        </span>
        <span>{title}</span>
      </p>
      {items.length > 0 && (
        <ul>
          {items.map((it) => (
            <li key={`${it.fieldId ?? "x"}-${it.message}`}>
              {it.fieldId ? (
                <a
                  href={`#${it.fieldId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(it.fieldId!)?.focus();
                  }}
                >
                  {it.message}
                </a>
              ) : (
                it.message
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
