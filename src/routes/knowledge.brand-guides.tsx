import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { BRAND_GUIDES } from "@/lib/brand-guides";
import { BRAND_MODES } from "@/lib/taxonomy";

export const Route = createFileRoute("/knowledge/brand-guides")({
  head: () => ({
    meta: [
      { title: "Brand Guides · Knowledge · TransPerfect" },
      { name: "description", content: "Digital brand guides for TransPerfect and its divisions." },
    ],
  }),
  component: BrandGuidesIndex,
});

function BrandGuidesIndex() {
  return (
    <AppShell>
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50">Knowledge · Brand Guides</div>
          <h1 className="mt-3 text-4xl font-semibold">Brand guides library</h1>
          <p className="mt-3 max-w-2xl text-black/60">
            The master TransPerfect brand system, plus division-specific sub-brand guides as they come online.
          </p>
        </div>
        <Link
          to="/knowledge"
          className="rounded-full border border-black/15 px-4 py-2 text-sm text-black/70 hover:border-black/40"
        >
          ← All knowledge
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        {BRAND_GUIDES.map((g) => {
          const division = BRAND_MODES.find((b) => b.id === g.divisionId);
          const swatch = g.primaryColors[0]?.hex ?? "#03002C";
          return (
            <Link
              key={g.slug}
              to={"/knowledge/brand-guides/$slug" as never}
              params={{ slug: g.slug } as never}
              className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 transition hover:border-black/30"
            >
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: swatch }} />
              <div className="text-[11px] uppercase tracking-[0.25em]" style={{ color: swatch }}>
                {g.divisionId === "master" ? "Master brand" : division?.name ?? "Division"}
              </div>
              <div className="mt-3 text-2xl font-semibold">{g.title}</div>
              <div className="text-sm text-black/60">{g.subtitle} · v{g.version}</div>
              {g.tagline && <div className="mt-4 italic text-black/70">"{g.tagline}"</div>}
              <div className="mt-5 flex items-center gap-2">
                {g.primaryColors.slice(0, 2).concat(g.secondaryColors.slice(0, 2)).map((c) => (
                  <span
                    key={c.hex}
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ background: c.hex }}
                    title={`${c.name} ${c.hex}`}
                  />
                ))}
              </div>
              <div className="mt-6 text-xs text-black/40 group-hover:text-black/70">Open guide →</div>
            </Link>
          );
        })}

        <div className="rounded-2xl border border-dashed border-black/20 bg-black/[0.02] p-6 text-sm text-black/50">
          <div className="text-[11px] uppercase tracking-[0.25em]">Coming soon</div>
          <div className="mt-3 text-lg font-medium text-black/70">Division sub-brand guides</div>
          <p className="mt-2">
            GlobalLink, Legal, Life Sciences, Media, Gaming, Digital and regional divisions each get their own
            digital guide extending the master system. Add a new entry in <code>src/lib/brand-guides.ts</code> to
            publish one.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
