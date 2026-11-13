import type { Metadata } from "next";
import { ForgotForm } from "@/components/public/auth/ForgotForm";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // MOCK preview only (?state=limited); remove when the backend is connected.
  const state = (await searchParams).state;
  return <ForgotForm previewLimited={state === "limited"} />;
}
