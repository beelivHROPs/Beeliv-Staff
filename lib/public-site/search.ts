/**
 * Public-site search data layer: THE ONLY place a search query is matched
 * against site content.
 *
 * STATUS: NO BACKEND. Plain, case-insensitive substring matching over static,
 * in-repo source:
 *   1. The top-level page directory (title + path), reusing NAV_LINKS so the
 *      indexed pages never drift from the real nav.
 *   2. Sample jobs live in search-jobs.ts (a server action) so the list never ships in browser JS.
 * No fuzzy-match library, no network call, no new dependency.
 *
 * TO CONNECT REAL SEARCH LATER (one place, the UI does not change):
 *   Replace the body of `search()` (SWAP POINT) with a real query - e.g. a
 *   Supabase full-text search across pages and live job postings - and
 *   return results in the same SearchResult[] shape.
 */

import { NAV_LINKS } from "./content";

export type SearchResultType = "page" | "job";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  /** Secondary line (job company/location); null for page results. */
  subtitle: string | null;
  href: string;
};

const PAGE_RESULTS: SearchResult[] = NAV_LINKS.map((l) => ({
  id: `page-${l.href}`,
  type: "page",
  title: l.label,
  subtitle: null,
  href: l.href,
}));

/**
 * Case-insensitive substring match over the page directory (title only) and
 * job listings (role / company / location). Returns [] for an empty/blank
 * query. SWAP POINT for a real backend search - see file header.
 */
export function search(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const pageMatches = PAGE_RESULTS.filter((p) => p.title.toLowerCase().includes(q));

  return pageMatches;
}
