import { Card, CardContent } from "@/components/ui/card";
import { FileUploadField } from "./fields";

/**
 * Step 5 — Required Documents. docs/BEELIV-SOURCE-OF-TRUTH.md §7
 * "Identification Documents". Passport photograph is already collected in
 * Step 1 (Personal Information) — deliberately not duplicated here. Accepted
 * file *formats* are not confirmed anywhere — no format restriction is
 * stated or implied.
 */
export function StepDocuments() {
  return (
    <Card>
      <CardContent>
        <h2 className="mb-1 text-sm font-semibold text-foreground">Required Documents</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Upload the document requested below. Your passport photograph was already collected in
          Personal Information.
        </p>

        <FileUploadField
          label="Copy of NIN"
          description="A clear copy of your National Identification Number document."
        />

        {/* docs/BEELIV-SOURCE-OF-TRUTH.md §7 note under Identification
            Documents — do not invent what "other documentation" might be. */}
        <p className="mt-4 rounded-md bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          Other documentation may be added here as operational requirements are finalized.
        </p>
      </CardContent>
    </Card>
  );
}
