import { Card, CardContent } from "@/components/ui/card";
import { TextField } from "./fields";
import { SAMPLE_DOCUMENTATION_INTAKE } from "@/lib/placeholder-data";

/** Step 3 — Next of Kin. Field set: docs/BEELIV-SOURCE-OF-TRUTH.md §7. */
export function StepNextOfKin() {
  const d = SAMPLE_DOCUMENTATION_INTAKE.nextOfKin;
  return (
    <Card>
      <CardContent>
        <h2 className="mb-1 text-sm font-semibold text-foreground">Next of Kin</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Someone we can contact on your behalf in an emergency.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" defaultValue={d.name} />
          <TextField label="Phone number" type="tel" defaultValue={d.phone} />
          <TextField label="Relationship" defaultValue={d.relationship} />
        </div>
        <div className="mt-4">
          <TextField label="Contact address" defaultValue={d.address} />
        </div>
      </CardContent>
    </Card>
  );
}
