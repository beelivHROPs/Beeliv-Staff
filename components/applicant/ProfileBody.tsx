"use client";

import { PhotoSourceDialog } from "@/components/shared/PhotoSourceDialog";
import { lgasOf } from "@/lib/shared/nigeria-locations";
import { useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Award,
  Pencil,
  BriefcaseBusiness,
  Check,
  ChefHat,
  ConciergeBell,
  Plus,
  Sparkles,
  Trash2,
  UsersRound,
  Wine,
  X,
  type LucideIcon,
} from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { readAndResize, chooseAvatar, personaNames, setAvatarPhoto, useAvatarState } from "@/lib/applicant/avatar";
import { GENDER_OPTIONS, NIGERIAN_STATES, SALARY_BANDS, SKILL_CATEGORIES } from "@/lib/applicant/reference-data";
import { computeProfileCompleteness, saveProfile, useApplicantStore } from "@/lib/applicant/service";
import { scrollToSection } from "@/lib/applicant/settings";
import type { ApplicantProfile, EmploymentEntry } from "@/lib/applicant/types";
import { formatIsoLabel, monthLabelToIso } from "@/lib/applicant/documentation";
import { dobToInput, inputToDob } from "./apply/StepPersonal";
import { confirmAction } from "./ConfirmDialog";
import { AutoHeight } from "./motion";
import { AddressInput, DatePicker, PhoneInput } from "./form-fields";
import { formatPhone } from "@/lib/phone/phone";
import { FieldError, useFlagInvalid } from "./form-feedback";
import { SelectMenu } from "./SelectMenu";
import { useRouter } from "next/navigation";
import { CompanyLogo } from "./primitives";
import { CareerDocuments, CareerHighlights, CompletionCard, CoverHeader, SectionNav } from "./profile-parts";
import { IconTile, SectionCard } from "./SectionCard";
import { PhoneProfileHeader } from "./profile/PhoneProfileHeader";

/** Wireframe SK_I: skill category -> department glyph. */
const SKILL_ICON: Record<string, LucideIcon> = {
  Kitchen: ChefHat,
  Floor: ConciergeBell,
  Bar: Wine,
  Management: UsersRound,
};

/** Desktop section bar (Indeed-style: a few clear stops, not eight tabs). */
const SECTION_NAV = [
  ["p-summary", "About"],
  ["p-experience", "Experience"],
  ["p-skills", "Skills"],
  ["p-certs", "Certifications"],
  ["p-prefs", "Preferences"],
  ["p-personal", "Personal & contact"],
  ["p-documents", "Documents"],
] as const;

/** Which section each completeness item opens (labels from PROFILE_CHECKLIST). */
const MISSING_TARGET: Record<string, string> = {
  "Add a short professional summary": "p-summary",
  "Add your hospitality certifications": "p-certs",
  "Add your employment history": "p-experience",
  "Add your skills": "p-skills",
  "Add an emergency contact": "p-emergency",
  "Upload your CV": "documents",
  "Upload a passport photograph": "documents",
  "Set your availability and preferred locations": "p-prefs",
};

export function ProfileBody() {
  const store = useApplicantStore();
  const { profile } = store;
  const isNew = store.mode === "new";
  const { photo, gender } = useAvatarState();
  const names = personaNames(gender);
  const completeness = computeProfileCompleteness(profile, store.documents);
  const [editing, setEditing] = useState<string | null>(null);
  const router = useRouter();
  const [photoOpen, setPhotoOpen] = useState(false);
  // Phones: Resume | Preferences tabs, and the menu button that lives in the top bar.
  const [tab, setTab] = useState<"resume" | "prefs">("resume");
  // Desktop: the section bar switches the content (no scrolling); Edit profile opens a pop-up page.
  const [dtab, setDtab] = useState<string>("p-summary");
  const [editOpen, setEditOpen] = useState(false);

  const skillEntries = Object.entries(profile.skills).filter(([, s]) => s.length);

  function open(id: string) {
    setEditing(id);
    // The target may sit on the other phone tab: switch first, then scroll once it is on screen.
    setTab(id === "p-prefs" || id === "p-emergency" ? "prefs" : "resume");
    setDtab(id === "p-contact" || id === "p-emergency" ? "p-personal" : id);
    requestAnimationFrame(() => scrollToSection(id));
  }

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

  async function save(partial: Partial<ApplicantProfile>) {
    await saveProfile(partial);
    setEditing(null);
    toast.add({ title: "Profile updated", type: "success" });
  }

  const editBtn = (id: string) =>
    editing === id ? null : (
      <button type="button" onClick={() => setEditing(id)} className="ap-btn ap-btn-s ap-btn-sm" aria-label={`Edit ${id.replace("p-", "")}`}>
        <Pencil className="size-3.5 max-[767px]:size-5" aria-hidden="true" />
        <span className="ap-edit-label">Edit</span>
      </button>
    );

  return (
    <div className="ap-profile">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[88vh] w-[min(calc(640px*var(--ps-zoom,1)),calc(100vw-2rem))] max-w-none overflow-y-auto sm:max-w-none">
          <div className="applicant-shell !min-h-0 !bg-transparent">
            <DialogTitle className="ap-serif text-[28px]">Edit profile</DialogTitle>
            <DialogDescription className="ap-sm mb-4">
              Your name comes from your verified account and your sign-in email is changed from Settings.
            </DialogDescription>
            <FieldsForm
              fields={[
                { key: "phone", label: "Phone", value: formatPhone(profile.phone), kind: "phone" },
                { key: "whatsapp", label: "WhatsApp", value: formatPhone(profile.whatsapp), kind: "phone" },
                { key: "address", label: "Residential address", value: profile.address, kind: "address" },
                { key: "dateOfBirth", label: "Date of birth", value: profile.dateOfBirth, kind: "dob" },
                { key: "gender", label: "Gender", value: profile.gender, kind: "gender" },
                { key: "nationality", label: "Nationality", value: profile.nationality },
                { key: "state", label: "State of origin", value: profile.state, kind: "state" },
                { key: "lga", label: "LGA (of origin)", value: profile.lga, kind: "lga" },
              ]}
              onCancel={() => setEditOpen(false)}
              onSave={async (v) => {
                await saveProfile(v);
                setEditOpen(false);
                toast.add({ title: "Profile updated", type: "success" });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      <PhotoSourceDialog
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        onFile={(f) => void onPhoto(f)}
        currentPhoto={photo}
        onRemove={async () => {
          setPhotoOpen(false);
          const ok = await confirmAction({
            tone: "danger",
            title: "Remove this photo?",
            description: "Your profile will show your initials until you add a new one.",
            confirmLabel: "Remove photo",
            cancelLabel: "Keep photo",
          });
          if (!ok) return;
          chooseAvatar("f");
          toast.add({ title: "Photo removed" });
        }}
      />
      {/* .prof header */}
      {/* Phones only (hidden from 768px up, where CoverHeader below takes over). */}
      <PhoneProfileHeader
        name={names.full}
        initials={names.initials}
        line={[profile.title || "Applicant", profile.location || "Abuja, FCT"].filter(Boolean).join(" · ")}
        photo={photo}
        percent={completeness.percent}
        hasStaff={profile.staffEntitlement.granted}
        firstMissing={
          completeness.missing.length
            ? MISSING_TARGET[completeness.missing[0]] === "documents"
              ? { href: "/applicant/documents" }
              : {}
            : null
        }
        onFinish={() => open(MISSING_TARGET[completeness.missing[0]] ?? "p-personal")}
        onCamera={() => setPhotoOpen(true)}
      />

      {/* Desktop: cover header + stats beside the completion checklist. */}
      <div className="mb-5 hidden gap-5 min-[768px]:grid min-[1101px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <CoverHeader
            name={names.full}
            profile={profile}
            onCamera={() => setPhotoOpen(true)}
            onEdit={() => setEditOpen(true)}
          />
        </div>
        <CompletionCard
          completeness={completeness}
          targetFor={(label) => MISSING_TARGET[label] ?? "p-personal"}
          onOpen={(target) => (target === "documents" ? router.push("/applicant/documents") : open(target))}
        />
      </div>

      <p className="mx-0.5 mt-3.5 mb-3 text-[13px] text-(--ap-muted) min-[768px]:hidden">
        Profile completion is separate from your application status. It only helps employers see your full background.
      </p>

      {/* Phones: Resume | Preferences (Indeed-style underline tabs). Desktop keeps the section chips. */}
      <div role="tablist" aria-label="Profile" className="mb-4 grid grid-cols-2 border-b border-(--ap-line) min-[768px]:hidden">
        {(
          [
            ["resume", "Resume"],
            ["prefs", "Preferences"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px h-12 border-b-[3px] text-[16px] ${tab === key ? "border-(--ap-violet) font-bold text-(--ap-ink)" : "border-transparent font-medium text-(--ap-muted)"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <SectionNav items={SECTION_NAV} active={dtab} onGo={(id) => setDtab(id)} />

      <div data-ptab={tab} data-dtab={dtab} className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1240px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-5">
          <SectionCard id="p-summary" className="scroll-mt-[150px]!" title="About me" action={profile.professionalSummary ? editBtn("p-summary") : null}>
            <AutoHeight k={editing === "p-summary" ? "edit" : "view"}>
            {editing === "p-summary" ? (
              <SummaryForm value={profile.professionalSummary} onCancel={() => setEditing(null)} onSave={(v) => save({ professionalSummary: v })} />
            ) : profile.professionalSummary ? (
              <p className="ap-bd whitespace-pre-line text-(--ap-ink-2)">{profile.professionalSummary}</p>
            ) : (
              <AddPrompt
                text="Two or three sentences about your hospitality experience and what you're looking for. Employers read this first."
                label="Add a professional summary"
                onClick={() => setEditing("p-summary")}
              />
            )}
            </AutoHeight>
          </SectionCard>
          <SectionCard id="p-experience" className="scroll-mt-[150px]!" title="Work experience" action={
              editing === "p-experience" ? null : (
                <button type="button" onClick={() => setEditing("p-experience")} className="ap-btn ap-btn-s ap-btn-sm max-[767px]:hidden">
                  <Plus className="size-4" aria-hidden="true" />
                  Add experience
                </button>
              )
            }>
            <Experience
              resume
              items={profile.employmentHistory}
              adding={editing === "p-experience"}
              onStartAdd={() => setEditing("p-experience")}
              onCancelAdd={() => setEditing(null)}
              onSave={(list) => save({ employmentHistory: list })}
            />
          </SectionCard>
          <SectionCard id="p-prefs" className="scroll-mt-[150px]!" title="Job preferences" action={editBtn("p-prefs")}>
            <AutoHeight k={editing === "p-prefs" ? "edit" : "view"}>
            {editing === "p-prefs" ? (
              <PrefsForm profile={profile} onCancel={() => setEditing(null)} onSave={(v) => save(v)} />
            ) : (
              <Kv
                rows={[
                  ["Preferred locations", profile.preferredLocations.join(", ")],
                  ["Availability", profile.availability],
                  ["Shifts", isNew && !profile.availability ? "" : profile.willingShifts ? "Yes" : "No"],
                  ["Weekends & holidays", isNew && !profile.availability ? "" : profile.willingWeekendsHolidays ? "Yes" : "No"],
                  ["Expected salary", profile.expectedSalary],
                ]}
              />
            )}
            </AutoHeight>
          </SectionCard>
          <SectionCard id="p-personal" className="scroll-mt-[150px]!" title="Personal information" action={editBtn("p-personal")}>
            <AutoHeight k={editing === "p-personal" ? "edit" : "view"}>
            {editing === "p-personal" ? (
              <FieldsForm
                fields={[
                  { key: "dateOfBirth", label: "Date of birth", value: profile.dateOfBirth, kind: "dob" },
                  { key: "gender", label: "Gender", value: profile.gender, kind: "gender" },
                  { key: "nationality", label: "Nationality", value: profile.nationality },
                  { key: "state", label: "State of origin", value: profile.state, kind: "state" },
                  { key: "lga", label: "LGA (of origin)", value: profile.lga, kind: "lga" },
                ]}
                note="Your name is taken from your verified account. Contact Beeliv to change it."
                onCancel={() => setEditing(null)}
                onSave={(v) => save(v)}
              />
            ) : (
              <Kv
                rows={[
                  ["Full name", names.legal],
                  ["Preferred name", names.first],
                  ["Date of birth", profile.dateOfBirth],
                  ["Gender", profile.gender],
                  ["Nationality", profile.nationality],
                  ["State of origin · LGA", profile.state || profile.lga ? [profile.state, profile.lga].filter(Boolean).join(" · ") : ""],
                ]}
              />
            )}
            </AutoHeight>
          </SectionCard>
          <SectionCard id="p-documents" className="scroll-mt-[150px]!" title="Career documents" aside>
            <CareerDocuments documents={store.documents} certifications={profile.certifications.length} />
          </SectionCard>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <CareerHighlights profile={profile} />
          <SectionCard id="p-skills" className="scroll-mt-[150px]!" title="Skills & expertise" aside action={skillEntries.length ? editBtn("p-skills") : null}>
            <AutoHeight k={editing === "p-skills" ? "edit" : "view"}>
            {editing === "p-skills" ? (
              <SkillsForm value={profile.skills} onCancel={() => setEditing(null)} onSave={(v) => save({ skills: v })} />
            ) : skillEntries.length === 0 ? (
              <SectionEmpty
                icon={Sparkles}
                title="No skills yet"
                text="Choose from kitchen, floor, bar and management skills."
                action={
                  <button type="button" onClick={() => setEditing("p-skills")} className="ap-btn ap-btn-s ap-btn-sm">
                    <Plus className="size-4" aria-hidden="true" />
                    Add skills
                  </button>
                }
              />
            ) : (
              skillEntries.map(([category, skills]) => {
                const Icon = SKILL_ICON[category] ?? Sparkles;
                return (
                  <div key={category}>
                    <div className="ap-eb mt-1 mb-3 flex items-center gap-2">
                      <Icon className="ap-duo size-[18px]" aria-hidden="true" />
                      {category}
                    </div>
                    <div className="mb-3.5 flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <span key={s} className="inline-flex items-center rounded-full border border-(--ap-tint-2) bg-(--ap-tint) px-3 py-1.5 text-[14px] font-medium text-(--ap-ink-2)">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            </AutoHeight>
          </SectionCard>
          <SectionCard id="p-certs" className="scroll-mt-[150px]!" title="Certifications" aside action={null}>
            <Certifications items={profile.certifications} adding={editing === "p-certs"} onStartAdd={() => setEditing("p-certs")} onCancel={() => setEditing(null)} onSave={(v) => save({ certifications: v })} />
          </SectionCard>
          <SectionCard id="p-contact" className="scroll-mt-[150px]!" title="Contact" aside action={editBtn("p-contact")}>
            <AutoHeight k={editing === "p-contact" ? "edit" : "view"}>
            {editing === "p-contact" ? (
              <FieldsForm
                narrow
                fields={[
                  { key: "phone", label: "Phone", value: formatPhone(profile.phone), kind: "phone" },
                  { key: "whatsapp", label: "WhatsApp", value: formatPhone(profile.whatsapp), kind: "phone" },
                  { key: "address", label: "Residential address", value: profile.address, kind: "address" },
                ]}
                note="Your sign-in email is changed from Settings."
                onCancel={() => setEditing(null)}
                onSave={(v) => save(v)}
              />
            ) : (
              <Kv
                narrow
                rows={[
                  ["Phone", formatPhone(profile.phone)],
                  ["WhatsApp", formatPhone(profile.whatsapp)],
                  ["Email", names.email],
                  ["Residential address", profile.address],
                ]}
              />
            )}
            </AutoHeight>
          </SectionCard>
          <SectionCard id="p-emergency" className="scroll-mt-[150px]!" title="Emergency contact" aside action={editBtn("p-emergency")}>
            <p className="ap-sm mb-3.5">Private. Never shown to clients; only authorised Beeliv staff can see it.</p>
            <AutoHeight k={editing === "p-emergency" ? "edit" : "view"}>
            {editing === "p-emergency" ? (
              <FieldsForm
                narrow
                fields={[
                  { key: "name", label: "Name", value: profile.emergencyContact.name },
                  { key: "relationship", label: "Relationship", value: profile.emergencyContact.relationship },
                  { key: "phone", label: "Phone", value: formatPhone(profile.emergencyContact.phone), kind: "phone" },
                ]}
                onCancel={() => setEditing(null)}
                onSave={(v) => save({ emergencyContact: { ...profile.emergencyContact, ...v } })}
              />
            ) : (
              <Kv
                narrow
                rows={[
                  ["Name", profile.emergencyContact.name],
                  ["Relationship", profile.emergencyContact.relationship],
                  ["Phone", formatPhone(profile.emergencyContact.phone)],
                ]}
              />
            )}
            </AutoHeight>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Kv({ rows, narrow = false }: { rows: [string, string][]; narrow?: boolean }) {
  return (
    <dl className={`m-0 grid gap-x-6 gap-y-4 ${narrow ? "grid-cols-1" : "grid-cols-2 max-[640px]:grid-cols-1"}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm font-semibold text-(--ap-muted)">{label}</dt>
          <dd className="m-0 text-base font-semibold wrap-anywhere">{value || <span className="font-medium text-(--ap-faint)">Not added</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionEmpty({ icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 py-4 text-center">
      <IconTile icon={icon} className="mb-1.5 size-14 rounded-full" iconClassName="size-6" />
      <b className="text-[17px]">{title}</b>
      <p className="max-w-[36ch] text-[15px] leading-snug text-(--ap-muted)">{text}</p>
      {action ? <div className="mt-2.5">{action}</div> : null}
    </div>
  );
}

/** Compact empty state for the two sections the wireframe's completion items point to. */
function AddPrompt({ text, label, onClick }: { text: string; label: string; onClick: () => void }) {
  return (
    <div>
      <p className="ap-sm">{text}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#D5C6E0] text-sm font-bold text-(--ap-violet) hover:bg-(--ap-tint)"
      >
        <Plus className="size-4" aria-hidden="true" />
        {label}
      </button>
    </div>
  );
}

function FormButtons({ onCancel, floating }: { onCancel: () => void; floating?: boolean }) {
  if (floating) {
    // Phone edit page: one full-width Save floating above the bottom edge (the back arrow is the way out).
    return (
      <div className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom,0px))] z-40 rounded-[20px] border border-(--ap-line) bg-white p-2.5 shadow-[0_12px_32px_rgba(37,0,68,.22)]">
        <button type="submit" className="ap-btn ap-btn-p ap-btn-hero w-full">
          <Check className="size-4" strokeWidth={2} aria-hidden="true" />
          Save
        </button>
      </div>
    );
  }
  return (
    <div className="mt-4 flex flex-wrap gap-2.5">
      <button type="submit" className="ap-btn ap-btn-p ap-btn-sm">
        Save
      </button>
      <button type="button" onClick={onCancel} className="ap-btn ap-btn-s ap-btn-sm">
        Cancel
      </button>
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div data-ap-field className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-(--ap-ink-2)">
        {label}
      </label>
      {children}
      {hint && !error ? <span className="text-[13px] text-(--ap-muted)">{hint}</span> : null}
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  );
}

type FieldDef = { key: string; label: string; value: string; type?: string; placeholder?: string; kind?: "phone" | "address" | "state" | "lga" | "dob" | "gender" };

/** Also used by the Staff profile (same person, same editor). */
export function FieldsForm({
  fields,
  note,
  narrow,
  floatingSave,
  onCancel,
  onSave,
}: {
  fields: FieldDef[];
  note?: string;
  narrow?: boolean;
  floatingSave?: boolean;
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.value])));
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        // No new rules: only fields that already mark themselves invalid (e.g. a wrong phone number) hold the save back.
        if (formRef.current?.querySelector('[aria-invalid="true"]')) {
          flag();
          return;
        }
        onSave(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])));
      }}
    >
      <div className={`grid gap-x-[18px] gap-y-4 ${narrow ? "grid-cols-1" : "grid-cols-2 max-[640px]:grid-cols-1"}`}>
        {fields.map((f) => (
          <Field key={f.key} id={`pf-${f.key}`} label={f.label}>
            {f.kind === "phone" ? (
              <PhoneInput id={`pf-${f.key}`} value={values[f.key]} onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))} />
            ) : f.kind === "address" ? (
              // Residential address only: it no longer fills state/LGA, which are now state/LGA of ORIGIN.
              <AddressInput id={`pf-${f.key}`} value={values[f.key]} onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))} />
            ) : f.kind === "state" ? (
              <SelectMenu
                id={`pf-${f.key}`}
                placeholder="Select state of origin"
                value={values[f.key]}
                options={NIGERIAN_STATES}
                onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v, ...("lga" in cur && !lgasOf(v).includes(cur.lga) ? { lga: "" } : {}) }))}
              />
            ) : f.kind === "lga" ? (
              <SelectMenu
                id={`pf-${f.key}`}
                placeholder={values.state ? "Select local government" : "Select a state first"}
                value={values[f.key]}
                options={[...lgasOf(values.state ?? "")]}
                onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))}
              />
            ) : f.kind === "gender" ? (
              <SelectMenu id={`pf-${f.key}`} placeholder="Select gender" value={values[f.key]} options={GENDER_OPTIONS} onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))} />
            ) : f.kind === "dob" ? (
              <DatePicker
                id={`pf-${f.key}`}
                title={f.label}
                initialView="years"
                max={new Date().toISOString().slice(0, 10)}
                value={dobToInput(values[f.key])}
                onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: inputToDob(v) }))}
              />
            ) : (
              <input
                id={`pf-${f.key}`}
                type={f.type ?? "text"}
                className="ap-input"
                placeholder={f.placeholder}
                value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            )}
          </Field>
        ))}
      </div>
      {note ? <p className="mt-3 text-[13px] text-(--ap-muted)">{note}</p> : null}
      <FormButtons onCancel={onCancel} floating={floatingSave} />
    </form>
  );
}

const SUMMARY_MAX = 600;

function SummaryForm({ value, onCancel, onSave }: { value: string; onCancel: () => void; onSave: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  const empty = !text.trim();
  const bad = tried && empty;
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (empty) {
          setTried(true);
          flag();
          return;
        }
        onSave(text.trim());
      }}
    >
      <Field id="pf-summary" label="Professional summary" error={bad ? "Write a short summary before saving." : undefined}>
        <textarea
          id="pf-summary"
          className="ap-input min-h-[120px]"
          maxLength={SUMMARY_MAX}
          placeholder="e.g. Assistant floor manager with 9 years in Abuja restaurants and hotels. Strong on guest recovery and rostering; looking for a floor manager role."
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={bad ? true : undefined}
          aria-describedby={bad ? "pf-summary-err pf-summary-count" : "pf-summary-count"}
        />
      </Field>
      <p id="pf-summary-count" className="mt-1.5 text-right text-[13px] text-(--ap-muted) tabular-nums">
        {text.length} / {SUMMARY_MAX}
      </p>
      <FormButtons onCancel={onCancel} />
    </form>
  );
}

/** Also used by the Staff profile (same person, same editor). */
export function Experience({
  items,
  adding,
  resume = false,
  onStartAdd,
  onCancelAdd,
  onSave,
}: {
  items: EmploymentEntry[];
  adding: boolean;
  /** Résumé-style entries (company monogram, company and place on separate lines). */
  resume?: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onSave: (list: EmploymentEntry[]) => void;
}) {
  const [editIndex, setEditIndex] = useState<number | null>(null);

  if (items.length === 0 && !adding) {
    return (
      <SectionEmpty
        icon={BriefcaseBusiness}
        title="No roles added"
        text="Add your hospitality roles once. We'll reuse them on every application."
        action={
          <button type="button" onClick={onStartAdd} className="ap-btn ap-btn-s ap-btn-sm">
            <Plus className="size-4" aria-hidden="true" />
            Add a role
          </button>
        }
      />
    );
  }

  return (
    <div>
      {items.map((x, i) =>
        editIndex === i ? (
          <div key={`${x.role}-${i}`} className="border-t border-(--ap-line-2) py-3.5">
            <RoleForm
              initial={x}
              onCancel={() => setEditIndex(null)}
              onRemove={async () => {
                const ok = await confirmAction({
                  tone: "danger",
                  title: "Remove this role?",
                  description: `${x.role}${x.company ? ` at ${x.company}` : ""} will be removed from your profile and from future applications.`,
                  confirmLabel: "Remove role",
                  cancelLabel: "Keep it",
                });
                if (!ok) return;
                onSave(items.filter((_, j) => j !== i));
                setEditIndex(null);
              }}
              onSave={(entry) => {
                onSave(items.map((it, j) => (j === i ? entry : it)));
                setEditIndex(null);
              }}
            />
          </div>
        ) : (
          <div
            key={`${x.role}-${i}`}
            className={`grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3.5 border-t border-(--ap-line-2) py-3.5 ${resume ? "max-[767px]:grid-cols-1 max-[767px]:gap-0" : "max-[767px]:grid-cols-[40px_minmax(0,1fr)]"}`}
          >
            {resume ? <span className="max-[767px]:hidden"><CompanyLogo name={x.company.split(" · ")[0]} size={48} /></span> : <IconTile icon={BriefcaseBusiness} className="size-11 rounded-xl max-[767px]:size-10" />}
            <div className="min-w-0">
              <b className={`block text-base ${resume ? "max-[767px]:text-[18px]" : ""}`}>{x.role}</b>
              <span className={`block ap-sm ${resume ? "max-[767px]:text-[16px] max-[767px]:text-(--ap-ink-2)" : ""}`}>{resume ? x.company.split(" · ")[0] : x.company}</span>
              {resume && x.company.includes(" · ") ? (
                <span className="block ap-sm max-[767px]:text-[16px] max-[767px]:text-(--ap-ink-2)">{x.company.split(" · ").slice(1).join(" · ")}</span>
              ) : null}
              <span className="block ap-sm max-[767px]:mt-2">{x.period}</span>
              {x.reasonForLeaving ? <span className="block ap-sm">Reason for leaving: {x.reasonForLeaving}</span> : null}
            </div>
            <button
              type="button"
              onClick={() => setEditIndex(i)}
              aria-label={`Edit ${x.role}`}
              className={resume ? "ap-btn ap-btn-o ap-btn-sm self-center max-[767px]:mt-3 max-[767px]:h-11 max-[767px]:self-start max-[767px]:px-5" : "ap-hit self-center px-1 text-sm font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:col-start-2 max-[767px]:min-h-9 max-[767px]:justify-self-start"}
            >
              {resume ? <Pencil className="size-3.5" aria-hidden="true" /> : null}
              Edit
            </button>
          </div>
        ),
      )}
      {adding ? (
        <div className="border-t border-(--ap-line-2) pt-3.5">
          <RoleForm
            onCancel={onCancelAdd}
            onSave={(entry) => {
              onSave([entry, ...items]);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartAdd}
          className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#D5C6E0] text-sm font-bold text-(--ap-violet) hover:bg-(--ap-tint)"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add another role
        </button>
      )}
    </div>
  );
}

function RoleForm({
  initial,
  onCancel,
  onSave,
  onRemove,
}: {
  initial?: EmploymentEntry;
  onCancel: () => void;
  onSave: (e: EmploymentEntry) => void;
  onRemove?: () => void;
}) {
  const [v, setV] = useState<EmploymentEntry>(initial ?? { role: "", company: "", period: "", reasonForLeaving: "" });
  // Dates are picked on the calendar; `period` stays the saved text, e.g. "Mar 2019 – Dec 2022" or "Mar 2019 – Present".
  const [range, setRange] = useState(() => {
    const [a = "", b = ""] = (initial?.period ?? "").split(/[–-]/).map((x) => x.split("·")[0].trim());
    return { start: monthLabelToIso(a), end: monthLabelToIso(b) };
  });
  const ready = v.role.trim() && v.company.trim();
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  const roleBad = tried && !v.role.trim();
  const companyBad = tried && !v.company.trim();
  const uid = initial ? initial.role.replace(/\W+/g, "-") : "new";
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const reason = v.reasonForLeaving?.trim();
        if (!ready) {
          setTried(true);
          flag();
          return;
        }
        onSave({ role: v.role.trim(), company: v.company.trim(), period: range.start ? `${formatIsoLabel(range.start)} – ${range.end ? formatIsoLabel(range.end) : "Present"}` : initial?.period ?? "", ...(reason ? { reasonForLeaving: reason } : {}) });
      }}
    >
      <div className="grid grid-cols-2 gap-x-[18px] gap-y-4 max-[640px]:grid-cols-1">
        <Field id={`rf-role-${uid}`} label="Job title" error={roleBad ? "Enter your job title." : undefined}>
          <input id={`rf-role-${uid}`} aria-invalid={roleBad ? true : undefined} aria-describedby={roleBad ? `rf-role-${uid}-err` : undefined} className="ap-input" placeholder="e.g. Floor Supervisor" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })} />
        </Field>
        <Field id={`rf-co-${uid}`} label="Employer · city" error={companyBad ? "Enter the employer and city." : undefined}>
          <input id={`rf-co-${uid}`} aria-invalid={companyBad ? true : undefined} aria-describedby={companyBad ? `rf-co-${uid}-err` : undefined} className="ap-input" placeholder="e.g. Grand Palm Hotel · Abuja" value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} />
        </Field>
        <Field id={`rf-start-${uid}`} label="Start date">
          <DatePicker id={`rf-start-${uid}`} title="Start date" mode="month" max={range.end || undefined} value={range.start} onChange={(x) => setRange((r) => ({ ...r, start: x }))} />
        </Field>
        <Field id={`rf-end-${uid}`} label="End date" hint="Leave empty if you still work here">
          <DatePicker id={`rf-end-${uid}`} title="End date" mode="month" min={range.start || undefined} placeholder="Present" value={range.end} onChange={(x) => setRange((r) => ({ ...r, end: x }))} />
        </Field>
        <div className="col-span-full">
          <Field id={`rf-rl-${uid}`} label="Reason for leaving">
            <input
              id={`rf-rl-${uid}`}
              className="ap-input"
              placeholder="Leave empty if you still work here"
              value={v.reasonForLeaving ?? ""}
              onChange={(e) => setV({ ...v, reasonForLeaving: e.target.value })}
            />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button type="submit" className="ap-btn ap-btn-p ap-btn-sm">
          {initial ? "Save" : "Add role"}
        </button>
        <button type="button" onClick={onCancel} className="ap-btn ap-btn-s ap-btn-sm">
          Cancel
        </button>
        {onRemove ? (
          <button type="button" onClick={onRemove} className="ap-hit ml-auto inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[#DC2626]">
            <Trash2 className="size-4" aria-hidden="true" />
            Remove
          </button>
        ) : null}
      </div>
    </form>
  );
}

function SkillsForm({ value, onCancel, onSave }: { value: Record<string, string[]>; onCancel: () => void; onSave: (v: Record<string, string[]>) => void }) {
  const [sel, setSel] = useState<Record<string, string[]>>(() => ({ ...value }));
  const toggle = (cat: string, s: string) => {
    const cur = sel[cat] ?? [];
    setSel({ ...sel, [cat]: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] });
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(sel);
      }}
    >
      {SKILL_CATEGORIES.map(({ category, skills }) => {
        const Icon = SKILL_ICON[category] ?? Sparkles;
        const chosen = sel[category] ?? [];
        return (
          <fieldset key={category} className="m-0 mb-3.5 border-0 p-0">
            <legend className="ap-eb mt-1 mb-3 flex items-center gap-2">
              <Icon className="ap-duo size-[18px]" aria-hidden="true" />
              {category}
              <span className="tracking-normal normal-case text-(--ap-muted)">· {chosen.length} selected</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => {
                const on = chosen.includes(s);
                return (
                  <button key={s} type="button" className="ap-pick" aria-pressed={on} onClick={() => toggle(category, s)}>
                    {on ? <Check className="size-3.5" strokeWidth={2} aria-hidden="true" /> : null}
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <FormButtons onCancel={onCancel} />
    </form>
  );
}

function Certifications({
  items,
  adding,
  onStartAdd,
  onCancel,
  onSave,
}: {
  items: string[];
  adding: boolean;
  onStartAdd: () => void;
  onCancel: () => void;
  onSave: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  const certBad = tried && !draft.trim();
  const form = adding ? (
    <form
      ref={formRef}
      noValidate
      className="flex flex-wrap items-start gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        const v = draft.trim();
        if (!v) {
          setTried(true);
          flag();
          return;
        }
        onSave([...items, v]);
        setDraft("");
        setTried(false);
      }}
    >
      <div className="min-w-[220px] flex-1">
        <Field id="pf-cert" label="Certification" error={certBad ? "Enter the certification name." : undefined}>
          <input id="pf-cert" aria-invalid={certBad ? true : undefined} aria-describedby={certBad ? "pf-cert-err" : undefined} className="ap-input" placeholder="e.g. Food Hygiene Level 2 · 2024" value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Field>
      </div>
      <button type="submit" className="ap-btn ap-btn-p ap-btn-sm mt-[26px]">
        Add
      </button>
      <button type="button" onClick={onCancel} className="ap-btn ap-btn-s ap-btn-sm mt-[26px]">
        Cancel
      </button>
    </form>
  ) : null;

  if (items.length === 0) {
    return adding ? (
      form
    ) : (
      <AddPrompt
        text="Food hygiene, first aid, barista or hotel-school certificates help you stand out."
        label="Add a certification"
        onClick={onStartAdd}
      />
    );
  }

  return (
    <div>
      {items.map((c, i) => (
        <div key={`${c}-${i}`} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-(--ap-line-2) py-3.5">
          <IconTile icon={Award} />
          <b className="text-base">{c}</b>
          <button type="button" aria-label={`Remove ${c}`} onClick={async () => {
              const ok = await confirmAction({
                tone: "danger",
                title: "Remove this certification?",
                description: `"${c}" will be removed from your profile.`,
                confirmLabel: "Remove certification",
                cancelLabel: "Keep it",
              });
              if (ok) onSave(items.filter((_, j) => j !== i));
            }} className="inline-flex size-11 items-center justify-center rounded-xl text-(--ap-ink-2) hover:bg-(--ap-line-2)">
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>
      ))}
      {adding ? (
        <div className="border-t border-(--ap-line-2) pt-3.5">{form}</div>
      ) : (
        <button
          type="button"
          onClick={onStartAdd}
          className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#D5C6E0] text-sm font-bold text-(--ap-violet) hover:bg-(--ap-tint)"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add another certification
        </button>
      )}
    </div>
  );
}

function PrefsForm({ profile, onCancel, onSave }: { profile: ApplicantProfile; onCancel: () => void; onSave: (v: Partial<ApplicantProfile>) => void }) {
  const [locs, setLocs] = useState(profile.preferredLocations.join(", "));
  const [availability, setAvailability] = useState(profile.availability);
  const [shifts, setShifts] = useState(profile.willingShifts);
  const [weekends, setWeekends] = useState(profile.willingWeekendsHolidays);
  const [salary, setSalary] = useState(profile.expectedSalary);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          preferredLocations: locs.split(",").map((s) => s.trim()).filter(Boolean),
          availability: availability.trim(),
          willingShifts: shifts,
          willingWeekendsHolidays: weekends,
          expectedSalary: salary.trim(),
        });
      }}
    >
      <div className="grid grid-cols-1 gap-y-4">
        <Field id="pf-locs" label="Preferred locations">
          <input id="pf-locs" className="ap-input" placeholder="e.g. Abuja, Lagos" value={locs} onChange={(e) => setLocs(e.target.value)} />
        </Field>
        <Field id="pf-avail" label="Availability">
          <input id="pf-avail" className="ap-input" placeholder="e.g. Available in 2 weeks" value={availability} onChange={(e) => setAvailability(e.target.value)} />
        </Field>
        <YesNo label="Shifts" value={shifts} onChange={setShifts} />
        <YesNo label="Weekends & holidays" value={weekends} onChange={setWeekends} />
        <Field id="pf-salary" label="Expected salary">
          <SelectMenu id="pf-salary" placeholder="Select a range" value={salary} options={SALARY_BANDS} onChange={setSalary} />
        </Field>
      </div>
      <FormButtons onCancel={onCancel} />
    </form>
  );
}

function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-(--ap-ink-2)">{label}</span>
      <div className="ap-seg" role="radiogroup" aria-label={label}>
        {[true, false].map((opt) => (
          <button key={String(opt)} type="button" role="radio" aria-checked={value === opt} onClick={() => onChange(opt)} className="aria-checked:bg-white aria-checked:text-(--ap-violet) aria-checked:shadow-[0_1px_3px_rgba(37,0,68,0.1)]">
            {opt ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}
