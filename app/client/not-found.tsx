import { AreaError } from "@/components/shared/AreaError";

// Client area "page not found" screen (shown for notFound() thrown inside /client).
export default function ClientNotFound() {
  return <AreaError kind="not-found" homeHref="/client" />;
}
