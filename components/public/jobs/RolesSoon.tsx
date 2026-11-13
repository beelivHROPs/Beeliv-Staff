import Link from "next/link";

/** Honest empty state for /jobs while no real roles are published (sample data is off on this domain). */
export function RolesSoon() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-20 text-center">
      <h2 className="ps-serif [--fs-d:36] [--fs-m:28]">Roles will be published here soon</h2>
      <p className="ps-bd">We have no open roles to show right now. Please check back shortly.</p>
      <Link href="/" className="text-sm font-semibold underline">Back to the home page</Link>
    </section>
  );
}
