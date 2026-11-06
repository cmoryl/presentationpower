import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { LibrarySubnav } from "@/components/LibrarySubnav";
import audit from "@/lib/audits/spectrum-module-sweep.json";

export const Route = createFileRoute("/library/audit")({
  head: () => ({ meta: [
    { title: "Spectrum module audit · TransPerfect Element" },
    { name: "description", content: "Per-module November 2026 guide checks, failures and review scope." },
    { property: "og:title", content: "Spectrum module audit · TransPerfect Element" },
    { property: "og:description", content: "Measured module results grouped by presentation family." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ModuleAudit,
});

function ModuleAudit() {
  const families = ["Openings", "Context", "Solution", "Proof", "Data", "Case studies", "Closings", "Custom canvas"];
  return <AppShell><main className="mx-auto max-w-7xl px-6 py-10">
    <LibrarySubnav active="/library/audit" />
    <h1 className="mt-8 text-3xl font-semibold">Spectrum module audit</h1>
    <p className="mt-3 text-muted-foreground">{audit.date} · {audit.rows.length} modules · {audit.rows.filter(r => r.status === "PASS").length} passed measured checks · {audit.rows.filter(r => r.status === "FAIL").length} failed</p>
    <p className="mt-4 max-w-4xl text-sm text-muted-foreground">{audit.scope}</p>
    {families.map(family => {
      const rows = audit.rows.filter(r => r.family === family);
      return <section key={family} className="my-10">
        <h2 className="mb-3 text-xl font-medium">{family} <span className="text-sm text-muted-foreground">{rows.filter(r => r.status === "PASS").length}/{rows.length} passed measured checks</span></h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="border-b border-border"><tr><th className="py-3 pr-4">Module</th><th className="pr-4">Result</th><th>Remaining findings</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id} className="border-b border-border">
            <td className="py-3 pr-4"><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.id}</div></td>
            <td className="pr-4 font-semibold">{r.status}</td><td>{r.failures.join("; ") || "No failure detected in the measured checks"}</td>
          </tr>)}</tbody>
        </table></div>
      </section>;
    })}
  </main></AppShell>;
}