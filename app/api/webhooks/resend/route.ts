import { handleMailWebhook } from "@/lib/server/auth/mail/handler";
export const runtime = "nodejs";
export const POST = handleMailWebhook;
