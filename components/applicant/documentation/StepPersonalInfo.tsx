import { Card, CardContent } from "@/components/ui/card";
import { TextField, SelectField, FileUploadField } from "./fields";
import { SAMPLE_DOCUMENTATION_INTAKE } from "@/lib/placeholder-data";

/**
 * Step 1 — Personal Information (non-sensitive). Field set + "non-sensitive
 * first" ordering: docs/BEELIV-SOURCE-OF-TRUTH.md §7 "Personal / Identity
 * Information" and docs/BEELIV-APPLICANT-JOURNEY.md stage 4 recommendation
 * item 1.
 */
export function StepPersonalInfo() {
  const d = SAMPLE_DOCUMENTATION_INTAKE.personal;
  return (
    <Card>
      <CardContent>
        <h2 className="mb-1 text-sm font-semibold text-foreground">Personal Information</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Your basic personal and contact details.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" defaultValue={d.fullName} />
          <TextField label="Email address" type="email" defaultValue={d.email} />
          <TextField label="Phone number" type="tel" defaultValue={d.phone} />
          <TextField label="Team" defaultValue={d.team} />
          <SelectField label="Sex" options={["Male", "Female"]} defaultValue={d.sex} />
          <SelectField
            label="Relationship status"
            options={["Single", "Married", "Divorced", "Widowed"]}
            defaultValue={d.relationshipStatus}
          />
          <SelectField
            label="Physically challenged"
            options={["Yes", "No"]}
            defaultValue={d.physicallyChallenged}
          />
          <TextField label="Birthday" type="date" defaultValue={d.birthday} />
          <TextField label="Nationality" defaultValue={d.nationality} />
          <TextField label="State of origin" defaultValue={d.stateOfOrigin} />
          <TextField
            label="Local Government Area / province / ethnic tribe"
            defaultValue={d.lga}
          />
          <TextField label="Educational qualification" defaultValue={d.educationalQualification} />
        </div>

        <div className="mt-4">
          <TextField label="Home address" defaultValue={d.homeAddress} />
        </div>

        <div className="mt-4">
          <FileUploadField label="Passport photograph" description="A recent photograph, plain background." />
        </div>
      </CardContent>
    </Card>
  );
}
