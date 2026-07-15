import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MODULE_FAMILIES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library · TransPerfect Modular" },
      { name: "description", content: "Approved module variants ready to drop into a deck." },
    ],
  }),
  component: Library,
});

function Library() {
  return (
    <AppShell>
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Library</div>
        <h1 className="mt-3 text-4xl font-semibold">Approved module variants.</h1>
        <p className="mt-3 max-w-2xl text-black/60">
          Cloud-backed governance (approval status, expiration, industry / division / stage tags) lands in phase 3. For
          now these are the seed variants the assembler pulls from.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-4">
        {MODULE_VARIANTS.map((v) => {
          const mf = byId(MODULE_FAMILIES, v.familyId);
          return (
            <div key={v.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-xs text-black/50">{v.id}</div>
                <span className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 font-mono text-[10px] text-[#0B2A4A]">
                  {v.familyId}
                </span>
              </div>
              <div className="mt-2 font-medium">{v.name}</div>
              <div className="mt-1 text-sm text-black/60">{v.description}</div>
              <div className="mt-4 text-xs text-black/50">
                <div>Family: {mf?.name}</div>
                <div>Layouts: {v.permittedLayoutIds.join(", ")}</div>
                {v.capacity.items && (
                  <div>
                    Items: {v.capacity.items.min}–{v.capacity.items.max}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10">
        <Link to="/brief/new" className="rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm text-white">
          Start a brief →
        </Link>
      </div>
    </AppShell>
  );
}
