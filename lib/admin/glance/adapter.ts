/**
 * Replaceable contract for Business at a glance: UI -> hooks -> service -> adapter
 * -> (dev fixture NOW, Supabase adapter LATER). The adapter returns finished
 * counts for the scope and must re-check role and client scope (RLS): an HR
 * user never receives company-wide totals or other HR officers' numbers.
 */
import type { AdapterEvent } from "../adapter";
import type { GlanceData, GlanceScope } from "./types";

export interface GlanceAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  getGlance(scope: GlanceScope): Promise<GlanceData>;
}
