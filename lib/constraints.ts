/**
 * Real (non-placeholder) product constraints that are actually confirmed,
 * as opposed to lib/placeholder-data.ts's sample content. Keep this file
 * for confirmed decisions only — see docs/architecture/database-
 * architecture.md §10 for the sourcing/date of each.
 */

/** CONFIRMED 2026-09-02 (project lead) — Supabase Storage budget constraint,
 *  not a workflow requirement. See database-architecture.md §10. */
export const MAX_UPLOAD_SIZE_MB = 5;
