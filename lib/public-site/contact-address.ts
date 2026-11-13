/**
 * The ONE place the public contact email lives.
 *
 * DECISION (project lead, 2026-11-12): beeliv.co@gmail.com is Mr Godson's own address (the Head of Operations), so it must
 * not stay the public contact. When Beeliv supplies the new public contact address, change PUBLIC_CONTACT_EMAIL here and every
 * page (footer, Contact page, Applicant and Staff help, error pages) follows. Nothing else in the code names an address.
 */
export const PUBLIC_CONTACT_EMAIL = "beeliv.co@gmail.com";
export const PUBLIC_CONTACT_MAILTO = `mailto:${PUBLIC_CONTACT_EMAIL}`;
