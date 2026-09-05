export interface ActivityItem {
  title: string;
  description: string;
  date: string;
  tone: "primary" | "warning" | "success";
}

const DOT_TONE = {
  primary: "bg-primary",
  warning: "bg-warning",
  success: "bg-success",
} as const;

/**
 * Recent-activity feed, newest first. Staggered fade-up entrance on mount
 * (design-system.md §15 / implementation brief §15) via animation-delay —
 * runs once since these items exist in the DOM at first paint.
 */
export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item, i) => (
        <li
          key={`${item.title}-${item.date}`}
          className="animate-fade-up relative border-l-2 border-border py-0 pr-0 pb-4 pl-5 last:border-transparent last:pb-0"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <span
            className={`absolute top-1 -left-[7px] h-2.5 w-2.5 rounded-full border-2 border-card ${DOT_TONE[item.tone]}`}
          />
          <span className="font-mono text-[10.5px] text-muted-foreground">{item.date}</span>
          <div className="text-sm font-semibold text-foreground">{item.title}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
