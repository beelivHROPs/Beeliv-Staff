import type { LearningStatus, SOPAssignment, TrainingAssignment } from "@/lib/staff/types";

/**
 * SOPs and Training share one list. This flattens both assignment shapes into
 * one display row; it adds no rules (status/progress are backend values).
 */
export interface LearningEntry {
  /** Assignment id (also the detail route segment). */
  id: string;
  kind: "sop" | "training";
  title: string;
  category: string;
  description: string;
  status: LearningStatus;
  progress: number;
  required: boolean;
  assignedAt: string;
  dueDate: string | null;
  /** "v3" for an SOP; "Course - 45 min" for training. */
  meta: string;
  department: string | null;
  /** SOP only. */
  requiresAcknowledgement: boolean;
  acknowledged: boolean;
  /** SOP only: ISO date-time it was completed. */
  completedAt: string | null;
}

const TRAINING_TYPE = { course: "Course", video: "Video", document: "Document", practical: "Practical" } as const;

export function toEntries(sops: SOPAssignment[], training: TrainingAssignment[]): LearningEntry[] {
  return [
    ...sops.map<LearningEntry>((s) => ({
      id: s.id,
      kind: "sop",
      title: s.sop.title,
      category: s.sop.category,
      description: s.sop.description,
      status: s.status,
      progress: s.progress,
      required: s.required,
      assignedAt: s.assignedAt,
      dueDate: s.dueDate,
      meta: s.sop.version,
      department: s.sop.department,
      requiresAcknowledgement: s.sop.requiresAcknowledgement,
      acknowledged: s.acknowledged,
      completedAt: s.completedAt ?? null,
    })),
    ...training.map<LearningEntry>((t) => ({
      id: t.id,
      kind: "training",
      title: t.training.title,
      category: t.training.category,
      description: t.training.description,
      status: t.status,
      progress: t.progress,
      required: t.required,
      assignedAt: t.assignedAt,
      dueDate: t.dueDate,
      meta: `${TRAINING_TYPE[t.training.type]}${t.training.durationMinutes ? ` - ${t.training.durationMinutes} min` : ""}`,
      department: null,
      requiresAcknowledgement: false,
      acknowledged: false,
      completedAt: null,
    })),
  ];
}

/** Required first, then earliest due date, then title. */
export function byPriority(a: LearningEntry, b: LearningEntry): number {
  if (a.required !== b.required) return a.required ? -1 : 1;
  if (a.dueDate !== b.dueDate) return a.dueDate === null ? 1 : b.dueDate === null ? -1 : a.dueDate.localeCompare(b.dueDate);
  return a.title.localeCompare(b.title);
}
