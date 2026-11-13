/**
 * ListsService: the single door the hooks use. Validates through the store,
 * then hands the saved lists to the adapter. To go live: change the one `adapter` line.
 */
import type { ListsAdapter } from "./adapter";
import { mockListsAdapter } from "./mock";
import { addItem, getLists, moveItem, removeItem, setItemActive, updateItem } from "./store";
import type { DraftOf, ListKey, SaveResult } from "./types";

const adapter: ListsAdapter = mockListsAdapter; // DEV FIXTURE until the backend adapter exists

export const loadLists = () => adapter.load();

async function persist(r: SaveResult): Promise<SaveResult> {
  if (r.ok) await adapter.save(getLists());
  return r;
}

export const createItem = <K extends ListKey>(key: K, draft: DraftOf<K>) => persist(addItem(key, draft));
export const editItem = <K extends ListKey>(key: K, id: string, draft: DraftOf<K>) => persist(updateItem(key, id, draft));
export const toggleItem = (key: ListKey, id: string, active: boolean) => persist(setItemActive(key, id, active));
export const reorderItem = (key: ListKey, id: string, dir: -1 | 1) => persist(moveItem(key, id, dir));
export const deleteItem = (key: ListKey, id: string) => persist(removeItem(key, id));
