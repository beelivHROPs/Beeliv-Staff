import { notFound } from "next/navigation";
import { SKELETONS } from "@/components/design-preview/skeletons/registry";

export default async function Page({ params }: { params: Promise<{ app: string; key: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { app, key } = await params;
  const entry = SKELETONS[app]?.[key];
  if (!entry) notFound();
  return <div data-sk-preview>{entry.render()}</div>;
}
