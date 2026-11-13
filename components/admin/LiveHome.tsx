import Link from "next/link";

/**
 * Live-deployment Home (server component). The designed Home dashboards still read sample numbers, so on the
 * live site they are replaced by this short "start here" page that only points at screens with real data.
 * Local previews keep the designed dashboards. Uses the app's existing card and button classes.
 */
type Item = { href: string; title: string; text: string };

const HR: Item[] = [
  { href: "/admin/staff/directory", title: "Staff", text: "Everyone placed at an outlet, with their client and role." },
  { href: "/admin/staff/assignments", title: "Placements", text: "Place staff at an outlet or move them." },
  { href: "/admin/staff/documents", title: "Staff documents", text: "Review documents staff have uploaded." },
  { href: "/admin/clients", title: "Clients", text: "Client businesses and their outlets." },
  { href: "/admin/team-access", title: "Team and access", text: "Invite people and manage who can sign in." },
];

const OPS: Item[] = [
  { href: "/admin/ops/clients", title: "Clients", text: "Client businesses and their outlets." },
  { href: "/admin/ops/staff", title: "Staff", text: "Every staff member and where they are placed." },
  { href: "/admin/ops/assignments", title: "Placements", text: "Place staff at an outlet or move them." },
  { href: "/admin/staff/documents", title: "Staff documents", text: "Review documents staff have uploaded." },
  { href: "/admin/team-access", title: "Team and access", text: "Invite people and manage who can sign in." },
];

export function LiveHome({ variant }: { variant: "hr" | "ops" }) {
  const items = variant === "ops" ? OPS : HR;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--ap-ink)", fontFamily: "var(--font-newsreader), serif" }}>
          Home
        </h1>
        <p className="mt-1 text-[15px]" style={{ color: "var(--ap-muted)" }}>
          Start with one of these. Your summary numbers will appear here once they are connected.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="ap-card flex min-h-11 flex-col gap-1 p-4 transition-colors">
              <span className="text-[16px] font-semibold" style={{ color: "var(--ap-ink)" }}>{i.title}</span>
              <span className="text-[14px]" style={{ color: "var(--ap-muted)" }}>{i.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
