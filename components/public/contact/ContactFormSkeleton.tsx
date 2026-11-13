import { T } from "@/components/public/primitives";
import { CONTACT_FIELDS, CONTACT_KIND, CONTACT_NAV_UI } from "@/lib/public-site/contact-content";
import { KindCard } from "./parts";

/**
 * Loading skeleton for the form column (Skel-Contact-Desktop / -Mobile.dc.html):
 * the wireframe's own field layout with text swapped for soft shimmering
 * blocks (`.skel` styles in app/(public)/public-site.css).
 */
export function ContactFormSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-7 wf-d:rounded-[18px] wf-d:border wf-d:border-(--soft-border) wf-d:bg-white wf-d:p-[calc(44*var(--u))] wf-d:shadow-[0_14px_40px_rgba(17,17,27,.06)]"
    >
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0 wf-d:gap-[14px]">
        <legend className="ps-eb mb-2.5 p-0 !text-(--muted-text) wf-d:mb-[14px]">
          <T>{CONTACT_KIND.legend}</T>
        </legend>
        <div className="flex flex-col gap-2.5 wf-d:grid wf-d:grid-cols-3 wf-d:gap-[14px]">
          {CONTACT_KIND.options.map((o) => (
            <KindCard
              key={o.value}
              id={`sk-ct-${o.value}`}
              name="sk-ct"
              value={o.value}
              label={o.label}
              checked={o.value === CONTACT_KIND.default}
              readOnly
            />
          ))}
        </div>
      </fieldset>

      <div className="ps-hr" />

      <div className="grid grid-cols-1 gap-4 wf-d:grid-cols-2 wf-d:gap-[18px]">
        <div className="cf-f">
          <span>
            <T>{CONTACT_FIELDS.name.label}</T>
          </span>
          <input className="cf-in" disabled />
        </div>
        <div className="cf-f">
          <span>
            <T>{CONTACT_FIELDS.email.label}</T>
          </span>
          <input className="cf-in" disabled />
        </div>
        <div className="cf-f">
          <span>
            <T>{CONTACT_FIELDS.phone.label}</T>
          </span>
          <input className="cf-in" disabled />
        </div>
        <div className="cf-f">
          <span>
            <T>{CONTACT_FIELDS.role.label}</T>
            <span className="cf-note"> {CONTACT_FIELDS.role.note}</span>
          </span>
          <input className="cf-in" disabled />
        </div>
      </div>

      <div className="cf-f">
        <span>
          <T>{CONTACT_FIELDS.message.label}</T>
        </span>
        <textarea className="cf-in" disabled />
      </div>

      <div className="cf-f">
        <span>
          <T>{CONTACT_FIELDS.cv.label}</T>
          <span className="cf-note"> {CONTACT_FIELDS.cv.note}</span>
        </span>
        <input className="cf-in" type="file" disabled />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-(--muted-text)">
        <input type="checkbox" disabled className="mt-0.5 h-[18px] w-[18px]" />
        <T>I agree to Beeliv storing my details to respond to this enquiry. Privacy</T>
      </label>

      <span className="ps-btn ps-bp self-start">
        <T>{CONTACT_NAV_UI.send}</T>
      </span>
    </div>
  );
}
