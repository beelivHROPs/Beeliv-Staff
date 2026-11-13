
// Loading skeleton for /jobs/[id] (Skel-Job-Desktop / Skel-Job-Mobile.dc.html):
// the same DOM as the real page, wrapped in `.skel` (styles in
// ../../public-site.css), with placeholder job + related-job data (never
// shown as real content).
export default async function Loading() {
  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-12" aria-busy="true" aria-label="Loading vacancy"><div className="h-12 animate-pulse rounded bg-current opacity-10"/><div className="h-64 animate-pulse rounded bg-current opacity-10"/></div>;
}
