import type { Metadata } from "next";
import { redirectToHub } from "@/lib/admin/hub-redirect";

export const metadata: Metadata = { title: "Vacancies" };

/** This list now lives in the simple hub (keeps any filters in the address). The embedded list component is unchanged. */
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return redirectToHub("/admin/jobs", null, searchParams);
}
