"use client";

import { Download } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { MoreActions } from "../phone";

/**
 * Export CSV / PDF (brief section 23). UI ONLY: no file is generated or
 * downloaded until reports are connected to the backend, and the toast says
 * so. When the backend export exists it must re-check the outlet scope and
 * filters server-side, exactly like the on-screen queries.
 */
export function ExportButtons({ report }: { report: string }) {
  const soon = (kind: string) => toast.add({ title: "Export is prepared once reports are connected", description: `${report} ${kind} is not generated in this preview.` });
  return (
    <>
    <MoreActions title="Export" actions={[{ label: "Export CSV", onClick: () => soon("CSV") }, { label: "Export PDF", onClick: () => soon("PDF") }]} />
    <div className="flex items-center gap-2 max-[767px]:hidden">
      <button type="button" onClick={() => soon("CSV")} className="ap-btn ap-btn-s ap-btn-sm max-[640px]:flex-1">
        <Download className="size-4" aria-hidden="true" /> Export CSV
      </button>
      <button type="button" onClick={() => soon("PDF")} className="ap-btn ap-btn-s ap-btn-sm max-[640px]:flex-1">
        <Download className="size-4" aria-hidden="true" /> Export PDF
      </button>
    </div>
    </>
  );
}
