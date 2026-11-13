import { redirect } from "next/navigation";

// Applicant and Staff are ONE Talent app with one login (locked decision, 2026-09-29): no separate Staff auth pages.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else if (v !== undefined) qs.set(k, v);
  }
  // Same account system, framed for Staff: "Sign in to Beeliv Staff", invitation-only note, lands on /staff (the server maps portal=staff to Talent auth).
  if (!qs.has("portal")) qs.set("portal", "staff");
  redirect(`/login?${qs.toString()}`);
}
