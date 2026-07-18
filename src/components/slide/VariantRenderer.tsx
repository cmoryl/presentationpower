import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";
import { SlideFrame as BaseSlideFrame, SlideModeContext, type SlideMode } from "./SlideChrome";
import { createContext, useContext } from "react";
import type { ComponentProps, ReactNode } from "react";
import type { DeckSlide } from "@/lib/deck-store";
import { TitleBlock, Kicker, DisplayTitle, Hairline, SupportingText, MetaRow, StatFigure, QuoteMark, Attribution, SoftDivider } from "./primitives";


// Module-scoped context so helper components (CardGrid, StatGrid, NumberedList,
// etc.) automatically pick up the current slide's clientName + layoutId when
// they wrap themselves in <SlideFrame>. VariantRenderer sets the value once
// per render.
const SlideFrameCtx = createContext<{ clientName?: string; layoutId?: string; clientLogoUrl?: string | null; subCompany?: string }>({});

function SlideFrame(props: ComponentProps<typeof BaseSlideFrame>) {
  const ctx = useContext(SlideFrameCtx);
  return (
    <BaseSlideFrame
      {...props}
      clientName={props.clientName ?? ctx.clientName}
      layoutId={props.layoutId ?? ctx.layoutId}
      clientLogoUrl={props.clientLogoUrl ?? ctx.clientLogoUrl ?? null}
      subCompany={props.subCompany ?? ctx.subCompany}
    />
  );
}

import {
  ICON_SIZES,
  resolveEmphasisColors,
  withDefaults,
  type IconPlacement,
  type IconSizeToken,
  type IconTreatment,
  type IconEmphasis,
} from "@/lib/iconography";
import {
  Sparkles, Workflow, Layers3, Users, ShieldCheck, Target, Rocket, LineChart,
  Search, Cog, MessageSquareQuote, Building2, Landmark, Cpu, Factory, Store,
  HeartPulse, Car, Plane, Coins, Calendar, ArrowRight, CheckCircle2,
  AlertTriangle, TrendingUp, GitBranch, Globe2, Lightbulb, ClipboardList,
  FileCheck2, Send, MessagesSquare, Mail, Phone, Timer, Trophy, Puzzle,
  Handshake, Play, BarChart3, Zap, ArrowUpRight,
} from "lucide-react";

type IconType = typeof Sparkles;

const ICON_KEYWORDS: Array<[RegExp, IconType]> = [
  [/intake|brief|request/i, ClipboardList],
  [/translat|language|linguist|localiz/i, Globe2],
  [/review|qa\b|quality|check|approve|audit-ready/i, FileCheck2],
  [/publish|route|deliver|ship|launch/i, Send],
  [/discover|research|map|understand/i, Search],
  [/pilot|proto|kickoff/i, Rocket],
  [/scale|expand|grow|rollout/i, TrendingUp],
  [/architect|layer|platform|stack/i, Layers3],
  [/workflow|process|orchestr|operating model/i, Workflow],
  [/analytic|dashboard|report|insight|sla|kpi/i, LineChart],
  [/govern|complia|policy|regulat|audit/i, ShieldCheck],
  [/risk|mitigat|threat|issue/i, AlertTriangle],
  [/team|people|talent|human|reviewer/i, Users],
  [/speed|fast|cycle|time-to|time to|weeks|days/i, Timer],
  [/cost|price|invest|budget|spend|dollar|pricing/i, Coins],
  [/decision|approve|sign-?off/i, CheckCircle2],
  [/calendar|schedule|date|when/i, Calendar],
  [/contact|email|mail|reach out/i, Mail],
  [/phone|call/i, Phone],
  [/market|region|country|global|langs?\b|multi/i, Globe2],
  [/goal|target|outcome|result|objective/i, Target],
  [/idea|insight|opportunity|so what|big idea/i, Lightbulb],
  [/integration|connector|api|cms|dam/i, GitBranch],
  [/tool|config|setup|technolog|ai\b|model/i, Cog],
  [/testimonial|quote|voice/i, MessageSquareQuote],
  [/pharma|life[- ]?scien|medic|health|regulator/i, HeartPulse],
  [/bank|financial|finance/i, Landmark],
  [/tech|software|product|platform|consumer tech/i, Cpu],
  [/retail|store|commerce/i, Store],
  [/insur/i, ShieldCheck],
  [/auto|vehicle|car/i, Car],
  [/aero|air|travel/i, Plane],
  [/manufact|industr|factor/i, Factory],
  [/enterprise|company|corp|business|client/i, Building2],
  [/deliver|handoff|hand-off|partner/i, Handshake],
  [/support|help|service/i, MessagesSquare],
  [/legal|contract/i, FileCheck2],
  [/learn|train|educat/i, Lightbulb],
  [/marketing|campaign|content/i, Sparkles],
  [/fit|puzzle|module/i, Puzzle],
  [/next|start|go|begin/i, Play],
  [/comparison|benchmark|compare/i, BarChart3],
  [/energy|momentum|impact/i, Zap],
  [/promise|commit|guarantee/i, Trophy],
];

const DEFAULT_ICONS: IconType[] = [Target, Layers3, Workflow, LineChart, Users, Rocket];

import { iconByName, parseIconRef } from "@/lib/icon-library";
import { IconRenderer } from "@/components/IconRenderer";

// Cache synthesized Lucide-shaped components per pack:name ref so React sees
// stable component identity across renders.
const packIconCompCache = new Map<string, IconType>();
function packIconComponent(packId: string, name: string): IconType {
  const key = `${packId}:${name}`;
  let Comp = packIconCompCache.get(key);
  if (!Comp) {
    const C = ({ size = 24, color }: { size?: number; color?: string; strokeWidth?: number }) => (
      <IconRenderer pack={packId} name={name} size={size} color={color} />
    );
    Comp = C as unknown as IconType;
    packIconCompCache.set(key, Comp);
  }
  return Comp;
}

function pickIcon(label: string, fallbackIndex = 0, override?: string | null): IconType {
  const ref = parseIconRef(override);
  if (ref) return packIconComponent(ref.packId, ref.name);
  const forced = iconByName(override);
  if (forced) return forced as IconType;
  const text = label || "";
  for (const [rx, Icon] of ICON_KEYWORDS) if (rx.test(text)) return Icon;
  return DEFAULT_ICONS[Math.abs(fallbackIndex) % DEFAULT_ICONS.length];
}


function IconBadge({
  brand,
  label,
  index,
  size = "md",
  tone = "accent",
  placement = "leading",
  treatment,
  ariaLabel,
  override,
}: {
  brand: BrandMode;
  label: string;
  index: number;
  size?: IconSizeToken;
  tone?: "accent" | "primary" | "onDark" | IconEmphasis;
  placement?: IconPlacement;
  treatment?: IconTreatment;
  ariaLabel?: string; // when set, badge is announced (role=img); otherwise decorative
  override?: string | null;
}) {
  // Back-compat: map legacy `tone` values into the new emphasis/treatment axes.
  const legacyOnDark = tone === "onDark";
  const emphasis: IconEmphasis =
    legacyOnDark ? "inverse"
    : tone === "primary" ? "primary"
    : tone === "accent" ? "accent"
    : (tone as IconEmphasis);
  const spec = withDefaults({
    placement,
    size,
    treatment: treatment ?? (legacyOnDark ? "on-dark" : "soft-tile"),
    emphasis,
    a11yRole: ariaLabel ? "semantic" : "decorative",
  });
  const dims = ICON_SIZES[spec.size];
  const colors = resolveEmphasisColors(brand, spec.treatment, spec.emphasis);
  const Icon = pickIcon(label, index, override);
  const isCircle = spec.treatment === "soft-circle";
  const a11y = spec.a11yRole === "semantic"
    ? { role: "img" as const, "aria-label": ariaLabel ?? label }
    : { "aria-hidden": true as const };
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${isCircle ? "rounded-full" : ""}`}
      style={{
        width: dims.containerPx,
        height: dims.containerPx,
        backgroundColor: colors.bg,
        color: colors.fg,
        border: colors.border ? `1px solid ${colors.border}` : undefined,
        borderRadius: isCircle ? undefined : dims.radiusPx,
      }}
      {...a11y}
    >
      <Icon size={dims.glyphPx} strokeWidth={dims.strokeWidth} aria-hidden={spec.a11yRole === "decorative"} />
    </div>
  );
}


type Props = {
  slide: DeckSlide;
  variant: ModuleVariant;
  brand: BrandMode;
  pageNumber: number;
  clientName?: string;
  clientLogoUrl?: string | null;
  subCompany?: string;
  mode?: SlideMode;
};

type Item = Record<string, unknown>;
const s = (v: unknown, fb = ""): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : fb);
const arr = (v: unknown): Item[] => (Array.isArray(v) ? (v as Item[]) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const strs = (v: unknown): string[] => (Array.isArray(v) ? (v as unknown[]).map((x) => s(x)) : []);

// In dark mode, swap the token surfaces + text so any `brand.tokens.*` usage in
// module bodies renders correctly on a dark slide. Primary becomes a lighter
// on-brand blue (#4D88FF from the approved web ramp) so numeric/text usage of
// primary stays legible on dark panels. Accent (Aqua/Lavender/Pink/etc.)
// already pops on dark and is preserved.
function themeBrandForMode(brand: BrandMode, mode: SlideMode): BrandMode {
  if (mode === "light") return brand;
  return {
    ...brand,
    tokens: {
      primary: "#4D88FF",
      accent: brand.tokens.accent,
      // Translucent panel so backdrop imagery shows through cards/boxes on dark slides.
      surface: "rgba(20, 20, 53, 0.55)",
      ink: "#FFFFFF",
    },
  };
}

export function VariantRenderer(props: Props) {
  const { slide, variant, brand, pageNumber, clientName, clientLogoUrl, subCompany, mode = "light" } = props;
  const c = slide.content as Record<string, unknown>;
  const contentClientName = s((slide.content as Record<string, unknown>).clientName) || undefined;
  const resolvedClient = clientName || contentClientName;
  const themedBrand = themeBrandForMode(brand, mode);

  return (
    <SlideModeContext.Provider value={mode}>
      <SlideFrameCtx.Provider value={{ clientName: resolvedClient, layoutId: slide.layoutId, clientLogoUrl: clientLogoUrl ?? null, subCompany }}>
        {renderVariantBody({ slide, variant, brand: themedBrand, pageNumber, c })}
      </SlideFrameCtx.Provider>
    </SlideModeContext.Provider>
  );
}


function renderVariantBody({
  slide,
  variant,
  brand,
  pageNumber,
  c,
}: {
  slide: DeckSlide;
  variant: ModuleVariant;
  brand: BrandMode;
  pageNumber: number;
  c: Record<string, unknown>;
}): ReactNode {

  switch (variant.id) {
    // ── Opening ────────────────────────────────────────────────────────
    case "MV-OP-COVER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-end">
            <Kicker brand={brand}>Prepared for {s(c.clientName)}</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={96} thicknessPx={2} className="mt-8" />
            <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1520} className="mt-10">
              {s(c.title, "Client")}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText size="xl" opacity={0.82} maxWidthPx={1180} className="mt-10">
                {s(c.subtitle)}
              </SupportingText>
            )}
            <MetaRow className="mt-16">
              {s(c.presenter) && <span>{s(c.presenter)}</span>}
              {s(c.date) && <span>{s(c.date)}</span>}
            </MetaRow>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-MEDIA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.clientName, "cover-media"))} className="absolute inset-0 h-full w-full rounded-none" />
          {/* Cinematic scrim — gradient from primary bottom-left to transparent top-right */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(115deg, ${brand.tokens.primary}f0 0%, ${brand.tokens.primary}b8 40%, rgba(0,0,0,0.35) 100%)`,
            }}
          />
          <div className="relative flex h-full flex-col justify-end text-white">
            <Kicker brand={brand}>Prepared for {s(c.clientName)}</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={96} thicknessPx={2} className="mt-8" />
            <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1520} className="mt-10">
              {s(c.title)}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText size="xl" opacity={0.88} maxWidthPx={1180} className="mt-10">
                {s(c.subtitle)}
              </SupportingText>
            )}
            <MetaRow className="mt-16">
              {s(c.date) && <span>{s(c.date)}</span>}
            </MetaRow>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-MINIMAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-center">
            <Hairline color={brand.tokens.accent} widthPx={120} thicknessPx={2} />
            <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1520} className="mt-12">
              {s(c.title)}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText size="xl" opacity={0.72} maxWidthPx={1080} className="mt-8">
                {s(c.subtitle)}
              </SupportingText>
            )}
            {s(c.date) && (
              <MetaRow className="mt-16">
                <span>{s(c.date)}</span>
              </MetaRow>
            )}
          </div>
        </SlideFrame>
      );

    case "MV-OP-DIVIDER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="divider">
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand}>{s(c.kicker, "Section")}</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={96} thicknessPx={2} className="mt-8" />
            <DisplayTitle size="divider" color="#ffffff" maxWidthPx={1600} className="mt-10">
              {s(c.title)}
            </DisplayTitle>
          </div>
        </SlideFrame>
      );

    case "MV-OP-DIVIDER-NUMBERED":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="divider">
          <div className="flex h-full items-center gap-20">
            <div
              className="tabular-nums"
              style={{
                fontSize: 340,
                lineHeight: 0.85,
                fontWeight: 600,
                letterSpacing: "-0.05em",
                color: brand.tokens.accent,
                opacity: 0.95,
              }}
            >
              {s(c.chapterNumber, "01")}
            </div>
            <div className="flex-1">
              <Kicker brand={brand} color="rgba(255,255,255,0.7)">{s(c.kicker, "Chapter")}</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={64} thicknessPx={2} className="mt-6" />
              <DisplayTitle size="section" color="#ffffff" maxWidthPx={1100} className="mt-8">
                {s(c.title)}
              </DisplayTitle>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-AGENDA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Agenda")} kicker="Contents" />
          <div className="mt-16 grid grid-cols-2 gap-x-24 gap-y-8">
            {arr(c.items).map((it, i) => (
              <div key={i} className="flex items-baseline gap-8 border-t pt-6" style={{ borderColor: "rgba(10,15,28,0.10)" }}>
                <div
                  className="tabular-nums"
                  style={{ color: brand.tokens.accent, fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", minWidth: 76 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 36, lineHeight: 1.2, fontWeight: 500 }}>{s(it.label)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-OP-AGENDA-VERTICAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Agenda")} kicker="Contents" />
          <div className="mt-12">
            {arr(c.items).map((it, i) => (
              <div key={i} className="flex items-baseline gap-10 border-t py-7" style={{ borderColor: "rgba(10,15,28,0.10)" }}>
                <div
                  className="tabular-nums"
                  style={{ color: brand.tokens.accent, fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", minWidth: 90 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1">
                  <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.15 }}>
                    {s(it.label)}
                  </div>
                  {s(it.body) && (
                    <div className="mt-2" style={{ fontSize: 24, opacity: 0.66, lineHeight: 1.35 }}>
                      {s(it.body)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );


    case "MV-OP-INTRO-TEAM":
    case "MV-TEAM-BIOS-3":
    case "MV-TEAM-BIOS-4":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Team")} />
          <div className={`mt-14 grid gap-10 ${arr(c.items).length === 4 ? "grid-cols-4" : arr(c.items).length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {arr(c.items).map((p, i) => (
              <div key={i} className="rounded-2xl border p-8" style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}>
                <div
                  className="mb-6 h-32 w-32 rounded-full"
                  style={{ backgroundColor: brand.tokens.accent }}
                />
                <div className="text-3xl font-semibold" style={{ color: brand.tokens.primary }}>
                  {s(p.name)}
                </div>
                <div className="mt-2 text-xl uppercase tracking-[0.2em] opacity-70">{s(p.role)}</div>
                <div className="mt-4 text-xl leading-snug opacity-80">{s(p.bio ?? p.note)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    // ── Context & Challenge ───────────────────────────────────────────
    case "MV-CTX-CARDS-3":
    case "MV-SOL-PILLARS-3":
      return <CardGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={3} />;

    case "MV-CTX-CARDS-2":
    case "MV-SOL-PILLARS-2":
      return <CardGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={2} />;

    case "MV-CTX-CARDS-4":
    case "MV-SOL-PILLARS-4":
      return <CardGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={2} rows={2} />;

    case "MV-CTX-COST": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[1.05fr_1fr] items-center gap-24">
            <div>
              <Kicker brand={brand}>Cost of inaction</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={88} thicknessPx={2} className="mt-6 mb-10" />
              <StatFigure
                brand={brand}
                value={s(c.stat)}
                unit={s(c.unit)}
                label={s(c.label)}
                size="monumental"
              />
            </div>
            <SupportingText size="xl" opacity={0.85} maxWidthPx={720}>
              {s(c.narrative)}
            </SupportingText>
          </div>
        </SlideFrame>
      );
    }

    case "MV-CTX-STAT-GRID":
    case "MV-PROOF-STATS-4":
      return <StatGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={2} rows={2} />;

    case "MV-PROOF-STATS-2":
      return <StatGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={2} />;

    case "MV-PROOF-STATS-3":
    case "MV-INS-OPPORTUNITY-SIZE":
      return <StatGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={3} />;

    case "MV-CTX-TREND":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand}>
              <span className="mr-4 inline-block align-[-0.15em]" style={{ fontSize: 44, letterSpacing: 0 }}>
                {s(c.direction) === "down" ? "\u2193" : "\u2191"}
              </span>
              Trend
            </Kicker>
            <Hairline color={brand.tokens.accent} widthPx={88} thicknessPx={2} className="mt-6 mb-8" />
            <DisplayTitle size="section" color={brand.tokens.primary} maxWidthPx={1500}>
              {s(c.headline)}
            </DisplayTitle>
            <SupportingText size="lg" opacity={0.8} maxWidthPx={1180} className="mt-10">
              {s(c.narrative)}
            </SupportingText>
          </div>
        </SlideFrame>
      );

    case "MV-CTX-CHALLENGE-STACK":
      return <NumberedList brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} />;

    // ── Insight ────────────────────────────────────────────────────────
    case "MV-INS-CALLOUT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand}>Insight</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={88} thicknessPx={2} className="mt-6 mb-10" />
            <DisplayTitle size="section" color={brand.tokens.primary} maxWidthPx={1520}>
              {s(c.insight)}
            </DisplayTitle>
            <SupportingText size="lg" opacity={0.8} maxWidthPx={1180} className="mt-10">
              {s(c.narrative)}
            </SupportingText>
          </div>
        </SlideFrame>
      );

    case "MV-INS-BIG-IDEA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand}>{s(c.kicker, "The big idea")}</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={120} thicknessPx={2} className="mt-8 mb-12" />
            <DisplayTitle size="cover" color={brand.tokens.primary} maxWidthPx={1620}>
              {s(c.idea)}
            </DisplayTitle>
          </div>
        </SlideFrame>
      );

    case "MV-INS-SO-WHAT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <div className="grid grid-cols-3">
              {[
                { label: "Insight", body: s(c.insight) },
                { label: "So what", body: s(c.soWhat) },
                { label: "Now what", body: s(c.nowWhat) },
              ].map((b, i) => (
                <div key={i} className="px-10 first:pl-0 last:pr-0" style={{
                  borderLeft: i === 0 ? undefined : "1px solid rgba(10,15,28,0.10)",
                }}>
                  <Hairline color={brand.tokens.accent} widthPx={44} thicknessPx={2} className="mb-6" />
                  <Kicker brand={brand}>{b.label}</Kicker>
                  <div className="mt-6" style={{ fontSize: 34, lineHeight: 1.28, letterSpacing: "-0.01em", color: brand.tokens.primary }}>
                    {b.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-INS-QUOTE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="relative flex h-full flex-col justify-center">
            <QuoteMark color={brand.tokens.accent} size={620} className="absolute -top-4 -left-4" />
            <div className="relative">
              <Kicker brand={brand}>In their words</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={88} thicknessPx={2} className="mt-6 mb-10" />
              <div style={{ fontSize: 78, fontWeight: 500, lineHeight: 1.14, letterSpacing: "-0.02em", maxWidth: 1520, color: brand.tokens.primary }}>
                {s(c.quote)}
              </div>
              <div className="mt-14">
                <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    // ── Solution & Process ─────────────────────────────────────────────
    case "MV-SOL-PILLARS-5": {
      const hero = obj(c.hero);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-12 grid grid-cols-2 gap-8" style={{ gridTemplateRows: "1fr 1fr" }}>
            <div
              className="row-span-2 rounded-2xl p-10 text-white"
              style={{ backgroundColor: brand.tokens.primary }}
            >
              <div className="text-xl uppercase tracking-[0.25em] opacity-80">Hero</div>
              <div className="mt-6 text-5xl font-semibold">{s(hero.title)}</div>
              <div className="mt-6 text-2xl leading-snug opacity-90">{s(hero.body)}</div>
            </div>
            {arr(c.items).slice(0, 4).map((it, i) => (
              <Card key={i} brand={brand} title={s(it.title)} body={s(it.body)} index={i + 1} icon={s(it.icon)} />
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-SOL-ARCHITECTURE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 space-y-4">
            {arr(c.items).map((it, i) => (
              <div
                key={i}
                className="flex items-center gap-10 rounded-xl border p-8"
                style={{
                  borderColor: "rgba(10,15,28,0.1)",
                  backgroundColor: i === 0 ? brand.tokens.primary : brand.tokens.surface,
                  color: i === 0 ? "#fff" : brand.tokens.ink,
                }}
              >
                <div className="w-64 text-3xl font-semibold" style={{ color: i === 0 ? "#fff" : brand.tokens.primary }}>
                  {s(it.label)}
                </div>
                <div className="flex-1 text-2xl opacity-90">{s(it.body)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-SOL-FEATURE-LIST":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-12 grid grid-cols-2 gap-x-16 gap-y-8">
            {arr(c.items).map((it, i) => (
              <div key={i} className="flex items-start gap-5">
                <IconBadge brand={brand} label={s(it.label)} index={i} size="md" override={s(it.icon)} />
                <div className="flex-1">
                  <div className="text-3xl font-semibold" style={{ color: brand.tokens.primary }}>
                    {s(it.label)}
                  </div>
                  <div className="mt-2 text-2xl opacity-80">{s(it.body)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-PROC-TIMELINE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="relative mt-20">
            <div className="absolute left-0 right-0 top-7 h-[3px]" style={{ backgroundColor: brand.tokens.accent }} />
            <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(arr(c.items).length, 1)}, minmax(0, 1fr))` }}>
              {arr(c.items).map((it, i) => (
                <div key={i} className="pr-10">
                  <div className="mb-6 -translate-y-4">
                    <IconBadge brand={brand} label={s(it.label)} index={i} size="md" override={s(it.icon)} />
                  </div>
                  <div className="text-3xl font-semibold" style={{ color: brand.tokens.primary }}>
                    {s(it.label)}
                  </div>
                  <div className="mt-4 text-2xl opacity-80">{s(it.body)}</div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-PROC-PHASES":
      return <NumberedList brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items).map((it) => ({ title: s(it.label), body: s(it.body) }))} />;

    case "MV-PROC-BEFORE-AFTER": {
      const before = obj(c.before);
      const after = obj(c.after);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid grid-cols-2 gap-10">
            <div className="rounded-2xl border p-10" style={{ borderColor: "rgba(10,15,28,0.15)", backgroundColor: brand.tokens.surface }}>
              <div className="text-xl uppercase tracking-[0.25em] opacity-60">Before</div>
              <div className="mt-4 text-4xl font-semibold">{s(before.title)}</div>
              <div className="mt-6 text-2xl leading-snug opacity-80">{s(before.body)}</div>
            </div>
            <div className="rounded-2xl p-10 text-white" style={{ backgroundColor: brand.tokens.primary }}>
              <div className="text-xl uppercase tracking-[0.25em]" style={{ color: brand.tokens.accent }}>After</div>
              <div className="mt-4 text-4xl font-semibold">{s(after.title)}</div>
              <div className="mt-6 text-2xl leading-snug opacity-90">{s(after.body)}</div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    // ── Proof & Data ──────────────────────────────────────────────────
    case "MV-PROOF-LOGOS":
    case "MV-CASE-LOGO-GRID":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid grid-cols-4 gap-6">
            {arr(c.items).map((it, i) => {
              const name = s(it.name ?? it.client);
              const logoUrl = s(it.logoUrl ?? it.logo ?? it.primaryUrl);
              const result = s(it.result);
              return (
                <div
                  key={i}
                  className="flex aspect-[3/2] flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center"
                  style={{ borderColor: "rgba(10,15,28,0.12)", backgroundColor: "#fff", color: brand.tokens.primary }}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={name ? `${name} logo` : "Client logo"}
                      className="max-h-[60%] max-w-[80%] object-contain"
                    />
                  ) : (
                    <div className="text-2xl font-semibold">{name}</div>
                  )}
                  {result && <div className="text-sm font-normal opacity-70">{result}</div>}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );

    case "MV-PROOF-TESTIMONIAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="relative grid h-full grid-cols-[1.35fr_1fr] items-center gap-24">
            <QuoteMark color={brand.tokens.accent} size={560} className="absolute -top-6 -left-4" />
            <div className="relative">
              <Kicker brand={brand}>Testimonial</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-10" />
              <div style={{ fontSize: 60, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-0.015em", color: brand.tokens.primary, maxWidth: 980 }}>
                {s(c.quote)}
              </div>
              <div className="mt-12">
                <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
              </div>
            </div>
            <div className="flex flex-col items-start">
              <Hairline color={brand.tokens.accent} widthPx={56} thicknessPx={2} className="mb-6" />
              <Kicker brand={brand}>Measurable outcome</Kicker>
              <div className="mt-8">
                <StatFigure brand={brand} value={s(c.metric)} size="lg" />
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-DEC-MATRIX":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-10 grid h-[720px] grid-cols-[80px_1fr] grid-rows-[1fr_60px]">
            <div className="flex rotate-180 items-center justify-center text-2xl opacity-70 [writing-mode:vertical-rl]">
              {s(c.axisY)}
            </div>
            <div className="grid grid-cols-2 grid-rows-2 gap-4">
              <Quadrant brand={brand} label={s(c.q2)} />
              <Quadrant brand={brand} label={s(c.q1)} highlight />
              <Quadrant brand={brand} label={s(c.q3)} />
              <Quadrant brand={brand} label={s(c.q4)} />
            </div>
            <div />
            <div className="flex items-center justify-center text-2xl opacity-70">{s(c.axisX)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-DEC-COMPARE-TABLE": {
      const columns = arr(c.columns);
      const rows = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-12 overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(10,15,28,0.1)" }}>
            <div className="grid" style={{ gridTemplateColumns: `2fr ${columns.map(() => "1fr").join(" ")}` }}>
              <div className="p-6 text-xl uppercase tracking-[0.2em] opacity-60">Criteria</div>
              {columns.map((col, i) => (
                <div key={i} className="p-6 text-2xl font-semibold" style={{ color: brand.tokens.primary }}>
                  {s(col.label)}
                </div>
              ))}
              {rows.map((r, ri) => (
                <div key={ri} className="contents">
                  <div className="border-t p-6 text-2xl" style={{ borderColor: "rgba(10,15,28,0.08)" }}>{s(r.criterion)}</div>
                  {strs(r.values).map((v, ci) => (
                    <div key={ci} className="border-t p-6 text-2xl" style={{ borderColor: "rgba(10,15,28,0.08)" }}>{v}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-DEC-CHECKLIST":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-12 grid grid-cols-2 gap-x-14 gap-y-6">
            {arr(c.items).map((it, i) => (
              <div key={i} className="flex items-start gap-5">
                <div
                  className="mt-2 flex h-9 w-9 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: brand.tokens.accent }}
                >
                  ✓
                </div>
                <div>
                  <div className="text-2xl font-semibold">{s(it.label)}</div>
                  {s(it.note) && <div className="mt-1 text-xl opacity-70">{s(it.note)}</div>}
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-COMM-PRICING":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Investment options")} />
          <div className="mt-12 grid grid-cols-3 gap-6">
            {arr(c.items).map((tier, i) => {
              const featured = i === 1;
              return (
                <div
                  key={i}
                  className="rounded-2xl p-10"
                  style={{
                    backgroundColor: featured ? brand.tokens.primary : brand.tokens.surface,
                    color: featured ? "#fff" : brand.tokens.ink,
                    border: `1px solid ${featured ? brand.tokens.primary : "rgba(10,15,28,0.1)"}`,
                  }}
                >
                  <div className="text-2xl uppercase tracking-[0.2em]" style={{ color: brand.tokens.accent }}>
                    {s(tier.name)}
                  </div>
                  <div className="mt-4 text-6xl font-semibold">
                    {s(tier.price)}<span className="text-2xl opacity-70"> {s(tier.unit)}</span>
                  </div>
                  <div className="mt-6 space-y-3 text-xl">
                    {strs(tier.features).map((f, k) => (
                      <div key={k} className="flex gap-3">
                        <span style={{ color: brand.tokens.accent }}>✓</span>
                        <span className="opacity-90">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );

    case "MV-COMM-INVESTMENT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-16 pt-10">
            <div className="flex flex-col justify-center">
              <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>{s(c.title, "Investment")}</div>
              <div className="mt-8 text-[180px] font-semibold leading-none" style={{ color: brand.tokens.primary }}>
                {s(c.amount)}
              </div>
              <div className="mt-4 text-3xl opacity-70">{s(c.unit)}</div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-xl uppercase tracking-[0.2em] opacity-60">Included</div>
              <div className="mt-6 space-y-4">
                {arr(c.items).map((it, i) => (
                  <div key={i} className="flex items-start gap-4 text-2xl">
                    <span className="mt-2 h-2 w-2 rounded-full" style={{ backgroundColor: brand.tokens.accent }} />
                    <span className="opacity-90">{s(it.label)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-RISK-MITIGATION":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Risk & mitigation")} />
          <div className="mt-12 space-y-6">
            {arr(c.items).map((it, i) => (
              <div key={i} className="grid grid-cols-2 gap-8 rounded-xl border p-8" style={{ borderColor: "rgba(10,15,28,0.1)" }}>
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${brand.tokens.accent}22`, color: brand.tokens.accent }}>
                    <AlertTriangle size={28} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-xl uppercase tracking-[0.2em]" style={{ color: brand.tokens.accent }}>Risk</div>
                    <div className="mt-2 text-3xl font-semibold">{s(it.risk)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${brand.tokens.primary}18`, color: brand.tokens.primary }}>
                    <ShieldCheck size={28} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-xl uppercase tracking-[0.2em] opacity-60">Mitigation</div>
                    <div className="mt-2 text-2xl opacity-90">{s(it.mitigation)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    // ── Case Study ─────────────────────────────────────────────────────
    case "MV-CASE-SPREAD":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>Case study</div>
          <div className="mt-6 text-6xl font-semibold">{s(c.client)}</div>
          <div className="mt-14 grid grid-cols-3 gap-12">
            <LabelBlock brand={brand} label="Challenge" body={s(c.challenge)} />
            <LabelBlock brand={brand} label="Solution" body={s(c.solution)} />
            <LabelBlock brand={brand} label="Result" body={s(c.result)} />
          </div>
          <div className="mt-14 text-5xl font-semibold" style={{ color: brand.tokens.accent }}>{s(c.metric)}</div>
        </SlideFrame>
      );

    case "MV-CASE-METRICS":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>Case study</div>
          <div className="mt-6 text-6xl font-semibold">{s(c.client)}</div>
          <div className="mt-8 max-w-5xl text-3xl opacity-80">{s(c.summary)}</div>
          <div className="mt-14 grid grid-cols-3 gap-14">
            {arr(c.items).map((it, i) => (
              <div key={i}>
                <div className="text-[140px] font-semibold leading-none" style={{ color: brand.tokens.primary }}>
                  {s(it.value)}<span className="text-5xl" style={{ color: brand.tokens.accent }}>{s(it.unit)}</span>
                </div>
                <div className="mt-4 text-2xl">{s(it.label)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-CASE-STORY":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-16">
            <div className="flex flex-col justify-center">
              <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>Case study</div>
              <div className="mt-6 text-5xl font-semibold">{s(c.client)}</div>
              <div className="mt-8 text-4xl font-semibold leading-tight">{s(c.headline)}</div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-2xl leading-snug opacity-85">{s(c.story)}</div>
              <div className="mt-10 rounded-xl p-6" style={{ backgroundColor: brand.tokens.surface }}>
                <div className="text-xl uppercase tracking-[0.2em]" style={{ color: brand.tokens.accent }}>Result</div>
                <div className="mt-3 text-3xl font-semibold">{s(c.result)}</div>
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    // ── Governance & Close ─────────────────────────────────────────────
    case "MV-GOV-RACI":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Governance model")} />
          <div className="mt-12 space-y-4">
            {arr(c.items).map((it, i) => (
              <div key={i} className="grid grid-cols-[1.3fr_1fr_2fr] gap-8 rounded-xl border p-6" style={{ borderColor: "rgba(10,15,28,0.1)" }}>
                <div className="text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.forum)}</div>
                <div className="text-xl uppercase tracking-[0.2em]" style={{ color: brand.tokens.accent }}>{s(it.cadence)}</div>
                <div className="text-xl opacity-80">{s(it.purpose)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-REC-NEXT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title="Our recommendation" />
          <div className="mt-14 max-w-6xl text-5xl font-medium leading-tight">{s(c.recommendation)}</div>
          <div className="mt-10 max-w-5xl text-3xl opacity-75">{s(c.rationale)}</div>
        </SlideFrame>
      );

    case "MV-CLOSE-CTA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand}>What happens next</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={96} thicknessPx={2} className="mt-8" />
            <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1520} className="mt-10">
              {s(c.message)}
            </DisplayTitle>
            {s(c.nextSteps) && (
              <SupportingText size="xl" opacity={0.85} maxWidthPx={1280} className="mt-10">
                {s(c.nextSteps)}
              </SupportingText>
            )}
            {(s(c.owner) || s(c.followUp)) && (
              <MetaRow className="mt-16">
                {s(c.owner) && <span>{s(c.owner)}</span>}
                {s(c.followUp) && <span>{s(c.followUp)}</span>}
              </MetaRow>
            )}
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-THANKS":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="flex h-full flex-col justify-center">
            <Hairline color={brand.tokens.accent} widthPx={120} thicknessPx={2} />
            <DisplayTitle size="hero" color="#ffffff" maxWidthPx={1600} className="mt-10">
              {s(c.message, "Thank you.")}
            </DisplayTitle>
            {s(c.signoff) && (
              <SupportingText size="xl" opacity={0.72} maxWidthPx={1180} className="mt-10">
                {s(c.signoff)}
              </SupportingText>
            )}
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-QNA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="relative flex h-full flex-col items-center justify-center text-center">
            {/* Oversized quote glyph, low-opacity, sits behind the title */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                color: brand.tokens.accent,
                fontSize: 720,
                lineHeight: 0.7,
                fontWeight: 600,
                opacity: 0.12,
                letterSpacing: "-0.06em",
              }}
            >
              ?
            </div>
            <div className="relative flex flex-col items-center">
              <Kicker brand={brand}>The floor is yours</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6" />
              <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1400} className="mt-10">
                {s(c.title, "Questions")}
              </DisplayTitle>
              {s(c.prompt) && (
                <SupportingText size="lg" opacity={0.7} maxWidthPx={980} className="mt-8">
                  {s(c.prompt)}
                </SupportingText>
              )}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-CONTACT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div>
            <Kicker brand={brand}>Stay in touch</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6" />
            <DisplayTitle size="section" color="#ffffff" className="mt-8">
              {s(c.title, "Get in touch")}
            </DisplayTitle>
          </div>
          <div className={`mt-14 grid gap-x-20 gap-y-12 ${arr(c.items).length >= 3 ? "grid-cols-3" : arr(c.items).length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {arr(c.items).map((p, i) => (
              <div key={i} className="border-t pt-8" style={{ borderColor: "rgba(255,255,255,0.16)" }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: "#ffffff", letterSpacing: "-0.015em" }}>
                  {s(p.name)}
                </div>
                <div className="mt-2 uppercase" style={{ color: brand.tokens.accent, fontSize: 18, letterSpacing: "0.28em", fontWeight: 600 }}>
                  {s(p.role)}
                </div>
                <div className="mt-6 space-y-2" style={{ fontSize: 24, color: "rgba(255,255,255,0.88)" }}>
                  <div>{s(p.email)}</div>
                  <div style={{ opacity: 0.65 }}>{s(p.phone)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );



    // ── Extended covers ────────────────────────────────────────────────
    case "MV-OP-COVER-EDITORIAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="grid h-full grid-cols-[1.5fr_1fr] gap-16">
            <div className="flex flex-col justify-between">
              <Kicker brand={brand} tracking="0.32em">{s(c.kicker, "Vol. 01")}</Kicker>
              <div>
                <Hairline color={brand.tokens.accent} widthPx={96} thicknessPx={2} className="mb-8" />
                <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1080}>
                  {s(c.title)}
                </DisplayTitle>
                {s(c.subtitle) && (
                  <SupportingText size="xl" opacity={0.82} maxWidthPx={860} className="mt-8">
                    {s(c.subtitle)}
                  </SupportingText>
                )}
              </div>
              <MetaRow>
                <span>Prepared for {s(c.clientName)}</span>
                <span>{s(c.date)}</span>
              </MetaRow>
            </div>
            <div className="flex items-center">
              <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.clientName, "editorial"))} className="aspect-[3/4] w-full" />
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-SPLIT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="-m-24 grid h-[calc(100%+192px)] grid-cols-2">
            <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.clientName, "split"))} className="h-full w-full rounded-none" />
            <div className="relative flex flex-col justify-center p-24 text-white" style={{ backgroundColor: brand.tokens.primary }}>
              {/* Subtle radial glow inside the primary panel */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(80% 60% at 20% 20%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 60%)`,
                }}
              />
              <div className="relative">
                <Kicker brand={brand}>Prepared for {s(c.clientName)}</Kicker>
                <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6" />
                <DisplayTitle size="section" color="#ffffff" maxWidthPx={720} className="mt-8">
                  {s(c.title)}
                </DisplayTitle>
                {s(c.subtitle) && (
                  <SupportingText size="lg" opacity={0.85} maxWidthPx={620} className="mt-8">
                    {s(c.subtitle)}
                  </SupportingText>
                )}
                <MetaRow className="mt-14">
                  <span>{s(c.date)}</span>
                </MetaRow>
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-POSTER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-between">
            <Kicker brand={brand} tracking="0.42em">{s(c.kicker, "A briefing")}</Kicker>
            <DisplayTitle
              size="hero"
              color="#ffffff"
              className="uppercase"
            >
              {s(c.title, "Signal")}
            </DisplayTitle>
            <div className="flex items-center justify-between">
              <Hairline color={brand.tokens.accent} widthPx={140} thicknessPx={2} />
              <MetaRow>
                <span>{s(c.meta, "Confidential")}</span>
                <span>№ 01</span>
              </MetaRow>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-GRID": {
      const items = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2 p-2">
            {(items.length ? items : [{}, {}, {}, {}]).slice(0, 4).map((it, i) => (
              <MediaTile key={i} brand={brand} seed={s(it.seed, `grid-${i}`)} className="h-full w-full rounded-none" />
            ))}
          </div>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(3,0,44,0.15) 0%, rgba(3,0,44,0.55) 55%, rgba(3,0,44,0.85) 100%)`,
            }}
          />
          <div className="relative flex h-full flex-col justify-end text-white">
            <Kicker brand={brand}>{s(c.date, "Briefing")}</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={96} thicknessPx={2} className="mt-8" />
            <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1520} className="mt-10">
              {s(c.title)}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText size="xl" opacity={0.9} maxWidthPx={1180} className="mt-8">
                {s(c.subtitle)}
              </SupportingText>
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-OP-COVER-DOSSIER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-between" style={{ color: brand.tokens.ink }}>
            <div className="flex items-start justify-between">
              <div className="uppercase" style={{ fontSize: 18, letterSpacing: "0.32em", opacity: 0.65 }}>
                Dossier · Ref {s(c.reference, "TP-0001")}
              </div>
              <div
                className="px-4 py-2 uppercase"
                style={{
                  border: `1px solid ${brand.tokens.accent}`,
                  color: brand.tokens.accent,
                  fontSize: 18,
                  letterSpacing: "0.32em",
                  fontWeight: 600,
                }}
              >
                Confidential
              </div>
            </div>
            <div>
              <Hairline color={brand.tokens.accent} widthPx={120} thicknessPx={2} />
              <DisplayTitle size="cover" color={brand.tokens.primary} maxWidthPx={1520} className="mt-10">
                {s(c.title)}
              </DisplayTitle>
              <SupportingText size="lg" opacity={0.75} maxWidthPx={1180} className="mt-8">
                Prepared for {s(c.clientName)}
              </SupportingText>
            </div>
            <div className="grid grid-cols-3 gap-16 border-t pt-8" style={{ borderColor: "rgba(10,15,28,0.14)" }}>
              {[
                ["Prepared by", s(c.prepared, "TransPerfect")],
                ["Date", s(c.date)],
                ["Distribution", "Internal"],
              ].map(([label, value], i) => (
                <div key={i}>
                  <Kicker brand={brand} size={14} tracking="0.32em">{label}</Kicker>
                  <div className="mt-3" style={{ fontSize: 22, letterSpacing: "-0.01em" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-GRADIENT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.clientName, "cover-image"))} className="absolute inset-0 h-full w-full rounded-none" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(120deg, ${brand.tokens.primary}f5 0%, ${brand.tokens.primary}c8 45%, rgba(0,0,0,0.35) 100%)`,
            }}
          />
          <div className="relative flex h-full flex-col justify-end text-white">
            <Kicker brand={brand} tracking="0.32em">Prepared for {s(c.clientName)}</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={96} thicknessPx={2} className="mt-8" />
            <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1520} className="mt-10">
              {s(c.title)}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText size="xl" opacity={0.9} maxWidthPx={1180} className="mt-10">
                {s(c.subtitle)}
              </SupportingText>
            )}
            <MetaRow className="mt-16">
              <span>{s(c.date)}</span>
            </MetaRow>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-MONOGRAM":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="grid h-full grid-cols-[1.15fr_1fr] gap-16">
            <div
              className="relative flex items-center justify-center overflow-hidden rounded-3xl"
              style={{ backgroundColor: brand.tokens.primary, color: "#fff" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(70% 55% at 30% 25%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 60%)`,
                }}
              />
              <div
                className="relative"
                style={{
                  color: brand.tokens.accent,
                  fontSize: 520,
                  lineHeight: 0.82,
                  fontWeight: 600,
                  letterSpacing: "-0.06em",
                }}
              >
                {s(c.monogram, "TP").slice(0, 2).toUpperCase()}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} />
              <DisplayTitle size="section" color="#ffffff" maxWidthPx={720} className="mt-8">
                {s(c.title)}
              </DisplayTitle>
              {s(c.subtitle) && (
                <SupportingText size="lg" opacity={0.75} maxWidthPx={620} className="mt-6">
                  {s(c.subtitle)}
                </SupportingText>
              )}
              <MetaRow className="mt-14">
                <span>{s(c.date)}</span>
              </MetaRow>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-STACKED":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-between">
            <Kicker brand={brand}>{s(c.kicker, "A proposal")}</Kicker>
            <div className="grid grid-cols-[1fr_1.4fr] items-end gap-16">
              <MediaTile brand={brand} seed={s(c.mediaSeed, "stacked")} className="aspect-[4/5] w-full" />
              <div>
                <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mb-8" />
                <DisplayTitle size="section" color="#ffffff" maxWidthPx={1000}>
                  {s(c.title)}
                </DisplayTitle>
                {s(c.subtitle) && (
                  <SupportingText size="xl" opacity={0.82} maxWidthPx={880} className="mt-8">
                    {s(c.subtitle)}
                  </SupportingText>
                )}
              </div>
            </div>
            <MetaRow>
              <span>Prepared with care</span>
              <span>{s(c.date)}</span>
            </MetaRow>
          </div>
        </SlideFrame>
      );


    // ── Image-forward content ──────────────────────────────────────────
    case "MV-IMG-FULL-BLEED":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.title, "hero"))} className="absolute inset-0 h-full w-full rounded-none" />
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(3,0,44,0.48)" }} />
          <div className="relative flex h-full flex-col justify-end text-white">
            <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>
              {s(c.kicker, "In focus")}
            </div>
            <div className="mt-6 max-w-5xl text-[92px] font-semibold leading-[1.02]">{s(c.title)}</div>
            <div className="mt-6 max-w-4xl text-2xl opacity-90">{s(c.body)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-IMG-SPLIT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-14">
            <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.title, "split"))} className="h-full w-full" />
            <div className="flex flex-col justify-center">
              <SlideTitle brand={brand} title={s(c.title)} />
              <div className="mt-8 text-2xl leading-snug opacity-85">{s(c.body)}</div>
              {s(c.caption) && <div className="mt-10 text-lg uppercase tracking-[0.25em] opacity-60">{s(c.caption)}</div>}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-IMG-CAPTION":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col items-center justify-center">
            <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>{s(c.title, "In focus")}</div>
            <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.title, "framed"))} className="mt-8 aspect-[16/9] w-[80%]" />
            <div className="mt-8 max-w-4xl text-center text-2xl opacity-85">{s(c.caption)}</div>
            {s(c.credit) && <div className="mt-3 text-lg uppercase tracking-[0.25em] opacity-50">{s(c.credit)}</div>}
          </div>
        </SlideFrame>
      );

    case "MV-IMG-GRID-3":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "In practice")} />
          <div className="mt-12 grid grid-cols-3 gap-8">
            {arr(c.items).map((it, i) => (
              <div key={i}>
                <MediaTile brand={brand} seed={s(it.seed, `grid3-${i}`)} className="aspect-[4/3] w-full" />
                <div className="mt-4 text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.label)}</div>
                <div className="mt-2 text-xl opacity-75">{s(it.caption)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-IMG-GRID-6":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Selected work")} />
          <div className="mt-10 grid grid-cols-3 grid-rows-2 gap-5">
            {arr(c.items).slice(0, 6).map((it, i) => (
              <div key={i}>
                <MediaTile brand={brand} seed={s(it.seed, `grid6-${i}`)} className="aspect-[4/3] w-full" />
                {s(it.caption) && <div className="mt-2 text-lg opacity-75">{s(it.caption)}</div>}
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-IMG-PORTRAIT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[1fr_1.3fr] gap-14">
            <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.name, "portrait"))} className="h-full w-full" portrait />
            <div className="flex flex-col justify-center">
              <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>{s(c.role)}</div>
              <div className="mt-6 text-6xl font-semibold" style={{ color: brand.tokens.primary }}>{s(c.name)}</div>
              {s(c.quote) && (
                <div className="mt-10 border-l-4 pl-6 text-3xl italic leading-snug" style={{ borderColor: brand.tokens.accent }}>
                  “{s(c.quote)}”
                </div>
              )}
              <div className="mt-8 text-2xl leading-snug opacity-80">{s(c.narrative)}</div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-IMG-QUOTE-BG":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.attribution, "quote"))} className="absolute inset-0 h-full w-full rounded-none" />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(115deg, ${brand.tokens.primary} 8%, ${brand.tokens.primary}CC 42%, ${brand.tokens.primary}66 78%, rgba(0,0,0,0.25) 100%)` }}
          />
          <div className="relative flex h-full flex-col justify-center text-white">
            <QuoteMark color={brand.tokens.accent} size={520} opacity={0.18} className="absolute -top-4 -left-4" />
            <div className="relative max-w-[1500px]">
              <Kicker brand={brand} color={brand.tokens.accent}>In their words</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-10" />
              <div style={{ fontSize: 72, fontWeight: 500, lineHeight: 1.18, letterSpacing: "-0.02em", color: "#ffffff" }}>
                {s(c.quote)}
              </div>
              <div className="mt-14">
                <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-IMG-BEFORE-AFTER": {
      const before = obj(c.before);
      const after = obj(c.after);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "What changes")} />
          <div className="mt-12 grid grid-cols-2 gap-8">
            {[{ label: "Before", panel: before }, { label: "After", panel: after }].map((p, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(10,15,28,0.1)" }}>
                <MediaTile brand={brand} seed={s(p.panel.seed, `${p.label}-${s(p.panel.label)}`)} className="aspect-[16/9] w-full rounded-none" muted={i === 0} />
                <div className="p-8">
                  <div className="text-xl uppercase tracking-[0.25em]" style={{ color: brand.tokens.accent }}>{p.label}</div>
                  <div className="mt-3 text-3xl font-semibold">{s(p.panel.label)}</div>
                  <div className="mt-3 text-xl opacity-80">{s(p.panel.body)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-IMG-STAT-CALLOUT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-14">
            <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.label, "stat"))} className="h-full w-full" />
            <div className="flex flex-col justify-center">
              <div className="text-[220px] font-semibold leading-none" style={{ color: brand.tokens.accent }}>
                {s(c.stat)}
                <span className="align-top text-[110px]">{s(c.unit)}</span>
              </div>
              <div className="mt-6 text-3xl">{s(c.label)}</div>
              <div className="mt-8 max-w-xl text-2xl opacity-80">{s(c.narrative)}</div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-IMG-STRIP":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "A quick look")} />
          <div className="mt-14 grid grid-cols-5 gap-4">
            {arr(c.items).slice(0, 5).map((it, i) => (
              <div key={i}>
                <MediaTile brand={brand} seed={s(it.seed, `strip-${i}`)} className="aspect-[3/4] w-full" />
                {s(it.caption) && <div className="mt-3 text-lg opacity-75">{s(it.caption)}</div>}
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    // ── Expanded quote layouts ────────────────────────────────────────
    case "MV-QUOTE-MULTI":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "What clients tell us")} />
          <div className="mt-12 space-y-6">
            {arr(c.items).slice(0, 3).map((it, i) => (
              <div
                key={i}
                className="grid grid-cols-[60px_1fr_260px] items-center gap-8 rounded-2xl border p-8"
                style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}
              >
                <div className="text-7xl leading-none" style={{ color: brand.tokens.accent }}>“</div>
                <div className="text-2xl leading-snug">{s(it.quote)}</div>
                <div className="text-right">
                  <div className="text-xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.attribution)}</div>
                  <div className="mt-1 text-lg opacity-70">{s(it.role)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-QUOTE-PORTRAIT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[420px_1fr] items-stretch gap-14">
            <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.attribution, "portrait"))} className="h-full w-full" portrait />
            <div className="flex flex-col justify-center">
              <div className="text-[180px] leading-none opacity-15" style={{ color: brand.tokens.accent }}>“</div>
              <div className="-mt-14 text-5xl font-medium leading-[1.2]">{s(c.quote)}</div>
              <div className="mt-10">
                <div className="text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(c.attribution)}</div>
                <div className="mt-2 text-xl opacity-70">{s(c.role)}{s(c.org) && <> <span className="mx-2">·</span> {s(c.org)}</>}</div>
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-QUOTE-CARD":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full items-center justify-center">
            <div
              className="relative max-w-5xl rounded-3xl border p-16"
              style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}
            >
              <div className="absolute -top-2 left-16 h-2 w-40" style={{ backgroundColor: brand.tokens.accent }} />
              <div className="text-6xl leading-none" style={{ color: brand.tokens.accent }}>“</div>
              <div className="mt-6 text-4xl font-medium leading-[1.25]">{s(c.quote)}</div>
              <div className="mt-10 flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(c.attribution)}</div>
                  <div className="mt-1 text-xl opacity-70">{s(c.role)}</div>
                </div>
                <div className="text-lg opacity-60">{s(c.org)}</div>
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-QUOTE-METRIC":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[1fr_360px] items-center gap-16">
            <div>
              <div className="text-[180px] leading-none opacity-15" style={{ color: brand.tokens.accent }}>“</div>
              <div className="-mt-14 text-5xl font-medium leading-[1.2]">{s(c.quote)}</div>
              <div className="mt-8 text-2xl opacity-70">{s(c.attribution)} <span className="mx-2">·</span> {s(c.role)}</div>
            </div>
            <div
              className="rounded-3xl p-10 text-center"
              style={{ backgroundColor: brand.tokens.primary, color: "#fff" }}
            >
              <div className="text-[140px] font-semibold leading-none">
                {s(c.metric)}<span className="align-top text-6xl opacity-90">{s(c.unit)}</span>
              </div>
              <div className="mt-4 text-2xl opacity-90">{s(c.metricLabel)}</div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-QUOTE-POSTER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="absolute inset-0" style={{ backgroundColor: brand.tokens.primary }} />
          <div className="relative flex h-full flex-col justify-center text-white">
            <div className="text-[240px] leading-none opacity-25" style={{ color: brand.tokens.accent }}>“</div>
            <div className="-mt-20 max-w-6xl text-8xl font-semibold leading-[1.05] tracking-tight">{s(c.quote)}</div>
            <div className="mt-14 text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>
              {s(c.attribution)}
            </div>
            <div className="mt-2 text-xl opacity-70">{s(c.role)}</div>
          </div>
        </SlideFrame>
      );

    // ── Infographic options ───────────────────────────────────────────
    case "MV-INFO-DONUT": {
      const items = arr(c.items);
      const total = items.reduce((sum, it) => sum + (typeof it.value === "number" ? it.value : Number(it.value) || 0), 0) || 1;
      const palette = [brand.tokens.primary, brand.tokens.accent, "#4A90A4", "#8E44AD", "#22C1C3"];
      let cum = 0;
      const segments = items.map((it, i) => {
        const v = typeof it.value === "number" ? it.value : Number(it.value) || 0;
        const start = (cum / total) * 360;
        cum += v;
        const end = (cum / total) * 360;
        return `${palette[i % palette.length]} ${start}deg ${end}deg`;
      }).join(", ");
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Where the effort goes")} />
          <div className="mt-10 grid grid-cols-[560px_1fr] items-center gap-16">
            <div className="relative aspect-square w-[560px]">
              <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${segments})` }} />
              <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full text-center" style={{ backgroundColor: brand.tokens.surface }}>
                <div className="text-8xl font-semibold leading-none" style={{ color: brand.tokens.primary }}>
                  {s(c.centerValue)}<span className="text-4xl" style={{ color: brand.tokens.accent }}>{s(c.centerUnit)}</span>
                </div>
                <div className="mt-4 max-w-[80%] text-xl opacity-80">{s(c.centerLabel)}</div>
              </div>
            </div>
            <div className="space-y-5">
              {items.map((it, i) => (
                <div key={i} className="flex items-start gap-5">
                  <div className="mt-3 h-5 w-5 shrink-0 rounded" style={{ backgroundColor: palette[i % palette.length] }} />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-6">
                      <div className="text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.label)}</div>
                      <div className="text-2xl font-semibold" style={{ color: brand.tokens.accent }}>{s(it.value)}%</div>
                    </div>
                    <div className="mt-1 text-lg opacity-70">{s(it.note)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-INFO-FUNNEL": {
      const items = arr(c.items);
      const n = Math.max(items.length, 1);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Funnel")} />
          <div className="mt-12 space-y-3">
            {items.map((it, i) => {
              const widthPct = 100 - (i / n) * 55;
              const shade = 1 - (i / n) * 0.55;
              return (
                <div key={i} className="flex items-center gap-8">
                  <div
                    className="flex h-24 items-center justify-between rounded-xl px-10 text-white"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: brand.tokens.primary,
                      opacity: 0.55 + shade * 0.45,
                    }}
                  >
                    <div className="text-2xl font-semibold">{s(it.label)}</div>
                    <div className="text-3xl font-semibold">{s(it.value)}<span className="ml-2 text-xl opacity-80">{s(it.unit)}</span></div>
                  </div>
                  <div className="flex-1 text-xl opacity-70">{s(it.note)}</div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-INFO-BAR-COMPARE": {
      const items = arr(c.items);
      const values = items.map((it) => (typeof it.value === "number" ? it.value : Number(it.value) || 0));
      const max = Math.max(1, ...values);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Comparison")} />
          <div className="mt-12 space-y-6">
            {items.map((it, i) => {
              const v = values[i];
              const pct = Math.max(6, (v / max) * 100);
              const highlight = i === items.length - 1;
              return (
                <div key={i} className="grid grid-cols-[260px_1fr_120px] items-center gap-6">
                  <div className="text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.label)}</div>
                  <div className="h-14 w-full rounded-lg" style={{ backgroundColor: "rgba(10,15,28,0.06)" }}>
                    <div
                      className="flex h-full items-center rounded-lg px-4 text-white"
                      style={{
                        width: `${pct}%`,
                        background: highlight
                          ? `linear-gradient(90deg, ${brand.tokens.primary}, ${brand.tokens.accent})`
                          : brand.tokens.primary,
                        opacity: highlight ? 1 : 0.55,
                      }}
                    >
                      <span className="text-lg opacity-90">{s(it.note)}</span>
                    </div>
                  </div>
                  <div className="text-right text-3xl font-semibold" style={{ color: highlight ? brand.tokens.accent : brand.tokens.primary }}>
                    {s(it.value)}<span className="ml-1 text-lg opacity-70">{s(c.unit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-INFO-CIRCULAR-FLOW": {
      const items = arr(c.items).slice(0, 6);
      const n = Math.max(items.length, 1);
      const R = 300;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "The cycle")} />
          <div className="relative mx-auto mt-8 h-[780px] w-[780px]">
            <div
              className="absolute inset-[28%] flex items-center justify-center rounded-full text-center text-white"
              style={{ backgroundColor: brand.tokens.primary }}
            >
              <div className="px-6 text-3xl font-semibold leading-tight">{s(c.hub, "Program")}</div>
            </div>
            {items.map((it, i) => {
              const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
              const x = 50 + (R / 780) * 100 * Math.cos(angle);
              const y = 50 + (R / 780) * 100 * Math.sin(angle);
              return (
                <div
                  key={i}
                  className="absolute w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 text-center"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    borderColor: "rgba(10,15,28,0.1)",
                    backgroundColor: brand.tokens.surface,
                  }}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: brand.tokens.accent }}>
                    {(() => { const Ic = pickIcon(s(it.label), i, s(it.icon)); return <Ic size={26} strokeWidth={2} />; })()}
                  </div>
                  <div className="mt-4 text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.label)}</div>
                  <div className="mt-2 text-lg opacity-75">{s(it.body)}</div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-INFO-PYRAMID": {
      const items = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Value pyramid")} />
          <div className="mt-12 grid grid-cols-[1fr_1fr] items-center gap-16">
            <div className="flex flex-col items-center gap-2">
              {items.map((it, i) => {
                const widthPct = 40 + ((items.length - 1 - i) / Math.max(items.length - 1, 1)) * 55;
                const shade = 0.5 + (i / Math.max(items.length - 1, 1)) * 0.5;
                return (
                  <div
                    key={i}
                    className="flex h-24 items-center justify-center rounded text-white"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: brand.tokens.primary,
                      opacity: shade,
                    }}
                  >
                    <div className="text-2xl font-semibold">{s(it.label)}</div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-6">
              {items.map((it, i) => (
                <div key={i} className="border-l-4 pl-6" style={{ borderColor: brand.tokens.accent }}>
                  <div className="text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.label)}</div>
                  <div className="mt-2 text-xl opacity-80">{s(it.body)}</div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-INFO-VENN": {
      const items = arr(c.items).slice(0, 3);
      const colors = [brand.tokens.primary, brand.tokens.accent, "#4A90A4"];
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Where it lives")} />
          <div className="mt-6 grid grid-cols-[720px_1fr] items-center gap-12">
            <div className="relative h-[600px] w-[720px]">
              {[
                { left: "20%", top: "18%" },
                { left: "50%", top: "18%" },
                { left: "35%", top: "48%" },
              ].map((pos, i) => (
                <div
                  key={i}
                  className="absolute h-[380px] w-[380px] rounded-full"
                  style={{ left: pos.left, top: pos.top, backgroundColor: colors[i], opacity: 0.45, mixBlendMode: "multiply" }}
                />
              ))}
              <div className="absolute left-1/2 top-1/2 z-10 max-w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95 p-6 text-center shadow-lg">
                <div className="text-lg uppercase tracking-[0.25em]" style={{ color: brand.tokens.accent }}>Intersection</div>
                <div className="mt-2 text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(c.intersection)}</div>
              </div>
            </div>
            <div className="space-y-6">
              {items.map((it, i) => (
                <div key={i} className="flex items-start gap-5">
                  <div className="mt-2 h-6 w-6 shrink-0 rounded-full" style={{ backgroundColor: colors[i] }} />
                  <div>
                    <div className="text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.label)}</div>
                    <div className="mt-2 text-xl opacity-80">{s(it.body)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    // ── Client & image matrix layouts ─────────────────────────────────
    case "MV-CLIENT-MATRIX":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Client outcomes")} />
          <div className="mt-10 grid grid-cols-3 gap-6">
            {arr(c.items).slice(0, 6).map((it, i) => (
              <div
                key={i}
                className="flex flex-col rounded-2xl border p-6"
                style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-12 w-24 items-center justify-center rounded text-sm font-semibold text-white"
                    style={{ backgroundColor: brand.tokens.primary }}
                  >
                    {s(it.client).split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase()}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] opacity-60">{s(it.sector)}</div>
                </div>
                <div className="mt-5 text-xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.client)}</div>
                <div className="mt-2 flex-1 text-lg opacity-80">{s(it.result)}</div>
                <div className="mt-5 border-t pt-4" style={{ borderColor: "rgba(10,15,28,0.08)" }}>
                  <span className="text-4xl font-semibold" style={{ color: brand.tokens.accent }}>{s(it.metric)}</span>
                  <span className="ml-2 text-lg opacity-70">{s(it.unit)}</span>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-CLIENT-DETAIL-3":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Client engagements")} />
          <div className="mt-10 grid grid-cols-3 gap-6">
            {arr(c.items).slice(0, 3).map((it, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}>
                <MediaTile brand={brand} seed={s(it.seed, s(it.client, `client-${i}`))} className="aspect-[16/10] w-full rounded-none" />
                <div className="p-6">
                  <div className="text-xs uppercase tracking-[0.2em] opacity-60">{s(it.sector)}</div>
                  <div className="mt-2 text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.client)}</div>
                  <div className="mt-3 text-lg leading-snug opacity-80">{s(it.story)}</div>
                  <div className="mt-5 inline-block rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: brand.tokens.primary, color: "#fff" }}>
                    {s(it.metric)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-IMG-MATRIX-4":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "In practice")} />
          <div className="mt-10 grid grid-cols-2 gap-6">
            {arr(c.items).slice(0, 4).map((it, i) => (
              <div key={i} className="grid grid-cols-[240px_1fr] items-center gap-6 overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}>
                <MediaTile brand={brand} seed={s(it.seed, `mx-${i}`)} className="h-full min-h-[200px] w-full rounded-none" />
                <div className="p-6 pr-8">
                  <div className="text-xs uppercase tracking-[0.25em]" style={{ color: brand.tokens.accent }}>{String(i + 1).padStart(2, "0")}</div>
                  <div className="mt-2 text-3xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.label)}</div>
                  <div className="mt-3 text-xl opacity-80">{s(it.body)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-IMG-MATRIX-6":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Program surface area")} />
          <div className="mt-8 grid grid-cols-3 gap-5">
            {arr(c.items).slice(0, 6).map((it, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}>
                <MediaTile brand={brand} seed={s(it.seed, `mx6-${i}`)} className="aspect-[16/10] w-full rounded-none" />
                <div className="p-5">
                  <div className="text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.label)}</div>
                  <div className="mt-2 text-lg opacity-75">{s(it.body)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-CLIENT-COMPARE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Three engagements")} />
          <div className="mt-10 grid grid-cols-3 gap-6">
            {arr(c.items).slice(0, 3).map((it, i) => (
              <div key={i} className="flex flex-col rounded-2xl border" style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}>
                <div className="border-b p-6" style={{ borderColor: "rgba(10,15,28,0.08)" }}>
                  <div className="text-xs uppercase tracking-[0.25em] opacity-60">Client</div>
                  <div className="mt-2 text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.client)}</div>
                </div>
                <div className="border-b p-6" style={{ borderColor: "rgba(10,15,28,0.08)" }}>
                  <div className="text-xs uppercase tracking-[0.25em]" style={{ color: brand.tokens.accent }}>Challenge</div>
                  <div className="mt-2 text-lg opacity-85">{s(it.challenge)}</div>
                </div>
                <div className="flex-1 border-b p-6" style={{ borderColor: "rgba(10,15,28,0.08)" }}>
                  <div className="text-xs uppercase tracking-[0.25em]" style={{ color: brand.tokens.accent }}>Outcome</div>
                  <div className="mt-2 text-lg opacity-85">{s(it.outcome)}</div>
                </div>
                <div className="p-6 text-center" style={{ backgroundColor: brand.tokens.primary, color: "#fff" }}>
                  <div className="text-2xl font-semibold" style={{ color: brand.tokens.accent }}>{s(it.metric)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    // ── Expanded CTA / close variants ─────────────────────────────────
    case "MV-CLOSE-TIMELINE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "What happens next")} />
          <div className="relative mt-20">
            <div className="absolute left-0 right-0 top-10 h-[3px]" style={{ backgroundColor: brand.tokens.accent }} />
            <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(arr(c.items).length, 1)}, minmax(0, 1fr))` }}>
              {arr(c.items).map((it, i) => (
                <div key={i} className="pr-8">
                  <div className="mb-8 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: brand.tokens.accent, transform: "translateY(4px)" }}>
                    {i + 1}
                  </div>
                  <div className="text-3xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.label)}</div>
                  <div className="mt-4 text-xl opacity-80">{s(it.body)}</div>
                  {s(it.owner) && (
                    <div className="mt-4 text-sm uppercase tracking-[0.2em] opacity-60">Owner · {s(it.owner)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-CHECKLIST":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "What happens next")} />
          <div className="mt-12 space-y-4">
            {arr(c.items).map((it, i) => (
              <div
                key={i}
                className="grid grid-cols-[60px_1fr_260px_180px] items-center gap-6 rounded-xl border p-6"
                style={{ borderColor: "rgba(10,15,28,0.08)", backgroundColor: brand.tokens.surface }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2" style={{ borderColor: brand.tokens.accent, color: brand.tokens.accent }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-11" /></svg>
                </div>
                <div className="text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.label)}</div>
                <div className="text-lg opacity-75">{s(it.owner)}</div>
                <div className="text-right text-lg font-medium" style={{ color: brand.tokens.accent }}>{s(it.when)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-DECISION":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-center">
            <div className="text-2xl uppercase tracking-[0.35em] opacity-70" style={{ color: brand.tokens.accent }}>{s(c.kicker, "The ask")}</div>
            <div className="mt-10 max-w-5xl text-8xl font-semibold leading-[1.05]" style={{ color: brand.tokens.primary }}>{s(c.ask)}</div>
            <div className="mt-14 max-w-4xl text-3xl leading-snug opacity-85">{s(c.rationale)}</div>
            <div className="mt-16 inline-flex items-center gap-6">
              <div className="rounded-full px-8 py-4 text-xl font-semibold text-white" style={{ backgroundColor: brand.tokens.primary }}>Decision by</div>
              <div className="text-3xl font-semibold" style={{ color: brand.tokens.accent }}>{s(c.decisionBy)}</div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-CALENDAR":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[520px_1fr] items-center gap-16">
            <div
              className="overflow-hidden rounded-3xl text-center text-white shadow-2xl"
              style={{ backgroundColor: brand.tokens.primary }}
            >
              <div className="border-b border-white/20 py-5 text-xl uppercase tracking-[0.3em] opacity-90">Kickoff</div>
              <div className="px-10 py-14">
                <div className="text-[220px] font-semibold leading-none">{s(c.date)}</div>
                <div className="mt-6 text-3xl">{s(c.day)}</div>
                <div className="mt-2 text-xl opacity-80">{s(c.monthYear)}</div>
              </div>
            </div>
            <div>
              <div className="text-lg uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>{s(c.title, "Kickoff")}</div>
              <div className="mt-6 text-4xl font-semibold leading-snug" style={{ color: brand.tokens.primary }}>{s(c.body)}</div>
              <div className="mt-10 border-t pt-6 text-xl opacity-70" style={{ borderColor: "rgba(10,15,28,0.1)" }}>
                {s(c.owner)}
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-STATEMENT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="absolute inset-0" style={{ backgroundColor: brand.tokens.primary }} />
          <div className="relative flex h-full flex-col justify-between py-4 text-white">
            <div className="text-2xl uppercase tracking-[0.35em]" style={{ color: brand.tokens.accent }}>{s(c.kicker)}</div>
            <div className="max-w-6xl text-9xl font-semibold leading-[0.98] tracking-tight">{s(c.statement)}</div>
            <div className="text-2xl opacity-80">{s(c.signoff)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-SPLIT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-14">
            <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.title, "cta"))} className="h-full w-full" />
            <div className="flex flex-col justify-center">
              <div className="text-5xl font-semibold leading-tight" style={{ color: brand.tokens.primary }}>{s(c.title)}</div>
              <div className="mt-8 text-2xl leading-snug opacity-85">{s(c.body)}</div>
              <div className="mt-12 rounded-2xl p-8 text-white" style={{ backgroundColor: brand.tokens.primary }}>
                <div className="text-xs uppercase tracking-[0.3em] opacity-80">Call to action</div>
                <div className="mt-3 text-4xl font-semibold">{s(c.ctaLabel)}</div>
                <div className="mt-3 text-xl opacity-90">{s(c.ctaDetail)}</div>
              </div>
              <div className="mt-8 text-lg uppercase tracking-[0.25em] opacity-60">{s(c.owner)}</div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-DUAL-CTA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Two ways to start")} />
          <div className="mt-14 grid grid-cols-2 gap-10">
            {arr(c.items).slice(0, 2).map((it, i) => {
              const highlight = i === 0;
              return (
                <div
                  key={i}
                  className="flex flex-col rounded-3xl p-12"
                  style={{
                    backgroundColor: highlight ? brand.tokens.primary : brand.tokens.surface,
                    color: highlight ? "#fff" : brand.tokens.ink,
                    border: highlight ? "none" : "1px solid rgba(10,15,28,0.1)",
                  }}
                >
                  <div className="text-lg uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>
                    {highlight ? "Recommended" : "Alternative"}
                  </div>
                  <div className="mt-4 text-5xl font-semibold">{s(it.label)}</div>
                  <div className="mt-6 flex-1 text-xl leading-snug opacity-90">{s(it.body)}</div>
                  <div
                    className="mt-10 flex items-center justify-center gap-3 rounded-full px-8 py-4 text-center text-xl font-semibold"
                    style={{
                      backgroundColor: highlight ? brand.tokens.accent : brand.tokens.primary,
                      color: "#fff",
                    }}
                  >
                    <span>{s(it.ctaLabel)}</span>
                    <ArrowRight size={22} strokeWidth={2.5} />
                  </div>
                  <div className="mt-4 text-center text-sm opacity-70">{s(it.note)}</div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-METRIC-PROMISE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-center">
            <div className="flex items-center gap-4 text-xl uppercase tracking-[0.35em]" style={{ color: brand.tokens.accent }}>
              <Trophy size={26} strokeWidth={2} />
              <span>{s(c.kicker, "Our commitment")}</span>
            </div>
            <div className="mt-10 flex items-baseline gap-6">
              <div className="text-[320px] font-semibold leading-none" style={{ color: brand.tokens.primary }}>
                {s(c.metric)}
              </div>
              <div className="text-8xl font-semibold" style={{ color: brand.tokens.accent }}>{s(c.unit)}</div>
            </div>
            <div className="mt-6 max-w-5xl text-5xl font-semibold leading-tight" style={{ color: brand.tokens.primary }}>{s(c.promise)}</div>
            <div className="mt-10 text-2xl opacity-80">{s(c.timeframe)}</div>
            <div className="mt-12 text-lg uppercase tracking-[0.3em] opacity-60">{s(c.owner)}</div>
          </div>
        </SlideFrame>
      );

    default:


      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8 text-3xl opacity-70">{variant.description}</div>
        </SlideFrame>
      );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// MediaTile — deterministic image tile used wherever a module wants imagery.
// Light mode stays plain; dark mode uses real backdrop assets only.
// ────────────────────────────────────────────────────────────────────────────
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Real photographic backdrops used inside MediaTile.
// MediaTile now pulls from division-specific image repositories keyed by brand id.
import { getDivisionImagery } from "@/assets/backdrops/divisions";

function MediaTile({
  brand,
  seed,
  className,
  portrait,
  muted,
}: {
  brand: BrandMode;
  seed: string;
  className?: string;
  portrait?: boolean;
  muted?: boolean;
}) {
  const mode = useContext(SlideModeContext);
  const h = hash(seed || brand.id);
  const grayscale = muted ? "grayscale(60%) brightness(0.9)" : undefined;

  // Division-specific imagery: photos + abstracts for the active brand.
  const divSet = getDivisionImagery(brand.id);
  const tileBackdrops = [...divSet.photos, ...divSet.abstracts];
  const url = tileBackdrops[h % tileBackdrops.length];
  const accent = brand.tokens.accent;
  const primary = brand.tokens.primary;

  // Light mode: same photographic backdrop treatment, but with a lighter
  // scrim and softer washes so imagery reads bright and airy.
  if (mode === "light") {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl ${className ?? ""}`}
        style={{ background: "#F2F2F2", filter: grayscale }}
      >
        <img
          src={url}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "brightness(1.05) saturate(0.9)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[18%] top-[8%] h-[52%] w-[58%] rounded-full"
          style={{
            backgroundColor: `${accent}26`,
            filter: "blur(34px)",
            mixBlendMode: "multiply",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[18%] right-[-18%] h-[58%] w-[58%] rounded-full"
          style={{
            backgroundColor: `${primary}22`,
            filter: "blur(38px)",
            mixBlendMode: "multiply",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(255,255,255,0.28)" }}
        />
        {portrait && (
          <div
            className="absolute left-1/2 top-[58%] h-[70%] w-[45%] -translate-x-1/2 rounded-t-full"
            style={{ backgroundColor: "rgba(10,15,28,0.08)" }}
          />
        )}
      </div>
    );
  }

  // Dark mode: use a real photographic backdrop with a simple scrim and
  // translucent brand-color washes. No generated radial/dot/pattern layers.
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{ background: "#03002C", filter: grayscale }}
    >
      <img
        src={url}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "brightness(0.85) saturate(0.95)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[18%] top-[8%] h-[52%] w-[58%] rounded-full"
        style={{
          backgroundColor: `${accent}2E`,
          filter: "blur(34px)",
          mixBlendMode: "screen",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[18%] right-[-18%] h-[58%] w-[58%] rounded-full"
        style={{
          backgroundColor: `${primary}36`,
          filter: "blur(38px)",
          mixBlendMode: "screen",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(3,0,44,0.42)" }}
      />
      {portrait && (
        <div
          className="absolute left-1/2 top-[58%] h-[70%] w-[45%] -translate-x-1/2 rounded-t-full"
          style={{ backgroundColor: `${accent}33`, mixBlendMode: "soft-light" }}
        />
      )}
    </div>
  );
}




// ────────────────────────────────────────────────────────────────────────────
// Shared building blocks
// ────────────────────────────────────────────────────────────────────────────

function CardGrid({
  brand,
  pageNumber,
  title,
  items,
  cols,
  rows,
}: {
  brand: BrandMode;
  pageNumber: number;
  title: string;
  items: Item[];
  cols: number;
  rows?: number;
}) {
  const gridClass = cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4";
  return (
    <SlideFrame brand={brand} pageNumber={pageNumber}>
      <SlideTitle brand={brand} title={title} />
      <div className={`mt-14 grid gap-10 ${gridClass}`} style={rows ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } : undefined}>
        {items.map((it, i) => (
          <Card key={i} brand={brand} title={s(it.title)} body={s(it.body)} index={i + 1} icon={s(it.icon)} />
        ))}
      </div>
    </SlideFrame>
  );
}

// ── Infographic stat tiles ─────────────────────────────────────────────
// Each tile rotates through a palette (A/B/C testing per position), draws
// a shape treatment behind the number (ring, bar, block, or split), and
// scales the number's font size to the character length so short + long
// values both feel proportionate.

type StatStyle = "block" | "tinted" | "ring" | "bar" | "split";

function statTilePalette(brand: BrandMode, index: number): { bg: string; ink: string; accent: string; muted: string; style: StatStyle } {
  const styles: StatStyle[] = ["block", "tinted", "ring", "bar", "split"];
  // A/B/C rotation — first tile leads with the strongest treatment.
  const rotation = [
    { bg: brand.tokens.primary, ink: "#ffffff", accent: brand.tokens.accent, muted: "rgba(255,255,255,0.7)" },
    { bg: `color-mix(in oklab, ${brand.tokens.accent} 14%, ${brand.tokens.surface})`, ink: brand.tokens.ink, accent: brand.tokens.accent, muted: "rgba(10,15,28,0.6)" },
    { bg: brand.tokens.surface, ink: brand.tokens.ink, accent: brand.tokens.primary, muted: "rgba(10,15,28,0.55)" },
    { bg: brand.tokens.accent, ink: "#ffffff", accent: "rgba(255,255,255,0.9)", muted: "rgba(255,255,255,0.75)" },
  ];
  const palette = rotation[index % rotation.length];
  return { ...palette, style: styles[index % styles.length] };
}

function statFontSize(value: string, unit: string): { valuePx: number; unitPx: number } {
  const len = (value ?? "").length + Math.min((unit ?? "").length, 2);
  if (len <= 3) return { valuePx: 200, unitPx: 72 };
  if (len <= 4) return { valuePx: 168, unitPx: 60 };
  if (len <= 6) return { valuePx: 136, unitPx: 52 };
  if (len <= 8) return { valuePx: 108, unitPx: 44 };
  return { valuePx: 88, unitPx: 36 };
}

function StatTile({ brand, item, index, dense }: { brand: BrandMode; item: Item; index: number; dense: boolean }) {
  const value = s(item.value);
  const unit = s(item.unit);
  const source = s(item.source);
  // Content-level override wins; otherwise rotation.
  const rotated = statTilePalette(brand, index);
  const style = ((item as { style?: string }).style as StatStyle) || rotated.style;
  const { bg, ink, accent, muted } = rotated;
  const font = statFontSize(value, unit);
  const scale = dense ? 0.78 : 1;
  const valuePx = Math.round(font.valuePx * scale);
  const unitPx = Math.round(font.unitPx * scale);

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-2xl p-10"
      style={{ backgroundColor: bg, color: ink }}
    >
      {/* Background shape treatment */}
      {style === "ring" && (
        <div
          className="pointer-events-none absolute -right-16 -top-16 rounded-full"
          style={{
            width: 340,
            height: 340,
            border: `24px solid ${accent}`,
            opacity: 0.28,
          }}
        />
      )}
      {style === "bar" && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2"
          style={{ backgroundColor: accent }}
        />
      )}
      {style === "split" && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-2"
          style={{ backgroundColor: accent }}
        />
      )}
      {style === "tinted" && (
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 rounded-full"
          style={{ width: 280, height: 280, backgroundColor: accent, opacity: 0.12 }}
        />
      )}

      <div className="relative flex-1">
        {s(item.title) && (
          <div className="text-lg uppercase tracking-[0.28em]" style={{ color: muted }}>
            {s(item.title)}
          </div>
        )}
        <div
          className="mt-4 font-semibold leading-[0.95] tabular-nums"
          style={{ fontSize: valuePx, color: ink }}
        >
          {value || "—"}
          {unit && (
            <span
              className="ml-2 align-top font-medium"
              style={{ fontSize: unitPx, color: accent }}
            >
              {unit}
            </span>
          )}
        </div>
        <div className="mt-6 text-2xl leading-snug" style={{ color: ink, opacity: 0.92 }}>
          {s(item.label)}
        </div>
      </div>

      {source && (
        <div className="relative mt-6 text-sm uppercase tracking-[0.2em]" style={{ color: muted }}>
          Source · {source}
        </div>
      )}
    </div>
  );
}

function StatGrid({
  brand,
  pageNumber,
  title,
  items,
  cols,
  rows,
}: {
  brand: BrandMode;
  pageNumber: number;
  title: string;
  items: Item[];
  cols: number;
  rows?: number;
}) {
  const gridClass = cols === 2 ? "grid-cols-2" : "grid-cols-3";
  const dense = (rows ?? 1) * cols >= 4;
  return (
    <SlideFrame brand={brand} pageNumber={pageNumber}>
      <SlideTitle brand={brand} title={title || "Proof"} />
      <div
        className={`mt-12 grid gap-6 ${gridClass}`}
        style={rows ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } : undefined}
      >
        {items.map((it, i) => (
          <StatTile key={i} brand={brand} item={it} index={i} dense={dense} />
        ))}
      </div>
    </SlideFrame>
  );
}


function NumberedList({ brand, pageNumber, title, items }: { brand: BrandMode; pageNumber: number; title: string; items: Item[] }) {
  return (
    <SlideFrame brand={brand} pageNumber={pageNumber}>
      <SlideTitle brand={brand} title={title} />
      <div className="mt-12 space-y-6">
        {items.map((it, i) => {
          const label = s(it.title ?? it.label);
          return (
            <div key={i} className="flex items-start gap-8 rounded-xl border p-8" style={{ borderColor: "rgba(10,15,28,0.08)", backgroundColor: brand.tokens.surface }}>
              <IconBadge brand={brand} label={label} index={i} size="lg" override={s(it.icon)} />
              <div className="w-20 text-5xl font-semibold" style={{ color: brand.tokens.accent }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex-1">
                <div className="text-3xl font-semibold" style={{ color: brand.tokens.primary }}>{label}</div>
                <div className="mt-3 text-2xl opacity-80">{s(it.body)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
}

function SlideTitle({ brand, title, kicker }: { brand: BrandMode; title: string; kicker?: string }) {
  return <TitleBlock brand={brand} title={title} kicker={kicker} size="title" />;
}


function Card({ brand, title, body, index, icon }: { brand: BrandMode; title: string; body: string; index: number; icon?: string }) {
  return (
    <div className="rounded-2xl border p-10" style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}>
      <div className="flex items-center gap-5">
        <IconBadge brand={brand} label={title} index={index - 1} size="md" override={icon} />
        <div className="text-2xl font-semibold" style={{ color: brand.tokens.accent }}>
          {String(index).padStart(2, "0")}
        </div>
      </div>
      <div className="mt-6 text-4xl font-semibold" style={{ color: brand.tokens.primary }}>
        {title}
      </div>
      <div className="mt-6 text-2xl leading-snug opacity-80">{body}</div>
    </div>
  );
}

function Quadrant({ brand, label, highlight }: { brand: BrandMode; label: string; highlight?: boolean }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border p-6 text-3xl font-medium"
      style={{
        borderColor: "rgba(10,15,28,0.15)",
        backgroundColor: highlight ? brand.tokens.primary : brand.tokens.surface,
        color: highlight ? "#fff" : brand.tokens.ink,
      }}
    >
      {label}
    </div>
  );
}

function LabelBlock({ brand, label, body }: { brand: BrandMode; label: string; body: string }) {
  return (
    <div>
      <div className="text-xl uppercase tracking-[0.25em]" style={{ color: brand.tokens.accent }}>
        {label}
      </div>
      <div className="mt-4 text-2xl leading-snug">{body}</div>
    </div>
  );
}
