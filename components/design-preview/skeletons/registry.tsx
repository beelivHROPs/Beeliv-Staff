import type { ReactNode } from "react";
import * as A from "@/components/applicant/skeletons";

/**
 * DEV ONLY registry for /design-preview/skeletons. `route` = the real page the skeleton stands in for
 * (undefined: a loading state rendered inside a page). Keep one entry per skeleton.
 */
export type SkEntry = { route?: string; render: () => ReactNode };

export const SKELETONS: Record<string, Record<string, SkEntry>> = {
  applicant: {
    home: { route: "/applicant", render: () => <A.OverviewSkeleton /> },
    jobs: { route: "/applicant/jobs", render: () => <A.JobsSkeleton /> },
    "job-detail": { route: "/applicant/jobs/head-chef", render: () => <A.JobDetailSkeleton /> },
    applications: { route: "/applicant/applications", render: () => <A.ApplicationsSkeleton /> },
    "application-detail": { route: "/applicant/applications/fm", render: () => <A.ApplicationDetailSkeleton /> },
    offer: { route: "/applicant/applications/fm/offer", render: () => <A.OfferSkeleton /> },
    documentation: { route: "/applicant/applications/fm/documentation", render: () => <A.DocumentationSkeleton /> },
    interviews: { route: "/applicant/interviews", render: () => <A.InterviewsSkeleton /> },
    documents: { route: "/applicant/documents", render: () => <A.DocumentsSkeleton /> },
    profile: { route: "/applicant/profile", render: () => <A.ProfileSkeleton /> },
    settings: { route: "/applicant/settings", render: () => <A.SettingsSkeleton /> },
    notifications: { route: "/applicant/notifications", render: () => <A.NotificationsSkeleton /> },
    help: { route: "/applicant/help", render: () => <A.HelpSkeleton /> },
    "staff-access": { route: "/applicant/staff-access", render: () => <A.StaffAccessSkeleton /> },
    apply: { route: "/applicant/apply", render: () => <A.ApplySkeleton /> },
  },
  admin: {},
  client: {},
  staff: {},
  public: {},
};
