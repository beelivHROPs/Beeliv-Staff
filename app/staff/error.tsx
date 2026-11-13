"use client"; // Error boundaries must be Client Components

import { AreaError } from "@/components/shared/AreaError";

// Staff area error screen. Next 16.3 recovery prop is `retry` (`reset` only clears state without refetching).
export default function StaffError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <AreaError kind="error" homeHref="/staff" digest={error.digest} onRetry={() => retry()} />;
}
