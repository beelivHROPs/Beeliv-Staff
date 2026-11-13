"use client";

/**
 * One list: heading + the single main button (Add), a plain table, and a History line.
 * Wide: columns. Narrow: each row stacks (name, the details underneath, then the row's buttons).
 * Row actions: open the name or click the row to edit, up/down to reorder, Deactivate / Reactivate.
 * An item that is used anywhere can only be deactivated, never removed (the store enforces it too).
 */
import { useState } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { ChevronDown, Pause, Plus, Repeat, ScrollText } from "@/components/applicant/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { StatusChip } from "@/components/client/StatusChip";
import { TH } from "@/components/admin/listKit";
import { createListItem, deleteListItem, editListItem, reorderListItem, toggleListItem } from "@/lib/admin/lists/hooks";
import { nameOf, usageOf, useListsData } from "@/lib/admin/lists/store";
import type { DraftOf, ItemByKey, ListKey, SaveResult } from "@/lib/admin/lists/types";
import { ItemSheet, type AnyDraft, type SheetTarget } from "./ItemSheet";
import { ruleTitle, type SectionDef } from "./sections";

const SMALL = "inline-flex h-9 items-center justify-center rounded-[10px] border border-(--ap-line) text-[13px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2) disabled:opacity-40 disabled:hover:bg-transparent";

function when(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}`;
}

export function SectionPanel({ def }: { def: SectionDef }) {
  const d = useListsData();
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const items = d[def.key] as ItemByKey[ListKey][];
  const note = d.history[def.key];
  const gridCols = `${def.ordered ? "44px " : ""}minmax(0,1.5fr) ${def.cols.map(() => "minmax(0,1fr)").join(" ")} 180px`.replace(/\s+/g, " ");

  async function save(draft: AnyDraft): Promise<SaveResult> {
    const r = sheet?.item ? await editListItem(def.key, (sheet.item as { id: string }).id, draft as DraftOf<ListKey>) : await createListItem(def.key, draft as DraftOf<ListKey>);
    if (r.ok) setSheet(null);
    return r;
  }
  async function remove(): Promise<SaveResult> {
    const r = await deleteListItem(def.key, (sheet?.item as { id: string }).id);
    if (r.ok) setSheet(null);
    return r;
  }

  async function toggle(item: ItemByKey[ListKey]) {
    const it = item as { id: string; active: boolean };
    if (it.active) {
      const used = usageOf(def.key, it.id, d);
      const name = def.key === "requiredDocuments" ? ruleTitle(item as ItemByKey["requiredDocuments"]) : nameOf(def.key, item, d);
      const ok = await confirmAction({
        tone: "caution",
        icon: Pause,
        title: `Deactivate ${name}?`,
        description: used > 0 ? `It is used in ${used} ${used === 1 ? "place" : "places"}. Those records keep it, but it can no longer be picked for new ones.` : "It can no longer be picked for new records. You can reactivate it any time.",
        confirmLabel: "Deactivate",
        cancelLabel: "Keep it",
      });
      if (!ok) return;
    }
    setBusy(it.id);
    await toggleListItem(def.key, it.id, !it.active);
    setBusy(null);
  }
  async function move(id: string, dir: -1 | 1) {
    setBusy(id);
    await reorderListItem(def.key, id, dir);
    setBusy(null);
  }

  const add = (
    <button type="button" onClick={() => setSheet({ key: def.key, noun: def.noun, item: null })} className="ap-btn ap-btn-p h-11 shrink-0 px-5 text-[15px] font-semibold text-white!">
      <Plus className="size-4" aria-hidden="true" /> Add {def.noun}
    </button>
  );

  return (
    <section aria-label={def.title} className="ap-card @container min-w-0 rounded-[20px] p-4.5 min-[768px]:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] leading-tight font-bold text-(--ap-ink)">{def.title}</h2>
          <p className="mt-0.5 text-[13px] text-(--ap-muted)">{def.summary}</p>
        </div>
        {items.length > 0 ? add : null}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No items yet" description={`Add the first ${def.noun} and it will show up wherever this list is used.`} action={add} />
      ) : (
        <>
          <div className="hidden px-2 pb-2 @min-[620px]:grid @min-[620px]:items-center @min-[620px]:gap-3" style={{ gridTemplateColumns: gridCols }}>
            {def.ordered ? <span className={TH}>Order</span> : null}
            <span className={TH}>Name</span>
            {def.cols.map((c) => (
              <span key={c.label} className={TH}>
                {c.label}
              </span>
            ))}
            <span className={`${TH} text-right`}>Actions</span>
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            {items.map((item, i) => {
              const it = item as { id: string; active: boolean };
              const name = def.key === "requiredDocuments" ? ruleTitle(item as ItemByKey["requiredDocuments"]) : nameOf(def.key, item, d);
              const used = usageOf(def.key, it.id, d);
              const open = () => setSheet({ key: def.key, noun: def.noun, item });
              return (
                <li
                  key={it.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button,a,[data-no-row]")) return;
                    if (window.getSelection()?.toString()) return;
                    open();
                  }}
                  className={`ad-clickrow cursor-pointer border-t border-(--ap-line-2) px-2 py-3 hover:bg-(--ap-tint-soft) @min-[620px]:grid @min-[620px]:items-center @min-[620px]:gap-3 ${it.active ? "" : "opacity-70"}`}
                  style={{ gridTemplateColumns: gridCols }}
                >
                  {def.ordered ? <span className="hidden text-[14px] font-semibold text-(--ap-muted) tabular-nums @min-[620px]:block">{i + 1}</span> : null}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={open} className="text-left text-[15px] font-semibold text-(--ap-ink) hover:underline">
                        {def.ordered ? <span className="text-(--ap-muted) @min-[620px]:hidden">{i + 1}. </span> : null}
                        {name}
                      </button>
                      {it.active ? null : <StatusChip tone="mute">Inactive</StatusChip>}
                    </div>
                    {def.key === "requiredDocuments" ? null : <p className="mt-0.5 text-[12px] text-(--ap-muted)">{used > 0 ? `Used in ${used} ${used === 1 ? "place" : "places"}` : "Not used yet"}</p>}
                  </div>
                  {def.cols.map((c) => (
                    <div key={c.label} className="mt-1.5 flex min-w-0 gap-1.5 text-[14px] text-(--ap-ink-2) @min-[620px]:mt-0">
                      <span className="text-(--ap-muted) @min-[620px]:hidden">{c.label}:</span>
                      <span className="min-w-0">{c.cell(item, d)}</span>
                    </div>
                  ))}
                  <div className="mt-2.5 flex items-center gap-1.5 @min-[620px]:mt-0 @min-[620px]:justify-end">
                    <button type="button" aria-label={`Move ${name} up`} disabled={i === 0 || busy === it.id} onClick={() => void move(it.id, -1)} className={`${SMALL} w-9`}>
                      <ChevronDown className="size-4 rotate-180" aria-hidden="true" />
                    </button>
                    <button type="button" aria-label={`Move ${name} down`} disabled={i === items.length - 1 || busy === it.id} onClick={() => void move(it.id, 1)} className={`${SMALL} w-9`}>
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" disabled={busy === it.id} onClick={() => void toggle(item)} className={`${SMALL} gap-1.5 px-3`}>
                      {it.active ? (
                        "Deactivate"
                      ) : (
                        <>
                          <Repeat className="size-3.5" aria-hidden="true" /> Reactivate
                        </>
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="mt-4 border-t border-(--ap-line-2) pt-3 text-[12px] text-(--ap-muted)">
        {note ? `History: last changed by ${note.by} on ${when(note.at)}.` : "History: not changed yet. These are the starting samples."}
      </p>

      {sheet ? <ItemSheet key={`${sheet.key}-${(sheet.item as { id: string } | null)?.id ?? "new"}`} target={sheet} onClose={() => setSheet(null)} onSave={save} onRemove={remove} /> : null}
    </section>
  );
}
