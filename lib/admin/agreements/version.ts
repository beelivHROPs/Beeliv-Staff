/**
 * Version label rule shown in the publish step ("Will become v1.1"). The SERVER assigns
 * the real label; this only previews it. First publish is v1.0; a small correction bumps
 * the second number (v1.0 -> v1.1); a major change bumps the first (v1.1 -> v2.0).
 */
export function nextVersion(current: string | null, size: "minor" | "major"): string {
  const m = current ? /^v(\d+)\.(\d+)$/.exec(current) : null;
  if (!m) return "v1.0";
  return size === "major" ? `v${Number(m[1]) + 1}.0` : `v${m[1]}.${Number(m[2]) + 1}`;
}
