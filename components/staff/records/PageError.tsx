"use client";

import { PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "../ErrorPanel";

/** Shared "couldn't load" card for the Records / Profile / Notifications pages (same pattern as Home's error). */
export function PageError({ title, what, retry }: { title: string; what: string; retry: () => void }) {
  return (
    <>
      <PageHeading title={title} />
      <ErrorPanel title={`We couldn't load ${what}`} retry={retry} />
    </>
  );
}
