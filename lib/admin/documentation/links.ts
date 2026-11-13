/**
 * Links to the ONE document record. Applicant 360, Staff 360 and the central
 * queue all open the same record by its internal id: never duplicate a record
 * and never link by a BLV-* reference.
 */
const BASE = "/admin/recruitment/documentation";

export const DOCUMENTATION_HREF = BASE;
export const documentHref = (id: string) => `${BASE}/${id}`;

/**
 * Staff 360 route: PLACEHOLDER contract (the Staff directory build owns the real
 * path; change it here once it exists).
 */
export const staffRecordHref = (id: string) => `/admin/staff/directory/${id}`;
