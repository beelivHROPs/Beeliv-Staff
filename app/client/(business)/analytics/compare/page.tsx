import type { Metadata } from "next";
import { ChartsCompare } from "@/components/client/compare/ChartsCompare";

// TEMPORARY design comparison page - removed once the chart style is chosen.
export const metadata: Metadata = { title: "Charts comparison" };

export default function Page() {
  return <ChartsCompare />;
}
