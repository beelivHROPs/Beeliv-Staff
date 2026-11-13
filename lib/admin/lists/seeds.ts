/**
 * Sample starting values for Lists & Rules. Clearly SAMPLES taken from the
 * existing Admin mocks (staff roles and departments, workforce leave and warning
 * types, the five default interview stages, applicant document types).
 * Beeliv edits these on /admin/lists. No business rule is decided here.
 * Kept free of imports from other Admin mocks so those mocks can read the store.
 */
import type { ListKey, ListsData } from "./types";

export const SEED_LISTS: ListsData = {
  departments: [
    { id: "dept-front-of-house", name: "Front of house", active: true },
    { id: "dept-kitchen", name: "Kitchen", active: true },
    { id: "dept-bar", name: "Bar", active: true },
    { id: "dept-management", name: "Management", active: true },
    { id: "dept-admin-ops", name: "Admin & operations", active: true },
    { id: "dept-support", name: "Support", active: true },
  ],
  roles: [
    { id: "role-waiter", name: "Waiter / Waitress", departmentId: "dept-front-of-house", active: true },
    { id: "role-front-desk", name: "Front Desk Officer", departmentId: "dept-front-of-house", active: true },
    { id: "role-commis-chef", name: "Commis Chef", departmentId: "dept-kitchen", active: true },
    { id: "role-bar-attendant", name: "Bar Attendant", departmentId: "dept-bar", active: true },
    { id: "role-floor-supervisor", name: "Floor Supervisor", departmentId: "dept-management", active: true },
    { id: "role-steward", name: "Steward", departmentId: "dept-support", active: true },
  ],
  leaveTypes: [
    { id: "leave-annual", name: "Annual leave", paid: true, defaultDays: 20, needsApproval: true, active: true },
    { id: "leave-personal", name: "Personal leave", paid: true, defaultDays: 5, needsApproval: true, active: true },
    { id: "leave-sick", name: "Sick leave", paid: true, defaultDays: 10, needsApproval: true, active: true },
    { id: "leave-other", name: "Other", paid: false, defaultDays: 0, needsApproval: true, active: true },
  ],
  interviewStages: [
    { id: "hr-screening", name: "HR Screening", onlyWhereRequired: false, defaultInterviewerRole: null, active: true },
    { id: "beeliv-interview", name: "Beeliv Interview", onlyWhereRequired: false, defaultInterviewerRole: null, active: true },
    { id: "client-interview", name: "Client Interview", onlyWhereRequired: true, defaultInterviewerRole: "Client panel", active: true },
    { id: "practical", name: "Practical Assessment", onlyWhereRequired: true, defaultInterviewerRole: null, active: true },
    { id: "final-review", name: "Final Review", onlyWhereRequired: false, defaultInterviewerRole: null, active: true },
  ],
  scoringCriteria: [
    { id: "c-comm", name: "Communication", hint: "Clear, polite, easy to follow", scaleMax: 5, weight: null, active: true },
    { id: "c-service", name: "Service attitude", hint: "Warmth and willingness to help guests", scaleMax: 5, weight: null, active: true },
    { id: "c-experience", name: "Relevant experience", hint: "Matches the role and setting", scaleMax: 5, weight: null, active: true },
    { id: "c-grooming", name: "Presentation and grooming", hint: null, scaleMax: 5, weight: null, active: true },
    { id: "c-team", name: "Teamwork and reliability", hint: "Examples of working with others", scaleMax: 5, weight: null, active: true },
  ],
  warningTypes: [
    { id: "warn-attendance", name: "Attendance", active: true },
    { id: "warn-conduct", name: "Conduct", active: true },
    { id: "warn-performance", name: "Performance", active: true },
    { id: "warn-policy", name: "Policy", active: true },
  ],
  warningLevels: [
    { id: "level-low", name: "Low", active: true },
    { id: "level-medium", name: "Medium", active: true },
    { id: "level-high", name: "High", active: true },
  ],
  requiredDocuments: [
    { id: "rd-cv", roleId: null, docTypeKey: "cv", stage: "application", required: true, formats: ["PDF"], maxMb: 5, active: true },
    { id: "rd-photo", roleId: null, docTypeKey: "passport-photo", stage: "application", required: true, formats: ["JPG", "PNG"], maxMb: 5, active: true },
    { id: "rd-id", roleId: null, docTypeKey: "valid-id", stage: "application", required: true, formats: ["PDF", "JPG", "PNG"], maxMb: 5, active: true },
    { id: "rd-edu", roleId: null, docTypeKey: "educational-certificate", stage: "application", required: false, formats: ["PDF", "JPG", "PNG"], maxMb: 5, active: true },
    { id: "rd-food", roleId: "role-commis-chef", docTypeKey: "professional-certificate", stage: "application", required: true, formats: ["PDF", "JPG", "PNG"], maxMb: 5, active: true },
    { id: "rd-guarantor", roleId: null, docTypeKey: "guarantor-form", stage: "after-selection", required: true, formats: ["PDF"], maxMb: 10, active: true },
    { id: "rd-reference", roleId: null, docTypeKey: "reference-letter", stage: "after-selection", required: true, formats: ["PDF"], maxMb: 10, active: true },
    { id: "rd-medical", roleId: null, docTypeKey: "medical-fitness", stage: "onboarding", required: false, formats: ["PDF", "JPG"], maxMb: 10, active: true },
  ],
  history: { departments: null, roles: null, leaveTypes: null, interviewStages: null, scoringCriteria: null, warningTypes: null, warningLevels: null, requiredDocuments: null },
};

/**
 * Sample "Used in N places" counts (vacancies, staff, requests and so on). A real
 * backend counts these; here they are fixed numbers so the guard can be seen.
 * Items added in this session start at 0.
 */
export const SEED_USAGE: Record<ListKey, Record<string, number>> = {
  departments: { "dept-front-of-house": 6, "dept-kitchen": 3, "dept-bar": 2, "dept-management": 2, "dept-admin-ops": 1, "dept-support": 1 },
  roles: { "role-waiter": 9, "role-front-desk": 4, "role-commis-chef": 5, "role-bar-attendant": 3, "role-floor-supervisor": 2, "role-steward": 2 },
  leaveTypes: { "leave-annual": 14, "leave-personal": 5, "leave-sick": 6, "leave-other": 1 },
  interviewStages: { "hr-screening": 18, "beeliv-interview": 12, "client-interview": 5, practical: 4, "final-review": 3 },
  scoringCriteria: { "c-comm": 22, "c-service": 22, "c-experience": 22, "c-grooming": 22, "c-team": 22 },
  warningTypes: { "warn-attendance": 4, "warn-conduct": 3, "warn-performance": 2, "warn-policy": 1 },
  warningLevels: { "level-low": 4, "level-medium": 4, "level-high": 2 },
  requiredDocuments: {},
};
