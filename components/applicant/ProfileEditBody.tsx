"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { personaNames, useAvatarState } from "@/lib/applicant/avatar";
import { saveProfile, useApplicantStore } from "@/lib/applicant/service";
import { FieldsForm } from "./ProfileBody";

/**
 * Phones: the pencil beside the name opens this page ("About you"), not a section further down the
 * profile. One form for the personal and contact details, a back arrow instead of Cancel, and a
 * floating Save. Name and sign-in email are shown but not editable here (the same rules as the
 * Personal and Contact cards on the profile page).
 */
export function ProfileEditBody() {
  const router = useRouter();
  const { profile } = useApplicantStore();
  const { gender } = useAvatarState();
  const names = personaNames(gender);

  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/applicant/profile");
  };

  return (
    <div className="pb-28">
      <div className="mb-5 flex items-center gap-1.5">
        <button type="button" onClick={back} aria-label="Back to profile" className="-ml-2 inline-flex size-11 items-center justify-center rounded-full text-(--ap-ink) hover:bg-(--ap-line-2)">
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>
        <h1 className="ap-serif text-[28px]">About you</h1>
      </div>

      <dl className="mb-6 grid gap-4 rounded-2xl border border-(--ap-line) bg-white p-4">
        <div>
          <dt className="text-sm font-semibold text-(--ap-muted)">Full name</dt>
          <dd className="m-0 text-base font-semibold">{names.legal}</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-(--ap-muted)">Email</dt>
          <dd className="m-0 text-base font-semibold wrap-anywhere">{names.email}</dd>
        </div>
        <p className="m-0 text-[14px] text-(--ap-muted)">Your name comes from your verified account, and your sign-in email is changed from Settings.</p>
      </dl>

      <h2 className="ap-serif mb-3 text-[22px]">Your details</h2>
      <FieldsForm
        narrow
        floatingSave
        fields={[
          { key: "phone", label: "Phone", value: profile.phone, kind: "phone" },
          { key: "whatsapp", label: "WhatsApp", value: profile.whatsapp, kind: "phone" },
          { key: "address", label: "Residential address", value: profile.address, kind: "address" },
          { key: "dateOfBirth", label: "Date of birth", value: profile.dateOfBirth, kind: "dob" },
          { key: "gender", label: "Gender", value: profile.gender, kind: "gender" },
          { key: "nationality", label: "Nationality", value: profile.nationality },
          { key: "state", label: "State of origin", value: profile.state, kind: "state" },
          { key: "lga", label: "LGA (of origin)", value: profile.lga, kind: "lga" },
        ]}
        onCancel={back}
        onSave={async (v) => {
          await saveProfile(v);
          toast.add({ title: "Profile updated", type: "success" });
          router.push("/applicant/profile");
        }}
      />
    </div>
  );
}
