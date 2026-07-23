import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { SpotlightLayout } from "@/components/print/SpotlightLayout";
import { emptySpotlight, type SpotlightContent } from "@/lib/print-assets.types";
import { exportPrintAssetAsPdf } from "@/lib/print-asset-export";
import { FileDown } from "lucide-react";

// TEMPORARY preview route for Phase 1 spotlight approval.
// Renders a Letter-portrait spotlight in LIGHT + DARK side-by-side, seeded
// with real division-flavored copy so we can screenshot and gate the
// content model + free-form portrait design before wiring the wizard,
// synthesizer, and editor. Delete once approved and integrated into
// `/asset/$assetId`.
export const Route = createFileRoute("/asset/spotlight-preview")({
  head: () => ({
    meta: [
      { title: "Spotlight preview · print" },
      { name: "description", content: "Phase-1 spotlight layout preview." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: SpotlightPreview,
});

const SEEDED_CONTENT: SpotlightContent = emptySpotlight({
  eyebrow: "Product spotlight",
  productName: "GlobalLink NEXT",
  tagline: "AI-native translation orchestration built for regulated enterprise pipelines.",
  summary:
    "One platform for continuous localization across web, product, and clinical content — with human review, model routing, and full auditability wired in from day one.",
  capabilities: [
    {
      heading: "Adaptive model routing",
      body: "Route each string to the model / linguist blend that fits its risk and reuse profile — automatically.",
    },
    {
      heading: "In-context QA",
      body: "Live visual QA against staging renders catches truncation, layout, and terminology drift pre-merge.",
    },
    {
      heading: "Regulated workflows",
      body: "Signed audit trails, role-scoped review, and validated environments for life-sciences and financial workloads.",
    },
    {
      heading: "Continuous connectors",
      body: "Native hooks into Contentful, Adobe, GitHub, Figma, and 40+ CMS / DAM systems — no batch uploads.",
    },
  ],
  stats: [
    { label: "Languages supported", value: "170", unit: "+" },
    { label: "Faster time-to-market", value: "62", unit: "%" },
    { label: "Enterprise deployments", value: "300", unit: "+" },
  ],
  quote: {
    text: "It stopped feeling like localization and started feeling like release engineering.",
    author: "Head of Global Content",
    role: "Fortune 100 medtech",
  },
  expert: {
    name: "Jordan Reyes",
    role: "Solutions architect · GlobalLink",
    email: "jreyes@transperfect.com",
  },
  cta: { label: "Book a walkthrough", url: "https://transperfect.com" },
});

function SpotlightPreview() {
  const { brandModes } = useTaxonomy();
  const brandParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("brand")
      : null;
  const brand = useMemo(() => {
    if (brandParam) {
      const hit = brandModes.find((b) => b.id === brandParam || b.id === `bm-${brandParam}`);
      if (hit) return hit;
    }
    return (
      brandModes.find((b) => b.id === "bm-tp-lifesci") ??
      brandModes[0]
    );
  }, [brandModes, brandParam]);
  const lightRef = useRef<HTMLDivElement | null>(null);
  const darkRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<null | "light" | "dark">(null);

  const exportPdf = async (mode: "light" | "dark") => {
    const node = (mode === "light" ? lightRef : darkRef).current;
    if (!node) return;
    setBusy(mode);
    try {
      await exportPrintAssetAsPdf(node, {
        pageSize: "Letter",
        bleedIn: 0.125,
        cropMarks: true,
        mode,
        quality: "300dpi",
        filename: `spotlight-globallink-${mode}.pdf`,
      });
    } finally {
      setBusy(null);
    }
  };

  if (!brand) {
    return (
      <AppShell>
        <div className="p-10">Loading brand modes…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-black/50 dark:text-white/50">
              Phase 1 · spotlight preview
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#03002C] dark:text-white">
              Spotlight · GlobalLink NEXT · Letter portrait
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-black/60 dark:text-white/60">
              Rendered on the portrait-projected aurora with free-form typography and
              hairline dividers only — no cards, panels, or tiles.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportPdf("light")}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white"
            >
              <FileDown size={12} />
              {busy === "light" ? "Rendering…" : "Export Light PDF · 300 DPI"}
            </button>
            <button
              type="button"
              onClick={() => exportPdf("dark")}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#03002C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#03002C]/85 disabled:opacity-50"
            >
              <FileDown size={12} />
              {busy === "dark" ? "Rendering…" : "Export Dark PDF · 300 DPI"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-black/50 dark:text-white/50">
              Light
            </div>
            <div
              ref={lightRef}
              className="overflow-hidden rounded-2xl border border-black/10 shadow-xl dark:border-white/10"
            >
              <SpotlightLayout
                content={SEEDED_CONTENT}
                brand={brand}
                mode="light"
                pageSize="Letter"
                density="standard"
              />
            </div>
          </div>
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-black/50 dark:text-white/50">
              Dark
            </div>
            <div
              ref={darkRef}
              className="overflow-hidden rounded-2xl border border-white/10 shadow-xl"
            >
              <SpotlightLayout
                content={SEEDED_CONTENT}
                brand={brand}
                mode="dark"
                pageSize="Letter"
                density="standard"
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
