import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Application Submitted" };

/**
 * Application Submitted — docs/architecture/ui-ux-framework.md §16, screen
 * 06. Copy is intentionally generic ("we'll be in touch") since no source
 * document defines a specific post-submission process or timeline.
 */
export default function ApplicationSubmittedPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="text-xl font-semibold text-gray-900">
        Your application has been submitted.
      </h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        We&apos;ll be in touch about next steps.
      </p>
      <Link
        href="/applicant/dashboard"
        className="mt-6 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go to My Dashboard
      </Link>
    </div>
  );
}
