"use client";

/**
 * Loads an invitation preview in the browser, then renders the right screen.
 *
 * Why a client component: the live service posts to /api/auth/invite-preview
 * with same-origin cookies, so it cannot be called from an awaited Server
 * Component. The invite routes stay Server Components (metadata, no-referrer,
 * the server-decided `mode`) and hand over to this controller.
 *
 * Result -> screen (docs/contracts/auth-invitation-wire.md):
 *   ok, state=unavailable      -> ONE generic "no longer available" card
 *   ok, valid-*                -> the accept form (masked email only)
 *   ok:false (429/503/timeout/ -> temporary failure with Retry; never "invalid"
 *            network/malformed)
 */

import { useEffect, useState } from "react";
import { loadInvitation } from "@/lib/auth/invitation-client";
import { inviteKey } from "@/lib/auth-ui/invite-state";
import type { InvitationPreviewResult } from "@/lib/auth/invitation-wire";
import type { AuthMode } from "@/lib/auth/mode";
import type { Portal } from "@/lib/auth/types";
import { InviteAcceptance } from "./InviteAcceptance";
import { InvitationChecking, InvitationTemporaryFailure, InvitationUnavailable } from "./InviteStates";

type LoaderProps = {
  token: string;
  routePortal: Portal;
  mode: AuthMode;
  demo: string | null;
  /** PREVIEW MODE ONLY (`?state=outage|outage-once|limited|malformed`). Ignored when live. */
  previewState: string | null;
};

/**
 * Everything below is keyed by the invitation's identity (token + app + mode, plus the preview
 * fixtures), so a client navigation to a different invitation REMOUNTS: the earlier preview,
 * retry count, success or recovery state can never be shown for the new link.
 */
export function InviteLoader(props: LoaderProps) {
  const key = `${inviteKey({ token: props.token, portal: props.routePortal, mode: props.mode })}|${props.demo ?? ""}|${props.previewState ?? ""}`;
  return <InviteLoaderInner key={key} {...props} />;
}

function InviteLoaderInner({ token, routePortal, mode, demo, previewState }: LoaderProps) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ attempt: number; result: InvitationPreviewResult } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadInvitation(token, routePortal, mode, { previewState, attempt }).then((result) => {
      if (!cancelled) setLoaded({ attempt, result });
    });
    return () => {
      cancelled = true;
    };
  }, [token, routePortal, mode, previewState, attempt]);

  // Loading = the latest attempt has not answered yet.
  const loading = !loaded || loaded.attempt !== attempt;
  if (!loaded || (loading && loaded.result.ok)) return <InvitationChecking routePortal={routePortal} />;

  const { result } = loaded;
  if (!result.ok) {
    return (
      <InvitationTemporaryFailure
        routePortal={routePortal}
        error={result.error}
        retrying={loading}
        onRetry={() => setAttempt((a) => a + 1)}
      />
    );
  }
  if (result.preview.state === "unavailable") return <InvitationUnavailable routePortal={routePortal} />;
  return (
    <InviteAcceptance
      token={token}
      preview={result.preview}
      mode={mode}
      demo={demo}
      routePortal={routePortal}
    />
  );
}
