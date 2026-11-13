import { ContactShell } from "@/components/public/contact/ContactShell";
import { ContactFormSkeleton } from "@/components/public/contact/ContactFormSkeleton";

// Loading skeleton for /contact (Skel-Contact-Desktop / -Mobile.dc.html): the
// whole page inside `.skel` (styles in ../public-site.css), form area in its
// default ("I'm looking for work") layout.
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Loading">
      <ContactShell>
        <ContactFormSkeleton />
      </ContactShell>
    </div>
  );
}
