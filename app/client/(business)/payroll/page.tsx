import type { Metadata } from "next";
import { PayrollBody } from "@/components/client/payroll/PayrollBody";

export const metadata: Metadata = { title: "Payroll" };

export default function ClientPayrollPage() {
  return <PayrollBody />;
}
