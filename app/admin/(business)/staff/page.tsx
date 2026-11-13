import type { Metadata } from "next";
import { redirectToHub } from "@/lib/admin/hub-redirect";

export const metadata: Metadata = { title: "Staff" };

/** Staff now live in the People hub. */
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return redirectToHub("/admin/people", "staff", searchParams);
}
