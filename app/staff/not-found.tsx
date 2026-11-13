import { AreaError } from "@/components/shared/AreaError";

// Staff area "page not found" screen (shown for notFound() thrown inside /staff).
export default function StaffNotFound() {
  return <AreaError kind="not-found" homeHref="/staff" />;
}
