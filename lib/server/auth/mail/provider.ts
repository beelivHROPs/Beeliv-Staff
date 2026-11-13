import "server-only";
import { uuid, type Message, type SendOutcome } from "./model";
export async function sendResend(message: Message, messageId: string, apiKey: string, transport: typeof fetch = fetch): Promise<SendOutcome> {
  if (!uuid.test(messageId) || !apiKey.startsWith("re_") || /[\r\n]/.test(apiKey)) throw new Error("mail_configuration_invalid");
  try {
    const response = await transport("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json","Idempotency-Key":"beeliv-invite/"+messageId},body:JSON.stringify({...message,to:[message.to]}),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000)});
    if (response.status === 429) {
      const raw = response.headers.get("Retry-After"); const seconds = raw && /^\d+$/.test(raw) ? Number(raw) : 60;
      return {status:"retry",delaySeconds:Math.min(3600,Math.max(30,seconds))};
    }
    if (response.status >= 500 || response.status === 408 || response.status === 409) return {status:"unknown",code:"provider_uncertain"};
    if (!response.ok) return {status:"failed",code:"provider_rejected"};
    const data: unknown = await response.json();
    const id = data && typeof data === "object" && "id" in data ? data.id : null;
    return typeof id === "string" && uuid.test(id) ? {status:"sent",providerId:id} : {status:"unknown",code:"provider_uncertain"};
  } catch { return {status:"unknown",code:"provider_uncertain"}; }
}

/** Read-only lookup of a server-stored ID. No send/retry or raw message content escapes. */
export async function retrieveResendStatus(providerId:string,apiKey:string,transport:typeof fetch=fetch):Promise<import("./model").EventType|null>{
 if(!uuid.test(providerId)||!apiKey.startsWith("re_")||/[\r\n]/.test(apiKey))return null;
 try{
  const response=await transport("https://api.resend.com/emails/"+providerId,{method:"GET",headers:{Authorization:"Bearer "+apiKey},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!response.ok)return null;
  const data:unknown=await response.json();if(!data||typeof data!=="object"||!("id" in data)||data.id!==providerId||!("last_event" in data)||typeof data.last_event!=="string")return null;
  const names:Record<string,import("./model").EventType>={sent:"sent",delivered:"delivered",delivery_delayed:"delayed",failed:"failed",bounced:"bounced",complained:"complained",suppressed:"suppressed"};
  return Object.hasOwn(names,data.last_event)?names[data.last_event]:null;
 }catch{return null;}
}
