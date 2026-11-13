import { handleMailWorker } from "@/lib/server/auth/mail/handler";
export const runtime = "nodejs";
export const POST = handleMailWorker;
