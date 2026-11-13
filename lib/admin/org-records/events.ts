/** Tiny bus so every org-records screen reloads after any create / edit / deactivate / placement change. */
const listeners = new Set<() => void>();
export function onOrgRecordsChanged(l: () => void): () => void {
  listeners.add(l);
  return () => void listeners.delete(l);
}
export function emitOrgRecordsChanged(): void {
  listeners.forEach((l) => l());
}
