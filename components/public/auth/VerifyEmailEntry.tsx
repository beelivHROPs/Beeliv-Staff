"use client";

import { useEffect, useState } from "react";
import { takeEmailLink, type EmailLinkParams } from "@/lib/public-site/auth";
import { VerifiedPanel } from "./VerifiedPanel";
import { VerifyEmailPanel } from "./VerifyEmailPanel";

/** Supports older /verify-email callbacks while new confirmation emails target /verify-email/success. */
export function VerifyEmailEntry({ email }: { email: string | null }) {
  const [link, setLink] = useState<EmailLinkParams | null>(null);
  useEffect(() => {
    const credential = takeEmailLink(); // scrub before handing the one-time value to a child
    if (credential) setLink(credential);
  }, []);
  return link ? <VerifiedPanel initialLink={link} /> : <VerifyEmailPanel email={email} />;
}
