import type { Metadata } from "next";
import { FormsListBody } from "@/components/staff/forms/FormsBody";

export const metadata: Metadata = { title: "Forms" };

export default function StaffFormsPage() {
  return <FormsListBody />;
}
