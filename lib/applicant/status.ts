/**
 * Derives a human-readable status chip (label + tone) for an Application.
 *
 * Deliberately a pure function, not a stored field: per project-lead
 * direction, application lifecycle, recruitment stage and document
 * verification are separate state domains and must never collapse into one
 * flattened "status" string. This derives a DISPLAY label from the two real
 * fields (`lifecycle`, `stage`) rather than storing a third, possibly
 * inconsistent copy of the same information.
 */
import { APPLICATION_STAGES, type Application, type NotificationTone } from "./types";

export function describeApplicationStatus(app: Application): { label: string; tone: NotificationTone | "mute" } {
  switch (app.lifecycle) {
    case "draft":
      return { label: "Draft", tone: "mute" };
    case "withdrawn":
      return { label: "Withdrawn", tone: "mute" };
    case "not_selected":
      return { label: "Not selected", tone: "mute" };
    case "in_talent_pool":
      return { label: "Not selected", tone: "mute" };
    case "completed":
      return { label: "Placed", tone: "ok" };
    case "submitted":
    default: {
      if (app.stage === 4) return { label: "Under verification", tone: app.next?.tone ?? "violet" };
      if (app.next?.tone) return { label: APPLICATION_STAGES[app.stage] ?? "Application", tone: app.next.tone };
      const stage = app.stage;
      const tone: NotificationTone = stage >= 6 ? "ok" : stage >= 2 ? "violet" : "info";
      return { label: APPLICATION_STAGES[stage] ?? "Application", tone };
    }
  }
}
