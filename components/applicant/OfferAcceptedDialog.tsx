"use client";

/**
 * "Offer accepted" moment, shown once straight after the accept-offer
 * preloader. Built from the shared confirmation set (./dialogs/ConfirmSheet):
 * sage success disc, short title, one line of body, one main pill and one
 * outline pill. The page itself then shows the live status in "What happens next".
 */
import { useId } from "react";
import { House } from "./icons";
import { Celebration } from "./Celebration";
import { SubmittedMark } from "./apply/SubmittedMark";
import { useIsPhone } from "./motion";
import { ConfirmActions, ConfirmHeader, ConfirmPortal, ConfirmShell } from "./dialogs/ConfirmSheet";

export function OfferAcceptedDialog({
  open,
  role,
  outlet,
  resumption,
  onClose,
  onSeeNext,
}: {
  open: boolean;
  role: string;
  outlet: string;
  resumption: string;
  onClose: () => void;
  onSeeNext: () => void;
}) {
  return <ConfirmPortal>{open ? <Panel key="offer-accepted" role={role} outlet={outlet} resumption={resumption} onClose={onClose} onSeeNext={onSeeNext} /> : null}</ConfirmPortal>;
}

function Panel({ role, outlet, resumption, onClose, onSeeNext }: { role: string; outlet: string; resumption: string; onClose: () => void; onSeeNext: () => void }) {
  const isPhone = useIsPhone();
  const titleId = useId();
  const descId = useId();
  return (
    <ConfirmShell role="dialog" onClose={onClose} labelledBy={titleId} describedBy={descId} width={440} behind={<Celebration originY={isPhone ? "58%" : "44%"} />}>
      <ConfirmHeader
        meaning="success"
        center
        disc={<SubmittedMark label="Offer accepted" plane={false} />}
        title="Offer accepted"
        titleId={titleId}
        bodyId={descId}
        body={
          <>
            <b className="block text-(--ap-ink)">
              {role} at {outlet}
            </b>
            Resumption {resumption}. Your response has been saved. Review your offer for the next steps.
          </>
        }
      />
      <ConfirmActions primary={{ label: "Go to Overview", href: "/applicant", icon: House }} secondary={{ label: "See what happens next", onClick: onSeeNext }} />
    </ConfirmShell>
  );
}
