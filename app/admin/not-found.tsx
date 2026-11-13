import { AreaError } from "@/components/shared/AreaError";

// Admin area "page not found" screen (shown for notFound() thrown inside /admin).
export default function AdminNotFound() {
  return <AreaError kind="not-found" homeHref="/admin" />;
}
