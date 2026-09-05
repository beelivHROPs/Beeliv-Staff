import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

// Thin wrapper around the real shadcn Badge (components/ui/badge.tsx),
// mapping this project's existing `tone` vocabulary onto Badge's `variant`
// prop so every existing caller (all five role dashboards) keeps working
// unchanged while now genuinely rendering a shadcn component underneath.
const TONE_TO_VARIANT: Record<
  "neutral" | "info" | "success" | "warning" | "danger",
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  neutral: "secondary",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "destructive",
};

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: keyof typeof TONE_TO_VARIANT;
}) {
  return <Badge variant={TONE_TO_VARIANT[tone]}>{label}</Badge>;
}
