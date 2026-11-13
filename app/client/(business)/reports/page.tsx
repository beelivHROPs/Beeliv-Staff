import { redirect } from "next/navigation";

/** "Reports" is now "Analytics". Old links keep working, and any query string is carried across. */
export default async function ClientReportsRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const one of Array.isArray(v) ? v : v ? [v] : []) qs.append(k, one);
  const s = qs.toString();
  redirect(`/client/analytics${s ? `?${s}` : ""}`);
}
