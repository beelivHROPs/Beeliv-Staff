"use client";

/**
 * Lists & Rules store. One in-memory object (also saved to this browser's
 * localStorage so edits survive a refresh) that every Admin screen reads
 * through the typed hooks and getters below, so an edit shows everywhere live.
 * Mutations are pure functions here; lib/admin/lists/service.ts is the async door
 * the UI uses. MOCK ONLY: a database replaces the storage, not the shapes.
 */
import { useMemo, useSyncExternalStore } from "react";
import { DOCUMENT_TYPES } from "@/lib/applicant/reference-data";
import { SEED_LISTS, SEED_USAGE } from "./seeds";
import { DOC_FORMATS, DOC_STAGES, type DraftOf, type ItemByKey, type ListKey, type ListsData, type SaveResult } from "./types";

const STORAGE_KEY = "bv-admin-lists-v1";
export const ACTOR = "You";

let data: ListsData = SEED_LISTS;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as Partial<ListsData> | null;
    if (!p || typeof p !== "object") return;
    const next = { ...SEED_LISTS };
    (Object.keys(SEED_LISTS) as (keyof ListsData)[]).forEach((k) => {
      if (k === "history") return;
      if (Array.isArray(p[k])) (next as Record<string, unknown>)[k] = p[k];
    });
    if (p.history && typeof p.history === "object") next.history = { ...SEED_LISTS.history, ...p.history };
    data = next;
  } catch {
    /* ignore a corrupt saved copy and keep the samples */
  }
}

function commit(next: ListsData) {
  data = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode: the edit still shows for this visit */
  }
  listeners.forEach((l) => l());
}

export function subscribeLists(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
const snapshot = () => {
  hydrate();
  return data;
};
const serverSnapshot = () => SEED_LISTS;

export function getLists(): ListsData {
  return snapshot();
}

/* ---------- names and usage ---------- */

export const docLabel = (key: string) => DOCUMENT_TYPES.find((t) => t.key === key)?.label ?? key;
export const docTypeOptions = () => DOCUMENT_TYPES.map((t) => ({ value: t.key, label: t.label }));

export function nameOf(key: ListKey, item: ItemByKey[ListKey], d: ListsData = snapshot()): string {
  if (key === "requiredDocuments") {
    const r = item as ItemByKey["requiredDocuments"];
    return `${docLabel(r.docTypeKey)}${r.roleId ? ` (${d.roles.find((x) => x.id === r.roleId)?.name ?? "role"})` : ""}`;
  }
  return (item as { name: string }).name;
}

/** "Used in N places". Departments also count the roles that belong to them. */
export function usageOf(key: ListKey, id: string, d: ListsData = snapshot()): number {
  const seeded = SEED_USAGE[key][id] ?? 0;
  if (key === "departments") return seeded + d.roles.filter((r) => r.departmentId === id).length - SEED_LISTS.roles.filter((r) => r.departmentId === id).length;
  if (key === "roles") return seeded + d.requiredDocuments.filter((r) => r.roleId === id && !SEED_LISTS.requiredDocuments.some((s) => s.id === r.id)).length;
  return seeded;
}

/* ---------- validation ---------- */

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export function validate<K extends ListKey>(key: K, draft: DraftOf<K>, d: ListsData, selfId: string | null): string | null {
  if (key === "requiredDocuments") {
    const r = draft as DraftOf<"requiredDocuments">;
    if (!DOCUMENT_TYPES.some((t) => t.key === r.docTypeKey)) return "Choose a document type.";
    if (!DOC_STAGES.includes(r.stage)) return "Choose when the document is needed.";
    if (r.formats.length === 0 || !r.formats.every((f) => DOC_FORMATS.includes(f))) return "Choose at least one accepted format.";
    if (!Number.isFinite(r.maxMb) || r.maxMb < 1 || r.maxMb > 25) return "Maximum size must be between 1 and 25 MB.";
    if (r.roleId && !d.roles.some((x) => x.id === r.roleId)) return "Choose a role from the list, or all roles.";
    const dup = d.requiredDocuments.some((x) => x.id !== selfId && x.docTypeKey === r.docTypeKey && x.stage === r.stage && x.roleId === r.roleId);
    return dup ? "That document is already listed for the same role and stage." : null;
  }
  const name = (draft as unknown as { name: string }).name;
  const clean = name.trim();
  if (!clean) return "Enter a name.";
  if (clean.length > 60) return "Keep the name under 60 characters.";
  const same = (d[key] as { id: string; name: string; departmentId?: string }[]).some((x) => {
    if (x.id === selfId || norm(x.name) !== norm(clean)) return false;
    return key === "roles" ? x.departmentId === (draft as DraftOf<"roles">).departmentId : true;
  });
  if (same) return key === "roles" ? "This department already has a role with that name." : "Something in this list already has that name.";
  if (key === "roles" && !d.departments.some((x) => x.id === (draft as DraftOf<"roles">).departmentId)) return "Choose a department.";
  if (key === "leaveTypes") {
    const l = draft as DraftOf<"leaveTypes">;
    if (!Number.isInteger(l.defaultDays) || l.defaultDays < 0 || l.defaultDays > 365) return "Days per year must be a whole number from 0 to 365.";
  }
  if (key === "scoringCriteria") {
    const w = (draft as DraftOf<"scoringCriteria">).weight;
    if (w !== null && (!Number.isFinite(w) || w < 1 || w > 100)) return "Weight must be between 1 and 100, or left blank.";
  }
  return null;
}

/* ---------- mutations (pure; the service adds the delay and the adapter) ---------- */

function stamp(d: ListsData, key: ListKey): ListsData {
  return { ...d, history: { ...d.history, [key]: { by: ACTOR, at: new Date().toISOString() } } };
}

function withList<K extends ListKey>(key: K, items: ItemByKey[K][]): ListsData {
  return stamp({ ...snapshot(), [key]: items }, key);
}

export function addItem<K extends ListKey>(key: K, draft: DraftOf<K>): SaveResult {
  const d = snapshot();
  const error = validate(key, draft, d, null);
  if (error) return { ok: false, error };
  const id = `${key}-${Math.random().toString(36).slice(2, 8)}`;
  const item = { ...draft, id, active: true } as unknown as ItemByKey[K];
  commit(withList(key, [...(d[key] as ItemByKey[K][]), item]));
  return { ok: true, id };
}

export function updateItem<K extends ListKey>(key: K, id: string, draft: DraftOf<K>): SaveResult {
  const d = snapshot();
  const error = validate(key, draft, d, id);
  if (error) return { ok: false, error };
  const list = d[key] as ItemByKey[K][];
  commit(withList(key, list.map((x) => ((x as { id: string }).id === id ? ({ ...x, ...draft } as ItemByKey[K]) : x))));
  return { ok: true, id };
}

export function setItemActive(key: ListKey, id: string, active: boolean): SaveResult {
  const d = snapshot();
  const list = d[key] as { id: string; active: boolean }[];
  commit(withList(key, list.map((x) => (x.id === id ? { ...x, active } : x)) as never));
  return { ok: true, id };
}

export function moveItem(key: ListKey, id: string, dir: -1 | 1): SaveResult {
  const d = snapshot();
  const list = [...(d[key] as { id: string }[])];
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true, id };
  [list[i], list[j]] = [list[j], list[i]];
  commit(withList(key, list as never));
  return { ok: true, id };
}

/** Only items that are not used anywhere can be removed; everything else is deactivated. */
export function removeItem(key: ListKey, id: string): SaveResult {
  const d = snapshot();
  const used = usageOf(key, id, d);
  if (used > 0) return { ok: false, error: `Used in ${used} ${used === 1 ? "place" : "places"}. Deactivate it instead.` };
  if (key === "departments" && d.roles.some((r) => r.departmentId === id)) return { ok: false, error: "Roles still belong to this department. Deactivate it instead." };
  if (key === "roles" && d.requiredDocuments.some((r) => r.roleId === id)) return { ok: false, error: "Required documents still point to this role. Deactivate it instead." };
  const list = d[key] as { id: string }[];
  commit(withList(key, list.filter((x) => x.id !== id) as never));
  return { ok: true, id };
}

/* ---------- typed reads: active items by default ---------- */

type Pick<K extends ListKey> = ItemByKey[K][];

function useList<K extends ListKey>(key: K, includeInactive: boolean): Pick<K> {
  const d = useSyncExternalStore(subscribeLists, snapshot, serverSnapshot);
  const all = d[key] as Pick<K>;
  return useMemo(() => (includeInactive ? all : (all as { active: boolean }[]).filter((x) => x.active) as unknown as Pick<K>), [all, includeInactive]);
}
function getList<K extends ListKey>(key: K, includeInactive: boolean): Pick<K> {
  const all = snapshot()[key] as Pick<K>;
  return includeInactive ? all : ((all as { active: boolean }[]).filter((x) => x.active) as unknown as Pick<K>);
}

export const useDepartments = (includeInactive = false) => useList("departments", includeInactive);
export const useRoles = (includeInactive = false) => useList("roles", includeInactive);
export const useLeaveTypes = (includeInactive = false) => useList("leaveTypes", includeInactive);
export const useInterviewStages = (includeInactive = false) => useList("interviewStages", includeInactive);
export const useScoringCriteria = (includeInactive = false) => useList("scoringCriteria", includeInactive);
export const useWarningTypes = (includeInactive = false) => useList("warningTypes", includeInactive);
export const useWarningLevels = (includeInactive = false) => useList("warningLevels", includeInactive);
export const useRequiredDocuments = (includeInactive = false) => useList("requiredDocuments", includeInactive);
export const useListsData = () => useSyncExternalStore(subscribeLists, snapshot, serverSnapshot);

export const getDepartments = (includeInactive = false) => getList("departments", includeInactive);
export const getRoles = (includeInactive = false) => getList("roles", includeInactive);
export const getLeaveTypes = (includeInactive = false) => getList("leaveTypes", includeInactive);
export const getInterviewStages = (includeInactive = false) => getList("interviewStages", includeInactive);
export const getScoringCriteria = (includeInactive = false) => getList("scoringCriteria", includeInactive);
export const getWarningTypes = (includeInactive = false) => getList("warningTypes", includeInactive);
export const getWarningLevels = (includeInactive = false) => getList("warningLevels", includeInactive);
export const getRequiredDocuments = (includeInactive = false) => getList("requiredDocuments", includeInactive);
