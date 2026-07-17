import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getBrandGuide, type BrandGuide, type ColorSwatch, type TypeStyle } from "@/lib/brand-guides";
import { BRAND_MODES } from "@/lib/taxonomy";
import { getDivisionLogos } from "@/lib/division-logos";
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
  const intel = getBrandhubIntel(guide.slug);
  const logos = getDivisionLogos(guide.divisionId) ?? getDivisionLogos(guide.slug);

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

        {logos?.white || logos?.color ? (
          <div className="mt-8 inline-flex items-center rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/20 backdrop-blur">
            <img
              src={logos.white ?? logos.color!}
              alt={`${guide.title} logo`}
              className="h-12 w-auto md:h-14"
              loading="lazy"
            />
          </div>
        ) : null}

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

      {intel && <BrandhubIntelSections intel={intel} hero={hero} accent={accent} />}

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

function BrandhubIntelSections({
  intel,
  hero,
  accent,
}: {
  intel: BrandhubIntel;
  hero: string;
  accent: string;
}) {
  const audience = targetAudienceText(intel.targetAudience);
  const tone = normalizeVoiceValue(intel.voiceProfile.tone);
  const style = normalizeVoiceValue(intel.voiceProfile.style);
  const personality = normalizeVoiceValue(intel.voiceProfile.personality);
  const commStyle = normalizeVoiceValue(intel.voiceProfile.communication_style);
  const competitors = intel.competitiveLandscape.competitors ?? [];
  const gaps = intel.competitiveLandscape.competitive_gaps ?? [];
  const markets = intel.culturalInsights.primary_markets ?? [];
  const cultural = intel.culturalInsights.cultural_considerations ?? [];
  const locPriorities = intel.culturalInsights.localization_priorities ?? [];
  const readiness = intel.culturalInsights.global_readiness_score;
  const growth = intel.growthRecommendations ?? [];
  const ke = intel.knowledgeEntries ?? [];

  return (
    <>
      <Section title="Brand intelligence" eyebrow="09">
        <div
          className="rounded-3xl p-8 text-white"
          style={{ background: `linear-gradient(135deg, ${hero}, ${accent})` }}
        >
          <div className="text-[11px] uppercase tracking-[0.3em] opacity-70">
            BrandHub · Oracle synthesis
          </div>
          {intel.summary && (
            <p className="mt-3 max-w-3xl text-base leading-[150%] opacity-95">
              {intel.summary}
            </p>
          )}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {intel.marketPosition && (
              <IntelCard label="Market position" body={intel.marketPosition} />
            )}
            {audience && <IntelCard label="Target audience" body={audience} />}
          </div>
        </div>
      </Section>

      {(tone.length || style.length || personality.length || commStyle.length) > 0 && (
        <Section title="Voice profile" eyebrow="10">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <VoiceCard label="Tone" values={tone} hero={hero} />
            <VoiceCard label="Style" values={style} hero={hero} />
            <VoiceCard label="Personality" values={personality} hero={hero} />
            <VoiceCard label="Communication" values={commStyle} hero={hero} />
          </div>
        </Section>
      )}

      {intel.competitiveAdvantages.length > 0 && (
        <Section title="Competitive advantages" eyebrow="11">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {intel.competitiveAdvantages.map((c, i) => (
              <div
                key={i}
                className="rounded-xl border border-black/10 bg-white p-4 text-sm text-black/80"
              >
                <div
                  className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: hero }}
                >
                  Advantage {String(i + 1).padStart(2, "0")}
                </div>
                {c}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(competitors.length > 0 || gaps.length > 0) && (
        <Section title="Competitive landscape" eyebrow="12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {competitors.length > 0 && (
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  Competitors tracked
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {competitors.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs text-black/80"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {gaps.length > 0 && (
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  Competitive gaps
                </div>
                <ul className="mt-3 space-y-2 text-sm text-black/80">
                  {gaps.slice(0, 8).map((g, i) => (
                    <li key={i} className="flex gap-2">
                      <span
                        className="mt-2 h-1 w-1 shrink-0 rounded-full"
                        style={{ background: hero }}
                      />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {(markets.length > 0 || cultural.length > 0 || locPriorities.length > 0) && (
        <Section title="Cultural & global readiness" eyebrow="13">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {markets.length > 0 && (
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  Primary markets
                </div>
                <ul className="mt-3 space-y-1 text-sm text-black/80">
                  {markets.map((m) => (
                    <li key={m}>· {m}</li>
                  ))}
                </ul>
                {typeof readiness === "number" && (
                  <div className="mt-4 rounded-lg bg-black/[0.04] p-3 text-xs">
                    <div className="text-black/50">Global readiness</div>
                    <div className="text-2xl font-semibold" style={{ color: hero }}>
                      {readiness}
                      <span className="text-sm text-black/40">/100</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {cultural.length > 0 && (
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  Cultural considerations
                </div>
                <ul className="mt-3 space-y-2 text-sm text-black/80">
                  {cultural.map((c, i) => (
                    <li key={i}>· {c}</li>
                  ))}
                </ul>
              </div>
            )}
            {locPriorities.length > 0 && (
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  Localization priorities
                </div>
                <ul className="mt-3 space-y-2 text-sm text-black/80">
                  {locPriorities.map((p, i) => (
                    <li key={i}>· {p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {growth.length > 0 && (
        <Section title="Growth recommendations" eyebrow="14">
          <div className="space-y-3">
            {growth.slice(0, 8).map((g, i) => (
              <div
                key={i}
                className="rounded-xl border border-black/10 bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  {g.priority && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                      style={{
                        background:
                          g.priority === "high"
                            ? "#E53D2E"
                            : g.priority === "medium"
                              ? hero
                              : "#666",
                      }}
                    >
                      {g.priority}
                    </span>
                  )}
                  {typeof g.confidence === "number" && (
                    <span className="text-[10px] text-black/40">
                      confidence {Math.round(g.confidence * 100)}%
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm text-black/80">{g.recommendation}</div>
                {g.rationale && (
                  <div className="mt-1 text-xs text-black/50">{g.rationale}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {ke.length > 0 && (
        <Section title="Knowledge entries" eyebrow="15">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ke.slice(0, 12).map((entry, i) => (
              <div
                key={i}
                className="rounded-xl border border-black/10 bg-white p-4 text-sm text-black/75"
              >
                <div
                  className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: hero }}
                >
                  Entry {String(i + 1).padStart(2, "0")}
                </div>
                {entry}
              </div>
            ))}
          </div>
          {ke.length > 12 && (
            <div className="mt-3 text-xs text-black/50">
              +{ke.length - 12} more entries in the knowledge base
            </div>
          )}
        </Section>
      )}
    </>
  );
}

function IntelCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/20">
      <div className="text-[10px] font-semibold uppercase tracking-[0.3em] opacity-70">
        {label}
      </div>
      <p className="mt-2 text-sm leading-[150%] opacity-95">{body}</p>
    </div>
  );
}

function VoiceCard({
  label,
  values,
  hero,
}: {
  label: string;
  values: string[];
  hero: string;
}) {
  if (!values.length) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-black/40">{label}</div>
        <div className="mt-2 text-xs text-black/30">—</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: hero }}>
        {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs text-black/80"
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

