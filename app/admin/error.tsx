"use client"; // Error boundaries must be Client Components

import { AreaError } from "@/components/shared/AreaError";

// Admin area error screen. Next 16.3 recovery prop is `retry` (`reset` only clears state without refetching).
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <AreaError kind="error" homeHref="/admin" digest={error.digest} onRetry={() => retry()} />;
}
