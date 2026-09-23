import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { LONDON_DIVISION_ACCENTS } from "@/lib/next-london-division";
import { DIVISION_SIGN_TEMPLATES } from "@/lib/next-division-signage";

export const Route = createFileRoute("/events/next_/divisions/")({
  head: () => {
    const title = "Division signage templates · TransPerfect NEXT";
    const description =
      "Starter signage for every NEXT division — doors, scenic panels, table-tops, booths and step-and-repeat — built from the London 2026 kit.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: DivisionsIndex,
});

function DivisionsIndex() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-5 py-10">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">NEXT · Divisions</p>
        <h1 className="mt-2 text-3xl font-semibold">Division signage templates</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Every division gets the same {DIVISION_SIGN_TEMPLATES.length} starter signs, taken from the London
          2026 kit at their issued sizes: white division lockup, the division accent as a light tint.
          A new NEXT city starts from these.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(LONDON_DIVISION_ACCENTS).map(([id, a]) => (
            <Link
              key={id}
              to="/events/next/divisions/$divisionId"
              params={{ divisionId: id }}
              className="rounded-xl border border-border bg-card p-4 hover:border-primary"
            >
              <span className="block h-1.5 w-10 rounded-full" style={{ background: a.hex }} />
              <span className="mt-3 block font-semibold">{a.label}</span>
              <span className="text-xs text-muted-foreground">Open sign set</span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
