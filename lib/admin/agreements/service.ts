/** Agreements service: the single door the hooks use. No business rules here. To go live: change the one `adapter` line. */
import type { AgreementsAdapter } from "./adapter";
import { mockAgreementsAdapter } from "./mock";

const adapter: AgreementsAdapter = mockAgreementsAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeAgreements: AgreementsAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listAgreementDocuments: AgreementsAdapter["listDocuments"] = () => adapter.listDocuments();
export const getAgreementDocument: AgreementsAdapter["getDocument"] = (id) => adapter.getDocument(id);
export const saveAgreementDraft: AgreementsAdapter["saveDraft"] = (id, body, rev) => adapter.saveDraft(id, body, rev);
export const publishAgreement: AgreementsAdapter["publish"] = (id, input) => adapter.publish(id, input);
export const listPublishedAgreements: AgreementsAdapter["listPublished"] = () => adapter.listPublished();
export const getPublicDocument: AgreementsAdapter["getPublicDocument"] = (id) => adapter.getPublicDocument(id);
