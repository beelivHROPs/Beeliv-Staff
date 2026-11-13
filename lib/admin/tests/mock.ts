/**
 * DEV FIXTURE adapter for Tests & Forms, over the shared in-memory store (lib/admin/tests/store.ts) that the taker screens
 * also use. Honours the Admin "Prototype state" control (loading / empty / error) and `?state=unauthorized` in the URL.
 * Delete with the store when the real adapter exists.
 */
import { RestrictedError, type AdapterEvent } from "../adapter";
import { cmpIso } from "../sort";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import type { FormSubmission } from "@/lib/forms/types";
import type { FormRow, FormSummary, QuestionSummary, ResultsPage, SubmissionDetail, SubmissionRow, TestsAdapter } from "./adapter";
import * as store from "./store";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
subscribePrototypeMode(() => listeners.forEach((l) => l("reset")));
store.subscribe(() => listeners.forEach((l) => l("reset")));

async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  await sleep(250);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("state") === "unauthorized") throw new RestrictedError();
  return mode;
}

const rowOf = (f: ReturnType<typeof store.listForms>[number]): FormRow => ({
  id: f.id,
  title: f.title,
  kind: f.kind,
  audience: f.audience,
  clientName: f.clientName,
  status: f.status,
  version: f.version,
  questionCount: f.questions.length,
  submissionCount: store.submissionCount(f.id),
  updatedAt: f.updatedAt,
  updatedBy: f.updatedBy,
});

function detailOf(id: string): SubmissionDetail | null {
  const submission = store.getSubmission(id);
  const form = submission ? store.getForm(submission.formId) : null;
  if (!submission || !form) return null;
  return { form, submission, score: form.kind === "test" ? store.scoreSubmission(form, submission) : null, history: store.getSubmissionHistory(id) };
}

export const mockTestsAdapter: TestsAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async listForms(q) {
    const mode = await gate();
    const all = mode === "empty" ? [] : store.listForms().map(rowOf);
    const tabCounts = { all: all.length, tests: all.filter((r) => r.kind === "test").length, appraisals: all.filter((r) => r.kind === "appraisal").length };
    const needle = q.search.trim().toLowerCase();
    const rows = all
      .filter((r) => (q.tab === "all" ? true : q.tab === "tests" ? r.kind === "test" : r.kind === "appraisal"))
      .filter((r) => !q.status || r.status === q.status)
      .filter((r) => !needle || `${r.title} ${r.clientName ?? ""}`.toLowerCase().includes(needle))
      .sort((a, b) => (q.sort === "title" ? a.title.localeCompare(b.title) : cmpIso(a.updatedAt, b.updatedAt, "desc")));
    return { rows: rows.slice(0, q.pageSize), total: rows.length, tabCounts, workspaceEmpty: all.length === 0 };
  },

  async getForm(id) {
    const mode = await gate();
    if (mode === "empty") return null;
    const form = store.getForm(id);
    return form ? { form, submissionCount: store.submissionCount(id) } : null;
  },

  async getFacets() {
    return { clients: store.SAMPLE_CLIENTS, departments: store.SAMPLE_DEPARTMENTS };
  },

  async saveForm(input) {
    await sleep(300);
    return store.saveForm(input);
  },

  async setStatus(id, status) {
    await sleep(250);
    const f = store.setFormStatus(id, status);
    if (!f) throw new Error("Not found");
    return f;
  },

  async duplicate(id) {
    await sleep(250);
    const f = store.duplicateForm(id);
    if (!f) throw new Error("Not found");
    return f;
  },

  async listResults(formId, q) {
    const mode = await gate();
    const form = store.getForm(formId);
    if (!form || mode === "empty") return null;
    const needle = q.search.trim().toLowerCase();
    const all = store.listSubmissions(formId);
    const rows: SubmissionRow[] = all
      .filter((s) => !needle || s.takerName.toLowerCase().includes(needle))
      .sort((a, b) => cmpIso(a.submittedAt ?? a.startedAt, b.submittedAt ?? b.startedAt, q.sort === "newest" ? "desc" : "asc"))
      .map((s) => ({
        id: s.id,
        takerId: s.takerId,
        takerName: s.takerName,
        takerType: s.takerType,
        submittedAt: s.submittedAt,
        status: s.status,
        score: form.kind === "test" ? store.scoreSubmission(form, s) : null,
        recommendation: s.recommendation ?? null,
      }));
    const page: ResultsPage = { form, rows: rows.slice(0, q.pageSize), total: rows.length, submittedTotal: all.filter((s) => s.status !== "in-progress").length };
    return page;
  },

  async getSummary(formId) {
    const mode = await gate();
    const form = store.getForm(formId);
    if (!form || mode === "empty") return null;
    const subs = store.listSubmissions(formId).filter((s) => s.status !== "in-progress");
    const questions: QuestionSummary[] = form.questions.map((q) => {
      const vals = subs.map((s) => ({ s, v: s.answers[q.id] })).filter((x) => x.v !== undefined && x.v !== "" && !(Array.isArray(x.v) && x.v.length === 0));
      const counts: QuestionSummary["counts"] = [];
      let average: number | null = null;
      const written: string[] = [];
      if (q.type === "single" || q.type === "multiple" || q.type === "dropdown") {
        const tally = new Map<string, number>();
        for (const { s, v } of vals) {
          for (const id of Array.isArray(v) ? v : [String(v)]) tally.set(id, (tally.get(id) ?? 0) + 1);
          if (s.otherText?.[q.id]) tally.set("__other", (tally.get("__other") ?? 0) + 1);
        }
        for (const o of q.options ?? []) counts.push({ label: o.label, count: tally.get(o.id) ?? 0 });
        if (q.allowOther) counts.push({ label: "Other", count: tally.get("__other") ?? 0 });
        if (!q.options) for (const [label, count] of tally) if (label !== "__other") counts.push({ label, count });
      } else if (q.type === "rating") {
        const nums = vals.map((x) => Number(x.v)).filter((n) => !Number.isNaN(n));
        average = nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
        for (let n = 1; n <= (q.ratingMax ?? 5); n++) counts.push({ label: String(n), count: nums.filter((x) => x === n).length });
      } else {
        for (const { v } of vals) written.push(String(v));
      }
      return { questionId: q.id, prompt: q.prompt, type: q.type, answered: vals.length, counts, average, written };
    });
    const summary: FormSummary = { form, submittedTotal: subs.length, questions };
    return summary;
  },

  async getSubmission(id) {
    const mode = await gate();
    if (mode === "empty") return null;
    return detailOf(id);
  },

  async saveMarks(id, marks, recommendation: FormSubmission["recommendation"]) {
    await sleep(300);
    store.saveMarks(id, marks, recommendation);
    const d = detailOf(id);
    if (!d) throw new Error("Not found");
    return d;
  },
};
