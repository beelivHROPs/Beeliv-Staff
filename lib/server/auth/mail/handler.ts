import "server-only";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { workerConfig, webhookConfig } from "./config";
import { mailGateway } from "./gateway";
import { sendResend } from "./provider";
import { deliverOne } from "./worker";
import { verifyWebhook, parseMailEvent } from "./webhook";
const headers={"Cache-Control":"private, no-store"};
function response(body:unknown,status=200) {return Response.json(body,{status,headers});}
async function rawBody(request: Request): Promise<Buffer> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("mail_request_invalid");
  const length=request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length)>65536)) throw new Error("mail_request_invalid");
  if (!request.body) throw new Error("mail_request_invalid");
  const reader=request.body.getReader(); const chunks: Uint8Array[]=[];let size=0;let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;void reader.cancel().catch(()=>{});},5000);
  try {
    while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>65536)throw new Error("mail_request_invalid");chunks.push(chunk.value);}
  } catch(error){await reader.cancel().catch(()=>{});throw error;}
  finally{clearTimeout(timer);reader.releaseLock();}
  if(timedOut || request.signal.aborted)throw new Error("mail_request_invalid");
  return Buffer.concat(chunks);
}
export async function handleMailWorker(request: Request) {
  const supportRef=randomUUID();
  try {
    const config=workerConfig(); const supplied=request.headers.get("authorization")??"";
    const digest=(value:string)=>createHash("sha256").update(value).digest();
    if (supplied.length>256 || !timingSafeEqual(digest(supplied),digest("Bearer "+config.workerSecret))) return response({ok:false},401);
    const status=await deliverOne(mailGateway(),config.keys,config.settings,(message,id)=>sendResend(message,id,config.apiKey));
    return response({ok:true,status});
  } catch {return response({ok:false,supportRef},503);}
}
export async function handleMailWebhook(request: Request) {
  const supportRef=randomUUID();
  let secret: string;
  try {secret=webhookConfig();} catch{return response({ok:false,supportRef},503);}
  let event: ReturnType<typeof parseMailEvent>;
  try {
    const body=await rawBody(request);
    const id=verifyWebhook(body,request.headers,secret);
    event=parseMailEvent(body,id);
  } catch {return response({ok:false,supportRef},400);}
  try {
    if(event)await mailGateway().recordEvent(event);
    return response({ok:true}); // only after durable acknowledgement; ignored signed events do nothing
  } catch{return response({ok:false,supportRef},503);}
}
