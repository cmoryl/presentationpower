import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import {
  ICON_SIZES,
  ICON_PLACEMENTS_META,
  ICON_TREATMENTS_META,
  ICON_EMPHASIS_META,
  MODULE_FAMILY_ICONS,
  PLACEMENT_DEFAULTS,
  resolveEmphasisColors,
  type IconTreatment,
  type IconEmphasis,
  type IconSizeToken,
} from "@/lib/iconography";
import { BRAND_MODES } from "@/lib/taxonomy";

export const Route = createFileRoute("/admin/icon-studio")({
  head: () => ({
    meta: [
      { title: "Icon Studio · Admin · TransPerfect" },
      {
        name: "description",
        content:
          "Preview and govern the module iconography system: placements, treatments, emphasis, sizing, and family marks.",
      },
    ],
  }),
  component: IconStudio,
});

const MASTER = BRAND_MODES[0];

function Tile({
  treatment,
  emphasis,
  size,
}: {
  treatment: IconTreatment;
  emphasis: IconEmphasis;
  size: IconSizeToken;
}) {
  const sz = ICON_SIZES[size];
  const c = resolveEmphasisColors(MASTER, treatment, emphasis);
  const isCircle = treatment === "soft-circle";
  const showContainer = treatment !== "glyph";
  return (
    <div
      className="grid place-items-center"
      style={{
        width: showContainer ? sz.containerPx : sz.glyphPx,
        height: showContainer ? sz.containerPx : sz.glyphPx,
        background: showContainer ? c.bg : "transparent",
        border: c.border ? `1px solid ${c.border}` : undefined,
        borderRadius: isCircle ? "9999px" : showContainer ? sz.radiusPx : 0,
      }}
    >
      <Sparkles
        size={sz.glyphPx}
        strokeWidth={sz.strokeWidth}
        color={c.fg}
      />
    </div>
  );
}

function IconStudio() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <header>
        <div className="text-xs uppercase tracking-[0.25em] text-[#003FC7]">
          Design system · Iconography
        </div>
        <h2 className="mt-2 text-3xl font-semibold">Icon Studio</h2>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          The canonical contract for every icon in every module variant. Governs
          placement, size, treatment, emphasis, and accessibility. Rendering is
          driven by <code className="rounded bg-black/5 px-1.5 py-0.5">src/lib/iconography.ts</code>{" "}
          and consumed by <code className="rounded bg-black/5 px-1.5 py-0.5">VariantRenderer</code>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            to="/atlas"
            className="rounded-full border border-black/15 px-3 py-1.5 text-black/70 hover:border-black/40"
          >
            View in Atlas →
          </Link>
          <Link
            to="/knowledge/brand-guides/transperfect-master"
            className="rounded-full border border-black/15 px-3 py-1.5 text-black/70 hover:border-black/40"
          >
            Brand guide · Hero Icons →
          </Link>
        </div>
      </header>

      {/* Module family marks */}
      <section>
        <SectionHead
          eyebrow="01"
          title="Module family marks"
          sub="One representative glyph per module family — used as wayfinding in Atlas cards, library filters and section chips."
        />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.values(MODULE_FAMILY_ICONS).map((f) => {
            const c = resolveEmphasisColors(MASTER, "soft-tile", f.emphasis);
            const Icon = f.Icon;
            return (
              <div
                key={f.id}
                className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-12 w-12 place-items-center rounded-xl"
                    style={{ background: c.bg }}
                  >
                    <Icon size={22} color={c.fg} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-black/60">
                      {f.id}
                    </div>
                    <div className="text-xs capitalize text-black/50">
                      {f.emphasis}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs leading-relaxed text-black/70">
                  {f.rationale}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Placements */}
      <section>
        <SectionHead
          eyebrow="02"
          title="Placements"
          sub="Where icons sit relative to text and content. Every variant declares a placement (or inherits one via pattern rules)."
        />
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {ICON_PLACEMENTS_META.map((p) => {
            const d = PLACEMENT_DEFAULTS[p.id];
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="mt-1 text-xs text-black/60">{p.description}</div>
                    <div className="mt-2 text-[11px] uppercase tracking-widest text-black/40">
                      Typical in
                    </div>
                    <div className="text-xs text-black/70">{p.typicalIn}</div>
                  </div>
                  <div className="shrink-0">
                    {p.id === "none" ? (
                      <div className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-black/20 text-[11px] uppercase tracking-widest text-black/40">
                        None
                      </div>
                    ) : (
                      <Tile
                        treatment={d.treatment}
                        emphasis={d.emphasis}
                        size={p.id === "watermark" || p.id === "standalone-hero" ? "lg" : d.size}
                      />
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1 text-[10px] uppercase tracking-widest text-black/50">
                  <Chip>size · {d.size}</Chip>
                  <Chip>tone · {d.emphasis}</Chip>
                  <Chip>{d.treatment}</Chip>
                  <Chip>{d.a11yRole}</Chip>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Treatments */}
      <section>
        <SectionHead
          eyebrow="03"
          title="Treatments"
          sub="Container/style of the icon. Pick the treatment that matches the surface density."
        />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {ICON_TREATMENTS_META.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur"
              style={{
                background: t.id === "on-dark" ? "#03002C" : undefined,
                color: t.id === "on-dark" ? "white" : undefined,
              }}
            >
              <div className="flex items-center justify-center py-2">
                <Tile treatment={t.id} emphasis={t.id === "on-dark" ? "inverse" : "accent"} size="md" />
              </div>
              <div className="mt-3 text-sm font-semibold">{t.name}</div>
              <div
                className="mt-1 text-xs"
                style={{ color: t.id === "on-dark" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)" }}
              >
                {t.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Emphasis */}
      <section>
        <SectionHead
          eyebrow="04"
          title="Emphasis"
          sub="Color role mapped against the active brand tokens. Resolved live from the master TransPerfect palette."
        />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {ICON_EMPHASIS_META.map((e) => {
            const c = resolveEmphasisColors(MASTER, "soft-tile", e.id);
            return (
              <div
                key={e.id}
                className="rounded-2xl border border-black/10 bg-white/70 p-4 text-center backdrop-blur"
              >
                <div className="mx-auto flex items-center justify-center">
                  <Tile treatment="soft-tile" emphasis={e.id} size="md" />
                </div>
                <div className="mt-3 text-sm font-semibold">{e.name}</div>
                <div className="mt-1 font-mono text-[10px] text-black/50">{c.fg}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sizes */}
      <section>
        <SectionHead
          eyebrow="05"
          title="Size tokens"
          sub="8pt-grid aligned. Glyph, container, gap, radius and stroke are all derived from the token."
        />
        <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.03] text-left text-[11px] uppercase tracking-widest text-black/50">
              <tr>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">Glyph</th>
                <th className="px-4 py-3">Container</th>
                <th className="px-4 py-3">Gap</th>
                <th className="px-4 py-3">Radius</th>
                <th className="px-4 py-3">Stroke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {(Object.keys(ICON_SIZES) as IconSizeToken[]).map((size) => {
                const s = ICON_SIZES[size];
                return (
                  <tr key={size}>
                    <td className="px-4 py-3 font-mono text-xs">{size}</td>
                    <td className="px-4 py-3">
                      <Tile treatment="soft-tile" emphasis="accent" size={size} />
                    </td>
                    <td className="px-4 py-3 text-black/70">{s.glyphPx}px</td>
                    <td className="px-4 py-3 text-black/70">{s.containerPx}px</td>
                    <td className="px-4 py-3 text-black/70">{s.gapPx}px</td>
                    <td className="px-4 py-3 text-black/70">{s.radiusPx}px</td>
                    <td className="px-4 py-3 text-black/70">{s.strokeWidth}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Integration */}
      <section>
        <SectionHead
          eyebrow="06"
          title="Integration"
          sub="How the studio wires into the rest of the build."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <IntegrationRow
            title="Variant renderer"
            body="Every module variant resolves its IconSpec via iconographyForVariant(). Declared spec wins; then pattern rules; then a safe leading soft-tile default."
            path="src/components/slide/VariantRenderer.tsx"
          />
          <IntegrationRow
            title="Atlas showcase"
            body="Atlas surfaces every placement/treatment against real variants for design review."
            path="src/routes/atlas.tsx"
            link="/atlas"
          />
          <IntegrationRow
            title="Brand guide"
            body="Hero Icons is the source library, documented in the master brand guide."
            path="src/lib/brand-guides.ts"
            link="/knowledge/brand-guides/transperfect-master"
          />
          <IntegrationRow
            title="Taxonomy"
            body="ModuleVariant.iconography allows per-variant overrides when a family default doesn't fit."
            path="src/lib/taxonomy.ts"
          />
        </div>
      </section>
    </div>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <div className="font-mono text-xs text-black/40">{eyebrow}</div>
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-1 max-w-2xl text-sm text-black/60">{sub}</p>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-black/10 bg-white px-2 py-0.5">
      {children}
    </span>
  );
}

function IntegrationRow({
  title,
  body,
  path,
  link,
}: {
  title: string;
  body: string;
  path: string;
  link?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        {link && (
          <Link to={link} className="text-xs text-[#003FC7] hover:underline">
            Open →
          </Link>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-black/65">{body}</p>
      <div className="mt-3 font-mono text-[10px] text-black/45">{path}</div>
    </div>
  );
}
