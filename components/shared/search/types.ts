/**
 * Global search: shared types. Every app (Admin, Client, Staff, Applicant) builds one
 * `SearchProvider` from its own mock services and hands it to <GlobalSearch />. The panel
 * itself knows nothing about any app's data.
 *
 * PROTOTYPE: matching happens in the browser over lists the app's services already
 * return (so they are already scoped to the signed-in person). The real version is a
 * scoped server search; see docs/contracts/frontend-backend-needs-2026-10-17.md row 15.
 */
import type { LucideIcon } from "@/components/applicant/icons";

/** One thing the person can open. `href` is always a route the signed-in person may open. */
export interface SearchEntry {
  id: string;
  /** Key of one of the provider's groups. */
  group: string;
  title: string;
  /** One muted line (role, client, status, date). Never a sensitive value. */
  subtitle?: string;
  href: string;
  icon: LucideIcon;
  /** Extra words that should match (reference, department...) but are not shown. */
  keys?: string[];
  /** Short status word shown with a small dot ("Approved", "Pending"). Plain label, never a reason or note. */
  status?: string;
  /** A person: the row shows initials instead of the group icon. */
  person?: boolean;
}

/** A "Go to" navigation shortcut (today's behaviour of the search box). */
export interface SearchShortcut {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
}

/**
 * A command in the palette (">" mode, or the "Actions" group in normal search).
 * Only shortcuts to flows that already exist as real buttons or pages, or a safe local toggle.
 * Never destructive (no delete, publish, approve, reject, remove). The real boundary is still
 * the server: it must re-check the role when the flow itself runs.
 */
export interface SearchAction {
  id: string;
  title: string;
  /** Small area heading and muted label: "Recruitment", "People", "Account", "View". */
  category: string;
  icon: LucideIcon;
  /** Extra words that find it ("dark" for the dark-mode toggle). */
  keywords?: string[];
  /** One of the few most useful for this role: listed on the empty search as "Quick actions". */
  quick?: boolean;
  /** Real keyboard shortcut only, e.g. ["Ctrl", "K"]. Leave out when none exists. */
  shortcut?: string[];
  /** Navigate here ... */
  href?: string;
  /** ... or run this safe local action (toggle, sign out after its own confirmation). */
  run?: () => void | Promise<void>;
}

export interface SearchGroupDef {
  key: string;
  /** Plural heading, e.g. "People". Also what the type chips and "jobs:" shortcuts are called. */
  label: string;
  /** One of these, e.g. "Person", is the quiet hint on each row. */
  singular: string;
  icon: LucideIcon;
  /** Extra words that select this type in "word: query" (e.g. "applicants" for People). */
  aliases?: string[];
}

export interface SearchProvider {
  /** Namespaces the recent searches kept on this device. */
  appId: string;
  placeholder: string;
  /** Short name for assistive technology, e.g. "Search Admin". */
  label: string;
  /** Sidebar-page navigation was removed from search; kept empty. */
  shortcuts: SearchShortcut[];
  /** Commands available to this person, already role-gated. */
  actions: SearchAction[];
  /** Order of the groups in the results. */
  groups: SearchGroupDef[];
  /** Fetch everything searchable once (called each time the panel opens). Resolves what it could; throws only when nothing could be loaded. */
  load: () => Promise<SearchEntry[]>;
  /** Where the "See all results" page lives, e.g. "/admin/search". */
  searchPath: string;
  /** Quiet one-line suggestion under the empty state. */
  hint: string;
  /** Optional last row for a typed query, e.g. "Search jobs for ..." (keeps the Applicant box's old behaviour). */
  fallback?: (query: string) => { title: string; href: string; icon: LucideIcon };
}
