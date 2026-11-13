"use client";

/**
 * DEV ONLY (remove with the other demo fixtures). Shows the REAL DocumentPreview frames side
 * by side for a sample PDF / image or any file the lead picks. Files are written to the demo
 * store under "dp-lab:*" keys (this browser only), which needs the demo flag below.
 */
import { useEffect, useState } from "react";
import { DocumentPreviewDialog, DocumentPreviewPanel } from "@/components/shared/documents/DocumentPreview";
import { saveDemoFile, demoProblemText } from "@/lib/demo-files/store";

const SLOTS = { pdf: "dp-lab:pdf", image: "dp-lab:image", pick: "dp-lab:pick" } as const;
type Slot = keyof typeof SLOTS;

async function seed(slot: Slot, url: string, name: string, type: string) {
  const res = await fetch(url, { cache: "no-store" });
  const blob = await res.blob();
  const file = new File([blob], name, { type });
  const r = await saveDemoFile(SLOTS[slot], file, { ownerName: "Sample preview", label: name });
  return r;
}

export function DocumentFrameLab({ hasPdf }: { hasPdf: boolean }) {
  const [ready, setReady] = useState(false);
  const [which, setWhich] = useState<Slot>(hasPdf ? "pdf" : "image");
  const [dialog, setDialog] = useState(false);
  const [msg, setMsg] = useState("");
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        if (hasPdf) await seed("pdf", "/design-preview/document-preview/file", "BH-HR-001 Staff Welfare, HR & Workplace Policy.pdf", "application/pdf");
        await seed("image", "/design-preview/document-preview/file?kind=image", "sample-image.png", "image/png");
      } catch (e) {
        setMsg("Could not load the sample files: " + String(e));
      }
      setReady(true);
    })();
  }, [hasPdf]);

  async function pick(f: File | undefined) {
    if (!f) return;
    const r = await saveDemoFile(SLOTS.pick, f, { ownerName: "Sample preview", label: f.name });
    if (!r.ok) return setMsg(demoProblemText(r.problem));
    setMsg("");
    setPicked(true);
    setWhich("pick");
  }

  const key = SLOTS[which];
  return (
    <div className="mx-auto max-w-[1200px] p-4 min-[768px]:p-8">
      <h1 className="ap-serif mb-1 text-[26px]">Document preview frames</h1>
      <p className="mb-4 text-[14px] text-(--ap-muted)">Dev-only. The real DocumentPreview component, with the file held in this browser only.</p>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {hasPdf ? <button type="button" className={`ap-btn ap-btn-sm ${which === "pdf" ? "ap-btn-p" : "ap-btn-s"}`} onClick={() => setWhich("pdf")}>Policy PDF (7 pages, A4)</button> : null}
        <button type="button" className={`ap-btn ap-btn-sm ${which === "image" ? "ap-btn-p" : "ap-btn-s"}`} onClick={() => setWhich("image")}>Sample image</button>
        {picked ? <button type="button" className={`ap-btn ap-btn-sm ${which === "pick" ? "ap-btn-p" : "ap-btn-s"}`} onClick={() => setWhich("pick")}>Your file</button> : null}
        <label className="ap-btn ap-btn-s ap-btn-sm cursor-pointer">
          Pick another file
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void pick(f); }} />
        </label>
        {msg ? <span role="alert" className="text-[13px] text-red-700">{msg}</span> : null}
      </div>

      {!ready ? <p>Loading...</p> : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 min-[1100px]:grid-cols-[minmax(0,1fr)_420px]">
          <section>
            <h2 className="mb-2 text-[16px] font-bold">(a) Dialog (desktop and phone)</h2>
            <button type="button" className="ap-btn ap-btn-p ap-btn-sm" onClick={() => setDialog(true)}>Open the dialog</button>
            {dialog ? <DocumentPreviewDialog fileKey={key} title="Policy document" ownerName="Sample preview" label="Policy" canReplace onClose={() => setDialog(false)} /> : null}

            <h2 className="mt-8 mb-2 text-[16px] font-bold">(b) Inline panel (Admin document page)</h2>
            <div className="ap-card rounded-[20px] p-5">
              <DocumentPreviewPanel fileKey={key} ownerName="Sample preview" label="Policy" canReplace />
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-[16px] font-bold">(c) Phone width, 390px</h2>
            <div className="mx-auto w-[390px] max-w-full overflow-hidden rounded-[28px] border-4 border-(--ap-ink) bg-(--ap-surface) p-3">
              <div className="h-[760px]">
                <DocumentPreviewPanel fileKey={key} ownerName="Sample preview" label="Policy" canReplace fill />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
