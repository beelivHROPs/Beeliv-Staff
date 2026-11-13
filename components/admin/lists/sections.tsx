/**
 * What each list looks like: title, plain-words summary, and the table columns.
 * Presentation only. The values and rules live in lib/admin/lists.
 */
import type { ReactNode } from "react";
import { Award, BriefcaseBusiness, Calendar, CalendarCheck, CircleAlert, FileText, Layers, SlidersHorizontal, type LucideIcon } from "@/components/applicant/icons";
import { docLabel } from "@/lib/admin/lists/store";
import { DOC_STAGE_LABEL, type ItemByKey, type ListKey, type ListsData } from "@/lib/admin/lists/types";

export interface Col {
  label: string;
  cell: (item: ItemByKey[ListKey], d: ListsData) => ReactNode;
}

export interface SectionDef {
  key: ListKey;
  /** Short name in the section nav. */
  nav: string;
  title: string;
  summary: string;
  /** Singular noun for buttons and sheets: "Add department". */
  noun: string;
  icon: LucideIcon;
  /** Show a 1, 2, 3 order number: the order matters on this list. */
  ordered: boolean;
  cols: Col[];
}

function col<K extends ListKey>(label: string, cell: (item: ItemByKey[K], d: ListsData) => ReactNode): Col {
  return { label, cell: cell as Col["cell"] };
}

const yesNo = (v: boolean) => (v ? "Yes" : "No");
const dash = <span className="text-(--ap-muted)">-</span>;

export const SECTIONS: SectionDef[] = [
  {
    key: "departments",
    nav: "Departments",
    title: "Departments",
    summary: "The parts of a hospitality business that roles and vacancies belong to.",
    noun: "department",
    icon: Layers,
    ordered: false,
    cols: [col<"departments">("Roles inside", (it, d) => d.roles.filter((r) => r.departmentId === it.id && r.active).length)],
  },
  {
    key: "roles",
    nav: "Roles",
    title: "Roles",
    summary: "Job roles used by vacancies and staff. Each role belongs to one department.",
    noun: "role",
    icon: BriefcaseBusiness,
    ordered: false,
    cols: [col<"roles">("Department", (it, d) => d.departments.find((x) => x.id === it.departmentId)?.name ?? dash)],
  },
  {
    key: "leaveTypes",
    nav: "Leave types",
    title: "Leave types",
    summary: "The kinds of leave staff can ask for.",
    noun: "leave type",
    icon: Calendar,
    ordered: false,
    cols: [
      col<"leaveTypes">("Paid", (it) => yesNo(it.paid)),
      col<"leaveTypes">("Days a year", (it) => it.defaultDays),
      col<"leaveTypes">("Needs approval", (it) => yesNo(it.needsApproval)),
    ],
  },
  {
    key: "interviewStages",
    nav: "Interview stages",
    title: "Interview stages",
    summary: "The steps a candidate can go through, in order.",
    noun: "interview stage",
    icon: CalendarCheck,
    ordered: true,
    cols: [
      col<"interviewStages">("Used", (it) => (it.onlyWhereRequired ? "Only where required" : "Every candidate")),
      col<"interviewStages">("Default interviewer", (it) => it.defaultInterviewerRole ?? dash),
    ],
  },
  {
    key: "scoringCriteria",
    nav: "Scoring criteria",
    title: "Scoring criteria",
    summary: "What interviewers score each candidate on.",
    noun: "criterion",
    icon: Award,
    ordered: true,
    cols: [
      col<"scoringCriteria">("Scale", () => "1 to 5"),
      col<"scoringCriteria">("Weight", (it) => it.weight ?? "Equal"),
    ],
  },
  {
    key: "warningTypes",
    nav: "Warning types",
    title: "Warning types",
    summary: "The reasons a warning can be issued for.",
    noun: "warning type",
    icon: CircleAlert,
    ordered: false,
    cols: [],
  },
  {
    key: "warningLevels",
    nav: "Warning levels",
    title: "Warning levels",
    summary: "How serious a warning is, from the lowest to the highest.",
    noun: "warning level",
    icon: SlidersHorizontal,
    ordered: true,
    cols: [],
  },
  {
    key: "requiredDocuments",
    nav: "Required documents",
    title: "Required documents",
    summary: "Which documents each role must provide, and when.",
    noun: "document rule",
    icon: FileText,
    ordered: false,
    cols: [
      col<"requiredDocuments">("Role", (it, d) => (it.roleId ? (d.roles.find((r) => r.id === it.roleId)?.name ?? dash) : "All roles")),
      col<"requiredDocuments">("When", (it) => DOC_STAGE_LABEL[it.stage]),
      col<"requiredDocuments">("Rule", (it) => (
        <>
          {it.required ? "Required" : "Optional"}
          <br />
          <span className="text-(--ap-muted)">
            {it.formats.join(", ")} · up to {it.maxMb} MB
          </span>
        </>
      )),
    ],
  },
];

/** The name shown for a required-document rule's row. */
export const ruleTitle = (it: ItemByKey["requiredDocuments"]) => docLabel(it.docTypeKey);
