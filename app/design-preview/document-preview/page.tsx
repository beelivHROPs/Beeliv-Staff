import { notFound } from "next/navigation";
import { access } from "node:fs/promises";
import path from "node:path";
import { DocumentFrameLab } from "@/components/design-preview/document-preview/DocumentFrameLab";

// Dev-only: 404 in production. The PDF is read from docs/ by the sibling file/ route handler.
export default async function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  const hasPdf = await access(path.join(process.cwd(), "docs", "policies", "BH-HR-001-staff-welfare-hr-workplace-policy.pdf")).then(() => true, () => false);
  return <DocumentFrameLab hasPdf={hasPdf} />;
}
