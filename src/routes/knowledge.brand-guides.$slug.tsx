import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getBrandGuide, type BrandGuide, type ColorSwatch, type TypeStyle } from "@/lib/brand-guides";
import { BRAND_MODES } from "@/lib/taxonomy";
import { getDivisionLogos } from "@/lib/division-logos";
import { getDivisionImagery } from "@/assets/backdrops/divisions";
import {
  getBrandhubIntel,
  normalizeVoiceValue,
  targetAudienceText,
  type BrandhubIntel,
} from "@/lib/brandhub-intel";
import {
  ShieldCheck, Sparkles, Users, HeartHandshake, Compass, Lightbulb,
  Rocket, Target, Zap, Globe, Layers, Award, Scale, Leaf, Star,
  Flag, TrendingUp, Handshake, Eye, MessageCircle, Cog, Gem,
  type LucideIcon,
} from "lucide-react";
import { Download } from "lucide-react";


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
      <div className="rounded-xl border border-border p-8 text-sm text-muted-foreground">
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
  const heroImagery = getDivisionImagery(guide.divisionId);
  // Pick a deterministic approved backdrop: prefer abstracts (photography
  // stays for content sections), fall back to the first photograph.
  const heroBackdrop =
    heroImagery?.abstracts?.[0] ?? heroImagery?.photos?.[0] ?? null;

  return (
    <AppShell>
      {/* Breadcrumb */}
      <div className="text-xs text-muted-foreground">
        <Link to="/knowledge" className="hover:underline">Knowledge</Link>
        <span className="mx-2">/</span>
        <Link to="/knowledge/brand-guides" className="hover:underline">Brand Guides</Link>
      </div>

      {/* Hero */}
      <section
        className="relative mt-4 overflow-hidden rounded-3xl p-10 md:p-16"
        style={{ background: hero, color: "#fff" }}
      >
        {/* Approved backdrop layer */}
        {heroBackdrop && (
          <>
            <img
              src={heroBackdrop}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-screen"
              loading="lazy"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(115deg, ${hero} 20%, ${hero}CC 55%, transparent 100%)`,
              }}
            />
          </>
        )}
        {/* Accent orb — brand secondary color pushed behind glass */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: accent }}
          aria-hidden
        />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.3em] ring-1 ring-white/25 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            {guide.divisionId === "master" ? "Master brand" : division?.name ?? "Division"}
            <span className="opacity-60">·</span>
            <span className="opacity-70">v{guide.version}</span>
          </div>

          <h1 className="mt-6 text-6xl font-medium leading-[95%] tracking-[-0.045em] md:text-7xl">
            {guide.title}
          </h1>
          <div className="mt-2 h-[2px] w-24 rounded-full" style={{ background: accent }} />
          <div className="mt-5 text-lg font-light opacity-85 md:text-xl">{guide.subtitle}</div>
          {guide.tagline && (
            <div className="mt-8 max-w-2xl text-2xl leading-[115%] tracking-[-0.02em] md:text-[28px]">
              {guide.tagline}
            </div>
          )}
          <p className="mt-6 max-w-2xl text-sm leading-[150%] opacity-80">{guide.intro}</p>

          {logos?.white || logos?.color ? (
            <div className="mt-8 inline-flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/20 backdrop-blur">
              <img
                src={logos.white ?? logos.color!}
                alt={`${guide.title} logo`}
                className="h-12 w-auto md:h-14"
                loading="lazy"
              />
              <div className="hidden h-8 w-px bg-white/25 md:block" />
              <a
                href={logos.white ?? logos.color!}
                download
                className="hidden items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.25em] opacity-80 transition hover:opacity-100 md:inline-flex"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
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
        </div>
      </section>

      {/* Values */}
      {guide.values && guide.values.length > 0 && (
        <Section title="Core values" eyebrow="01">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {guide.values.map((v) => {
              const Icon = pickValueIcon(v.label);
              return (
                <div key={v.label} className="group rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: `${hero}14`, color: hero }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-semibold" style={{ color: hero }}>{v.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{v.description}</div>
                </div>
              );
            })}
          </div>
        </Section>
      )}


      {/* Logo */}
      <Section title="Logo system" eyebrow="02">
        {guide.logoNotes && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-lg font-semibold">{guide.logoNotes.headline}</div>
            <p className="mt-2 max-w-3xl text-sm text-foreground/80">{guide.logoNotes.body}</p>
          </div>
        )}
        {logos && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {logos.color && (
              <LogoTile label="Horizontal · Color" src={logos.color} bg="#ffffff" border />
            )}
            {logos.stackedColor && (
              <LogoTile label="Stacked · Color" src={logos.stackedColor} bg="#ffffff" border />
            )}
            {logos.white && (
              <LogoTile label="Horizontal · Reversed" src={logos.white} bg={hero} />
            )}
            {logos.stackedWhite && (
              <LogoTile label="Stacked · Reversed" src={logos.stackedWhite} bg={hero} />
            )}
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
                <div className="text-sm font-semibold text-foreground">{r.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{r.description}</div>
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
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Full web ramps</div>
          <div className="mt-3 space-y-3">
            {guide.ramps.map((ramp) => (
              <div key={ramp.name} className="flex items-center gap-4">
                <div className="w-28 text-xs text-muted-foreground">{ramp.name}</div>
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
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-baseline gap-4">
            <div className="text-4xl font-medium tracking-[-0.04em]">{guide.typefacePrimary}</div>
            <div className="text-sm text-muted-foreground">Primary typeface · open source (Google Fonts)</div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Web-friendly fallback: <span className="font-medium text-foreground/85">{guide.typefaceWeb}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Headings</div>
            <div className="mt-3 space-y-4">
              {guide.headingScale.map((s) => (
                <TypeSample key={s.label} style={s} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Body</div>
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
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-sm font-semibold">Photography</div>
                <p className="mt-2 text-sm text-foreground/80">{guide.photography}</p>
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

      {/* Imagery library — division backdrop pool */}
      {(() => {
        const imagery = getDivisionImagery(guide.divisionId);
        if (!imagery || (imagery.photos.length === 0 && imagery.abstracts.length === 0)) return null;
        return (
          <Section title="Imagery library" eyebrow="05B">
            <p className="max-w-3xl text-sm text-foreground/75">
              The curated backdrop pool used across decks, exports, and live previews for this division.
              Photography slots drive hero and full-bleed layouts; abstracts back stats, quotes, and section dividers.
            </p>

            {imagery.photos.length > 0 && (
              <div className="mt-6">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Photography · {imagery.photos.length}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  {imagery.photos.map((src, i) => (
                    <div key={`p-${i}`} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
                      <img src={src} alt={`${guide.title} photography backdrop ${i + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">P{String(i + 1).padStart(2, "0")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {imagery.abstracts.length > 0 && (
              <div className="mt-6">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Abstract · {imagery.abstracts.length}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {imagery.abstracts.map((src, i) => (
                    <div key={`a-${i}`} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
                      <img src={src} alt={`${guide.title} abstract backdrop ${i + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">A{String(i + 1).padStart(2, "0")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        );
      })()}

      {/* Sub-brands */}
      {guide.subBrands && guide.subBrands.length > 0 && (
        <Section title="Sub-brand architecture" eyebrow="06">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guide.subBrands.map((group) => (
              <div key={group.group} className="rounded-2xl border border-border bg-card p-5">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  {group.group}
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-foreground/85">
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
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-lg font-semibold">{guide.iconography.headline}</div>
            <p className="mt-2 max-w-3xl text-sm text-foreground/80">{guide.iconography.body}</p>
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
              <div key={platform.platform} className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  {platform.platform}
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground/85">
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

      <div className="my-16 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">

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
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</div>
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
      <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className={`mt-2 grid gap-3 ${large ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"}`}>
        {swatches.map((c) => (
          <div key={c.hex} className="overflow-hidden rounded-xl border border-border bg-card">
            <div
              className={`flex items-end p-4 ${large ? "h-32" : "h-20"}`}
              style={{ background: c.hex, color: c.onDark ? "#fff" : "#03002C" }}
            >
              <div className="text-xs font-mono opacity-80">{c.hex}</div>
            </div>
            <div className="p-3">
              <div className="text-sm font-semibold">{c.name}</div>
              {c.role && <div className="text-[11px] text-muted-foreground">{c.role}</div>}
              {(c.pantone || c.rgb) && (
                <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
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
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-4">
        <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{style.label}</div>
        <div className="text-[10px] text-muted-foreground">
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
                className="rounded-xl border border-border bg-card p-4 text-sm text-foreground/85"
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
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  Competitors tracked
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {competitors.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border bg-foreground/[0.05] px-3 py-1 text-xs text-foreground/85"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {gaps.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  Competitive gaps
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground/85">
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
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  Primary markets
                </div>
                <ul className="mt-3 space-y-1 text-sm text-foreground/85">
                  {markets.map((m) => (
                    <li key={m}>· {m}</li>
                  ))}
                </ul>
                {typeof readiness === "number" && (
                  <div className="mt-4 rounded-lg bg-foreground/[0.06] p-3 text-xs">
                    <div className="text-muted-foreground">Global readiness</div>
                    <div className="text-2xl font-semibold" style={{ color: hero }}>
                      {readiness}
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {cultural.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  Cultural considerations
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground/85">
                  {cultural.map((c, i) => (
                    <li key={i}>· {c}</li>
                  ))}
                </ul>
              </div>
            )}
            {locPriorities.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
                  Localization priorities
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground/85">
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
                className="rounded-xl border border-border bg-card p-4"
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
                    <span className="text-[10px] text-muted-foreground">
                      confidence {Math.round(g.confidence * 100)}%
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm text-foreground/85">{g.recommendation}</div>
                {g.rationale && (
                  <div className="mt-1 text-xs text-muted-foreground">{g.rationale}</div>
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
                className="rounded-xl border border-border bg-card p-4 text-sm text-foreground/85"
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
            <div className="mt-3 text-xs text-muted-foreground">
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
    <div className="rounded-2xl bg-card/10 p-5 backdrop-blur-sm ring-1 ring-white/20">
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
      <div className="rounded-xl border border-dashed border-border p-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
        <div className="mt-2 text-xs text-muted-foreground/70">—</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: hero }}>
        {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs text-foreground/85"
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function LogoTile({ label, src, bg, border }: { label: string; src: string; bg: string; border?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl p-6 ${border ? "border border-border" : ""}`}
      style={{ background: bg, minHeight: 160 }}
    >
      <img src={src} alt={label} className="max-h-20 w-auto max-w-full object-contain" loading="lazy" />
      <div
        className="text-[10px] uppercase tracking-[0.25em]"
        style={{ color: bg === "#ffffff" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)" }}
      >
        {label}
      </div>
    </div>
  );
}

