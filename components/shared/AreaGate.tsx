/**
 * Shown instead of an app's mock screens on a live domain whose backend for that area is not open yet.
 * The decision is made on the SERVER in each area's `(business)` layout, which returns this INSTEAD of rendering
 * {children}, so a closed area's mock pages are never rendered or sent. Sign-in, invitation, reset and setup routes
 * live outside `(business)` and are never gated. Presentation only; not access control.
 */
export function AreaNotOpen({ siteUrl }: { siteUrl: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">This area is not open yet</h1>
      <p className="text-base opacity-80">
        We are still getting this part of Beeliv ready. Please check back soon, or visit our main website in the meantime.
      </p>
      <a href={siteUrl} className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white">
        Go to the Beeliv website
      </a>
    </main>
  );
}
