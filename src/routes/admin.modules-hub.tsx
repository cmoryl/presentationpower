import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { PRINT_MODULE_COUNT } from "@/lib/print-library/section-modules";

const TITLE = "Master modules · Admin · TransPerfect Element";
const DESC =
  "One place to see every module family in Element and how each is maintained, created, built, imported and exported.";

export const Route = createFileRoute("/admin/modules-hub")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModulesHub,
});

type Step = { label: string; to: string };
type Family = {
  name: string;
  what: string;
  countKey: "variants" | "custom" | "print" | null;
  maintain: Step[];
  create: Step[];
  build: Step[];
  importFrom: Step[];
  exportTo: Step[];
};

const FAMILIES: Family[] = [
  {
    name: "Slide modules",
    what: "The MV-* variants decks are built from, each permitted per section framework.",
    countKey: "variants",
    maintain: [{ label: "Module editor", to: "/admin/modules" }],
    create: [{ label: "Module Studio", to: "/admin/module-studio" }],
    build: [{ label: "Template Studio", to: "/looks" }],
    importFrom: [{ label: "Imported decks", to: "/library/imported" }],
    exportTo: [{ label: "Library (PPTX via deck export)", to: "/library" }],
  },
  {
    name: "Custom modules",
    what: "Team-made modules that go through review before anyone can use them.",
    countKey: "custom",
    maintain: [{ label: "My modules", to: "/library/my" }],
    create: [{ label: "Module Studio", to: "/admin/module-studio" }],
    build: [{ label: "Canvas Studio", to: "/admin/canvas" }],
    importFrom: [{ label: "Overrides", to: "/library/overrides" }],
    exportTo: [{ label: "Approvals (Modules tab)", to: "/approvals" }],
  },
  {
    name: "Print section modules",
    what: "The pm-* sections used by case studies, brochures, posters and print templates.",
    countKey: "print",
    maintain: [{ label: "Print modules", to: "/library/print/modules" }],
    create: [{ label: "Print library", to: "/admin/print-library" }],
    build: [{ label: "Print Studio", to: "/library/print" }],
    importFrom: [{ label: "PDF ingestion", to: "/admin/pdf-ingest" }],
    exportTo: [{ label: "Print audit", to: "/library/print/audit" }],
  },
  {
    name: "Social modules",
    what: "Layouts used in social and digital kits.",
    countKey: null,
    maintain: [{ label: "Social modules", to: "/social/modules" }],
    create: [{ label: "Module Studio", to: "/admin/module-studio" }],
    build: [{ label: "Convert to every size", to: "/convert" }],
    importFrom: [{ label: "Convert (upload live files)", to: "/convert" }],
    exportTo: [{ label: "Convert (Download all)", to: "/convert" }],
  },
];

function useCount(table: "module_variants" | "custom_modules") {
  return useQuery({
    queryKey: ["modules-hub-count", table],
    queryFn: async () => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) return null;
      return count ?? 0;
    },
  });
}

function StepLinks({ steps }: { steps: Step[] }) {
  return (
    <ul className="space-y-1">
      {steps.map((s) => (
        <li key={s.label}>
          <Link to={s.to as never} className="text-sm text-primary underline-offset-2 hover:underline">
            {s.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const COLS: { key: keyof Pick<Family, "maintain" | "create" | "build" | "importFrom" | "exportTo">; label: string }[] = [
  { key: "maintain", label: "Maintain" },
  { key: "create", label: "Create" },
  { key: "build", label: "Build with" },
  { key: "importFrom", label: "Import" },
  { key: "exportTo", label: "Export / release" },
];

function ModulesHub() {
  const variants = useCount("module_variants");
  const custom = useCount("custom_modules");
  const counts = {
    variants: variants.data,
    custom: custom.data,
    print: PRINT_MODULE_COUNT,
  } as const;

  return (
    <div>
      <AdminPageHeader eyebrow="Studios" title="Master modules" description={DESC} />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Slide variants", v: counts.variants },
          { label: "Custom modules", v: counts.custom },
          { label: "Print sections", v: counts.print },
        ].map((s) => (
          <div key={s.label} className="rounded-md border border-black/10 p-4 dark:border-white/10">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-3xl font-semibold">{s.v ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              <th className="py-3 pr-4 text-sm font-semibold">Module family</th>
              {COLS.map((c) => (
                <th key={c.key} className="py-3 pr-4 text-sm font-semibold">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FAMILIES.map((f) => (
              <tr key={f.name} className="border-b border-black/5 align-top dark:border-white/5">
                <td className="py-4 pr-4">
                  <div className="font-medium">
                    {f.name}
                    {f.countKey && counts[f.countKey] != null && (
                      <span className="ml-2 text-sm text-muted-foreground">{counts[f.countKey]}</span>
                    )}
                  </div>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">{f.what}</p>
                </td>
                {COLS.map((c) => (
                  <td key={c.key} className="py-4 pr-4">
                    <StepLinks steps={f[c.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10 max-w-3xl space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">How a module moves through Element</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Create or import it in a studio.</li>
          <li>Send it for review; decisions happen only on Approvals.</li>
          <li>Once approved it appears in the library for decks, print and kits.</li>
          <li>Exports run the normal QA checks before any file is written.</li>
        </ol>
      </section>
    </div>
  );
}
