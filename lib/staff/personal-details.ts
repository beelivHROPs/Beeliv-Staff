/**
 * Small pure helpers for the Staff personal-details sections. No business rules
 * beyond "which fields make a section count as filled in" (a UI default the
 * checklist uses). Format checks for NIN / account number are the same ones the
 * Applicant documentation form uses.
 */
import { EDUCATION_OPTIONS, NIGERIAN_BANKS, RELATIONSHIP_STATUS_OPTIONS, isValidNin, isValidNuban } from "@/lib/applicant/documentation";
import type { StaffEmployer, StaffPersonalDetails } from "./types";

export { EDUCATION_OPTIONS, NIGERIAN_BANKS, RELATIONSHIP_STATUS_OPTIONS, isValidNin, isValidNuban };

export const EMPTY_PERSONAL: StaffPersonalDetails = {
  sex: "",
  relationshipStatus: "",
  birthday: "",
  nationality: "",
  stateOfOrigin: "",
  lga: "",
  homeAddress: "",
  education: "",
};

export const EMPTY_EMPLOYER: StaffEmployer = { organisation: "", location: "", contact: "", position: "", description: "", manager: "", startMonth: "", endMonth: "" };

/** The personal-details section is complete when every field it asks for has a value (education has its own card). */
export function personalComplete(d: StaffPersonalDetails): boolean {
  return [d.sex, d.relationshipStatus, d.birthday, d.nationality, d.stateOfOrigin, d.lga, d.homeAddress].every((v) => v.trim() !== "");
}

/** Digits only, capped. Used as the user types NIN and account numbers. */
export const digitsOnly = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);
