// Root loading fallback. Intentionally a neutral, blank warm-white frame with
// no shapes or animation: no wireframe Skel board exists for this level, so no
// skeleton design is invented here. Each route owns its own loading.tsx built
// from its own Skel board. Self-contained styling (outside the (public) layout).
export default function Loading() {
  return (
    <>
      {/* Follows the saved dark mode (Client and Staff) so a refresh never flashes a white frame. */}
      <style>{`.root-loading{min-height:100vh;width:100%;background-color:#FAF9F7}html[data-client-theme="dark"] .root-loading{background-color:#141013}html[data-staff-theme="dark"] .root-loading{background-color:#13101d}`}</style>
      <div role="status" aria-label="Loading" className="root-loading" />
    </>
  );
}
