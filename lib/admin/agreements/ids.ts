import type { AgreementDocId } from "./types";

/** The five documents. Server pages import this (not the mock) to validate a route id. */
export const AGREEMENT_IDS: AgreementDocId[] = ["staff-welfare", "data-protection", "client-terms", "privacy", "terms"];
export const isAgreementId = (v: string): v is AgreementDocId => (AGREEMENT_IDS as string[]).includes(v);
