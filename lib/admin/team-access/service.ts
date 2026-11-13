/** TeamAccessService: the single door the hooks use. Delegates to the active adapter (mock or live, per ./mode.ts) and adds NO business rules. */
import type { TeamAccessAdapter } from "./adapter";
import { createLiveTeamAccessAdapter } from "./live";
import { mockTeamAccessAdapter } from "./mock";
import { teamAccessMode } from "./mode";

// Mock (local development fixtures) or live (real invitation endpoints) is chosen per call from the server's
// decision (./mode.ts). Live never falls back to the fixtures.
const live = createLiveTeamAccessAdapter();
const adapter = (): TeamAccessAdapter => (teamAccessMode() === "live" ? live : mockTeamAccessAdapter);

export const subscribeTeamAccess: TeamAccessAdapter["subscribe"] = (l) => {
  const stopMock = mockTeamAccessAdapter.subscribe(l);
  const stopLive = live.subscribe(l);
  return () => {
    stopMock();
    stopLive();
  };
};
export const getCapabilities: TeamAccessAdapter["getCapabilities"] = () => adapter().getCapabilities();
export const getTeamFacets: TeamAccessAdapter["getFacets"] = () => adapter().getFacets();
export const getAccessMatrix: TeamAccessAdapter["getMatrix"] = () => adapter().getMatrix();
export const listInternal: TeamAccessAdapter["listInternal"] = (q) => adapter().listInternal(q);
export const listClientUsers: TeamAccessAdapter["listClientUsers"] = (q) => adapter().listClientUsers(q);
export const listAccounts: TeamAccessAdapter["listAccounts"] = (q) => adapter().listAccounts(q);
export const listInvitations: TeamAccessAdapter["listInvitations"] = (q) => adapter().listInvitations(q);
export const inviteUser: TeamAccessAdapter["invite"] = (i) => adapter().invite(i);
export const sendInvitation: TeamAccessAdapter["sendInvitation"] = (id) => adapter().sendInvitation(id);
export const createAccessLink: TeamAccessAdapter["createAccessLink"] = (id, rev) => adapter().createAccessLink(id, rev);
export const updateInvitationEmail: TeamAccessAdapter["updateInvitationEmail"] = (id, e) => adapter().updateInvitationEmail(id, e);
export const replaceInvitation: TeamAccessAdapter["replaceInvitation"] = (id) => adapter().replaceInvitation(id);
export const findDuplicates: TeamAccessAdapter["findDuplicates"] = (i) => adapter().findDuplicates(i);
export const resendInvitation: TeamAccessAdapter["resendInvitation"] = (id) => adapter().resendInvitation(id);
export const revokeInvitation: TeamAccessAdapter["revokeInvitation"] = (id, r) => adapter().revokeInvitation(id, r);
export const setAccountState: TeamAccessAdapter["setState"] = (id, a, r) => adapter().setState(id, a, r);
export const updateAccess: TeamAccessAdapter["updateAccess"] = (id, p) => adapter().updateAccess(id, p);
export const getHistory: TeamAccessAdapter["getHistory"] = (id) => adapter().getHistory(id);
