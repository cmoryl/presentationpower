import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { BrandMode } from "@/lib/taxonomy";
import { AppShell } from "@/components/AppShell";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { byId } from "@/lib/taxonomy";
import { applyDeckOverrides, useModuleOverrides } from "@/lib/module-overrides";
import { Sparkles } from "lucide-react";
import {
  ICON_SIZES,
  ICON_PLACEMENTS_META,
  ICON_TREATMENTS_META,
  ICON_EMPHASIS_META,
  resolveEmphasisColors,
  iconographyForVariant,
  familyIcon,
  type IconTreatment,
  type IconEmphasis,
  type IconSizeToken,
} from "@/lib/iconography";
import {
  LOGO_POSITIONS_META,
  LOGO_POSITION_BY_LAYOUT,
  resolveLogoPlacement,
} from "@/lib/logo-placement";
import { BrandLockup } from "@/components/BrandLockup";

import { DESIGN_SKINS, INDUSTRY_RECIPES } from "@/lib/design-skins";
import {
  PRINT_SECTION_MODULES,
  PRINT_MODULE_FAMILY_ORDER,
  printModuleFamilyMeta,
} from "@/lib/print-library/section-modules";
import { PRINT_PAGE_PRESETS_FULL, PRINT_PAGE_SIZE_ORDER } from "@/lib/print-page-presets";
import { SOCIAL_FORMATS, KIT_PROFILES } from "@/lib/social-formats";
import { SOCIAL_STYLES } from "@/lib/social-styles";
import { SOCIAL_PLAYBOOKS } from "@/lib/social-playbooks";
import { EVENT_PLAYBOOKS } from "@/lib/event-playbooks";

export const Route = createFileRoute("/atlas")({
  head: () => ({
    meta: [
      { title: "Atlas · TransPerfect Element" },
      {
        name: "description",
        content:
          "The Element reference: presentation modules, print sections, social formats, event playbooks, and the approved style library.",
      },
      { property: "og:title", content: "Atlas · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Every building block in Element — segmented by Presentation, Print, Social, Events, plus the S01–S28 style library.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: Atlas,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Atlas failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

// Brand palette (v3.0)
const BLUE = "#003FC7";
const NAVY = "#03002C";

type SegmentId = "presentation" | "print" | "social" | "events" | "style";

const SEGMENTS: Array<{
  id: SegmentId;
  label: string;
  ink: string;
  blurb: string;
}> = [
  {
    id: "presentation",
    label: "Presentation",
    ink: BLUE,
    blurb:
      "Section frameworks, module families, slide variants, and layout geometry for decks and exports.",
  },
  {
    id: "print",
    label: "Print",
    ink: "#B3186B",
    blurb: "Print section modules, page geometry, and the kinds each module reads well on.",
  },
  {
    id: "social",
    label: "Social",
    ink: "#A33B12",
    blurb: "Output geometries, kit profiles, template styles, and campaign playbooks.",
  },
  {
    id: "events",
    label: "Events",
    ink: "#0F5C1A",
    blurb: "Event playbooks with phases, deliverables, and the KPIs each one is judged on.",
  },
  {
    id: "style",
    label: "Style Library",
    ink: NAVY,
    blurb: "The approved visual languages S01–S28 and the industry recipes built from them.",
  },
];

function Atlas() {
  const [segment, setSegment] = useState<SegmentId>("presentation");
  const active = SEGMENTS.find((s) => s.id === segment)!;

  return (
    <AppShell>
      <div>
        <div className="text-xs uppercase tracking-[0.3em]" style={{ color: `${NAVY}80` }}>
          The Atlas
        </div>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight" style={{ color: NAVY }}>
          Every Element building block, segmented by output.
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-black/60">
          Presentation, print, social, and events each draw from their own module set — and all of
          them are skinned by the same approved style library. Pick a segment to see what the
          assembler can reach for.
        </p>
      </div>

      {/* Segment bar */}
      <nav aria-label="Atlas segments" className="mt-8 flex flex-wrap gap-2">
        {SEGMENTS.map((s) => {
          const on = s.id === segment;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSegment(s.id)}
              aria-pressed={on}
              className="rounded-full border px-4 py-2 text-sm font-medium transition"
              style={
                on
                  ? { backgroundColor: s.ink, borderColor: s.ink, color: "#FFFFFF" }
                  : { borderColor: "rgba(3,0,44,0.14)", color: NAVY, backgroundColor: "#FFFFFF" }
              }
            >
              {s.label}
            </button>
          );
        })}
      </nav>

      <p className="mt-4 max-w-2xl text-sm text-black/55">{active.blurb}</p>

      {segment === "presentation" && <PresentationSegment />}
      {segment === "print" && <PrintSegment ink={active.ink} />}
      {segment === "social" && <SocialSegment ink={active.ink} />}
      {segment === "events" && <EventsSegment ink={active.ink} />}
      {segment === "style" && <StyleLibrarySegment />}

      <div className="mt-14 rounded-2xl border border-dashed p-6 text-sm text-black/60" style={{ borderColor: "rgba(3,0,44,0.18)" }}>
        Want to see the pieces in action?{" "}
        <Link to="/brief/new" className="font-medium underline" style={{ color: BLUE }}>
          Start a brief
        </Link>{" "}
        and the assembler will pick from this atlas.
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

function PresentationSegment() {
  const {
    layoutFrameworks: LAYOUT_FRAMEWORKS,
    moduleFamilies: MODULE_FAMILIES,
    moduleVariants: MODULE_VARIANTS,
    sectionFrameworks: SECTION_FRAMEWORKS,
    narrativeArchetypes: NARRATIVE_ARCHETYPES,
  } = useTaxonomy();

  const { overrides } = useModuleOverrides("deck");
  const deckVariants = applyDeckOverrides(MODULE_VARIANTS, overrides);

  return (
    <>
      <Section title="Narrative archetypes" count={NARRATIVE_ARCHETYPES.length}>
        <div className="grid gap-4 md:grid-cols-2">
          {NARRATIVE_ARCHETYPES.map((a) => (
            <div key={a.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-medium">{a.name}</div>
              <div className="mt-1 text-sm text-black/60">{a.description}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.sectionRecipe.map((sfId) => (
                  <span
                    key={sfId}
                    className="rounded-full bg-black/5 px-2 py-0.5 font-mono text-xs"
                  >
                    {sfId}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Section frameworks" count={SECTION_FRAMEWORKS.length}>
        <div className="grid gap-4 md:grid-cols-3">
          {SECTION_FRAMEWORKS.map((sf) => (
            <div key={sf.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-mono text-xs text-black/50">{sf.id}</div>
              <div className="mt-1 font-medium">{sf.name}</div>
              <div className="mt-1 text-sm text-black/60">{sf.purpose}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sf.permittedFamilyIds.map((f) => (
                  <span
                    key={f}
                    className="rounded-full px-2 py-0.5 font-mono text-xs"
                    style={{ backgroundColor: `${BLUE}14`, color: BLUE }}
                  >
                    {f} {byId(MODULE_FAMILIES, f)?.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Module families" count={MODULE_FAMILIES.length}>
        <div className="grid gap-4 md:grid-cols-2">
          {MODULE_FAMILIES.map((mf) => {
            const variants = deckVariants.filter((mv) => mv.familyId === mf.id);
            const fi = familyIcon(mf.id);
            const color =
              fi.emphasis === "primary"
                ? BLUE
                : fi.emphasis === "accent"
                  ? "#EC388A"
                  : fi.emphasis === "success"
                    ? "#0F5C1A"
                    : fi.emphasis === "warning"
                      ? "#A33B12"
                      : "#666666";
            return (
              <div key={mf.id} className="rounded-2xl border border-black/10 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                      style={{ backgroundColor: `${color}18`, color }}
                      aria-hidden
                      title={fi.rationale}
                    >
                      <fi.Icon size={22} />
                    </span>
                    <div>
                      <div className="font-mono text-xs text-black/50">{mf.id}</div>
                      <div className="mt-1 font-medium">{mf.name}</div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs">
                    Review: {mf.reviewLevel}
                  </span>
                </div>
                <div className="mt-3 text-sm text-black/60">{mf.description}</div>

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
                                backgroundColor:
                                  ico.placement === "none" ? "rgba(0,0,0,0.04)" : `${BLUE}14`,
                                color: ico.placement === "none" ? "rgba(0,0,0,0.4)" : BLUE,
                              }}
                              title={`${ico.placement} · ${ico.size} · ${ico.treatment} · ${ico.emphasis} — ${ico.rationale}`}
                            >
                              {ico.placement === "none"
                                ? "no-icon"
                                : `${ico.placement}·${ico.size}`}
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
        <div className="grid gap-4 md:grid-cols-4">
          {LAYOUT_FRAMEWORKS.map((lf) => (
            <div key={lf.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-mono text-xs text-black/50">{lf.id}</div>
              <div className="mt-1 font-medium">{lf.name}</div>
              <div className="mt-1 text-sm text-black/60">{lf.description}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {lf.zones.map((z) => (
                  <span key={z} className="rounded-full bg-black/5 px-2 py-0.5 text-xs">
                    {z}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <TypographySection />
      <IconographySection />
      <LogoPlacementSection />
    </>
  );
}

// ---------------------------------------------------------------------------
// Print
// ---------------------------------------------------------------------------

function PrintSegment({ ink }: { ink: string }) {
  return (
    <>
      <Section title="Print section modules" count={PRINT_SECTION_MODULES.length}>
        <div className="space-y-8">
          {PRINT_MODULE_FAMILY_ORDER.map((family) => {
            const modules = PRINT_SECTION_MODULES.filter((m) => m.family === family);
            if (!modules.length) return null;
            const meta = printModuleFamilyMeta(family);
            return (
              <div key={family}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold" style={{ color: NAVY }}>
                    {meta?.label ?? family}
                  </h3>
                  <span className="text-xs text-black/45">{modules.length} modules</span>
                </div>
                {meta?.description && (
                  <p className="mt-1 max-w-2xl text-sm text-black/55">{meta.description}</p>
                )}
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {modules.map((m) => (
                    <div key={m.id} className="rounded-2xl border border-black/10 bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium leading-snug">{m.label}</div>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                          style={{ backgroundColor: `${ink}14`, color: ink }}
                        >
                          {m.density}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-black/60">{m.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {m.bestFor.map((k) => (
                          <span key={k} className="rounded-full bg-black/5 px-2 py-0.5 text-[11px]">
                            {k}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 font-mono text-[10px] text-black/40">{m.id}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Page geometry" count={PRINT_PAGE_SIZE_ORDER.length}>
        <div className="grid gap-4 md:grid-cols-4">
          {PRINT_PAGE_SIZE_ORDER.map((size) => {
            const p = PRINT_PAGE_PRESETS_FULL[size];
            return (
              <div key={size} className="rounded-2xl border border-black/10 bg-white p-5">
                <div className="font-mono text-xs text-black/50">{size}</div>
                <div className="mt-1 font-medium">{p.label}</div>
                <div className="mt-2 text-sm text-black/60">
                  {p.widthIn}″ × {p.heightIn}″
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------

function SocialSegment({ ink }: { ink: string }) {
  return (
    <>
      <Section title="Output formats" count={SOCIAL_FORMATS.length}>
        <div className="grid gap-3 md:grid-cols-4">
          {SOCIAL_FORMATS.map((f) => (
            <div key={f.id} className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium leading-snug">{f.label}</div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                  style={{ backgroundColor: `${ink}14`, color: ink }}
                >
                  {f.platform}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="rounded border border-black/10 bg-black/[0.03]"
                  style={{
                    width: f.aspect >= 1 ? 44 : 44 * f.aspect,
                    height: f.aspect >= 1 ? 44 / f.aspect : 44,
                  }}
                  aria-hidden
                />
                <div className="text-sm text-black/60">
                  {f.width} × {f.height}
                  <div className="font-mono text-[10px] text-black/40">
                    {f.aspect.toFixed(2)} : 1
                  </div>
                </div>
              </div>
              {f.intent && <p className="mt-2 text-xs text-black/55">{f.intent}</p>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Kit profiles" count={KIT_PROFILES.length}>
        <div className="grid gap-4 md:grid-cols-2">
          {KIT_PROFILES.map((k) => (
            <div key={k.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-medium">{k.label}</div>
              <p className="mt-1 text-sm text-black/60">{k.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {k.formatIds.map((id) => (
                  <span key={id} className="rounded-full bg-black/5 px-2 py-0.5 font-mono text-[11px]">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Template styles" count={SOCIAL_STYLES.length}>
        <div className="grid gap-4 md:grid-cols-3">
          {SOCIAL_STYLES.map((s) => (
            <div key={s.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{s.label}</div>
                <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  {s.tag}
                </span>
              </div>
              <p className="mt-1 text-sm text-black/60">{s.blurb}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10px] text-black/50">
                <span className="rounded bg-black/5 px-2 py-0.5">plate:{s.plate}</span>
                <span className="rounded bg-black/5 px-2 py-0.5">cta:{s.cta}</span>
                <span className="rounded bg-black/5 px-2 py-0.5">lockup:{s.lockup}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Campaign playbooks" count={SOCIAL_PLAYBOOKS.length}>
        <div className="grid gap-4 md:grid-cols-3">
          {SOCIAL_PLAYBOOKS.map((p) => (
            <PlaybookCard
              key={p.id}
              name={p.name}
              tagline={p.tagline}
              chip={p.chip}
              accent={p.accent}
              meta={`${p.divisionLabel} · ${p.deliverables.length} deliverables · ${p.phases.length} phases`}
            />
          ))}
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function EventsSegment({ ink }: { ink: string }) {
  return (
    <Section title="Event playbooks" count={EVENT_PLAYBOOKS.length}>
      <div className="grid gap-4 md:grid-cols-2">
        {EVENT_PLAYBOOKS.map((p) => (
          <div key={p.id} className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-xs text-black/50">{p.kind}</div>
                <div className="mt-1 text-lg font-semibold" style={{ color: NAVY }}>
                  {p.name}
                </div>
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                style={{ backgroundColor: `${ink}14`, color: ink }}
              >
                {p.chip}
              </span>
            </div>
            <p className="mt-2 text-sm text-black/60">{p.tagline}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-widest text-black/50">Phases</div>
                <ul className="mt-1 space-y-0.5 text-sm text-black/70">
                  {p.phases.map((ph, i) => (
                    <li key={i}>{ph.label ?? ph.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-black/50">KPIs</div>
                <ul className="mt-1 space-y-0.5 text-sm text-black/70">
                  {p.kpis.map((k, i) => (
                    <li key={i}>{k.label}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-3 text-xs text-black/50">
              {p.deliverables.length} deliverables · kit {p.kitProfileId}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function PlaybookCard({
  name,
  tagline,
  chip,
  accent,
  meta,
}: {
  name: string;
  tagline: string;
  chip: string;
  accent: string;
  meta: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium leading-snug">{name}</div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{ backgroundColor: `${accent}1F`, color: NAVY }}
        >
          {chip}
        </span>
      </div>
      <p className="mt-1 text-sm text-black/60">{tagline}</p>
      <div className="mt-3 text-xs text-black/50">{meta}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Style library
// ---------------------------------------------------------------------------

function StyleLibrarySegment() {
  return (
    <>
      <Section title="Approved visual languages" count={DESIGN_SKINS.length}>
        <p className="-mt-2 mb-5 max-w-3xl text-sm text-black/60">
          S01–S28 are permanent codes. Every deck, print asset, social frame, and event kit renders
          through one of these languages — pick the language, then let the industry recipe narrow it.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {DESIGN_SKINS.map((s) => (
            <div key={s.code} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
              <div className="flex h-14">
                {s.palette.map((c) => (
                  <div key={c} className="flex-1" style={{ backgroundColor: c }} aria-hidden />
                ))}
              </div>
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-mono text-xs text-black/50">{s.code}</div>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                    {s.mode}
                  </span>
                </div>
                <div className="mt-1 font-medium" style={{ color: NAVY }}>
                  {s.name}
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-black/40">
                  {s.reference}
                </div>
                <p className="mt-2 text-sm text-black/60">{s.description}</p>
                <dl className="mt-3 space-y-1 text-xs text-black/55">
                  <div>
                    <dt className="inline font-medium text-black/70">Best fit: </dt>
                    <dd className="inline">{s.bestFit}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-black/70">Type: </dt>
                    <dd className="inline">{s.typography}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-black/70">Density: </dt>
                    <dd className="inline">{s.density}</dd>
                  </div>
                </dl>
                <div className="mt-3 font-mono text-[10px] text-black/40">{s.spec}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Industry recipes" count={INDUSTRY_RECIPES.length}>
        <div className="grid gap-4 md:grid-cols-3">
          {INDUSTRY_RECIPES.map((r) => (
            <div key={r.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-mono text-xs text-black/50">{r.id}</div>
              <div className="mt-1 font-medium" style={{ color: NAVY }}>
                {r.name}
              </div>
              <p className="mt-1 text-sm text-black/60">{r.summary}</p>
              <div className="mt-3 flex gap-1">
                {r.palette.map((c) => (
                  <span
                    key={c}
                    className="h-5 w-5 rounded-full border border-black/10"
                    style={{ backgroundColor: c }}
                    aria-hidden
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.dna.map((d) => (
                  <span
                    key={d}
                    className="rounded-full px-2 py-0.5 text-[11px]"
                    style={{ backgroundColor: `${BLUE}12`, color: BLUE }}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-black/50">Tone: {r.tone}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// Shared brand for the swatches — TransPerfect v3.0 palette.
const DEMO_BRAND = {
  tokens: { primary: BLUE, accent: "#EC388A" },
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
      <Sparkles size={dims.glyphPx} />
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
        Cycle time drops <Sparkles size={14} className="inline align-[-2px]" aria-hidden /> by 43%
        across the pilot.
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
        <Sparkles size={24} className="absolute -right-6 -top-6 text-foreground/10" aria-hidden />
        <div className="relative p-4 text-sm font-medium">Section opener</div>
      </div>
    ),
    "standalone-hero": (
      <div className="flex justify-center py-2">
        <IconTile treatment="soft-circle" emphasis="primary" size="display" />
      </div>
    ),
    none: <div className="text-sm italic text-black/50">Pure typography — no icon.</div>,
  };

  return (
    <Section title="Iconography" count={ICON_PLACEMENTS_META.length}>
      <p className="-mt-2 mb-6 max-w-3xl text-sm text-black/60">
        Every module declares an <span className="font-mono text-xs">iconography</span> contract:
        placement, size, treatment, emphasis, and accessibility role. Sizes ride an 8pt grid;
        decorative icons are hidden from screen readers, semantic ones announce their label.
      </p>

      <div className="mb-8">
        <div className="mb-3 text-xs uppercase tracking-widest text-black/50">
          Sizes (glyph / container / gap)
        </div>
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
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-4"
            >
              <div className={t.id === "on-dark" ? "rounded-lg bg-[#0B2A4A] p-2" : ""}>
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
        <div className="mb-3 text-xs uppercase tracking-widest text-black/50">
          Emphasis (color role)
        </div>
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
          <li>
            Decorative icons render with <span className="font-mono text-xs">aria-hidden</span> and
            never announce.
          </li>
          <li>
            Semantic icons (standalone hero, meaningful glyphs) use{" "}
            <span className="font-mono text-xs">role="img"</span> with an explicit label.
          </li>
          <li>
            Interactive icon targets are at least 44×44 CSS px; sizes{" "}
            <span className="font-mono text-xs">sm</span> and up already satisfy this.
          </li>
          <li>
            Filled treatments enforce inverse foreground for AA contrast; muted emphasis is reserved
            for non-critical metadata.
          </li>
        </ul>
      </div>
    </Section>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
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
    "top-left": "items-start justify-start",
    "top-center": "items-start justify-center",
    "top-right": "items-start justify-end",
    "bottom-left": "items-end justify-start",
    "bottom-center": "items-end justify-center",
    "bottom-right": "items-end justify-end",
    hidden: "items-center justify-center",
  };
  const isHidden = position === "hidden";
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-black/10 bg-white">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E85D2C]" aria-hidden />
      <div className={`flex h-full w-full p-3 ${zone[position]}`}>
        {isHidden ? (
          <span className="text-[10px] uppercase tracking-widest text-black/30">hidden</span>
        ) : (
          <div style={{ color: "#000" }}>
            <BrandLockup
              brand={
                {
                  id: "tp",
                  name: "TransPerfect",
                  description: "TransPerfect master brand",
                  tokens: {
                    primary: "#003FC7",
                    accent: "#A1FBF9",
                    surface: "#FFFFFF",
                    ink: "#03002C",
                  },
                  logo: { mark: "TP", wordmark: "TransPerfect" },
                } satisfies BrandMode
              }
              color="#000"
              size="2xs"
              showMark={false}
              showDivision={false}
            />
          </div>
        )}
      </div>
      <div
        className="pointer-events-none absolute inset-2 rounded border border-dashed border-black/10"
        aria-hidden
      />
    </div>
  );
}

function LogoPlacementSection() {
  const chromeDefaults = [
    { chrome: "cover" as const, label: "Cover chrome" },
    { chrome: "content" as const, label: "Content chrome (default)" },
    { chrome: "divider" as const, label: "Divider chrome" },
    { chrome: "close" as const, label: "Close chrome" },
  ];

  return (
    <Section title="Logo placement" count={LOGO_POSITIONS_META.length}>
      <p className="-mt-2 mb-6 max-w-3xl text-sm text-black/60">
        Every slide places the brand lockup in one of seven approved zones. The zone is derived from
        the chrome variant, with per-layout overrides for full-bleed, poster, and editorial moments.
        Variants may override in rare cases via{" "}
        <span className="font-mono text-xs">logoPosition</span>.
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
        <div className="mb-3 text-xs uppercase tracking-widest text-black/50">
          Chrome-variant defaults
        </div>
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
        <div className="mb-3 text-xs uppercase tracking-widest text-black/50">
          Layout-framework overrides
        </div>
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

// ────────────────────────────────────────────────────────────────────────────
// Typography
// ────────────────────────────────────────────────────────────────────────────

const TYPE_SCALE = [
  {
    token: "display",
    role: "Display / hero titles",
    className: "text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05]",
    sample: "A modular deck system.",
    spec: "72–96px · 600 · -0.02em",
  },
  {
    token: "h1",
    role: "Slide titles, page H1",
    className: "text-4xl font-semibold tracking-tight leading-[1.1]",
    sample: "Section frameworks and variants",
    spec: "36px · 600 · -0.015em",
  },
  {
    token: "h2",
    role: "Section headings",
    className: "text-2xl font-semibold tracking-tight",
    sample: "Narrative archetypes",
    spec: "24px · 600",
  },
  {
    token: "h3",
    role: "Card / sub-section",
    className: "text-xl font-semibold",
    sample: "Module families",
    spec: "20px · 600",
  },
  {
    token: "h4",
    role: "In-slide labels",
    className: "text-base font-medium",
    sample: "Preferred variants",
    spec: "16px · 500",
  },
  {
    token: "body-lg",
    role: "Lead paragraph",
    className: "text-lg leading-relaxed",
    sample: "Every deck is assembled from these pieces.",
    spec: "18px · 400 · 1.65",
  },
  {
    token: "body",
    role: "Default body",
    className: "text-base leading-relaxed",
    sample: "Section frameworks decide where you are in the story.",
    spec: "16px · 400 · 1.6",
  },
  {
    token: "body-sm",
    role: "Secondary body, captions",
    className: "text-sm text-black/70 leading-relaxed",
    sample: "Loaded live from the Cloud taxonomy tables.",
    spec: "14px · 400",
  },
  {
    token: "eyebrow",
    role: "Eyebrow / section label",
    className: "text-xs uppercase tracking-[0.3em] text-black/50",
    sample: "The Atlas",
    spec: "12px · 500 · 0.3em tracking",
  },
  {
    token: "meta",
    role: "IDs, tags, code refs",
    className: "font-mono text-xs text-black/60",
    sample: "MV-CASE-STORY · SF-04 · MF-03",
    spec: "12px · Geist Mono",
  },
];

const WEIGHTS = [
  { w: 400, label: "Regular" },
  { w: 500, label: "Medium" },
  { w: 600, label: "Semibold" },
  { w: 700, label: "Bold" },
];

function TypographySection() {
  return (
    <Section title="Typography" count={TYPE_SCALE.length}>
      <p className="-mt-2 mb-6 max-w-3xl text-sm text-black/60">
        Geist is the master typeface across every surface — briefs, decks, atlas, and exports. Geist
        Sans carries all headings and body copy; Geist Mono carries IDs, tags, and code references.
        The hierarchy below is authoritative — never introduce new sizes ad-hoc in a slide.
      </p>

      {/* Master faces */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="text-xs uppercase tracking-widest text-black/50">
              Primary — Geist Sans
            </div>
            <span className="font-mono text-[10px] text-black/50">--font-sans</span>
          </div>
          <div className="font-sans text-5xl font-semibold tracking-tight leading-none">
            Aa Bb Cc
          </div>
          <div className="mt-2 font-sans text-sm text-black/60">
            The quick brown fox jumps over the lazy dog. 0123456789
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {WEIGHTS.map((w) => (
              <div key={w.w} className="rounded-lg border border-black/10 px-3 py-2">
                <div className="font-sans text-lg" style={{ fontWeight: w.w }}>
                  Ag
                </div>
                <div className="mt-1 font-mono text-[10px] text-black/50">
                  {w.w} · {w.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="text-xs uppercase tracking-widest text-black/50">
              Secondary — Geist Mono
            </div>
            <span className="font-mono text-[10px] text-black/50">--font-mono</span>
          </div>
          <div className="font-mono text-5xl font-semibold tracking-tight leading-none">
            Aa Bb Cc
          </div>
          <div className="mt-2 font-mono text-sm text-black/60">
            MV-CASE-STORY · SF-04 · MF-03 · 0123456789
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {WEIGHTS.slice(0, 3).map((w) => (
              <div key={w.w} className="rounded-lg border border-black/10 px-3 py-2">
                <div className="font-mono text-lg" style={{ fontWeight: w.w }}>
                  Ag
                </div>
                <div className="mt-1 font-mono text-[10px] text-black/50">
                  {w.w} · {w.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hierarchy */}
      <div className="mb-3 text-xs uppercase tracking-widest text-black/50">Hierarchy</div>
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        {TYPE_SCALE.map((t, i) => (
          <div
            key={t.token}
            className={`grid grid-cols-[7rem_minmax(0,1fr)_11rem] items-baseline gap-4 px-6 py-5 ${
              i > 0 ? "border-t border-black/5" : ""
            }`}
          >
            <div>
              <div className="font-mono text-xs text-black/70">{t.token}</div>
              <div className="mt-0.5 text-[11px] text-black/45">{t.role}</div>
            </div>
            <div className={t.className}>{t.sample}</div>
            <div className="text-right font-mono text-[10px] text-black/45">{t.spec}</div>
          </div>
        ))}
      </div>

      {/* Rules */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="mb-2 font-medium">Usage rules</div>
          <ul className="list-inside list-disc space-y-1 text-sm text-black/70">
            <li>
              Every route sets exactly one <span className="font-mono text-xs">display</span> or{" "}
              <span className="font-mono text-xs">h1</span> — never both.
            </li>
            <li>
              Body copy stays at <span className="font-mono text-xs">body</span> or{" "}
              <span className="font-mono text-xs">body-lg</span>; drop to{" "}
              <span className="font-mono text-xs">body-sm</span> only for captions and metadata.
            </li>
            <li>
              IDs (variants, layouts, sections) always use{" "}
              <span className="font-mono text-xs">meta</span> — Geist Mono at 12px.
            </li>
            <li>
              Eyebrows carry a section's context, not decoration — use once per section, above the
              heading.
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="mb-2 font-medium">Do &amp; don't</div>
          <ul className="list-inside list-disc space-y-1 text-sm text-black/70">
            <li>
              Do keep <span className="font-mono text-xs">tracking-tight</span> on headings — Geist
              wants slightly negative letter-spacing above 24px.
            </li>
            <li>
              Do reserve <span className="font-mono text-xs">700</span> for emphasis inside body
              copy; headings top out at <span className="font-mono text-xs">600</span>.
            </li>
            <li>Don't introduce a serif or a competing sans anywhere in a deck.</li>
            <li>Don't set line-height below 1.4 on body copy or below 1.05 on display.</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}
