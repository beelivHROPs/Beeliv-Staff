/** OffersService: the single door the hooks use. Delegates to the active adapter and adds NO business rules. To go live: change the one `adapter` line. */
import type { OffersAdapter } from "./adapter";
import { mockOffersAdapter } from "./mock";

const adapter: OffersAdapter = mockOffersAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeOffers: OffersAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listOffers: OffersAdapter["listOffers"] = (q) => adapter.listOffers(q);
export const getOffer: OffersAdapter["getOffer"] = (id) => adapter.getOffer(id);
export const getOfferFacets: OffersAdapter["getFacets"] = () => adapter.getFacets();
export const createOffer: OffersAdapter["createOffer"] = (i) => adapter.createOffer(i);
export const updateOfferDraft: OffersAdapter["updateDraft"] = (id, i) => adapter.updateDraft(id, i);
export const submitOffer: OffersAdapter["submitForApproval"] = (id) => adapter.submitForApproval(id);
export const approveOffer: OffersAdapter["approve"] = (id) => adapter.approve(id);
export const sendOffer: OffersAdapter["send"] = (id) => adapter.send(id);
export const withdrawOffer: OffersAdapter["withdraw"] = (id, r) => adapter.withdraw(id, r);
export const resendOffer: OffersAdapter["resend"] = (id, e) => adapter.resend(id, e);
export const convertOfferToStaff: OffersAdapter["convertToStaff"] = (id, i) => adapter.convertToStaff(id, i);
export const devSimulateOperationsApproval: OffersAdapter["devSimulateOperationsApproval"] = (id) => adapter.devSimulateOperationsApproval(id);
export const devSimulateApplicantResponse: OffersAdapter["devSimulateApplicantResponse"] = (id, r) => adapter.devSimulateApplicantResponse(id, r);
