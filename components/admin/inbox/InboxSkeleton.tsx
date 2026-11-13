/** Loading placeholders for the Inbox: list rows and a thread. Solid pulsing tiles (ap-shimmer). */
function Sk({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`ap-shimmer ${className}`} />;
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading cases" className="flex flex-col">
      <div className="flex flex-col gap-2.5 border-b border-(--ap-line) p-3">
        <Sk className="h-11 rounded-xl" />
        <Sk className="h-9 w-2/3 rounded-full" />
        <div className="grid grid-cols-2 gap-2">
          <Sk className="h-11 rounded-xl" />
          <Sk className="h-11 rounded-xl" />
        </div>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3 border-b border-(--ap-line-2) px-3.5 py-3.5">
          <Sk className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Sk className="h-4 w-2/5 rounded-md" />
            <Sk className="h-4 w-4/5 rounded-md" />
            <Sk className="h-3.5 w-3/5 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ThreadSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading case" className="flex h-full flex-col">
      <div className="space-y-2 border-b border-(--ap-line) p-4">
        <Sk className="h-6 w-3/5 rounded-md" />
        <Sk className="h-4 w-2/5 rounded-md" />
      </div>
      <div className="flex-1 space-y-3.5 p-5">
        <Sk className="h-24 w-[70%] rounded-2xl" />
        <Sk className="ml-auto h-16 w-[60%] rounded-2xl" />
        <Sk className="h-20 w-[65%] rounded-2xl" />
      </div>
      <div className="border-t border-(--ap-line) p-4">
        <Sk className="h-24 rounded-xl" />
      </div>
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading details" className="space-y-5 p-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Sk className="h-3.5 w-1/3 rounded-md" />
          <Sk className="h-5 w-4/5 rounded-md" />
        </div>
      ))}
    </div>
  );
}
