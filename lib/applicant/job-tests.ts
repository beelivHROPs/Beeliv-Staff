/**
 * Which published test a vacancy carries (set by HR in Admin > Vacancies > "Attach a test or form" as `testFormId`).
 * Mock: Admin vacancies and these applicant listings are not linked yet, so the same sample attachments are repeated here
 * (Hospitality Training Test on the waiter and bar roles). The real version reads the vacancy's testFormId.
 */
const TEST_BY_JOB: Record<string, string> = {
  "waiter-waitress": "form-training-test",
  "guest-relations-officer": "form-training-test",
  "bar-supervisor": "form-training-test",
};

export function testFormIdFor(jobId: string | null | undefined): string | undefined {
  return jobId ? TEST_BY_JOB[jobId] : undefined;
}
