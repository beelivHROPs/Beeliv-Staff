import { randomUUID } from "node:crypto";
import { apiFailure, handleEnquiry } from "@/lib/server/public-enquiries/handler";
import { getEnquiryDependencies } from "@/lib/server/public-enquiries/gateway";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try { return await handleEnquiry(request, getEnquiryDependencies()); }
  catch { return apiFailure(503, "unavailable", "Enquiries are temporarily unavailable. Please try again later.", randomUUID()); }
}
