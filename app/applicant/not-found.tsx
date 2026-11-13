import { AreaError } from "@/components/shared/AreaError";

// Applicant area "page not found" screen (shown for notFound() thrown inside /applicant).
export default function ApplicantNotFound() {
  return <AreaError kind="not-found" homeHref="/applicant" />;
}
