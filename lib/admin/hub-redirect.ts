import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * The simple hubs (People, Jobs) are where lists live now. The old full-list routes forward here and keep the person's
 * filters (e.g. ?stage=approved-placed or ?tab=open) so every old link and bookmark still lands on the right list.
 */
export async function redirectToHub(hubPath: string, view: string | null, searchParams: SearchParams): Promise<never> {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "view") continue;
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else if (v !== undefined) qs.set(k, v);
  }
  if (view) qs.set("view", view);
  const q = qs.toString();
  redirect(q ? `${hubPath}?${q}` : hubPath);
}
