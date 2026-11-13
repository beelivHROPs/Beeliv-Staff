import type { Metadata } from "next";
import { ContactForm } from "@/components/public/contact/ContactForm";
import { ContactShell } from "@/components/public/contact/ContactShell";
import { CONTACT_HERO } from "@/lib/public-site/contact-content";

export const metadata: Metadata = {
  title: "Contact",
  description: CONTACT_HERO.bodyDesktop,
};

/**
 * /contact (Contact-Desktop / Contact-Mobile.dc.html): hero + a single-step
 * form (not the Request Talent wizard). See ContactForm for the "I'm a
 * business" -> /request redirect.
 */
export default function ContactPage() {
  return (
    <ContactShell>
      <ContactForm />
    </ContactShell>
  );
}
