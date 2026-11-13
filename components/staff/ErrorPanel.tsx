"use client";

import { CircleAlert, RefreshCw } from "@/components/applicant/icons";
import { ActionPill, StateCard } from "./kit";

/**
 * "Couldn't load" state for every Staff page: the shared StateCard with one
 * Try again pill (content width on desktop, full width on phones).
 */
export function ErrorPanel({ title, retry }: { title: string; retry: () => void }) {
  return (
    <StateCard
      icon={CircleAlert}
      tone="sand"
      title={title}
      text="Check your connection and try again. Nothing on your account has changed."
      action={
        <ActionPill icon={RefreshCw} variant="purple" compact arrow={false} className="w-full justify-center" onClick={retry}>
          Try again
        </ActionPill>
      }
    />
  );
}
