/**
 * DEMO ONLY (see lib/demo-files/store.ts). One place that decides what happens to a
 * picked file: in demo mode it is validated (extension AND signature, 5 MB) and kept
 * in the browser store; otherwise the old filename-only checks run. Returns the
 * display size ("214 KB"), null when the size is not known, or false when the file was
 * refused (the person has already been told, in plain words).
 */
import { toast } from "@/components/ui/toast";
import { DEMO_MAX_BYTES, demoFilesEnabled, demoProblemText, formatBytes, saveDemoFile } from "@/lib/demo-files/store";

export async function intakeFile(file: File, key: string, ownerName: string, label: string): Promise<string | null | false> {
  if (demoFilesEnabled()) {
    const r = await saveDemoFile(key, file, { ownerName, label });
    if (!r.ok) {
      toast.add({ title: demoProblemText(r.problem), type: "error" });
      return false;
    }
    return formatBytes(r.meta.size);
  }
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
    toast.add({ title: "Use a PDF, JPG or PNG file", type: "error" });
    return false;
  }
  if (file.size > DEMO_MAX_BYTES) {
    toast.add({ title: "That file is over 5 MB", description: "Try a smaller scan or photo.", type: "error" });
    return false;
  }
  return null;
}
