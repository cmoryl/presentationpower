import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { byId } from "@/lib/taxonomy";
import {
  ICON_SIZES,
  ICON_PLACEMENTS_META,
  ICON_TREATMENTS_META,
  ICON_EMPHASIS_META,
  resolveEmphasisColors,
  iconographyForVariant,
  type IconTreatment,
  type IconEmphasis,
  type IconSizeToken,
} from "@/lib/iconography";
import { Sparkles, Target, Workflow, Layers3, Users, Rocket } from "lucide-react";
import {
  LOGO_POSITIONS_META,
  LOGO_POSITION_BY_LAYOUT,
  resolveLogoPlacement,
} from "@/lib/logo-placement";

export const Route = createFileRoute("/atlas")({
  head: () => ({
    meta: [
      { title: "Atlas · TransPerfect Modular" },
      { name: "description", content: "Browse the section frameworks, module families, variants, and layout frameworks." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: Atlas,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Atlas failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

function Atlas() {
  const {
    layoutFrameworks: LAYOUT_FRAMEWORKS,
    moduleFamilies: MODULE_FAMILIES,
    moduleVariants: MODULE_VARIANTS,
    sectionFrameworks: SECTION_FRAMEWORKS,
    narrativeArchetypes: NARRATIVE_ARCHETYPES,
  } = useTaxonomy();

  return (
    <AppShell>
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">The Atlas</div>
        <h1 className="mt-3 text-4xl font-semibold">Section frameworks, module families, variants, and layouts.</h1>
        <p className="mt-3 max-w-2xl text-black/60">
          Every deck is assembled from these pieces. Section frameworks decide where you are in the story; module
          families decide what job the slide does; variants decide the shape; layouts decide the geometry.
        </p>
        <p className="mt-2 text-xs text-black/40">Loaded live from the Cloud taxonomy tables.</p>
      </div>

      <Section title="Narrative archetypes" count={NARRATIVE_ARCHETYPES.length}>
        <div className="grid grid-cols-2 gap-4">
          {NARRATIVE_ARCHETYPES.map((a) => (
            <div key={a.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-medium">{a.name}</div>
              <div className="mt-1 text-sm text-black/60">{a.description}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.sectionRecipe.map((sfId) => (
                  <span key={sfId} className="rounded-full bg-black/5 px-2 py-0.5 font-mono text-xs">{sfId}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Section frameworks" count={SECTION_FRAMEWORKS.length}>
        <div className="grid grid-cols-3 gap-4">
          {SECTION_FRAMEWORKS.map((sf) => (
            <div key={sf.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-mono text-xs text-black/50">{sf.id}</div>
              <div className="mt-1 font-medium">{sf.name}</div>
              <div className="mt-1 text-sm text-black/60">{sf.purpose}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sf.permittedFamilyIds.map((f) => (
                  <span key={f} className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 font-mono text-xs text-[#0B2A4A]">
                    {f} {byId(MODULE_FAMILIES, f)?.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Module families" count={MODULE_FAMILIES.length}>
        <div className="grid grid-cols-2 gap-4">
          {MODULE_FAMILIES.map((mf) => {
            const variants = MODULE_VARIANTS.filter((mv) => mv.familyId === mf.id);
            return (
              <div key={mf.id} className="rounded-2xl border border-black/10 bg-white p-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="font-mono text-xs text-black/50">{mf.id}</div>
                    <div className="mt-1 font-medium">{mf.name}</div>
                  </div>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">Review: {mf.reviewLevel}</span>
                </div>
                <div className="mt-2 text-sm text-black/60">{mf.description}</div>
                <div className="mt-4 border-t border-black/10 pt-3">
                  <div className="text-xs uppercase tracking-widest text-black/50">Variants</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {variants.map((v) => {
                      const ico = iconographyForVariant(v);
                      return (
                        <li key={v.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{v.name}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span
                              className="rounded-full px-2 py-0.5 font-mono text-[10px]"
                              style={{
                                backgroundColor: ico.placement === "none" ? "rgba(0,0,0,0.04)" : "rgba(232,93,44,0.12)",
                                color: ico.placement === "none" ? "rgba(0,0,0,0.4)" : "#B84512",
                              }}
                              title={`${ico.placement} · ${ico.size} · ${ico.treatment} · ${ico.emphasis} — ${ico.rationale}`}
                            >
                              {ico.placement === "none" ? "no-icon" : `${ico.placement}·${ico.size}`}
                            </span>
                            <span className="font-mono text-xs text-black/50">{v.id}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Layout frameworks" count={LAYOUT_FRAMEWORKS.length}>
        <div className="grid grid-cols-4 gap-4">
          {LAYOUT_FRAMEWORKS.map((lf) => (
            <div key={lf.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-mono text-xs text-black/50">{lf.id}</div>
              <div className="mt-1 font-medium">{lf.name}</div>
              <div className="mt-1 text-sm text-black/60">{lf.description}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {lf.zones.map((z) => (
                  <span key={z} className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{z}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <IconographySection />

      <LogoPlacementSection />

      <div className="mt-14 rounded-2xl border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
        Want to see the pieces in action?{" "}
        <Link to="/brief/new" className="font-medium text-[#0B2A4A] underline">Start a brief</Link>{" "}
        and the assembler will pick from this atlas.
      </div>
    </AppShell>
  );
}

// Shared brand for the swatches — matches the TransPerfect default.
const DEMO_BRAND = {
  tokens: { primary: "#0B2A4A", accent: "#E85D2C" },
} as const;

function IconTile({
  treatment,
  emphasis,
  size,
}: {
  treatment: IconTreatment;
  emphasis: IconEmphasis;
  size: IconSizeToken;
}) {
  const dims = ICON_SIZES[size];
  const c = resolveEmphasisColors(DEMO_BRAND as never, treatment, emphasis);
  const isCircle = treatment === "soft-circle";
  return (
    <div
      className={`flex items-center justify-center ${isCircle ? "rounded-full" : ""}`}
      style={{
        width: dims.containerPx,
        height: dims.containerPx,
        backgroundColor: c.bg,
        color: c.fg,
        border: c.border ? `1px solid ${c.border}` : undefined,
        borderRadius: isCircle ? undefined : dims.radiusPx,
      }}
      aria-hidden
    >
      <Sparkles size={dims.glyphPx} strokeWidth={dims.strokeWidth} />
    </div>
  );
}

function IconographySection() {
  const sizeOrder: IconSizeToken[] = ["xs", "sm", "md", "lg", "xl", "display"];
  const placementDemos: Record<string, React.ReactNode> = {
    leading: (
      <div className="flex items-center gap-3">
        <IconTile treatment="soft-tile" emphasis="accent" size="md" />
        <div className="text-sm">Intake · brief captured</div>
      </div>
    ),
    above: (
      <div className="flex flex-col items-start gap-2">
        <IconTile treatment="soft-tile" emphasis="accent" size="lg" />
        <div className="text-sm font-medium">Global reach</div>
      </div>
    ),
    corner: (
      <div className="relative w-full rounded-xl border border-black/10 p-4 pr-12">
        <div className="text-sm font-medium">Risk card</div>
        <div className="mt-1 text-xs text-black/50">Mitigation owner assigned</div>
        <div className="absolute right-3 top-3">
          <IconTile treatment="outline-tile" emphasis="muted" size="sm" />
        </div>
      </div>
    ),
    inline: (
      <div className="text-sm leading-relaxed">
        Cycle time drops <Sparkles size={14} className="inline align-[-2px]" aria-hidden /> by 43% across the pilot.
      </div>
    ),
    bullet: (
      <ul className="space-y-1.5 text-sm">
        {["Intake SLA", "Reviewer coverage", "Publish routing"].map((t) => (
          <li key={t} className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: "#E85D2C" }} aria-hidden />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    ),
    "numbered-badge": (
      <div className="flex items-center gap-3">
        <div
          className="grid place-items-center rounded-full font-mono text-sm font-semibold"
          style={{ width: 56, height: 56, backgroundColor: "#0B2A4A", color: "#fff" }}
          aria-hidden
        >
          01
        </div>
        <div className="text-sm">Kickoff · week 1</div>
      </div>
    ),
    watermark: (
      <div className="relative h-24 overflow-hidden rounded-xl bg-black/[0.03]">
        <Sparkles
          size={140}
          strokeWidth={1}
          className="absolute -right-6 -top-6 text-black/10"
          aria-hidden
        />
        <div className="relative p-4 text-sm font-medium">Section opener</div>
      </div>
    ),
    "standalone-hero": (
      <div className="flex justify-center py-2">
        <IconTile treatment="soft-circle" emphasis="primary" size="display" />
      </div>
    ),
    none: (
      <div className="text-sm italic text-black/50">Pure typography — no icon.</div>
    ),
  };

  return (
    <Section title="Iconography" count={ICON_PLACEMENTS_META.length}>
      <p className="-mt-2 mb-6 max-w-3xl text-sm text-black/60">
        Every module declares an <span className="font-mono text-xs">iconography</span> contract: placement, size,
        treatment, emphasis, and accessibility role. Sizes ride an 8pt grid; decorative icons are hidden from screen
        readers, semantic ones announce their label.
      </p>

      <div className="mb-8">
        <div className="mb-3 text-xs uppercase tracking-widest text-black/50">Sizes (glyph / container / gap)</div>
        <div className="flex flex-wrap items-end gap-6 rounded-2xl border border-black/10 bg-white p-6">
          {sizeOrder.map((s) => {
            const d = ICON_SIZES[s];
            return (
              <div key={s} className="flex flex-col items-center gap-2 text-center">
                <IconTile treatment="soft-tile" emphasis="accent" size={s} />
                <div className="font-mono text-xs">{s}</div>
                <div className="font-mono text-[10px] text-black/50">
                  {d.glyphPx}/{d.containerPx}/{d.gapPx}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 text-xs uppercase tracking-widest text-black/50">Treatments</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {ICON_TREATMENTS_META.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-4">
              <div
                className={t.id === "on-dark" ? "rounded-lg bg-[#0B2A4A] p-2" : ""}
              >
                <IconTile treatment={t.id} emphasis="accent" size="md" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="truncate text-xs text-black/50">{t.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 text-xs uppercase tracking-widest text-black/50">Emphasis (color role)</div>
        <div className="flex flex-wrap gap-3 rounded-2xl border border-black/10 bg-white p-6">
          {ICON_EMPHASIS_META.map((e) => (
            <div key={e.id} className="flex flex-col items-center gap-2">
              <IconTile treatment="filled-tile" emphasis={e.id} size="md" />
              <div className="font-mono text-xs">{e.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 text-xs uppercase tracking-widest text-black/50">Placements</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ICON_PLACEMENTS_META.map((p) => (
            <div key={p.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="flex items-baseline justify-between">
                <div className="font-medium">{p.name}</div>
                <span className="font-mono text-xs text-black/50">{p.id}</span>
              </div>
              <div className="mt-1 text-sm text-black/60">{p.description}</div>
              <div className="mt-1 text-xs text-black/40">Typical in: {p.typicalIn}</div>
              <div className="mt-4 rounded-xl bg-black/[0.02] p-4">{placementDemos[p.id]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/70">
        <div className="mb-1 font-medium">Accessibility rules</div>
        <ul className="list-disc pl-5 text-sm text-black/60">
          <li>Decorative icons render with <span className="font-mono text-xs">aria-hidden</span> and never announce.</li>
          <li>Semantic icons (standalone hero, meaningful glyphs) use <span className="font-mono text-xs">role="img"</span> with an explicit label.</li>
          <li>Interactive icon targets are at least 44×44 CSS px; sizes <span className="font-mono text-xs">sm</span> and up already satisfy this.</li>
          <li>Filled treatments enforce inverse foreground for AA contrast; muted emphasis is reserved for non-critical metadata.</li>
        </ul>
      </div>
    </Section>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <span className="text-sm text-black/50">{count}</span>
      </div>
      {children}
    </section>
  );
}

function LogoZoneDiagram({ position }: { position: import("@/lib/logo-placement").LogoPosition }) {
  const zone: Record<string, string> = {
    "top-left":      "items-start justify-start",
    "top-center":    "items-start justify-center",
    "top-right":     "items-start justify-end",
    "bottom-left":   "items-end justify-start",
    "bottom-center": "items-end justify-center",
    "bottom-right":  "items-end justify-end",
    "hidden":        "items-center justify-center",
  };
  const isHidden = position === "hidden";
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-black/10 bg-white">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E85D2C]" aria-hidden />
      <div className={`flex h-full w-full p-3 ${zone[position]}`}>
        {isHidden ? (
          <span className="text-[10px] uppercase tracking-widest text-black/30">hidden</span>
        ) : (
          <div className="flex items-center gap-1.5 rounded border border-[#0B2A4A] px-1.5 py-1">
            <span className="grid h-4 w-4 place-items-center rounded-sm border border-[#0B2A4A] text-[7px] font-semibold text-[#0B2A4A]">TP</span>
            <span className="text-[8px] font-semibold tracking-wider text-[#0B2A4A]">TRANSPERFECT</span>
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-2 rounded border border-dashed border-black/10" aria-hidden />
    </div>
  );
}

function LogoPlacementSection() {
  const chromeDefaults = [
    { chrome: "cover" as const,   label: "Cover chrome" },
    { chrome: "content" as const, label: "Content chrome (default)" },
    { chrome: "divider" as const, label: "Divider chrome" },
    { chrome: "close" as const,   label: "Close chrome" },
  ];

  return (
    <Section title="Logo placement" count={LOGO_POSITIONS_META.length}>
      <p className="-mt-2 mb-6 max-w-3xl text-sm text-black/60">
        Every slide places the brand lockup in one of seven approved zones. The zone is derived from the chrome
        variant, with per-layout overrides for full-bleed, poster, and editorial moments. Variants may override in
        rare cases via <span className="font-mono text-xs">logoPosition</span>.
      </p>

      <div className="mb-8">
        <div className="mb-3 text-xs uppercase tracking-widest text-black/50">Approved zones</div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {LOGO_POSITIONS_META.map((p) => (
            <div key={p.id} className="rounded-2xl border border-black/10 bg-white p-4">
              <LogoZoneDiagram position={p.id} />
              <div className="mt-3 flex items-baseline justify-between">
                <div className="font-medium">{p.name}</div>
                <span className="font-mono text-[10px] text-black/50">{p.id}</span>
              </div>
              <div className="mt-1 text-xs text-black/50">{p.typicalIn}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 text-xs uppercase tracking-widest text-black/50">Chrome-variant defaults</div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {chromeDefaults.map((c) => {
            const spec = resolveLogoPlacement(c.chrome);
            return (
              <div key={c.chrome} className="rounded-2xl border border-black/10 bg-white p-4">
                <LogoZoneDiagram position={spec.position} />
                <div className="mt-3 text-sm font-medium">{c.label}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-black/50">
                  <span>{spec.position}</span>
                  <span className="font-mono text-[10px]">{c.chrome}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 text-xs uppercase tracking-widest text-black/50">Layout-framework overrides</div>
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <ul className="grid gap-2 md:grid-cols-2">
            {Object.entries(LOGO_POSITION_BY_LAYOUT).map(([lfId, pos]) => (
              <li key={lfId} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-mono text-xs text-black/50">{lfId}</span>{" "}
                  <span className="text-black/70">→ {pos}</span>
                </span>
                <span className="rounded-full bg-black/5 px-2 py-0.5 font-mono text-[10px]">
                  {resolveLogoPlacement("content", lfId).rationale}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
