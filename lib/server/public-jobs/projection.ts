/** Public DTO projection only. Not connected to persistence or sample-data factories. */
export type VacancyForPublicProjection = {
  id: string; reference: string; title: string; department: string;
  client: { id: string; name: string }; location: string; employmentType: string;
  openings: number; status: string; postedAt: string | null; closesOn: string;
  endedAt?: string | null;
  expectedResumption: string; about: string; responsibilities: string[];
  essential: string[]; preferred: string[];
  experience: { minYears: number; maxYears?: number; summary: string };
  skills: string[];
  salary: { min: number | null; max: number | null; frequency: string; negotiable: boolean; visibility: string };
  benefits: { id: string; kind: string; detail: string; visibility: string }[];
  conditions: { workingDays: string; shiftSystem: string; hours: string; weekends: string; publicHolidays: string };
  requiredDocuments: { atApplication: string[]; afterSelection: string[] };
  recruitmentProcess: string[];
};
function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function lagosDay(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function projectPublicVacancy(vacancy: VacancyForPublicProjection, now = new Date()) {
  if (!Number.isFinite(now.getTime()) || !['published', 'closing-soon', 'closed'].includes(vacancy.status) || !vacancy.postedAt || !validDate(vacancy.closesOn)) return null;
  const postedAt = new Date(vacancy.postedAt);
  if (!Number.isFinite(postedAt.getTime()) || postedAt > now) return null;
  if (vacancy.status !== 'closed' && vacancy.endedAt != null) return null;
  const today = lagosDay(now);
  if (!validDate(today)) return null;
  // A manually closed vacancy needs its actual end timestamp. Missing or future
  // end evidence fails closed instead of extending a stale listing indefinitely.
  const endedAt = vacancy.status === 'closed' ? new Date(vacancy.endedAt ?? '') : null;
  if (endedAt && (!Number.isFinite(endedAt.getTime()) || endedAt > now || endedAt < postedAt)) return null;
  const endDay = endedAt
    ? [lagosDay(endedAt), vacancy.closesOn].sort()[0]
    : vacancy.closesOn;
  if (!validDate(endDay)) return null;
  const daysUntilEnd = Math.round((Date.parse(`${endDay}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (daysUntilEnd < -5) return null;
  const availability = endedAt || daysUntilEnd < 0 ? 'closed' : daysUntilEnd <= 5 ? 'closing-soon' : 'open';
  return {
    id: vacancy.id, reference: vacancy.reference, title: vacancy.title, department: vacancy.department,
    companyName: vacancy.client.name, location: vacancy.location, employmentType: vacancy.employmentType,
    openings: vacancy.openings, postedAt: postedAt.toISOString(), closesOn: vacancy.closesOn,
    closedAt: endedAt?.toISOString() ?? null, availability,
    expectedResumption: vacancy.expectedResumption, about: vacancy.about,
    responsibilities: [...vacancy.responsibilities], essential: [...vacancy.essential], preferred: [...vacancy.preferred],
    experience: { minYears: vacancy.experience.minYears, ...(vacancy.experience.maxYears !== undefined ? { maxYears: vacancy.experience.maxYears } : {}), summary: vacancy.experience.summary },
    skills: [...vacancy.skills],
    salary: vacancy.salary.visibility === 'public' ? { min: vacancy.salary.min, max: vacancy.salary.max, frequency: vacancy.salary.frequency, negotiable: vacancy.salary.negotiable } : null,
    benefits: vacancy.benefits.filter(benefit => benefit.visibility === 'public').map(benefit => ({ kind: benefit.kind, detail: benefit.detail })),
    conditions: { workingDays: vacancy.conditions.workingDays, shiftSystem: vacancy.conditions.shiftSystem, hours: vacancy.conditions.hours, weekends: vacancy.conditions.weekends, publicHolidays: vacancy.conditions.publicHolidays },
    requiredDocuments: { atApplication: [...vacancy.requiredDocuments.atApplication], afterSelection: [...vacancy.requiredDocuments.afterSelection] },
    recruitmentProcess: [...vacancy.recruitmentProcess],
  };
}
export type PublicVacancy = NonNullable<ReturnType<typeof projectPublicVacancy>>;
