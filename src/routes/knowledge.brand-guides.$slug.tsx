import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getBrandGuide, type BrandGuide, type ColorSwatch, type TypeStyle } from "@/lib/brand-guides";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  getBrandhubIntel,
  normalizeVoiceValue,
  targetAudienceText,
  type BrandhubIntel,
} from "@/lib/brandhub-intel";

export const Route = createFileRoute("/knowledge/brand-guides/$slug")({
  loader: ({ params }) => {
    const guide = getBrandGuide(params.slug);
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.guide.title} Brand Guide · TransPerfect` },
      { name: "description", content: loaderData?.guide.intro.slice(0, 155) },
    ],
  }),
  notFoundComponent: () => (
    <AppShell>
      <div className="rounded-xl border border-black/10 p-8 text-sm text-black/60">
        Brand guide not found.{" "}
        <Link to="/knowledge/brand-guides" className="underline">Back to guides</Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        {(error as Error).message}
      </div>
    </AppShell>
  ),
  component: BrandGuideView,
});

function BrandGuideView() {
  const { guide } = Route.useLoaderData() as { guide: BrandGuide };
  const division = BRAND_MODES.find((b) => b.id === guide.divisionId);
  const hero = guide.primaryColors[0]?.hex ?? "#03002C";
  const accent = guide.secondaryColors[0]?.hex ?? "#A1FBF9";

  return (
    <AppShell>
      {/* Breadcrumb */}
      <div className="text-xs text-black/50">
        <Link to="/knowledge" className="hover:underline">Knowledge</Link>
        <span className="mx-2">/</span>
        <Link to="/knowledge/brand-guides" className="hover:underline">Brand Guides</Link>
      </div>

      {/* Hero */}
      <section
        className="mt-4 overflow-hidden rounded-3xl p-10 md:p-14"
        style={{ background: hero, color: "#fff" }}
      >
        <div className="text-[11px] uppercase tracking-[0.4em] opacity-70">
          {guide.divisionId === "master" ? "Master brand" : division?.name ?? "Division"} · v{guide.version}
        </div>
        <h1 className="mt-4 text-5xl font-medium leading-[100%] tracking-[-0.04em] md:text-6xl">
          {guide.title}
        </h1>
        <div className="mt-3 text-lg opacity-80">{guide.subtitle}</div>
        {guide.tagline && (
          <div className="mt-8 max-w-2xl text-2xl leading-[110%] tracking-[-0.02em]">
            {guide.tagline}
          </div>
        )}
        <p className="mt-6 max-w-2xl text-sm leading-[140%] opacity-80">{guide.intro}</p>

        <div className="mt-10 flex items-center gap-2">
          {[...guide.primaryColors, ...guide.secondaryColors].map((c) => (
            <span
              key={c.hex}
              className="h-8 w-8 rounded-full ring-2 ring-white/30"
              style={{ background: c.hex }}
              title={`${c.name} ${c.hex}`}
            />
          ))}
        </div>
      </section>

      {/* Values */}
      {guide.values && guide.values.length > 0 && (
        <Section title="Core values" eyebrow="01">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {guide.values.map((v) => (
              <div key={v.label} className="rounded-xl border border-black/10 bg-white p-4">
                <div className="text-sm font-semibold" style={{ color: hero }}>{v.label}</div>
                <div className="mt-1 text-xs text-black/60">{v.description}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Logo */}
      <Section title="Logo system" eyebrow="02">
        {guide.logoNotes && (
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <div className="text-lg font-semibold">{guide.logoNotes.headline}</div>
            <p className="mt-2 max-w-3xl text-sm text-black/70">{guide.logoNotes.body}</p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {guide.logoRules.map((r) => (
            <div
              key={r.title}
              className="flex gap-3 rounded-xl border p-4"
              style={{
                borderColor: r.do ? "#0A660A33" : "#E53D2E33",
                background: r.do ? "#DDFAD255" : "#FACCC855",
              }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: r.do ? "#0A660A" : "#E53D2E" }}
              >
                {r.do ? "DO" : "×"}
              </div>
              <div>
                <div className="text-sm font-semibold text-black">{r.title}</div>
                <div className="mt-0.5 text-xs text-black/60">{r.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Color */}
      <Section title="Color palette" eyebrow="03">
        <SwatchRow label="Primary" swatches={guide.primaryColors} large />
        <SwatchRow label="Secondary (10% accent max)" swatches={guide.secondaryColors} />
        <SwatchRow label="Tertiary pops" swatches={guide.tertiaryColors} />
        <SwatchRow label="Neutrals" swatches={guide.neutrals} />

        <div className="mt-8">
          <div className="text-xs uppercase tracking-[0.25em] text-black/50">Full web ramps</div>
          <div className="mt-3 space-y-3">
            {guide.ramps.map((ramp) => (
              <div key={ramp.name} className="flex items-center gap-4">
                <div className="w-28 text-xs text-black/60">{ramp.name}</div>
                <div className="flex flex-1 gap-1">
                  {ramp.stops.map((s) => (
                    <div key={s} className="h-10 flex-1 rounded" style={{ background: s }} title={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography" eyebrow="04">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="flex flex-wrap items-baseline gap-4">
            <div className="text-4xl font-medium tracking-[-0.04em]">{guide.typefacePrimary}</div>
            <div className="text-sm text-black/50">Primary typeface · open source (Google Fonts)</div>
          </div>
          <div className="mt-2 text-sm text-black/60">
            Web-friendly fallback: <span className="font-medium text-black/80">{guide.typefaceWeb}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-black/50">Headings</div>
            <div className="mt-3 space-y-4">
              {guide.headingScale.map((s) => (
                <TypeSample key={s.label} style={s} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-black/50">Body</div>
            <div className="mt-3 space-y-4">
              {guide.bodyScale.map((s) => (
                <TypeSample key={s.label} style={s} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Photography + Visuals */}
      {(guide.photography || guide.brandVisuals) && (
        <Section title="Imagery" eyebrow="05">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {guide.photography && (
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <div className="text-sm font-semibold">Photography</div>
                <p className="mt-2 text-sm text-black/70">{guide.photography}</p>
              </div>
            )}
            {guide.brandVisuals && (
              <div
                className="rounded-2xl p-6 text-white"
                style={{ background: `linear-gradient(135deg, ${hero}, ${accent})` }}
              >
                <div className="text-sm font-semibold">Brand visuals</div>
                <p className="mt-2 text-sm opacity-90">{guide.brandVisuals}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Sub-brands */}
      {guide.subBrands && guide.subBrands.length > 0 && (
        <Section title="Sub-brand architecture" eyebrow="06">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guide.subBrands.map((group) => (
              <div key={group.group} className="rounded-2xl border border-black/10 bg-white p-5">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  {group.group}
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-black/80">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full" style={{ background: hero }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Iconography */}
      {guide.iconography && (
        <Section title="Iconography" eyebrow="07">
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <div className="text-lg font-semibold">{guide.iconography.headline}</div>
            <p className="mt-2 max-w-3xl text-sm text-black/70">{guide.iconography.body}</p>
            {guide.iconography.sourceUrl && (
              <a
                href={guide.iconography.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-[0.25em] hover:underline"
                style={{ color: hero }}
              >
                Icon library ↗
              </a>
            )}
          </div>
        </Section>
      )}

      {/* Social media */}
      {guide.socialMedia && guide.socialMedia.length > 0 && (
        <Section title="Social image watermarks" eyebrow="08">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {guide.socialMedia.map((platform) => (
              <div key={platform.platform} className="rounded-2xl border border-black/10 bg-white p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  {platform.platform}
                </div>
                <ul className="mt-3 space-y-2 text-sm text-black/80">
                  {platform.rules.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ background: hero }} />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="my-16 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-6 text-xs text-black/50">
        <div>
          {guide.title} · Brand Guidelines v{guide.version} · Last updated {guide.updatedAt}
        </div>
        {guide.sourceUrl && (
          <a href={guide.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
            View source deck ↗
          </a>
        )}
      </div>
    </AppShell>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <div className="flex items-baseline gap-4">
        <div className="text-xs uppercase tracking-[0.3em] text-black/40">{eyebrow}</div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SwatchRow({
  label,
  swatches,
  large = false,
}: {
  label: string;
  swatches: ColorSwatch[];
  large?: boolean;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="text-xs uppercase tracking-[0.25em] text-black/50">{label}</div>
      <div className={`mt-2 grid gap-3 ${large ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"}`}>
        {swatches.map((c) => (
          <div key={c.hex} className="overflow-hidden rounded-xl border border-black/10 bg-white">
            <div
              className={`flex items-end p-4 ${large ? "h-32" : "h-20"}`}
              style={{ background: c.hex, color: c.onDark ? "#fff" : "#03002C" }}
            >
              <div className="text-xs font-mono opacity-80">{c.hex}</div>
            </div>
            <div className="p-3">
              <div className="text-sm font-semibold">{c.name}</div>
              {c.role && <div className="text-[11px] text-black/50">{c.role}</div>}
              {(c.pantone || c.rgb) && (
                <div className="mt-1 space-y-0.5 text-[10px] text-black/50">
                  {c.pantone && <div>{c.pantone}</div>}
                  {c.rgb && <div>RGB {c.rgb}</div>}
                  {c.cmyk && <div>CMYK {c.cmyk}</div>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypeSample({ style }: { style: TypeStyle }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex items-baseline justify-between gap-4">
        <div className="text-[11px] uppercase tracking-[0.25em] text-black/50">{style.label}</div>
        <div className="text-[10px] text-black/40">
          {style.sizePx}px · {style.weight} · track {style.tracking} · lead {style.leading}
        </div>
      </div>
      <div
        className="mt-2"
        style={{
          fontSize: Math.min(style.sizePx, 40),
          fontWeight: style.weight as number,
          letterSpacing: style.tracking ? `${Number(style.tracking) / 100}em` : undefined,
          lineHeight: style.leading,
        }}
      >
        {style.sample}
      </div>
    </div>
  );
}
