import Link from "next/link";
import { notFound } from "next/navigation";
import { SKELETONS } from "@/components/design-preview/skeletons/registry";

// DEV ONLY index of every skeleton: skeleton preview link + the real route it stands in for.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main style={{ padding: 24, font: "14px system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Loading skeletons</h1>
      {Object.entries(SKELETONS).map(([app, items]) => (
        <section key={app} style={{ marginTop: 18 }}>
          <h2 style={{ fontWeight: 700, textTransform: "capitalize" }}>{app}</h2>
          <ul>
            {Object.entries(items).map(([key, e]) => (
              <li key={key}>
                <Link href={`/design-preview/skeletons/${app}/${key}`}>{key}</Link> - stands in for{" "}
                {e.route ? <Link href={e.route}>{e.route}</Link> : <em>(state inside a page)</em>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
