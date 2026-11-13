"use client";

/** Agreements hooks. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import { useLoad, type Live } from "../ops/assignments-hooks";
import * as service from "./service";
import type { AgreementDetail, AgreementDocId, AgreementDocSummary, PublicDocument, PublishedAgreement } from "./types";

export const useAgreementDocuments = (): Live<AgreementDocSummary[]> => useLoad(() => service.listAgreementDocuments(), "docs", (d) => d === null || d.length === 0, service.subscribeAgreements);
export const useAgreementDocument = (id: AgreementDocId): Live<AgreementDetail> => useLoad(() => service.getAgreementDocument(id), id, (d) => d === null, service.subscribeAgreements);
export const usePublishedAgreements = (): Live<PublishedAgreement[]> => useLoad(() => service.listPublishedAgreements(), "published", (d) => d === null || d.length === 0, service.subscribeAgreements);
/** Public pages: status "empty" means nothing is published (keep the placeholder). */
export const usePublicDocument = (id: "privacy" | "terms"): Live<PublicDocument> => useLoad(() => service.getPublicDocument(id), `public-${id}`, (d) => d === null, service.subscribeAgreements);

export const saveAgreementDraft = service.saveAgreementDraft;
export const publishAgreement = service.publishAgreement;
export { ConflictError } from "../ops/adapter";
export { AgreementValidationError } from "./types";
