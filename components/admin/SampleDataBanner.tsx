"use client";

import { usePathname } from "next/navigation";
import { isSampleAdminRoute } from "@/lib/admin/sample-routes";

const VACANCIES_LIVE = process.env.NEXT_PUBLIC_VACANCIES_BACKEND_ENABLED === "true";

/**
 * Live deployments only (`on` is decided on the server: true when sample data is NOT allowed, i.e. production).
 * Labels every Admin page that still shows built-in sample data, so nobody mistakes it for real records.
 * Local previews are all sample data, so the banner stays off there and approved designs look unchanged.
 */
export function SampleDataBanner({ on }: { on: boolean }) {
  const pathname = usePathname();
  if (!on || !isSampleAdminRoute(pathname, VACANCIES_LIVE)) return null;
  return (
    <div
      role="note"
      className="mb-4 rounded-xl border px-4 py-3 text-[14px] leading-snug"
      style={{ borderColor: "var(--ap-line-2)", background: "var(--ap-tint-soft)", color: "var(--ap-ink)" }}
    >
      <strong className="font-semibold">Preview.</strong> Sample data, nothing here is saved. This page is not connected to Beeliv records yet.
    </div>
  );
}
