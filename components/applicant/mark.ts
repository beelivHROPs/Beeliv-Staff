/** Marker-highlight class for a state tone (see .ap-mark in applicant.css). */
export function markClass(tone?: "warn" | "ok" | "info" | "violet" | "mute" | "rose"): string {
  if (tone === "ok") return "ap-mark ap-mark-ok";
  if (tone === "violet" || tone === "info" || tone === "mute") return "ap-mark ap-mark-violet";
  if (tone === "rose") return "ap-mark ap-mark-rose";
  return "ap-mark";
}
