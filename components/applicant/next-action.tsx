import { ArrowRight, BriefcaseBusiness, FilePenLine, FileText, ScrollText, Upload, Video, type IconProps } from "@/components/applicant/icons";

/**
 * Glyph for an application's "Next action" (tile + CTA button), picked from
 * where the action leads, so "Review offer" never shows an upload arrow.
 * Shared by Overview and Application detail.
 */
export function NextActionIcon({ href, ...props }: IconProps & { href: string }) {
  if (href.includes("/interviews")) return <Video aria-hidden="true" {...props} />;
  if (href.includes("/offer")) return <ScrollText aria-hidden="true" {...props} />;
  if (href.includes("/staff-access")) return <BriefcaseBusiness aria-hidden="true" {...props} />;
  if (href.includes("/documentation") || href.includes("/apply")) return <FilePenLine aria-hidden="true" {...props} />;
  if (href.includes("/documents")) return <Upload aria-hidden="true" {...props} />;
  if (href.includes("/applications/")) return <FileText aria-hidden="true" {...props} />;
  return <ArrowRight aria-hidden="true" {...props} />;
}
