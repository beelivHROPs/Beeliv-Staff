"use client";

import { saveProfile, useApplicantStore } from "@/lib/applicant/service";
import { PhotoSourceDialog } from "@/components/shared/PhotoSourceDialog";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ArrowRight, Camera, Check, Files, LockKeyhole, Pencil, Settings } from "@/components/applicant/icons";
import { ActionPill, Facts, HERO_SURFACE, HeroDeco, Panel, Sk, confirmAction } from "../kit";
import { PhoneInput } from "@/components/applicant/form-fields";
import { formatPhone, isValidPhone } from "@/lib/phone/phone";
import { useFlagInvalid } from "@/components/applicant/form-feedback";
import { toast } from "@/components/ui/toast";
import { chooseAvatar, readAndResize, setAvatarPhoto, useAvatarState } from "@/lib/applicant/avatar";
import { dayMonth } from "@/lib/staff/format";
import { staffMode } from "@/lib/staff/mode";
import { useCurrentAssignment, usePersonalDetails, useSensitiveStatus, useStaffProfile } from "@/lib/staff/hooks";
import { updateStaffContact } from "@/lib/staff/service";
import type { AccountStatus, StaffAssignment, StaffProfile } from "@/lib/staff/types";
import { ErrorPanel } from "../ErrorPanel";
import { StaffAvatar } from "../StaffAvatar";
import { withStaffPreloader } from "../StaffPreloader";
import { AccessibilityCard, BankCard, EducationCard, EmploymentCard, NextOfKinCard, NinCard, PersonalDetailsCard } from "./DetailsSections";
import { ProfileSkeleton } from "./ProfileSkeleton";

/**
 * Staff Profile (brief section 13). Fields are split three ways:
 *  - EDITABLE          - you can change it here (the card has an Edit pill)
 *  - MANAGED BY BEELIV - read-only, marked with a small lock
 *  - SENSITIVE         - NIN / bank / next of kin / physical challenge: WRITE-ONLY.
 *                        The person adds them here; afterwards only the masked
 *                        status from the backend is shown (DetailsSections.tsx).
 * Which fields fall in which group is a UI default; the backend/RLS decides
 * the real permissions (docs/contracts/staff-personal-details.md).
 *
 * Layout: one rich hero (photo, name, role, status), then facts as quiet rows in
 * white cards. The "add your details" sections live in DetailsSections.tsx.
 */

const STATUS_LABEL: Record<AccountStatus, [string, "ok" | "info" | "mute"]> = {
  active: ["Active", "ok"],
  onboarding: ["Setting up", "info"],
  "invitation-required": ["Invitation needed", "mute"],
  "invitation-expired": ["Invitation expired", "mute"],
  suspended: ["Suspended", "mute"],
  deactivated: ["No longer active", "mute"],
};

type Kind = "editable" | "managed";

/** A fact row: label (with a small lock when only Beeliv can change it) and value. */
function rowOf(label: string, value: ReactNode, kind: Kind): [string, ReactNode] {
  return [
    label,
    <span key={label} className="inline-flex items-center justify-end gap-1.5">
      {value || <span className="font-medium text-(--ap-faint)">Not added</span>}
      {kind === "managed" ? (
        <>
          <LockKeyhole className="size-3.5 shrink-0 text-(--ap-faint)" aria-hidden="true" />
          <span className="sr-only">Managed by Beeliv</span>
        </>
      ) : null}
    </span>,
  ];
}

const GRID = "grid grid-cols-2 gap-x-5 gap-y-4 max-[640px]:grid-cols-1";

/**
 * Profile photo upload. Same account as the Applicant side, so the photo is
 * shared across both (lib/applicant/avatar.ts). PROTOTYPE: kept on this
 * device only; who else can see it (HR/Ops, the assigned outlet) is an RBAC
 * decision for the backend - see docs/architecture/rbac.md (TBD).
 */
function PhotoControl({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  // The photo from the application journey is the one shown (shared store); only "Change photo" is offered here.
  const { photo } = useAvatarState();

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.add({ title: "Choose an image file", type: "error" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.add({ title: "That photo is over 8 MB", type: "error" });
      return;
    }
    try {
      setAvatarPhoto(await readAndResize(file));
      toast.add({ title: "Profile photo updated", type: "success" });
    } catch {
      toast.add({ title: "We couldn't read that image", type: "error" });
    }
  }

  async function removePhoto() {
    const ok = await confirmAction({
      tone: "danger",
      title: "Remove your photo?",
      description: "Your profile will show your initials until you add a new one.",
      confirmLabel: "Remove photo",
      cancelLabel: "Keep it",
    });
    if (!ok) return;
    chooseAvatar("f");
    toast.add({ title: "Photo removed" });
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div className="relative">
        <StaffAvatar name={name} photoUrl={photo ?? avatarUrl} size={96} />
        <button
          type="button"
          title="Change photo"
          onClick={() => setOpen(true)}
          className="absolute -right-1 -bottom-1 flex size-11 cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-(--staff-fill,#5b45bf) text-white shadow-[0_4px_10px_rgba(37,0,68,0.25)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Camera className="size-[18px]" aria-hidden="true" />
          <span className="sr-only">Change photo</span>
        </button>
        <PhotoSourceDialog open={open} onOpenChange={setOpen} onFile={(f) => void onPhoto(f)} currentPhoto={photo ?? avatarUrl ?? null} />
      </div>
      {photo ? (
        <button type="button" onClick={() => void removePhoto()} className="inline-flex min-h-11 items-center rounded-full px-3 text-[14px] font-semibold text-white/90 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">
          Remove photo
        </button>
      ) : null}
    </div>
  );
}

export function ProfileBody() {
  const { data: staffProfile, status, retry } = useStaffProfile();
  // One Talent person: contact details given in the application fill in whatever the Staff record does not hold yet.
  const talent = useApplicantStore().profile;
  const personal = usePersonalDetails();
  const sensitive = useSensitiveStatus();
  // Live mode never borrows from the Applicant store (it is preview data there): only what the server returned is shown.
  const live = staffMode() === "live";
  const profile = staffProfile ? (live ? staffProfile : { ...staffProfile, preferredName: staffProfile.preferredName !== null ? staffProfile.preferredName : talent.preferredName || null, phone: staffProfile.phone !== null ? staffProfile.phone : talent.phone || null }) : staffProfile;
  if (status === "loading") return <ProfileSkeleton />;
  if (status === "error" || !profile)
    return (
      <div className="mx-auto w-full max-w-[760px] pt-2">
        <h1 className="sr-only">Profile</h1>
        <ErrorPanel title="We couldn't load your profile" retry={retry} />
      </div>
    );

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const [statusText, statusTone] = STATUS_LABEL[profile.accountStatus];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2">
      <section aria-label="Your profile" className={`${HERO_SURFACE} flex items-center gap-4 p-5 min-[768px]:gap-6 min-[768px]:p-7`}>
        <HeroDeco />
        <PhotoControl name={fullName} avatarUrl={profile.avatarUrl} />
        <div className="min-w-0 flex-1 leading-snug">
          <h1 className="text-[26px] leading-tight font-bold wrap-anywhere min-[768px]:text-[32px]">{profile.preferredName || fullName}</h1>
          <p className="text-[16px] text-white/85">{profile.roleLabel}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[14px] font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-1">
              <span className={`size-2 rounded-full ${statusTone === "ok" ? "bg-[#7fe0a8]" : "bg-[#e8d9a8]"}`} aria-hidden="true" />
              {statusText}
            </span>
            <span className="rounded-full bg-white/16 px-3 py-1 tabular-nums">{profile.staffId}</span>
          </div>
        </div>
      </section>

      <p className="-mt-2 flex items-center gap-1.5 px-1 text-[14px] text-(--ap-muted)">
        <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" /> A lock means only Beeliv can change it. Everything else you can edit here.
      </p>

      <div className="flex flex-col gap-5 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,1fr)_380px] min-[1000px]:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <PersonalCard profile={profile} fullName={fullName} />
          <PersonalDetailsCard load={personal} />
          <AssignmentCard />
          <EmploymentCard />
          <EducationCard load={personal} />
          <NextOfKinCard load={sensitive} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <NinCard load={sensitive} />
          <BankCard load={sensitive} />
          <AccessibilityCard load={sensitive} />
          <Panel title="Agreements & consents">
            <p className="text-[16px] text-(--ap-ink-2)">Agreements you accept are recorded against your account. Review or respond to them in Documents.</p>
            <ActionPill href="/staff/documents" icon={Files} variant="outline" compact className="mt-4">
              Open Documents
            </ActionPill>
          </Panel>
          <Panel title="Account">
            <Facts rows={[rowOf("Beeliv staff ID", profile.staffId, "managed"), rowOf("Sign-in email", profile.email, "managed")]} />
            <p className="mt-3 text-[14px] text-(--ap-muted)">Shared across your Beeliv account. Change it in Settings.</p>
            <ActionPill href="/staff/settings" icon={Settings} variant="outline" compact className="mt-4">
              Account &amp; security
            </ActionPill>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ---------- Personal & Contact (the editable section) ---------- */

function PersonalCard({ profile, fullName }: { profile: StaffProfile; fullName: string }) {
  const [editing, setEditing] = useState(false);
  return (
    <Panel
      title="Personal & contact"
      aside={
        editing ? undefined : (
          <ActionPill variant="outline" compact arrow={false} icon={Pencil} onClick={() => setEditing(true)} ariaLabel="Edit personal and contact details">
            Edit
          </ActionPill>
        )
      }
    >
      {editing ? (
        <PersonalForm profile={profile} onDone={() => setEditing(false)} />
      ) : (
        <Facts
          rows={[
            rowOf("Full name", fullName, "managed"),
            rowOf("Preferred name", profile.preferredName, "editable"),
            rowOf("Phone", profile.phone ? formatPhone(profile.phone) : profile.phone, "editable"),
            rowOf("Email", profile.email, "managed"),
          ]}
        />
      )}
    </Panel>
  );
}

function PersonalForm({ profile, onDone }: { profile: StaffProfile; onDone: () => void }) {
  const [preferred, setPreferred] = useState(profile.preferredName ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  // Empty is allowed; a partly typed number is not.
  const valid = phone === "" || isValidPhone(phone);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!valid) {
      setTried(true);
      flag();
      return;
    }
    setBusy(true);
    try {
      // An empty box is a real choice (no preferred name / no phone), not "fall back to the application". The application profile is the same person, so it is updated too.
      await withStaffPreloader("save", async () => {
        await updateStaffContact({ preferredName: preferred.trim(), phone });
        await saveProfile({ preferredName: preferred.trim(), phone });
      });
      toast.add({ title: "Profile updated", type: "success" });
      onDone();
    } catch {
      toast.add({ title: "We couldn't save your changes", description: "Please try again.", type: "error" });
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={save} noValidate>
      <div className={GRID}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="sp-preferred" className="text-sm font-semibold text-(--ap-ink-2)">Preferred name</label>
          <input id="sp-preferred" className="ap-input" value={preferred} maxLength={40} onChange={(e) => setPreferred(e.target.value)} placeholder="How you'd like to be greeted" />
        </div>
        <div data-ap-field className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="sp-phone" className="text-sm font-semibold text-(--ap-ink-2)">Phone</label>
          <PhoneInput id="sp-phone" value={phone} onChange={setPhone} invalid={tried && !valid} />
        </div>
      </div>
      <p className="mt-3 text-[14px] text-(--ap-muted)">Your legal name and sign-in email are managed by Beeliv and can&apos;t be changed here.</p>
      <div className="mt-4 flex flex-col gap-2.5 min-[768px]:flex-row">
        <ActionPill type="submit" variant="dark" loading={busy} icon={Check} fit className="max-[767px]:w-full">
          Save
        </ActionPill>
        <ActionPill variant="outline" disabled={busy} arrow={false} fit onClick={onDone} className="max-[767px]:w-full">
          Cancel
        </ActionPill>
      </div>
    </form>
  );
}

/* ---------- Employment / assignment (read-only, from the current assignment) ---------- */

function AssignmentCard() {
  const { data: a, status, retry } = useCurrentAssignment();
  return (
    <Panel
      title="Employment & assignment"
      aside={
        a ? (
          <Link href="/staff/assignment" className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-bold whitespace-nowrap text-(--ap-violet)">
            View details <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : undefined
      }
    >
      {status === "loading" ? (
        <Sk className="h-[120px]" />
      ) : status === "error" ? (
        <ErrorPanel title="We couldn't load your assignment" retry={retry} />
      ) : !a ? (
        <p className="text-[16px] text-(--ap-muted)">No assignment yet. When Beeliv confirms where you&apos;ll work, it appears here.</p>
      ) : (
        <AssignmentFields a={a} />
      )}
    </Panel>
  );
}

function AssignmentFields({ a }: { a: StaffAssignment }) {
  return (
    <Facts
      rows={[
        rowOf("Client", a.client.name, "managed"),
        rowOf("Outlet", a.outlet.name, "managed"),
        rowOf("Role", a.role, "managed"),
        rowOf("Department", a.department, "managed"),
        rowOf("Start date", `${dayMonth(a.startDate)} ${a.startDate.slice(0, 4)}`, "managed"),
      ]}
    />
  );
}
