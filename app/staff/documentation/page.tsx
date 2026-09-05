import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/PageHeading";
import { Card } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";

export const metadata: Metadata = { title: "My Documentation" };

export default function StaffDocumentationPage() {
  return (
    <div>
      <PageHeading title="My Documentation" />
      <Card title="Onboarding Documentation">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">All required items</span>
          <StatusBadge label="Complete" tone="success" />
        </div>
      </Card>
    </div>
  );
}
