import { redirect } from "next/navigation";

// Applicant and Staff are ONE Talent app with one login (locked decision, 2026-09-29): staff invites use the shared invite page.
// Preview parameters (?state=, ?demo=) are kept so development previews still work through this redirect.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else if (v !== undefined) qs.set(k, v);
  }
  const q = qs.toString();
  redirect(`/invite/${encodeURIComponent(token)}${q ? `?${q}` : ""}`);
}
