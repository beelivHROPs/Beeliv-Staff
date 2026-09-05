import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export interface OutstandingAction {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}

/**
 * Data-driven: renders the "Action Required" state when `action` is
 * provided, otherwise the positive "all caught up" state. This is the same
 * pattern shown as a manual toggle in the design review artifact — here it's
 * driven by actual outstanding-item data, since this is real UI, not a demo.
 */
export function RequiredActionCard({ action }: { action: OutstandingAction | null }) {
  if (!action) {
    return (
      <Card>
        <CardContent className="text-center">
          <div className="bg-success-wash mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full text-success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-foreground">You&apos;re all caught up!</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No outstanding actions right now — great job.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ring-warning/20">
      <CardContent>
        <div className="mb-3.5 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth={2}>
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
          <h2 className="text-xs font-semibold tracking-wide text-warning uppercase">
            Action Required
          </h2>
        </div>
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">{action.title}</div>
            <p className="mt-0.5 mb-3 text-xs text-muted-foreground">{action.description}</p>
            <Link href={action.actionHref} className={buttonVariants()}>
              {action.actionLabel} →
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
