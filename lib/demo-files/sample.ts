/**
 * DEMO ONLY: remove with the other demo fixtures at go-live (lib/demo-files/*).
 *
 * Bundled sample files for the demo file store. When a document has NO file the user
 * uploaded, the store falls back to one of these so the project lead can judge the real
 * preview on every document page. The fallback never overrides a stored file, only exists
 * while the server-decided demo mode is on (the store checks that), and is clearly
 * labelled "Sample preview" in the UI.
 *
 *  - PDF-type documents: Beeliv's own BH-HR-001 policy (docs/policies/*.pdf).
 *  - image-type documents (photo, ID): a neutral generated PNG (docs/policies/sample-image.png).
 * Both are served by a dev-only route (app/design-preview/document-preview/file/route.ts)
 * that 404s in production, so outside dev there is simply no fallback.
 */

export const SAMPLE_URL = "/design-preview/document-preview/file";
export const SAMPLE_NAME = "Sample preview";

/** Image-type documents (photo / ID) get the sample image; everything else gets the sample PDF. */
export function sampleKindFor(key: string): "pdf" | "png" {
  return /photo|passport|valid-id|identity|nin|selfie|doc-id/i.test(key) ? "png" : "pdf";
}

/** Label for the "Sample preview, <document>" download name, when the key carries one. */
export function sampleLabelFor(key: string): string {
  return key.startsWith("demo-sample:") ? key.split(":").slice(2).join(":") : "";
}

const cache: Partial<Record<"pdf" | "png", Promise<Blob | null>>> = {};

export function loadSampleBlob(kind: "pdf" | "png"): Promise<Blob | null> {
  cache[kind] ??= fetch(kind === "png" ? `${SAMPLE_URL}?kind=image` : SAMPLE_URL, { cache: "force-cache" })
    .then(async (res) => {
      const want = kind === "png" ? "image/png" : "application/pdf";
      if (!res.ok || !res.headers.get("content-type")?.includes(want)) return null;
      return new Blob([await res.arrayBuffer()], { type: want });
    })
    .catch(() => null);
  return cache[kind]!;
}
