"use client";

import "./states.css";

/**
 * "This was changed by someone else just now." (409). `onKeepMine` is passed
 * only where the contract allows overwriting; without it only Reload shows.
 */
export function ConflictNotice({
  onReload,
  onKeepMine,
  className = "",
}: {
  onReload: () => void;
  onKeepMine?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" data-tone="warn" className={`st st-card ${className}`}>
      <p className="st-title">This was changed by someone else just now.</p>
      <p className="st-muted">
        Reload to see the latest version. Your own changes have not been saved yet.
      </p>
      <div className="st-row">
        <button type="button" className="st-btn" onClick={onReload}>
          Reload latest
        </button>
        {onKeepMine && (
          <button type="button" className="st-btn" data-variant="secondary" onClick={onKeepMine}>
            Keep my version
          </button>
        )}
      </div>
    </div>
  );
}
