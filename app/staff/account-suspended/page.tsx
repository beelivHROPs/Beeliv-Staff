import { redirect } from "next/navigation";

// Applicant and Staff are ONE Talent app with one login (locked decision, 2026-09-29): no separate Staff auth pages.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else if (v !== undefined) qs.set(k, v);
  }
  const q = qs.toString();
  redirect(q ? `/account-suspended?${q}` : "/account-suspended");
}
