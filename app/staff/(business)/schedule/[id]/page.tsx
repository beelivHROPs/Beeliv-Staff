import type { Metadata } from "next";
import { ShiftDetailBody } from "@/components/staff/schedule/ShiftDetailBody";

export const metadata: Metadata = { title: "Shift" };

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  return <ShiftDetailBody shiftId={id} />;
}
