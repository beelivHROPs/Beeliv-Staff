import { readClientWorkspace } from "@/lib/server/client-workspace/context";
import { ClientAccountActions } from "./ClientAccountActions";
export async function ClientWorkspace() {
  const workspace=await readClientWorkspace().catch(()=>null);
  return <main className="mx-auto min-h-screen max-w-[960px] px-5 py-10">
    <header className="mb-10 flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold text-(--ap-violet)">Beeliv Client</p><h1 className="mt-2 text-3xl font-bold">{workspace?`Welcome, ${workspace.name}`:"Your client account"}</h1></div><ClientAccountActions /></header>
    {workspace?<>
      <section className="ap-card space-y-3 rounded-3xl p-6"><h2 className="text-xl font-bold">Your account is ready</h2><p>Your account setup is complete. Your assigned access is shown below. Contact Beeliv if an organisation or outlet needs to be corrected.</p></section>
      <section className="mt-6 rounded-3xl border border-(--ap-line-2) p-6" aria-labelledby="assigned-access"><h2 id="assigned-access" className="text-lg font-bold">Your organisations and outlets</h2>
        {workspace.scopes.length?<ul className="mt-4 divide-y divide-(--ap-line-2)">{workspace.scopes.map((scope,index)=><li className="py-3" key={index}><b className="block">{scope.clientName}</b><span className="text-sm text-(--ap-muted)">{scope.outletName??"All outlets in this organisation"}</span></li>)}</ul>:<p className="mt-3">No active organisation or outlet access is currently assigned. Contact Beeliv to check your access.</p>}
        {workspace.truncated?<p className="mt-3 text-sm">Showing the first 100 access assignments. Contact Beeliv for the complete list.</p>:null}
      </section>
    </>:<section role="alert" className="ap-card rounded-3xl p-6"><h2 className="text-lg font-bold">We couldn&apos;t load your account</h2><p className="mt-2">Reload this page to check your current account and assigned access.</p><a className="ap-btn ap-btn-s ap-btn-sm mt-4" href="/client">Reload account</a></section>}
    <a href="/contact" className="mt-6 inline-block text-sm font-semibold underline">Contact Beeliv</a>
  </main>;
}
