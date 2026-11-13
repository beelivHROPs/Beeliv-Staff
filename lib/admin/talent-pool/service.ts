/**
 * TalentPoolService: the single door the hooks use. Delegates to the active
 * adapter and adds NO business rules. To go live: change the one `adapter` line.
 */
import type { TalentPoolAdapter } from "./adapter";
import { mockTalentPoolAdapter } from "./mock";

const adapter: TalentPoolAdapter = mockTalentPoolAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeTalentPool: TalentPoolAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listPool: TalentPoolAdapter["listPool"] = (q) => adapter.listPool(q);
export const addToVacancy: TalentPoolAdapter["addToVacancy"] = (id, input) => adapter.addToVacancy(id, input);
export const removeFromPool: TalentPoolAdapter["removeFromPool"] = (id, input) => adapter.removeFromPool(id, input);
