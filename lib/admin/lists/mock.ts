/**
 * DEV FIXTURE for Lists & Rules. The values live in the browser store
 * (lib/admin/lists/store.ts, seeded from seeds.ts); this adapter only simulates
 * the network: loading / error modes and the ?state=restricted preview.
 * Replace with a database adapter implementing ListsAdapter; no screen changes.
 */
import { previewGate, sleep } from "../interviews/mock";
import type { ListsAdapter } from "./adapter";

export const mockListsAdapter: ListsAdapter = {
  async load() {
    await previewGate(250);
  },
  async save() {
    await sleep(120);
  },
};
