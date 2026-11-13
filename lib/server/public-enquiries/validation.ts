export type EnquiryKind = "contact" | "service_request";
export type CleanEnquiry = { kind: EnquiryKind; email: string; payload: Record<string, unknown> };
export class ValidationError extends Error {
  constructor(public fields: Record<string, string>) { super("Please check your details and try again."); }
}
const NEEDS = ["recruitment", "training", "systems", "audit", "unsure"];
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ValidationError({ form: "Enter valid enquiry details." });
  return value as Record<string, unknown>;
}
export function validateEnquiry(value: unknown, now = new Date()): CleanEnquiry {
  const input = object(value);
  const data = object(input.data);
  const fields: Record<string, string> = {};
  function text(source: Record<string, unknown>, key: string, path: string, max: number, min = 0): string | null {
    const raw = source[key];
    if (raw === null || raw === undefined || raw === "") {
      if (min) fields[path] = "This field is required.";
      return min ? "" : null;
    }
    if (typeof raw !== "string") { fields[path] = "Enter text for this field."; return null; }
    const result = raw.trim();
    if (result.length < min || result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) fields[path] = `Enter between ${min} and ${max} characters.`;
    return result || null;
  }
  function contact(source: Record<string, unknown>, prefix = "") {
    const name = text(source, "name", `${prefix}name`, 200, 2);
    const email = text(source, "email", `${prefix}email`, 254, 3)?.toLowerCase() ?? "";
    const phone = text(source, "phone", `${prefix}phone`, 40, 7);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fields[`${prefix}email`] = "Enter a valid email address.";
    if (!/^\+?\d{7,15}$/.test((phone ?? "").replace(/[\s\-().]/g, ""))) fields[`${prefix}phone`] = "Enter a valid phone number.";
    return { name, email, phone };
  }
  function count(source: Record<string, unknown>, key: string, path: string) {
    const n = source[key];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 99999) fields[path] = "Enter a whole number from 1 to 99999.";
    return typeof n === "number" ? n : 0;
  }
  let payload: Record<string, unknown>;
  let email: string;
  if (input.kind === "contact") {
    const c = contact(data);
    if (data.kind !== "work" && data.kind !== "other") fields.kind = "Choose a valid contact type.";
    if (data.consent !== true) fields.consent = "Please agree to storage of your details so Beeliv can respond.";
    if (typeof data.hasCv !== "boolean") fields.hasCv = "Choose whether a CV is attached.";
    // Never acknowledge a CV when the transport contains only a filename/boolean.
    if (data.hasCv === true) fields.cv = "CV uploads are not connected yet. Remove the attachment to send your message, or use the application document flow when it is available.";
    payload = { ...c, kind: data.kind, role: data.kind === "work" ? text(data, "role", "role", 200) : null, message: text(data, "message", "message", 4000, 1), hasCv: false, consent: true };
    email = c.email;
  } else if (input.kind === "service_request") {
    const business = object(data.business);
    const c = contact(object(data.contact), "contact.");
    const extras = object(data.contact);
    const needs = Array.isArray(data.needs) ? data.needs : [];
    if (!needs.length || needs.length > 5 || needs.some(n => typeof n !== "string" || !NEEDS.includes(n)) || new Set(needs).size !== needs.length || (needs.includes("unsure") && needs.length !== 1)) fields.needs = "Choose valid service options; Not sure must be selected on its own.";
    let recruitment = null;
    let training = null;
    if (needs.includes("recruitment")) {
      const r = object(data.recruitment);
      const targetStartDate = text(r, "targetStartDate", "recruitment.startDate", 10);
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
      if (targetStartDate && (!/^\d{4}-\d{2}-\d{2}$/.test(targetStartDate) || Number.isNaN(Date.parse(targetStartDate)) || new Date(targetStartDate).toISOString().slice(0, 10) !== targetStartDate || targetStartDate < today)) fields["recruitment.startDate"] = "Choose a valid date that is today or later.";
      recruitment = { roles: text(r, "roles", "recruitment.roles", 500, 1), headcount: count(r, "headcount", "recruitment.headcount"), location: text(r, "location", "recruitment.location", 200, 1), targetStartDate };
    } else if (data.recruitment !== null && data.recruitment !== undefined) fields.recruitment = "Recruitment details require the recruitment option.";
    if (needs.includes("training")) {
      const t = object(data.training);
      training = { teamSize: count(t, "teamSize", "training.teamSize"), topics: text(t, "topics", "training.topics", 500, 1) };
    } else if (data.training !== null && data.training !== undefined) fields.training = "Training details require the training option.";
    payload = { business: { name: text(business, "name", "business.name", 200, 2), outlet: text(business, "outlet", "business.outlet", 200), location: text(business, "location", "business.location", 200, 1) }, needs: NEEDS.filter(n => needs.includes(n)), recruitment, training, details: text(data, "details", "details", 2000), contact: { ...c, jobTitle: text(extras, "jobTitle", "contact.jobTitle", 200), bestTimeToCall: text(extras, "bestTimeToCall", "contact.bestTimeToCall", 200) } };
    email = c.email;
  } else throw new ValidationError({ kind: "Choose a valid enquiry type." });
  if (Object.keys(fields).length) throw new ValidationError(fields);
  return { kind: input.kind, email, payload };
}

