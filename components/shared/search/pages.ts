/**
 * "Pages" group of the global search, shared by the four apps. Every screen of an app is listed
 * once (menu items, screens reached from a menu, and settings sections) with the words people
 * actually type for it ("analytics", "time off", "dark mode"). Building the list is synchronous and
 * cheap (a few dozen small objects). Each app filters its own list by role / entitlement / pilot menu
 * BEFORE calling these helpers, so a result never leads to a "not available" page.
 */
import type { LucideIcon } from "@/components/applicant/icons";
import type { SearchEntry, SearchShortcut } from "./types";

export interface PageDef {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Synonyms that find the page. The label always matches. */
  keys?: string[];
  /** The one muted line. Defaults to "Open this page". */
  sub?: string;
  /** One of the most used screens: offered as a "Browse pages" chip on the empty search (first six that remain). */
  popular?: boolean;
}

export const PAGES_GROUP = "pages";

/** Page definitions as search entries. The same address + label is listed once. */
export function pageEntries(defs: readonly PageDef[], sectionKeys: string[] = ["settings"]): SearchEntry[] {
  const seen = new Set<string>();
  const out: SearchEntry[] = [];
  for (const d of defs) {
    const id = `page-${d.href}-${d.label}`;
    if (seen.has(id)) continue;
    seen.add(id);
    // A section of a page (href ends in #id) also answers to the page's own word, e.g. "settings".
    const keys = d.href.includes("#") ? [...(d.keys ?? []), ...sectionKeys] : d.keys;
    out.push({ id, group: PAGES_GROUP, title: d.label, subtitle: d.sub ?? "Open this page", href: d.href, icon: d.icon, keys });
  }
  return out;
}

/** The "Browse pages" chips: up to six popular pages (a menu item each, no settings sections). */
export function browseLinks(defs: readonly PageDef[], max = 6): SearchShortcut[] {
  return defs
    .filter((d) => d.popular)
    .slice(0, max)
    .map((d) => ({ id: `browse-${d.href}`, title: d.label, href: d.href, icon: d.icon }));
}
