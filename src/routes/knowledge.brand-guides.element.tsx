import { createFileRoute, Link } from "@tanstack/react-router";
import { ElementLockup, ElementMark, ElementMonogram } from "@/components/brand/ElementLogo";
import logoSheet from "@/assets/element-logo-set.png.asset.json";

export const Route = createFileRoute("/knowledge/brand-guides/element")({
  head: () => ({
    meta: [
      { title: "Element identity · Brand guides · TransPerfect Element" },
      {
        name: "description",
        content:
          "The TransPerfect Element identity: five-brick E monogram, stacked and horizontal lockups, reversed and color variants, palette and clear-space rules.",
      },
      { property: "og:title", content: "Element identity · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Logo system, variants, palette and clear space for TransPerfect Element — the modular design system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ElementIdentityPage,
});

const PALETTE = [
  { hex: "#0D1117", label: "Element Ink" },
  { hex: "#2563EB", label: "Element Blue" },
  { hex: "#14B8A6", label: "Signal Teal" },
  { hex: "#FF6B57", label: "Signal Coral" },
  { hex: "#8B5CF6", label: "Signal Violet" },
  { hex: "#D1D5DB", label: "System Gray" },
];

const RULES = [
  "Clear space equals one brick height on all four sides — never crowd the mark.",
  "Use the mono mark by default; the color mark is reserved for brand moments and covers.",
  "Reversed (white) mark on Element Ink or any dark field at or above AA contrast.",
  "Never stretch, rotate, outline, add effects to, or re-map the brick colors.",
  "Below 24px use the monogram; drop the 'MODULAR DESIGN SYSTEM' descriptor below 120px lockup width.",
];

function Panel({
  label,
  children,
  dark = false,
}: {
  label: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        dark
          ? "border-white/10 bg-[#0D1117] text-white"
          : "border-black/10 bg-white dark:border-white/10 dark:bg-white/5"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-[0.3em] ${dark ? "text-white/50" : "text-black/45 dark:text-white/50"}`}
      >
        {label}
      </div>
      <div className="mt-6 flex min-h-24 items-center justify-center">{children}</div>
    </div>
  );
}

function ElementIdentityPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 lg:px-8">
      <Link
        to={"/knowledge/brand-guides" as never}
        className="text-xs text-black/55 hover:text-black dark:text-white/60 dark:hover:text-white"
      >
        ← Brand guides
      </Link>

      <header className="mt-4">
        <div className="text-[11px] uppercase tracking-[0.3em] text-black/45 dark:text-white/50">
          Product master brand
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight dark:text-white">
          TransPerfect Element
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/70 dark:text-white/70">
          Element is the modular design system behind every presentation, print, event and social
          artifact. The identity is literal: five bricks form an E, the gaps are the grid, and each
          brick is a module you can recolor, reorder or reuse.
        </p>
      </header>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <Panel label="1 · Primary lockup — light">
          <ElementLockup layout="stacked" markSize={54} className="text-[#0D1117]" />
        </Panel>
        <Panel label="1a · Primary lockup — color">
          <ElementLockup layout="stacked" tone="color" markSize={54} className="text-[#0D1117]" />
        </Panel>
        <Panel label="8 · Reversed — white on dark" dark>
          <ElementLockup layout="stacked" tone="reversed" markSize={54} />
        </Panel>
        <Panel label="3 · Horizontal lockup">
          <ElementLockup layout="horizontal" markSize={40} className="text-[#0D1117]" />
        </Panel>
        <Panel label="6 · Wordmark only">
          <ElementLockup layout="wordmark" className="text-[#0D1117]" />
        </Panel>
        <Panel label="4 / 5 · Icon + monogram">
          <div className="flex items-end gap-8 text-[#0D1117]">
            <ElementMark size={54} />
            <ElementMonogram size={40} />
            <ElementMark tone="color" size={30} />
          </div>
        </Panel>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold dark:text-white">Palette</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {PALETTE.map((c) => (
            <div key={c.hex} className="rounded-xl border border-black/10 dark:border-white/10">
              <div className="h-20 rounded-t-xl" style={{ background: c.hex }} />
              <div className="px-3 py-2">
                <div className="text-xs font-medium dark:text-white">{c.label}</div>
                <div className="text-[11px] tabular-nums text-black/50 dark:text-white/50">
                  {c.hex}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="text-lg font-semibold dark:text-white">Usage rules</h2>
          <ul className="mt-4 space-y-3">
            {RULES.map((r) => (
              <li
                key={r}
                className="flex gap-3 text-sm leading-relaxed text-black/75 dark:text-white/75"
              >
                <span className="mt-1.5 h-2 w-4 shrink-0 bg-[#2563EB]" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </div>
        <figure className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <img
            src={logoSheet.url}
            alt="TransPerfect Element logo system sheet: primary, stacked, horizontal, icon-only, monogram, wordmark, reversed and small-size variants with the color palette."
            loading="lazy"
            className="w-full rounded-lg"
          />
          <figcaption className="mt-3 text-[11px] text-black/50 dark:text-white/50">
            Source identity sheet — the reference for every variant above.
          </figcaption>
        </figure>
      </section>
    </div>
  );
}
