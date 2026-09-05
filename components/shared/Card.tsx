export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 ${className}`}
    >
      {title ? (
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h3>
      ) : null}
      {children}
    </div>
  );
}
