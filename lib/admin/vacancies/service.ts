/**
 * VacancyService: the single door the hooks use. Delegates to the active
 * adapter and adds NO business rules. To go live: change the one `adapter` line.
 */
import type { VacancyAdapter } from "./adapter";
import { mockVacancyAdapter } from "./mock";
import { liveVacancyAdapter } from "./live";

const adapter: VacancyAdapter = process.env.NEXT_PUBLIC_VACANCIES_BACKEND_ENABLED === 'true' ? liveVacancyAdapter : mockVacancyAdapter;

export const subscribeVacancies: VacancyAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const getConfig: VacancyAdapter["getConfig"] = () => adapter.getConfig();
export const listVacancies: VacancyAdapter["listVacancies"] = (q) => adapter.listVacancies(q);
export const getVacancy: VacancyAdapter["getVacancy"] = (id) => adapter.getVacancy(id);
export const createVacancy: VacancyAdapter["createVacancy"] = (i, n) => adapter.createVacancy(i, n);
export const updateVacancy: VacancyAdapter["updateVacancy"] = (id, i, n, revision) => adapter.updateVacancy(id, i, n, revision);
export const performAction: VacancyAdapter["performAction"] = (id, i, revision) => adapter.performAction(id, i, revision);
