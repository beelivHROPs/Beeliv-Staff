import { Card, CardContent } from "@/components/ui/card";
import { TextField } from "./fields";
import { SAMPLE_DOCUMENTATION_INTAKE } from "@/lib/placeholder-data";

/**
 * Step 4 — Sensitive / Banking Information. Field set: docs/BEELIV-SOURCE-
 * OF-TRUTH.md §7 "Banking Information" + NIN number from "Personal /
 * Identity Information". Deliberately placed near the end of the intake,
 * once the applicant already has real signal they're being seriously
 * considered — docs/BEELIV-APPLICANT-JOURNEY.md stage 4 recommendation item
 * 5. Visually distinguished (shield icon, amber ring) from the earlier
 * non-sensitive steps, matching this project's existing sensitive-data-
 * flagging convention (components/applicant/DocumentCard.tsx's
 * ring-destructive/35 attention treatment).
 *
 * This is the applicant entering their own data — rbac.md confirms an
 * applicant may provide their own documentation, so plain (not masked)
 * fields are appropriate here. Who else may later *view* these fields once
 * submitted is governed by docs/BEELIV-SOURCE-OF-TRUTH.md §8 / rbac.md §8,
 * not decided by this screen.
 */
export function StepSensitive() {
  const d = SAMPLE_DOCUMENTATION_INTAKE.sensitive;
  return (
    <Card className="ring-warning/35">
      <CardContent>
        <div className="mb-1 flex items-center gap-2">
          <ShieldIcon />
          <h2 className="text-sm font-semibold text-foreground">
            Sensitive / Banking Information
          </h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          This information is classified as sensitive. Access to it after submission is
          restricted by role — see docs/architecture/rbac.md §8.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="NIN number" defaultValue={d.nin} />
          <TextField label="Full name on bank account" defaultValue={d.bankAccountName} />
          <TextField label="Bank account number" defaultValue={d.bankAccountNumber} />
          <TextField label="Bank name" defaultValue={d.bankName} />
        </div>
      </CardContent>
    </Card>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="shrink-0 text-warning"
      aria-hidden="true"
    >
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
    </svg>
  );
}
