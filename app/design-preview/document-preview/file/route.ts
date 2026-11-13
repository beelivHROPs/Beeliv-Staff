import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";

// DEMO ONLY (remove with the other demo fixtures at go-live). Dev-only: serves the bundled
// SAMPLE files (Beeliv's own BH-HR-001 policy PDF, and a neutral generated PNG with ?kind=image)
// from docs/policies so the demo file store can fall back to a real file. 404 in production
// builds; never linked or indexed.
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") notFound();
  const image = new URL(req.url).searchParams.get("kind") === "image";
  const name = image ? "sample-image.png" : "BH-HR-001-staff-welfare-hr-workplace-policy.pdf";
  const bytes = await readFile(path.join(process.cwd(), "docs", "policies", name));
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": image ? "image/png" : "application/pdf", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
