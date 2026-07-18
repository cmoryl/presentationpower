import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";
import { SlideFrame as BaseSlideFrame, SlideModeContext, type SlideMode } from "./SlideChrome";
import { createContext, useContext, Fragment } from "react";
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
          <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.clientName, "cover-media"))} overrideUrl={s(c.mediaUrl)} className="absolute inset-0 h-full w-full rounded-none" />
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
          <div className={`mt-14 grid gap-12 ${arr(c.items).length === 4 ? "grid-cols-4" : arr(c.items).length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {arr(c.items).map((p, i) => (
              <div key={i} className="pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <div
                  className="mb-6 h-24 w-24 rounded-full"
                  style={{ backgroundColor: brand.tokens.accent, opacity: 0.9 }}
                  aria-hidden
                />
                <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.015em", color: brand.tokens.primary }}>
                  {s(p.name)}
                </div>
                {s(p.role) && (
                  <div className="mt-2 uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", color: "rgba(10,15,28,0.62)", fontWeight: 500 }}>
                    {s(p.role)}
                  </div>
                )}
                <SupportingText size="md" opacity={0.72} className="mt-5" maxWidthPx={420}>
                  {s(p.bio ?? p.note)}
                </SupportingText>
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
          <div className="mt-12 grid grid-cols-2 gap-10" style={{ gridTemplateRows: "1fr 1fr" }}>
            <div className="row-span-2 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
              <Kicker brand={brand}>Hero</Kicker>
              <div className="mt-6" style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.05, color: brand.tokens.primary }}>
                {s(hero.title)}
              </div>
              <SupportingText size="lg" opacity={0.75} className="mt-6" maxWidthPx={560}>
                {s(hero.body)}
              </SupportingText>
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
          <div className="mt-14">
            {arr(c.items).map((it, i) => (
              <div key={i}>
                {i > 0 && <SoftDivider />}
                <div className="flex items-center gap-10 py-7">
                  <div
                    className="w-16 tabular-nums"
                    style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.18em", color: brand.tokens.accent }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="w-72" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.015em", color: i === 0 ? brand.tokens.primary : brand.tokens.ink }}>
                    {s(it.label)}
                  </div>
                  <SupportingText size="md" opacity={0.72} className="flex-1">{s(it.body)}</SupportingText>
                </div>
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
          <div className="relative mt-24">
            {/* Hairline connector at node baseline */}
            <div
              className="absolute left-0 right-8 top-[9px] h-px"
              style={{ backgroundColor: brand.tokens.accent, opacity: 0.55 }}
            />
            <div className="grid gap-10" style={{ gridTemplateColumns: `repeat(${Math.max(arr(c.items).length, 1)}, minmax(0, 1fr))` }}>
              {arr(c.items).map((it, i) => (
                <div key={i} className="pr-8">
                  {/* Refined node — small precise dot on the rule */}
                  <div className="relative mb-8" style={{ height: 18 }}>
                    <div
                      className="absolute left-0"
                      style={{
                        top: 3,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        backgroundColor: brand.tokens.accent,
                        boxShadow: `0 0 0 4px ${brand.tokens.surface}`,
                      }}
                    />
                  </div>
                  <div
                    className="mb-3 uppercase tabular-nums"
                    style={{ fontSize: 18, letterSpacing: "0.28em", color: brand.tokens.accent, fontWeight: 600 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em", lineHeight: 1.15 }}>
                    {s(it.label)}
                  </div>
                  <div className="mt-4" style={{ fontSize: 22, lineHeight: 1.4, color: "rgba(10,15,28,0.72)" }}>
                    {s(it.body)}
                  </div>
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
          <div className="mt-14 grid grid-cols-2 gap-16">
            <div className="flex flex-col pt-8" style={{ borderTop: "1px solid rgba(10,15,28,0.15)" }}>
              <Kicker brand={brand} color="rgba(10,15,28,0.55)">Before</Kicker>
              <div className="mt-8" style={{ fontSize: 40, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                {s(before.title)}
              </div>
              <div className="mt-6" style={{ fontSize: 24, lineHeight: 1.4, color: "rgba(10,15,28,0.72)" }}>
                {s(before.body)}
              </div>
            </div>
            <div className="flex flex-col pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
              <Kicker brand={brand}>After</Kicker>
              <div className="mt-8" style={{ fontSize: 40, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                {s(after.title)}
              </div>
              <div className="mt-6" style={{ fontSize: 24, lineHeight: 1.4, color: "rgba(10,15,28,0.82)" }}>
                {s(after.body)}
              </div>
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
      const winnerIdx = typeof (c as { winnerIndex?: number }).winnerIndex === "number" ? (c as { winnerIndex?: number }).winnerIndex : undefined;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14">
            <div className="grid gap-x-8" style={{ gridTemplateColumns: `2fr ${columns.map(() => "1fr").join(" ")}` }}>
              {/* Editorial column headers — small caps + hairline underline */}
              <div className="pb-4 uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", color: "rgba(10,15,28,0.55)", fontWeight: 600, borderBottom: "1px solid rgba(10,15,28,0.15)" }}>
                Criteria
              </div>
              {columns.map((col, i) => (
                <div
                  key={i}
                  className="pb-4 uppercase"
                  style={{
                    fontSize: 20,
                    letterSpacing: "0.24em",
                    fontWeight: 600,
                    color: winnerIdx === i ? brand.tokens.accent : brand.tokens.primary,
                    borderBottom: `${winnerIdx === i ? 2 : 1}px solid ${winnerIdx === i ? brand.tokens.accent : "rgba(10,15,28,0.15)"}`,
                  }}
                >
                  {s(col.label)}
                </div>
              ))}
              {rows.map((r, ri) => (
                <div key={ri} className="contents">
                  <div
                    className="py-5"
                    style={{ fontSize: 24, letterSpacing: "-0.01em", color: brand.tokens.primary, borderBottom: "1px solid rgba(10,15,28,0.10)" }}
                  >
                    {s(r.criterion)}
                  </div>
                  {strs(r.values).map((v, ci) => (
                    <div
                      key={ci}
                      className="py-5"
                      style={{
                        fontSize: 24,
                        color: winnerIdx === ci ? brand.tokens.primary : "rgba(10,15,28,0.75)",
                        fontWeight: winnerIdx === ci ? 600 : 400,
                        borderBottom: "1px solid rgba(10,15,28,0.10)",
                      }}
                    >
                      {v}
                    </div>
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
          <div className="mt-14 grid grid-cols-2 gap-x-20 gap-y-0">
            {arr(c.items).map((it, i) => (
              <div
                key={i}
                className="flex items-start gap-6 py-6"
                style={{ borderBottom: "1px solid rgba(10,15,28,0.10)" }}
              >
                <div
                  className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center"
                  style={{ border: `2px solid ${brand.tokens.accent}`, color: brand.tokens.accent, fontSize: 18, fontWeight: 700 }}
                >
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.01em", lineHeight: 1.25 }}>
                    {s(it.label)}
                  </div>
                  {s(it.note) && (
                    <div className="mt-2" style={{ fontSize: 20, lineHeight: 1.4, color: "rgba(10,15,28,0.65)" }}>
                      {s(it.note)}
                    </div>
                  )}
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
          <div className="mt-12 grid grid-cols-3 gap-12">
            {arr(c.items).map((tier, i) => {
              const featured = i === 1;
              return (
                <div
                  key={i}
                  className="pt-8"
                  style={{ borderTop: `${featured ? 3 : 1}px solid ${featured ? brand.tokens.accent : "rgba(10,15,28,0.12)"}` }}
                >
                  <Kicker brand={brand} color={featured ? brand.tokens.accent : "rgba(10,15,28,0.55)"}>
                    {s(tier.name)}
                  </Kicker>
                  <div
                    className="mt-6 font-semibold tabular-nums"
                    style={{ fontSize: 88, lineHeight: 0.95, letterSpacing: "-0.03em", color: brand.tokens.primary }}
                  >
                    {s(tier.price)}
                    {s(tier.unit) && (
                      <span className="ml-2 font-medium" style={{ fontSize: 26, color: brand.tokens.accent, letterSpacing: "-0.01em" }}>
                        {s(tier.unit)}
                      </span>
                    )}
                  </div>
                  <div className="mt-8 space-y-4">
                    {strs(tier.features).map((f, k) => (
                      <div key={k}>
                        {k > 0 && <SoftDivider />}
                        <div className="flex gap-4 py-3" style={{ fontSize: 22, lineHeight: 1.35 }}>
                          <span style={{ color: brand.tokens.accent, fontWeight: 600 }}>—</span>
                          <span style={{ opacity: 0.82 }}>{f}</span>
                        </div>
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
          <div className="grid h-full grid-cols-2 items-center gap-24">
            <div>
              <Kicker brand={brand}>{s(c.title, "Investment")}</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={88} thicknessPx={2} className="mt-6 mb-10" />
              <StatFigure
                brand={brand}
                value={s(c.amount)}
                unit={s(c.unit)}
                size="monumental"
              />
            </div>
            <div>
              <Hairline color={brand.tokens.accent} widthPx={56} thicknessPx={2} className="mb-6" />
              <Kicker brand={brand}>Included</Kicker>
              <div className="mt-8 space-y-5">
                {arr(c.items).map((it, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-5 pt-5"
                    style={{ borderTop: i === 0 ? "none" : "1px solid rgba(10,15,28,0.10)" }}
                  >
                    <span className="mt-3 h-2 w-8" style={{ backgroundColor: brand.tokens.accent }} />
                    <span style={{ fontSize: 26, lineHeight: 1.3, letterSpacing: "-0.01em", color: brand.tokens.primary }}>
                      {s(it.label)}
                    </span>
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
          <div className="mt-12">
            <div
              className="grid grid-cols-[80px_1fr_1fr] gap-10 pb-4 uppercase"
              style={{ fontSize: 18, letterSpacing: "0.28em", color: "rgba(10,15,28,0.55)", borderBottom: `1px solid ${brand.tokens.accent}` }}
            >
              <div className="tabular-nums">№</div>
              <div>Risk</div>
              <div>Mitigation</div>
            </div>
            {arr(c.items).map((it, i) => (
              <div key={i}>
                {i > 0 && <SoftDivider />}
                <div className="grid grid-cols-[80px_1fr_1fr] items-start gap-10 py-6">
                  <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.18em", color: brand.tokens.accent }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.01em", color: brand.tokens.primary }}>{s(it.risk)}</div>
                  <SupportingText size="md" opacity={0.72}>{s(it.mitigation)}</SupportingText>
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
          <Kicker brand={brand}>Case study</Kicker>
          <Hairline color={brand.tokens.accent} widthPx={88} thicknessPx={2} className="mt-6 mb-8" />
          <DisplayTitle size="section" color={brand.tokens.primary}>{s(c.client)}</DisplayTitle>
          <div className="mt-14 grid grid-cols-3 gap-14">
            <LabelBlock brand={brand} label="Challenge" body={s(c.challenge)} />
            <LabelBlock brand={brand} label="Solution" body={s(c.solution)} />
            <LabelBlock brand={brand} label="Result" body={s(c.result)} />
          </div>
          {s(c.metric) && (
            <div className="mt-16">
              <StatFigure brand={brand} value={s(c.metric)} label="Outcome" size="lg" />
            </div>
          )}
        </SlideFrame>
      );

    case "MV-CASE-METRICS":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <Kicker brand={brand}>Case study</Kicker>
          <Hairline color={brand.tokens.accent} widthPx={88} thicknessPx={2} className="mt-6 mb-8" />
          <DisplayTitle size="section" color={brand.tokens.primary}>{s(c.client)}</DisplayTitle>
          <SupportingText size="lg" opacity={0.72} className="mt-8" maxWidthPx={1180}>{s(c.summary)}</SupportingText>
          <div className="mt-14 grid grid-cols-3 gap-14">
            {arr(c.items).map((it, i) => (
              <div key={i} className={i > 0 ? "pl-10" : ""} style={i > 0 ? { borderLeft: "1px solid rgba(10,15,28,0.10)" } : undefined}>
                <StatFigure brand={brand} value={s(it.value)} unit={s(it.unit)} label={s(it.label)} size="lg" />
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-CASE-STORY":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-20">
            <div className="flex flex-col justify-center">
              <Kicker brand={brand}>Case study</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-8" />
              <DisplayTitle size="section" color={brand.tokens.primary}>{s(c.client)}</DisplayTitle>
              <div className="mt-8" style={{ fontSize: 42, fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                {s(c.headline)}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <SupportingText size="lg" opacity={0.82}>{s(c.story)}</SupportingText>
              <div className="mt-10 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <Kicker brand={brand}>Result</Kicker>
                <div className="mt-4" style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", color: brand.tokens.primary }}>
                  {s(c.result)}
                </div>
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
          <div className="mt-12">
            <div
              className="grid grid-cols-[1.3fr_1fr_2fr] gap-10 pb-4 uppercase"
              style={{ fontSize: 18, letterSpacing: "0.28em", color: "rgba(10,15,28,0.55)", borderBottom: `1px solid ${brand.tokens.accent}` }}
            >
              <div>Forum</div>
              <div>Cadence</div>
              <div>Purpose</div>
            </div>
            {arr(c.items).map((it, i) => (
              <div key={i}>
                {i > 0 && <SoftDivider />}
                <div className="grid grid-cols-[1.3fr_1fr_2fr] items-start gap-10 py-6">
                  <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.01em", color: brand.tokens.primary }}>{s(it.forum)}</div>
                  <div className="uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", color: brand.tokens.accent, fontWeight: 600 }}>{s(it.cadence)}</div>
                  <SupportingText size="md" opacity={0.72}>{s(it.purpose)}</SupportingText>
                </div>
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
              backgroundImage: `linear-gradient(180deg, ${brand.tokens.primary}26 0%, ${brand.tokens.primary}8C 55%, ${brand.tokens.primary}E6 100%)`,
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
              className="relative flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: `radial-gradient(120% 90% at 20% 15%, ${brand.tokens.primary} 0%, ${brand.tokens.primary}DD 55%, ${brand.tokens.primary}66 100%)`,
                color: "#fff",
              }}
            >
              <div
                className="relative"
                style={{
                  color: brand.tokens.accent,
                  fontSize: 520,
                  lineHeight: 0.82,
                  fontWeight: 600,
                  letterSpacing: "-0.06em",
                  opacity: 0.9,
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
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `linear-gradient(180deg, ${brand.tokens.primary}33 0%, ${brand.tokens.primary}99 55%, ${brand.tokens.primary}E6 100%)` }}
          />
          <div className="relative flex h-full flex-col justify-end text-white">
            <Kicker brand={brand}>{s(c.kicker, "In focus")}</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={96} thicknessPx={2} className="mt-6 mb-8" />
            <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1600}>{s(c.title)}</DisplayTitle>
            <SupportingText size="xl" opacity={0.9} maxWidthPx={1180} className="mt-8">{s(c.body)}</SupportingText>
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
              <SupportingText size="lg" opacity={0.82} className="mt-8" maxWidthPx={720}>{s(c.body)}</SupportingText>
              {s(c.caption) && (
                <MetaRow className="mt-12">
                  <span>{s(c.caption)}</span>
                </MetaRow>
              )}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-IMG-CAPTION":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col items-center justify-center">
            <Kicker brand={brand}>{s(c.title, "In focus")}</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-8" />
            <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.title, "framed"))} className="aspect-[16/9] w-[80%]" />
            <SupportingText size="lg" opacity={0.85} className="mt-10 text-center" maxWidthPx={1100}>{s(c.caption)}</SupportingText>
            {s(c.credit) && (
              <MetaRow className="mt-6">
                <span>{s(c.credit)}</span>
              </MetaRow>
            )}
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
                <div className="mt-5" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.01em", color: brand.tokens.primary }}>{s(it.label)}</div>
                <SupportingText size="md" opacity={0.72} className="mt-2">{s(it.caption)}</SupportingText>
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
                {s(it.caption) && (
                  <div className="mt-3 uppercase" style={{ fontSize: 16, letterSpacing: "0.28em", color: "rgba(10,15,28,0.6)" }}>
                    {s(it.caption)}
                  </div>
                )}
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
              <Kicker brand={brand}>{s(c.role)}</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-8" />
              <DisplayTitle size="section" color={brand.tokens.primary}>{s(c.name)}</DisplayTitle>
              {s(c.quote) && (
                <div className="relative mt-10 pl-8" style={{ borderLeft: `2px solid ${brand.tokens.accent}` }}>
                  <div style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.3, letterSpacing: "-0.01em", color: brand.tokens.primary }}>
                    “{s(c.quote)}”
                  </div>
                </div>
              )}
              <SupportingText size="lg" opacity={0.78} className="mt-8" maxWidthPx={720}>{s(c.narrative)}</SupportingText>
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
              <div key={i} className="pt-0">
                <MediaTile brand={brand} seed={s(p.panel.seed, `${p.label}-${s(p.panel.label)}`)} className="aspect-[16/9] w-full rounded-none" muted={i === 0} />
                <div className="mt-8 pt-6" style={{ borderTop: `${i === 1 ? 2 : 1}px solid ${i === 1 ? brand.tokens.accent : "rgba(10,15,28,0.12)"}` }}>
                  <Kicker brand={brand} color={i === 1 ? brand.tokens.accent : "rgba(10,15,28,0.55)"}>{p.label}</Kicker>
                  <div className="mt-4" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.015em", color: brand.tokens.primary }}>{s(p.panel.label)}</div>
                  <SupportingText size="md" opacity={0.72} className="mt-3">{s(p.panel.body)}</SupportingText>
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
          <div className="grid h-full grid-cols-2 gap-16">
            <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.label, "stat"))} className="h-full w-full" />
            <div className="flex flex-col justify-center">
              <Kicker brand={brand}>Signal</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-10" />
              <StatFigure
                brand={brand}
                value={s(c.stat)}
                unit={s(c.unit)}
                label={s(c.label)}
                size="xl"
              />
              <SupportingText size="lg" opacity={0.8} maxWidthPx={560} className="mt-10">
                {s(c.narrative)}
              </SupportingText>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-IMG-STRIP":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "A quick look")} />
          <div className="mt-14 grid grid-cols-5 gap-6">
            {arr(c.items).slice(0, 5).map((it, i) => (
              <div key={i}>
                <MediaTile brand={brand} seed={s(it.seed, `strip-${i}`)} className="aspect-[3/4] w-full" />
                {s(it.caption) && (
                  <MetaRow className="mt-4">
                    <span>{s(it.caption)}</span>
                  </MetaRow>
                )}
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
          <div className="mt-14 grid grid-cols-1 gap-0">
            {arr(c.items).slice(0, 3).map((it, i) => (
              <div
                key={i}
                className="grid grid-cols-[80px_1fr_320px] items-start gap-10 py-10"
                style={{ borderTop: i === 0 ? "none" : "1px solid rgba(10,15,28,0.10)" }}
              >
                <QuoteMark color={brand.tokens.accent} size={110} opacity={0.9} className="-mt-4" />
                <div style={{ fontSize: 30, lineHeight: 1.32, letterSpacing: "-0.01em", color: brand.tokens.primary }}>
                  {s(it.quote)}
                </div>
                <div className="text-right">
                  <Attribution brand={brand} name={s(it.attribution)} role={s(it.role)} />
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-QUOTE-PORTRAIT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[420px_1fr] items-stretch gap-16">
            <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.attribution, "portrait"))} className="h-full w-full" portrait />
            <div className="relative flex flex-col justify-center">
              <QuoteMark color={brand.tokens.accent} size={520} className="absolute -top-4 -left-2" />
              <div className="relative">
                <Kicker brand={brand}>In their words</Kicker>
                <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-10" />
                <div style={{ fontSize: 60, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-0.015em", color: brand.tokens.primary, maxWidth: 1080 }}>
                  {s(c.quote)}
                </div>
                <div className="mt-14">
                  <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} org={s(c.org)} />
                </div>
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-QUOTE-CARD":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full items-center justify-center">
            <div className="relative max-w-[1300px]">
              <QuoteMark color={brand.tokens.accent} size={560} className="absolute -top-10 -left-6" />
              <div className="relative">
                <Kicker brand={brand}>Testimonial</Kicker>
                <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-10" />
                <div style={{ fontSize: 56, fontWeight: 500, lineHeight: 1.22, letterSpacing: "-0.015em", color: brand.tokens.primary }}>
                  {s(c.quote)}
                </div>
                <div className="mt-14 flex items-end justify-between gap-10">
                  <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
                  {s(c.org) && (
                    <MetaRow>
                      <span>{s(c.org)}</span>
                    </MetaRow>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-QUOTE-METRIC":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="relative grid h-full grid-cols-[1.3fr_1fr] items-center gap-24">
            <QuoteMark color={brand.tokens.accent} size={520} className="absolute -top-6 -left-4" />
            <div className="relative">
              <Kicker brand={brand}>In their words</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-10" />
              <div style={{ fontSize: 58, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-0.015em", color: brand.tokens.primary }}>
                {s(c.quote)}
              </div>
              <div className="mt-12">
                <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
              </div>
            </div>
            <div>
              <Hairline color={brand.tokens.accent} widthPx={56} thicknessPx={2} className="mb-6" />
              <Kicker brand={brand}>{s(c.metricLabel, "Outcome")}</Kicker>
              <div className="mt-8">
                <StatFigure brand={brand} value={s(c.metric)} unit={s(c.unit)} size="xl" />
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-QUOTE-POSTER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="relative flex h-full flex-col justify-center text-white">
            <QuoteMark color={brand.tokens.accent} size={780} opacity={0.16} className="absolute -top-6 -left-4" />
            <div className="relative">
              <Kicker brand={brand} color={brand.tokens.accent}>Testimonial</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={120} thicknessPx={2} className="mt-8 mb-12" />
              <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1620}>
                {s(c.quote)}
              </DisplayTitle>
              <div className="mt-16">
                <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
              </div>
            </div>
          </div>
        </SlideFrame>
      );
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
                  className="absolute w-[240px] -translate-x-1/2 -translate-y-1/2 p-2 text-center"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${brand.tokens.accent}22`, color: brand.tokens.accent }}>
                    {(() => { const Ic = pickIcon(s(it.label), i, s(it.icon)); return <Ic size={24} strokeWidth={2} />; })()}
                  </div>
                  <div className="mt-4" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em", color: brand.tokens.primary }}>{s(it.label)}</div>
                  <SupportingText size="sm" opacity={0.72} className="mt-2">{s(it.body)}</SupportingText>
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
          <div className="mt-10 grid grid-cols-3 gap-x-10 gap-y-12">
            {arr(c.items).slice(0, 6).map((it, i) => (
              <div key={i} className="pt-6" style={{ borderTop: `1px solid rgba(10,15,28,0.12)` }}>
                <div className="flex items-center justify-between">
                  <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.18em", color: brand.tokens.accent }}>
                    {s(it.client).split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase()}
                  </div>
                  <Kicker brand={brand} color="rgba(10,15,28,0.55)" size={16}>{s(it.sector)}</Kicker>
                </div>
                <div className="mt-6" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.015em", color: brand.tokens.primary }}>{s(it.client)}</div>
                <SupportingText size="md" opacity={0.75} className="mt-3">{s(it.result)}</SupportingText>
                <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(10,15,28,0.08)" }}>
                  <StatFigure brand={brand} value={s(it.metric)} unit={s(it.unit)} size="sm" />
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
          <div className="mt-10 grid grid-cols-3 gap-8">
            {arr(c.items).slice(0, 3).map((it, i) => (
              <div key={i}>
                <MediaTile brand={brand} seed={s(it.seed, s(it.client, `client-${i}`))} className="aspect-[16/10] w-full" />
                <div className="mt-6 pt-5" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                  <Kicker brand={brand} color="rgba(10,15,28,0.55)" size={16}>{s(it.sector)}</Kicker>
                  <div className="mt-4" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.015em", color: brand.tokens.primary }}>{s(it.client)}</div>
                  <SupportingText size="md" opacity={0.78} className="mt-3">{s(it.story)}</SupportingText>
                  <div className="mt-6" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: brand.tokens.accent }}>
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
          <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-10">
            {arr(c.items).slice(0, 4).map((it, i) => (
              <div key={i} className="grid grid-cols-[240px_1fr] items-start gap-8">
                <MediaTile brand={brand} seed={s(it.seed, `mx-${i}`)} className="aspect-[4/3] w-full" />
                <div className="pt-2">
                  <div className="tabular-nums uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", color: brand.tokens.accent, fontWeight: 600 }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="mt-4" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.015em", color: brand.tokens.primary }}>{s(it.label)}</div>
                  <SupportingText size="md" opacity={0.75} className="mt-3">{s(it.body)}</SupportingText>
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
          <div className="mt-8 grid grid-cols-3 gap-x-8 gap-y-10">
            {arr(c.items).slice(0, 6).map((it, i) => (
              <div key={i}>
                <MediaTile brand={brand} seed={s(it.seed, `mx6-${i}`)} className="aspect-[16/10] w-full" />
                <div className="mt-5" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em", color: brand.tokens.primary }}>{s(it.label)}</div>
                <SupportingText size="sm" opacity={0.72} className="mt-2">{s(it.body)}</SupportingText>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-CLIENT-COMPARE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Three engagements")} />
          <div className="mt-10 grid grid-cols-3 gap-12">
            {arr(c.items).slice(0, 3).map((it, i) => (
              <div key={i} className="flex flex-col pt-6" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <Kicker brand={brand} color="rgba(10,15,28,0.55)" size={16}>Client</Kicker>
                <div className="mt-3" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.015em", color: brand.tokens.primary }}>{s(it.client)}</div>
                <SoftDivider className="mt-6" />
                <div className="mt-6">
                  <Kicker brand={brand} size={16}>Challenge</Kicker>
                  <SupportingText size="md" opacity={0.82} className="mt-3">{s(it.challenge)}</SupportingText>
                </div>
                <SoftDivider className="mt-6" />
                <div className="mt-6 flex-1">
                  <Kicker brand={brand} size={16}>Outcome</Kicker>
                  <SupportingText size="md" opacity={0.82} className="mt-3">{s(it.outcome)}</SupportingText>
                </div>
                <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(10,15,28,0.12)" }}>
                  <StatFigure brand={brand} value={s(it.metric)} size="sm" />
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
          <div className="mt-12">
            <div
              className="grid grid-cols-[60px_1fr_260px_180px] items-center gap-8 pb-4 uppercase"
              style={{ fontSize: 18, letterSpacing: "0.28em", color: "rgba(10,15,28,0.55)", borderBottom: `1px solid ${brand.tokens.accent}` }}
            >
              <div></div>
              <div>Action</div>
              <div>Owner</div>
              <div className="text-right">When</div>
            </div>
            {arr(c.items).map((it, i) => (
              <div key={i}>
                {i > 0 && <SoftDivider />}
                <div className="grid grid-cols-[60px_1fr_260px_180px] items-center gap-8 py-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ border: `1.5px solid ${brand.tokens.accent}`, color: brand.tokens.accent }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5 9-11" /></svg>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.01em", color: brand.tokens.primary }}>{s(it.label)}</div>
                  <SupportingText size="md" opacity={0.72}>{s(it.owner)}</SupportingText>
                  <div className="text-right uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", color: brand.tokens.accent, fontWeight: 600 }}>{s(it.when)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-DECISION":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand}>{s(c.kicker, "The ask")}</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={96} thicknessPx={2} className="mt-8 mb-10" />
            <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1600}>{s(c.ask)}</DisplayTitle>
            <SupportingText size="xl" opacity={0.85} className="mt-10" maxWidthPx={1180}>{s(c.rationale)}</SupportingText>
            <div className="mt-16 flex items-baseline gap-10">
              <Kicker brand={brand} color="rgba(255,255,255,0.65)">Decision by</Kicker>
              <div style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-0.02em", color: brand.tokens.accent }}>{s(c.decisionBy)}</div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-CALENDAR":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[520px_1fr] items-center gap-20">
            <div className="flex flex-col items-center text-center">
              <Kicker brand={brand}>Kickoff</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-10" />
              <div className="tabular-nums" style={{ fontSize: 260, lineHeight: 0.9, fontWeight: 600, letterSpacing: "-0.04em", color: brand.tokens.primary }}>
                {s(c.date)}
              </div>
              <div className="mt-6" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.01em", color: brand.tokens.primary }}>{s(c.day)}</div>
              <div className="mt-2 uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", color: "rgba(10,15,28,0.6)" }}>{s(c.monthYear)}</div>
            </div>
            <div>
              <Kicker brand={brand}>{s(c.title, "Kickoff")}</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-8" />
              <div style={{ fontSize: 48, fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.02em", color: brand.tokens.primary }}>{s(c.body)}</div>
              <SoftDivider className="mt-10 mb-6" />
              <MetaRow><span>{s(c.owner)}</span></MetaRow>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-STATEMENT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="relative flex h-full flex-col justify-between py-4 text-white">
            <Kicker brand={brand}>{s(c.kicker)}</Kicker>
            <DisplayTitle size="hero" color="#ffffff" maxWidthPx={1700}>{s(c.statement)}</DisplayTitle>
            <MetaRow><span>{s(c.signoff)}</span></MetaRow>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-SPLIT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-16">
            <MediaTile brand={brand} seed={s(c.mediaSeed, s(c.title, "cta"))} className="h-full w-full" />
            <div className="flex flex-col justify-center">
              <Kicker brand={brand}>Next step</Kicker>
              <Hairline color={brand.tokens.accent} widthPx={72} thicknessPx={2} className="mt-6 mb-8" />
              <DisplayTitle size="title" color={brand.tokens.primary}>{s(c.title)}</DisplayTitle>
              <SupportingText size="lg" opacity={0.82} className="mt-8" maxWidthPx={720}>{s(c.body)}</SupportingText>
              <div className="mt-12 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <Kicker brand={brand}>Call to action</Kicker>
                <div className="mt-4" style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.02em", color: brand.tokens.primary }}>{s(c.ctaLabel)}</div>
                <SupportingText size="md" opacity={0.75} className="mt-3">{s(c.ctaDetail)}</SupportingText>
              </div>
              <MetaRow className="mt-10"><span>{s(c.owner)}</span></MetaRow>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-DUAL-CTA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Two ways to start")} />
          <div className="mt-14 grid grid-cols-2 gap-16">
            {arr(c.items).slice(0, 2).map((it, i) => {
              const highlight = i === 0;
              return (
                <div
                  key={i}
                  className="flex flex-col pt-8"
                  style={{ borderTop: `${highlight ? 3 : 1}px solid ${highlight ? brand.tokens.accent : "rgba(10,15,28,0.12)"}` }}
                >
                  <Kicker brand={brand} color={highlight ? brand.tokens.accent : "rgba(10,15,28,0.55)"}>
                    {highlight ? "Recommended" : "Alternative"}
                  </Kicker>
                  <div className="mt-6" style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.05, color: brand.tokens.primary }}>
                    {s(it.label)}
                  </div>
                  <SupportingText size="lg" opacity={0.78} className="mt-6 flex-1" maxWidthPx={620}>{s(it.body)}</SupportingText>
                  <div className="mt-10 flex items-center gap-4" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.005em", color: highlight ? brand.tokens.accent : brand.tokens.primary }}>
                    <span>{s(it.ctaLabel)}</span>
                    <ArrowRight size={22} strokeWidth={2.5} />
                  </div>
                  {s(it.note) && (
                    <MetaRow className="mt-6"><span>{s(it.note)}</span></MetaRow>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-METRIC-PROMISE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand} color={brand.tokens.accent}>
              <Trophy size={22} strokeWidth={2} className="mr-3 inline-block align-[-0.15em]" />
              {s(c.kicker, "Our commitment")}
            </Kicker>
            <Hairline color={brand.tokens.accent} widthPx={120} thicknessPx={2} className="mt-8 mb-12" />
            <StatFigure
              brand={brand}
              value={s(c.metric)}
              unit={s(c.unit)}
              size="monumental"
              valueColor="#ffffff"
            />
            <div className="mt-14 max-w-[1500px]">
              <DisplayTitle size="section" color="#ffffff">
                {s(c.promise)}
              </DisplayTitle>
            </div>
            {(s(c.timeframe) || s(c.owner)) && (
              <MetaRow className="mt-16">
                {s(c.timeframe) && <span>{s(c.timeframe)}</span>}
                {s(c.owner) && <span>{s(c.owner)}</span>}
              </MetaRow>
            )}
          </div>
        </SlideFrame>
      );

    // ── Advanced variants — BATCH 1 ──────────────────────────────────────
    case "MV-BENTO-5": {
      const items = arr(c.items);
      const anchor = items[0] ?? {};
      const rest = items.slice(1, 5);
      const cellClass = "flex flex-col justify-between p-10";
      const cellBorder = { border: "1px solid rgba(10,15,28,0.10)" } as const;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10 grid gap-6" style={{ gridTemplateColumns: "1.5fr 1fr 1fr", gridTemplateRows: "1fr 1fr", height: 720 }}>
            <div className={cellClass} style={{ ...cellBorder, gridRow: "1 / span 2" }}>
              <div className="flex items-center gap-4">
                <IconBadge brand={brand} label={s(anchor.title)} index={0} size="md" override={s(anchor.icon)} treatment="soft-tile" />
                <Kicker brand={brand}>Anchor</Kicker>
              </div>
              <div className="mt-auto">
                <div style={{ fontSize: 44, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{s(anchor.title)}</div>
                <div className="mt-5" style={{ fontSize: 24, lineHeight: 1.42, color: "rgba(10,15,28,0.72)" }}>{s(anchor.body)}</div>
              </div>
            </div>
            {rest.map((it, i) => {
              const kind = s(it.kind, "body");
              return (
                <div key={i} className={cellClass} style={cellBorder}>
                  {kind === "stat" ? (
                    <>
                      <IconBadge brand={brand} label={s(it.label)} index={i + 1} size="sm" override={s(it.icon)} treatment="soft-tile" />
                      <div className="mt-auto">
                        <StatFigure brand={brand} value={s(it.value)} unit={s(it.unit)} label={s(it.label)} size="md" />
                      </div>
                    </>
                  ) : kind === "media" ? (
                    <div className="relative -m-10 h-full overflow-hidden">
                      <MediaTile brand={brand} seed={s(it.mediaSeed, s(it.title, `bento-${i}`))} className="absolute inset-0 h-full w-full rounded-none" />
                      <div className="absolute inset-x-6 bottom-6 uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", color: "#fff" }}>{s(it.title)}</div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <IconBadge brand={brand} label={s(it.title)} index={i + 1} size="sm" override={s(it.icon)} treatment="soft-tile" />
                        <Kicker brand={brand}>{String(i + 2).padStart(2, "0")}</Kicker>
                      </div>
                      <div className="mt-auto">
                        <div style={{ fontSize: 28, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em", lineHeight: 1.15 }}>{s(it.title)}</div>
                        <div className="mt-3" style={{ fontSize: 20, lineHeight: 1.4, color: "rgba(10,15,28,0.7)" }}>{s(it.body)}</div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-KPI-DASHBOARD": {
      const items = arr(c.items).slice(0, 8);
      const cols = items.length <= 6 ? 3 : 4;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-14 grid gap-x-12 gap-y-14" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {items.map((it, i) => {
              const trend = s(it.trend);
              const trendColor = trend === "down" ? brand.tokens.accent : brand.tokens.accent;
              return (
                <div key={i} className="pt-6" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="uppercase" style={{ fontSize: 16, letterSpacing: "0.28em", color: "rgba(10,15,28,0.6)", fontWeight: 600 }}>{s(it.label)}</div>
                    <IconBadge brand={brand} label={s(it.label)} index={i} size="sm" override={s(it.icon)} treatment="glyph" />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="tabular-nums font-semibold" style={{ fontSize: 88, lineHeight: 0.95, letterSpacing: "-0.025em", color: brand.tokens.primary }}>{s(it.value)}</span>
                    {s(it.unit) && <span className="font-medium" style={{ fontSize: 34, color: brand.tokens.accent, letterSpacing: "-0.015em" }}>{s(it.unit)}</span>}
                  </div>
                  {s(it.delta) && (
                    <div className="mt-3 flex items-center gap-2" style={{ fontSize: 18, color: trendColor, letterSpacing: "0.02em" }}>
                      {trend === "down" ? "▼" : "▲"} <span className="tabular-nums font-semibold">{s(it.delta)}</span>
                      <span style={{ color: "rgba(10,15,28,0.55)" }}>vs. baseline</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-ROADMAP-QUARTERS": {
      const quarters = strs(c.quarters).length ? strs(c.quarters) : ["Q1", "Q2", "Q3", "Q4"];
      const items = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-14">
            <div className="grid gap-6" style={{ gridTemplateColumns: `240px repeat(${quarters.length}, minmax(0, 1fr))` }}>
              <div />
              {quarters.map((q, i) => (
                <div key={i} className="pb-4 uppercase" style={{ fontSize: 20, letterSpacing: "0.28em", color: brand.tokens.accent, fontWeight: 600, borderBottom: `2px solid ${brand.tokens.accent}` }}>{q}</div>
              ))}
              {items.map((it, i) => {
                const start = Math.max(1, Number(it.start ?? 1));
                const end = Math.min(quarters.length, Number(it.end ?? start));
                const span = end - start + 1;
                return (
                  <>
                    <div key={`l-${i}`} className="py-5 pr-6" style={{ fontSize: 22, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.01em", borderTop: "1px solid rgba(10,15,28,0.08)" }}>
                      {s(it.label)}
                      {s(it.note) && <div className="mt-1" style={{ fontSize: 16, fontWeight: 400, color: "rgba(10,15,28,0.6)", letterSpacing: 0 }}>{s(it.note)}</div>}
                    </div>
                    {Array.from({ length: quarters.length }).map((_, q) => {
                      const active = q + 1 >= start && q + 1 <= end;
                      const isStart = q + 1 === start;
                      return (
                        <div key={`c-${i}-${q}`} className="py-5" style={{ borderTop: "1px solid rgba(10,15,28,0.08)" }}>
                          {isStart && (
                            <div
                              style={{
                                gridColumn: `span ${span}`,
                                height: 24,
                                background: `linear-gradient(90deg, ${brand.tokens.primary}, ${brand.tokens.accent})`,
                                width: `calc(${span * 100}% + ${(span - 1) * 24}px)`,
                                opacity: 0.9,
                              }}
                            />
                          )}
                          {!active && !isStart && <div style={{ height: 24 }} />}
                        </div>
                      );
                    })}
                  </>
                );
              })}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-FUNNEL": {
      const items = arr(c.items);
      const n = items.length || 1;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-12 flex flex-col items-center gap-3">
            {items.map((it, i) => {
              const width = 100 - (i / n) * 55;
              return (
                <div key={i} className="flex w-full items-center justify-center">
                  <div
                    className="flex items-center justify-between px-10 py-6"
                    style={{
                      width: `${width}%`,
                      background: `linear-gradient(90deg, ${brand.tokens.primary}${i === 0 ? "" : ""}, ${brand.tokens.accent})`,
                      opacity: 0.92 - i * 0.08,
                      color: "#fff",
                    }}
                  >
                    <div className="flex items-center gap-5">
                      <IconBadge brand={brand} label={s(it.label)} index={i} size="md" override={s(it.icon)} treatment="on-dark" tone="onDark" />
                      <div>
                        <div className="uppercase" style={{ fontSize: 16, letterSpacing: "0.28em", opacity: 0.85 }}>{String(i + 1).padStart(2, "0")}</div>
                        <div className="mt-2" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.015em" }}>{s(it.label)}</div>
                        {s(it.note) && <div className="mt-1" style={{ fontSize: 18, opacity: 0.85 }}>{s(it.note)}</div>}
                      </div>
                    </div>
                    <div className="tabular-nums font-semibold text-right" style={{ fontSize: 56, letterSpacing: "-0.02em", lineHeight: 1 }}>
                      {s(it.value)}<span className="ml-1" style={{ fontSize: 26, opacity: 0.9 }}>{s(it.unit)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-FLYWHEEL": {
      const items = arr(c.items);
      const n = items.length || 4;
      const R = 300;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="relative mx-auto mt-10" style={{ width: 820, height: 720 }}>
            <svg viewBox="-400 -360 800 720" className="absolute inset-0 h-full w-full">
              <circle cx="0" cy="0" r={R} fill="none" stroke={brand.tokens.accent} strokeWidth={2} opacity={0.5} />
              {items.map((_, i) => {
                const a1 = (i / n) * Math.PI * 2 - Math.PI / 2;
                const a2 = ((i + 0.85) / n) * Math.PI * 2 - Math.PI / 2;
                const x1 = Math.cos(a1) * R, y1 = Math.sin(a1) * R;
                const x2 = Math.cos(a2) * R, y2 = Math.sin(a2) * R;
                return <path key={i} d={`M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`} stroke={brand.tokens.primary} strokeWidth={4} fill="none" markerEnd="url(#fw-arrow)" opacity={0.9} />;
              })}
              <defs>
                <marker id="fw-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={brand.tokens.primary} />
                </marker>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center" style={{ width: 260 }}>
                <Kicker brand={brand}>Hub</Kicker>
                <div className="mt-3" style={{ fontSize: 30, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em", lineHeight: 1.15 }}>{s(c.hub, "Program")}</div>
              </div>
            </div>
            {items.map((it, i) => {
              const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * R + 400;
              const y = Math.sin(angle) * R + 360;
              return (
                <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: x, top: y, width: 220 }}>
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#fff", border: `2px solid ${brand.tokens.accent}` }}>
                    <IconBadge brand={brand} label={s(it.label)} index={i} size="sm" override={s(it.icon)} treatment="glyph" />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em" }}>{s(it.label)}</div>
                  {s(it.note) && <div className="mt-1" style={{ fontSize: 16, color: "rgba(10,15,28,0.66)" }}>{s(it.note)}</div>}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-MATURITY-CURVE": {
      const items = arr(c.items);
      const n = Math.max(items.length, 2);
      const W = 1600, H = 460;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-12">
            <svg viewBox={`0 0 ${W} ${H + 140}`} className="w-full">
              <line x1="0" y1={H} x2={W} y2={H} stroke="rgba(10,15,28,0.15)" strokeWidth={1} />
              <path
                d={`M 40 ${H - 20} Q ${W * 0.35} ${H - 40} ${W * 0.55} ${H * 0.6} T ${W - 40} 40`}
                fill="none"
                stroke={brand.tokens.primary}
                strokeWidth={4}
              />
              {items.map((it, i) => {
                const t = i / (n - 1);
                const x = 40 + t * (W - 80);
                const y = H - 20 - t * (H - 60);
                const current = Boolean(it.current);
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r={current ? 16 : 10} fill={current ? brand.tokens.accent : "#fff"} stroke={brand.tokens.primary} strokeWidth={3} />
                    <text x={x} y={y - 28} textAnchor="middle" fontSize={26} fontWeight={600} fill={brand.tokens.primary} style={{ letterSpacing: "-0.01em" }}>{s(it.label)}</text>
                    <text x={x} y={H + 40} textAnchor="middle" fontSize={18} fill="rgba(10,15,28,0.65)">{s(it.note)}</text>
                    {current && <text x={x} y={y + 44} textAnchor="middle" fontSize={16} fontWeight={600} fill={brand.tokens.accent} style={{ letterSpacing: "0.28em", textTransform: "uppercase" }}>You are here</text>}
                  </g>
                );
              })}
            </svg>
          </div>
        </SlideFrame>
      );
    }

    case "MV-JOURNEY-MAP": {
      const items = arr(c.items);
      const n = Math.max(items.length, 2);
      const W = 1600, H = 260;
      const points = items.map((it, i) => {
        const x = 60 + (i / (n - 1)) * (W - 120);
        const sent = Math.max(1, Math.min(5, Number(it.sentiment ?? 3)));
        const y = H - ((sent - 1) / 4) * (H - 40) - 20;
        return { x, y, it };
      });
      const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
              {items.map((it, i) => (
                <div key={i} className="pb-5" style={{ borderBottom: `2px solid ${brand.tokens.accent}` }}>
                  <div className="flex items-center gap-3">
                    <IconBadge brand={brand} label={s(it.phase)} index={i} size="sm" override={s(it.icon)} treatment="soft-circle" />
                    <Kicker brand={brand}>Phase {String(i + 1).padStart(2, "0")}</Kicker>
                  </div>
                  <div className="mt-2" style={{ fontSize: 28, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em" }}>{s(it.phase)}</div>
                  <div className="mt-2" style={{ fontSize: 18, color: "rgba(10,15,28,0.7)", lineHeight: 1.4 }}>{s(it.touchpoint)}</div>
                </div>
              ))}
            </div>
            <svg viewBox={`0 0 ${W} ${H + 40}`} className="mt-8 w-full">
              <path d={path} fill="none" stroke={brand.tokens.primary} strokeWidth={3} />
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={11} fill={brand.tokens.accent} stroke="#fff" strokeWidth={3} />
                  <text x={p.x} y={p.y - 20} textAnchor="middle" fontSize={18} fontWeight={600} fill={brand.tokens.primary}>{String(p.it.sentiment ?? "")}/5</text>
                </g>
              ))}
              <text x={20} y={20} fontSize={14} fill="rgba(10,15,28,0.55)" style={{ letterSpacing: "0.28em", textTransform: "uppercase" }}>High</text>
              <text x={20} y={H} fontSize={14} fill="rgba(10,15,28,0.55)" style={{ letterSpacing: "0.28em", textTransform: "uppercase" }}>Low</text>
            </svg>
          </div>
        </SlideFrame>
      );
    }

    case "MV-LOGO-WALL": {
      const items = arr(c.items);
      const cols = items.length <= 8 ? 4 : items.length <= 10 ? 5 : 6;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-14 grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {items.map((it, i) => {
              const name = s(it.name);
              const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div key={i} className="flex aspect-[4/3] items-center justify-center" style={{ borderRight: (i + 1) % cols === 0 ? "none" : "1px solid rgba(10,15,28,0.10)", borderBottom: "1px solid rgba(10,15,28,0.10)", borderTop: i < cols ? "1px solid rgba(10,15,28,0.10)" : "none", borderLeft: i % cols === 0 ? "1px solid rgba(10,15,28,0.10)" : "none" }}>
                  {s(it.logoUrl) ? (
                    <img src={s(it.logoUrl)} alt={name} className="max-h-16 max-w-[70%] object-contain" style={{ filter: "grayscale(100%) opacity(0.75)" }} />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div style={{ fontSize: 44, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em" }}>{initials || "—"}</div>
                      <div className="uppercase" style={{ fontSize: 14, letterSpacing: "0.28em", color: "rgba(10,15,28,0.55)" }}>{name}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-MATRIX-2X2": {
      const quadrants = strs(c.quadrants);
      const target = Number(c.target ?? 0);
      const items = arr(c.items);
      const S = 720;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8 grid gap-10" style={{ gridTemplateColumns: "1fr 320px" }}>
            <div className="relative" style={{ height: S }}>
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                {[0, 1, 2, 3].map((q) => {
                  const isTarget = q + 1 === target;
                  return (
                    <div key={q} className="flex items-start justify-start p-6" style={{ border: "1px solid rgba(10,15,28,0.12)", background: isTarget ? `${brand.tokens.accent}14` : "transparent" }}>
                      <div className="uppercase" style={{ fontSize: 16, letterSpacing: "0.28em", color: isTarget ? brand.tokens.accent : "rgba(10,15,28,0.55)", fontWeight: 600 }}>{quadrants[q] ?? `Q${q + 1}`}</div>
                    </div>
                  );
                })}
              </div>
              {items.map((it, i) => {
                const x = Math.max(0.05, Math.min(0.95, Number(it.x ?? 0.5))) * S;
                const y = (1 - Math.max(0.05, Math.min(0.95, Number(it.y ?? 0.5)))) * S;
                return (
                  <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
                    <div className="h-4 w-4 rounded-full" style={{ background: brand.tokens.primary, boxShadow: `0 0 0 4px ${brand.tokens.primary}22` }} />
                    <div className="mt-2 whitespace-nowrap" style={{ fontSize: 18, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.01em" }}>{s(it.label)}</div>
                  </div>
                );
              })}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 uppercase" style={{ fontSize: 16, letterSpacing: "0.28em", color: brand.tokens.accent, fontWeight: 600 }}>{s(c.axisY)}</div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 uppercase" style={{ fontSize: 16, letterSpacing: "0.28em", color: brand.tokens.accent, fontWeight: 600 }}>{s(c.axisX)}</div>
            </div>
            <div className="flex flex-col justify-center gap-6">
              <Kicker brand={brand}>Reading</Kicker>
              <div style={{ fontSize: 22, lineHeight: 1.45, color: "rgba(10,15,28,0.78)" }}>
                Position on <b>{s(c.axisX)}</b> and <b>{s(c.axisY)}</b>. The tinted quadrant is where the program should live.
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-ICEBERG": {
      const above = arr(c.above);
      const below = arr(c.below);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8">
            <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${Math.max(above.length, 2)}, minmax(0, 1fr))` }}>
              {above.map((it, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3">
                    <IconBadge brand={brand} label={s(it.label)} index={i} size="sm" override={s(it.icon)} treatment="glyph" />
                    <Kicker brand={brand}>Visible</Kicker>
                  </div>
                  <div className="mt-3" style={{ fontSize: 28, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em" }}>{s(it.label)}</div>
                  <div className="mt-2" style={{ fontSize: 20, lineHeight: 1.42, color: "rgba(10,15,28,0.72)" }}>{s(it.body)}</div>
                </div>
              ))}
            </div>
            <div className="my-10 flex items-center gap-6">
              <div className="h-[2px] flex-1" style={{ background: brand.tokens.accent }} />
              <div className="uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", color: brand.tokens.accent, fontWeight: 600 }}>Waterline — {s(c.waterline, "what leadership sees")}</div>
              <div className="h-[2px] flex-1" style={{ background: brand.tokens.accent }} />
            </div>
            <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${Math.max(Math.min(below.length, 3), 2)}, minmax(0, 1fr))` }}>
              {below.map((it, i) => (
                <div key={i} className="p-6" style={{ background: "rgba(10,15,28,0.04)", border: "1px solid rgba(10,15,28,0.08)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="uppercase" style={{ fontSize: 14, letterSpacing: "0.28em", color: "rgba(10,15,28,0.55)", fontWeight: 600 }}>Hidden</div>
                    <IconBadge brand={brand} label={s(it.label)} index={i} size="sm" override={s(it.icon)} treatment="soft-tile" />
                  </div>
                  <div className="mt-3" style={{ fontSize: 24, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em" }}>{s(it.label)}</div>
                  <div className="mt-2" style={{ fontSize: 18, lineHeight: 1.42, color: "rgba(10,15,28,0.72)" }}>{s(it.body)}</div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    // ── Advanced variants — BATCH 2 ─────────────────────────────────────
    case "MV-EDITORIAL-SPREAD": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full gap-16" style={{ gridTemplateColumns: "40% 1fr" }}>
            <div className="flex flex-col justify-between">
              <Kicker brand={brand}>{s(c.kicker, "Editorial")}</Kicker>
              <div>
                <StatFigure brand={brand} value={s(c.pullValue, "3×")} unit={s(c.pullUnit)} label={s(c.pullLabel)} size="xl" />
              </div>
              <MetaRow><span>{s(c.folio)}</span></MetaRow>
            </div>
            <div className="flex flex-col">
              <Hairline color={brand.tokens.accent} widthPx={120} thicknessPx={2} className="mb-6" />
              <DisplayTitle size="section" color={brand.tokens.primary} maxWidthPx={1080}>{s(c.title)}</DisplayTitle>
              <div className="mt-12 grid gap-12" style={{ gridTemplateColumns: "1fr 1px 1fr" }}>
                <div style={{ fontSize: 22, lineHeight: 1.5, color: "rgba(10,15,28,0.78)" }}>{s(c.bodyLeft)}</div>
                <div style={{ background: "rgba(10,15,28,0.15)" }} />
                <div style={{ fontSize: 22, lineHeight: 1.5, color: "rgba(10,15,28,0.78)" }}>{s(c.bodyRight)}</div>
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-SPLIT-MANIFESTO": {
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full gap-0" style={{ gridTemplateColumns: "40% 1fr", margin: "-64px", minHeight: "calc(100% + 128px)" }}>
            <div className="relative flex flex-col justify-between overflow-hidden p-16" style={{ background: brand.tokens.primary, color: "#fff" }}>
              <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full" style={{ background: `radial-gradient(circle, ${brand.tokens.accent}55, transparent 70%)` }} />
              <Kicker brand={brand} color="#ffffff">{s(c.kicker, "Our belief")}</Kicker>
              <div className="relative">
                <Hairline color={brand.tokens.accent} widthPx={96} thicknessPx={2} className="mb-8" />
                <DisplayTitle size="section" color="#ffffff">{s(c.statement)}</DisplayTitle>
              </div>
              <MetaRow><span>{s(c.signoff, "TransPerfect")}</span></MetaRow>
            </div>
            <div className="flex flex-col justify-center gap-12 p-16">
              {items.map((it, i) => (
                <div key={i} className="pt-6" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                  <div className="flex items-baseline gap-6">
                    <span className="tabular-nums font-semibold" style={{ fontSize: 26, color: brand.tokens.accent, letterSpacing: "-0.01em" }}>{String(i + 1).padStart(2, "0")}</span>
                    <div className="flex-1">
                      <div style={{ fontSize: 34, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em", lineHeight: 1.15 }}>{s(it.title)}</div>
                      <div className="mt-2" style={{ fontSize: 22, lineHeight: 1.42, color: "rgba(10,15,28,0.72)" }}>{s(it.body)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-NUMBERS-TRIPTYCH": {
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-16 grid" style={{ gridTemplateColumns: "1fr 1px 1fr 1px 1fr" }}>
            {items.map((it, i) => (
              <>
                {i > 0 && <div key={`d-${i}`} style={{ background: "rgba(10,15,28,0.12)" }} />}
                <div key={i} className="px-10">
                  <StatFigure brand={brand} value={s(it.value)} unit={s(it.unit)} label={s(it.label)} source={s(it.source) || undefined} size="xl" />
                  {s(it.note) && (
                    <div className="mt-6" style={{ fontSize: 22, lineHeight: 1.4, color: "rgba(10,15,28,0.72)", maxWidth: 420 }}>{s(it.note)}</div>
                  )}
                </div>
              </>
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-TIMELINE-VERTICAL": {
      const items = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="relative mt-12 pl-32">
            <div className="absolute bottom-2 left-24 top-2 w-[2px]" style={{ background: brand.tokens.accent }} />
            <div className="flex flex-col gap-10">
              {items.map((it, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[38px] top-3 h-4 w-4 rounded-full" style={{ background: "#fff", border: `3px solid ${brand.tokens.accent}` }} />
                  <div className="absolute -left-32 top-1 w-24 pr-4 text-right tabular-nums uppercase" style={{ fontSize: 18, letterSpacing: "0.24em", color: brand.tokens.accent, fontWeight: 600 }}>
                    {s(it.date)}
                  </div>
                  <div>
                    <div style={{ fontSize: 30, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em", lineHeight: 1.15 }}>{s(it.label)}</div>
                    <div className="mt-2" style={{ fontSize: 22, lineHeight: 1.42, color: "rgba(10,15,28,0.72)", maxWidth: 1080 }}>{s(it.body)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-COMPARE-SLIDER": {
      const before = obj(c.before);
      const after = obj(c.after);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="relative mt-16 grid gap-0" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="pr-16" style={{ opacity: 0.6 }}>
              <div className="mb-6" style={{ height: 2, background: "rgba(10,15,28,0.15)", width: 96 }} />
              <Kicker brand={brand} color="rgba(10,15,28,0.6)">{s(before.label, "Before")}</Kicker>
              <div className="mt-8">
                <StatFigure brand={brand} value={s(before.value)} unit={s(before.unit)} size="lg" valueColor="rgba(10,15,28,0.7)" />
              </div>
              <div className="mt-6" style={{ fontSize: 22, lineHeight: 1.42, color: "rgba(10,15,28,0.65)" }}>{s(before.body)}</div>
            </div>
            <div className="pl-16" style={{ borderLeft: `2px solid ${brand.tokens.accent}` }}>
              <Hairline color={brand.tokens.accent} widthPx={96} thicknessPx={2} className="mb-6" />
              <Kicker brand={brand}>{s(after.label, "After")}</Kicker>
              <div className="mt-8">
                <StatFigure brand={brand} value={s(after.value)} unit={s(after.unit)} size="xl" />
              </div>
              <div className="mt-6" style={{ fontSize: 24, lineHeight: 1.42, color: "rgba(10,15,28,0.82)" }}>{s(after.body)}</div>
            </div>
            <div
              aria-hidden
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: "50%" }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: brand.tokens.accent, color: "#fff", fontSize: 28, fontWeight: 600 }}>
                <ArrowRight size={28} strokeWidth={2.4} />
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-PULL-QUOTE-STACK": {
      const hero = obj(c.hero);
      const items = arr(c.items).slice(0, 2);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="relative">
            <QuoteMark color={brand.tokens.accent} size={520} className="absolute -left-6 -top-24" />
            <div className="relative">
              <Kicker brand={brand}>Voices</Kicker>
              <div className="mt-8 max-w-[1500px]" style={{ fontSize: 60, lineHeight: 1.1, letterSpacing: "-0.02em", fontWeight: 600, color: brand.tokens.primary }}>
                &ldquo;{s(hero.quote)}&rdquo;
              </div>
              <div className="mt-10">
                <Attribution brand={brand} name={s(hero.name)} role={s(hero.role)} org={s(hero.org)} />
              </div>
            </div>
          </div>
          <div className="mt-16 grid gap-12" style={{ gridTemplateColumns: "1fr 1px 1fr" }}>
            {items[0] && (
              <div className="pt-6" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <div style={{ fontSize: 26, lineHeight: 1.35, color: "rgba(10,15,28,0.82)", fontStyle: "italic" }}>&ldquo;{s(items[0].quote)}&rdquo;</div>
                <div className="mt-5">
                  <Attribution brand={brand} name={s(items[0].name)} role={s(items[0].role)} org={s(items[0].org)} />
                </div>
              </div>
            )}
            <div style={{ background: "rgba(10,15,28,0.12)" }} />
            {items[1] && (
              <div className="pt-6" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <div style={{ fontSize: 26, lineHeight: 1.35, color: "rgba(10,15,28,0.82)", fontStyle: "italic" }}>&ldquo;{s(items[1].quote)}&rdquo;</div>
                <div className="mt-5">
                  <Attribution brand={brand} name={s(items[1].name)} role={s(items[1].role)} org={s(items[1].org)} />
                </div>
              </div>
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-DEFINITION": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center" style={{ maxWidth: 1500 }}>
            <Kicker brand={brand}>Definition</Kicker>
            <div className="mt-6">
              <DisplayTitle size="section" color={brand.tokens.primary}>{s(c.term)}</DisplayTitle>
            </div>
            <div className="mt-6 flex flex-wrap items-baseline gap-6">
              <span className="uppercase" style={{ fontSize: 20, letterSpacing: "0.28em", color: "rgba(10,15,28,0.55)", fontWeight: 500 }}>{s(c.pronunciation)}</span>
              <span style={{ fontSize: 24, color: brand.tokens.accent, fontStyle: "italic", fontWeight: 600 }}>{s(c.partOfSpeech, "n.")}</span>
            </div>
            <div className="mt-10" style={{ fontSize: 34, lineHeight: 1.35, color: "rgba(10,15,28,0.85)", maxWidth: 1400 }}>
              {s(c.definition)}
            </div>
            {s(c.usage) && (
              <div className="mt-12 pt-8" style={{ borderTop: "1px solid rgba(10,15,28,0.15)", maxWidth: 1400 }}>
                <span className="uppercase mr-4" style={{ fontSize: 14, letterSpacing: "0.28em", color: brand.tokens.accent, fontWeight: 600 }}>Usage</span>
                <span style={{ fontSize: 24, lineHeight: 1.45, color: "rgba(10,15,28,0.65)", fontStyle: "italic" }}>{s(c.usage)}</span>
              </div>
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PRINCIPLES": {
      const items = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-12">
            {items.map((it, i) => (
              <div key={i} className="relative grid items-center gap-8 py-8" style={{ gridTemplateColumns: "160px 1fr", borderTop: i === 0 ? "1px solid rgba(10,15,28,0.12)" : "none", borderBottom: "1px solid rgba(10,15,28,0.12)" }}>
                <div className="tabular-nums font-semibold" style={{ fontSize: 120, lineHeight: 1, letterSpacing: "-0.03em", color: brand.tokens.accent, opacity: 0.18 }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div style={{ fontSize: 40, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em", lineHeight: 1.1 }}>{s(it.statement)}</div>
                  <div className="mt-2" style={{ fontSize: 22, lineHeight: 1.42, color: "rgba(10,15,28,0.72)" }}>{s(it.body)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-COUNTDOWN": {
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand} color={brand.tokens.accent}>{s(c.kicker, "Three to remember")}</Kicker>
            <Hairline color={brand.tokens.accent} widthPx={120} thicknessPx={2} className="mt-6 mb-10" />
            <DisplayTitle size="section" color="#ffffff" maxWidthPx={1600}>{s(c.title)}</DisplayTitle>
            <div className="mt-12">
              {items.map((it, i) => {
                const n = items.length - i;
                return (
                  <div key={i} className="grid items-center gap-10 py-8" style={{ gridTemplateColumns: "220px 1fr", borderTop: i === 0 ? "1px solid rgba(255,255,255,0.18)" : "none", borderBottom: "1px solid rgba(255,255,255,0.18)" }}>
                    <div className="tabular-nums font-semibold" style={{ fontSize: 180, lineHeight: 0.9, letterSpacing: "-0.03em", color: brand.tokens.accent }}>
                      {n}
                    </div>
                    <div>
                      <div style={{ fontSize: 44, fontWeight: 600, color: "#ffffff", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{s(it.statement)}</div>
                      <div className="mt-3" style={{ fontSize: 22, lineHeight: 1.42, color: "rgba(255,255,255,0.72)" }}>{s(it.body)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-HORIZON": {
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10">
            {items.map((it, i) => {
              const ink = i === 0 ? "rgba(10,15,28,0.92)" : i === 1 ? "rgba(10,15,28,0.72)" : "rgba(10,15,28,0.52)";
              const labelColor = i === 0 ? brand.tokens.accent : "rgba(10,15,28,0.55)";
              return (
                <div key={i} className="grid gap-12 py-10" style={{ gridTemplateColumns: "200px 1fr", borderTop: "1px solid rgba(10,15,28,0.12)", borderBottom: i === items.length - 1 ? "1px solid rgba(10,15,28,0.12)" : "none" }}>
                  <div className="uppercase" style={{ fontSize: 20, letterSpacing: "0.28em", color: labelColor, fontWeight: 600 }}>{s(it.label)}</div>
                  <div>
                    <div style={{ fontSize: 44, fontWeight: 600, color: ink, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{s(it.headline)}</div>
                    <div className="mt-3" style={{ fontSize: 22, lineHeight: 1.42, color: ink, opacity: 0.85, maxWidth: 1200 }}>{s(it.body)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    // ── Dashboard family ────────────────────────────────────────────────
    case "MV-DASH-SUMMARY": {
      const primary = obj(c.primary);
      const secondary = obj(c.secondary);
      const balance = obj(c.balance);
      const bItems = arr(balance.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10 grid gap-14" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="flex flex-col gap-10">
              <SummaryStatCard brand={brand} label={s(primary.label)} value={s(primary.value)} unit={s(primary.unit)} series={toNums(primary.series)} />
              <SummaryStatCard brand={brand} label={s(secondary.label)} value={s(secondary.value)} unit={s(secondary.unit)} series={toNums(secondary.series)} />
            </div>
            <div className="pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
              <Kicker brand={brand}>Balance</Kicker>
              <div className="mt-8">
                <StatFigure brand={brand} value={s(balance.value)} unit={s(balance.unit)} label={s(balance.label)} size="xl" />
              </div>
              <div className="mt-10">
                {bItems.map((it, i) => (
                  <div key={i} className="flex items-baseline justify-between py-5" style={{ borderTop: "1px solid rgba(10,15,28,0.12)", borderBottom: i === bItems.length - 1 ? "1px solid rgba(10,15,28,0.12)" : "none" }}>
                    <div className="uppercase" style={{ fontSize: 18, letterSpacing: "0.24em", color: "rgba(10,15,28,0.6)", fontWeight: 600 }}>{s(it.label)}</div>
                    <div className="tabular-nums" style={{ fontSize: 32, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em" }}>{s(it.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-DONUT-TRIO": {
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-14 grid gap-10" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {items.map((it, i) => (
              <div key={i} className="flex flex-col items-center pt-8 text-center" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <Donut brand={brand} percent={Number(it.value) || 0} size={280} />
                <div className="mt-8 uppercase" style={{ fontSize: 20, letterSpacing: "0.28em", color: brand.tokens.primary, fontWeight: 600 }}>{s(it.label)}</div>
                <div className="mt-4" style={{ fontSize: 22, lineHeight: 1.4, color: "rgba(10,15,28,0.68)", maxWidth: 380 }}>{s(it.body)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-SALES-CHART": {
      const series = arr(c.series).map((p) => ({ label: s(p.label), value: Number(p.value) || 0 }));
      const stat = obj(c.stat);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10 grid gap-16" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
            <div>
              <AreaChart brand={brand} series={series} height={520} />
            </div>
            <div className="flex flex-col justify-center pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
              <Kicker brand={brand}>{s(c.kicker, "Trend")}</Kicker>
              <div className="mt-6" style={{ fontSize: 44, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{s(c.headline)}</div>
              <div className="mt-10">
                <StatFigure brand={brand} value={s(stat.value)} unit={s(stat.unit)} label={s(stat.label)} size="lg" />
                {s(stat.delta) && (
                  <div className="mt-4 uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", color: brand.tokens.accent, fontWeight: 600 }}>{s(stat.delta)}</div>
                )}
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-GAUGE-ROW": {
      const items = arr(c.items).slice(0, 5);
      const cols = items.length || 1;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-16 grid gap-10" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {items.map((it, i) => (
              <div key={i} className="flex flex-col items-center">
                <SemiGauge brand={brand} percent={Number(it.value) || 0} size={280} />
                <div className="mt-6 uppercase text-center" style={{ fontSize: 18, letterSpacing: "0.24em", color: brand.tokens.primary, fontWeight: 600, maxWidth: 260 }}>{s(it.label)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-PERFORMANCE": {
      const bars = arr(c.bars).map((b) => ({ label: s(b.label), value: Number(b.value) || 0 }));
      const highlight = s(c.highlight);
      const stat = obj(c.stat);
      const legend = arr(c.legend);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10 grid gap-16" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
            <div>
              <BarChart brand={brand} bars={bars} height={520} highlight={highlight} />
            </div>
            <div className="flex flex-col justify-center">
              <StatFigure brand={brand} value={s(stat.value)} unit={s(stat.unit)} label={s(stat.label)} size="xl" />
              <div className="mt-12">
                {legend.map((l, i) => (
                  <div key={i} className="flex items-center justify-between py-4" style={{ borderTop: i === 0 ? "1px solid rgba(10,15,28,0.12)" : "none", borderBottom: "1px solid rgba(10,15,28,0.12)" }}>
                    <div className="flex items-center gap-4">
                      <div style={{ width: 14, height: 14, background: i === 0 ? brand.tokens.accent : brand.tokens.primary, opacity: i === 0 ? 1 : Math.max(0.4, 1 - i * 0.2) }} />
                      <div style={{ fontSize: 22, color: brand.tokens.primary, fontWeight: 600 }}>{s(l.label)}</div>
                    </div>
                    <div className="tabular-nums" style={{ fontSize: 24, fontWeight: 600, color: "rgba(10,15,28,0.72)" }}>{s(l.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-REPORT-CARDS": {
      const items = arr(c.items).slice(0, 2);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-14 grid gap-14" style={{ gridTemplateColumns: "1fr 1px 1fr" }}>
            {items[0] && <ReportCard brand={brand} item={items[0]} />}
            <div style={{ background: "rgba(10,15,28,0.12)" }} />
            {items[1] && <ReportCard brand={brand} item={items[1]} />}
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-GROWTH-COLUMNS": {
      const items = arr(c.items).slice(0, 5);
      const vals = items.map((it) => Number(it.value) || 0);
      const max = Math.max(1, ...vals);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-14 grid items-end gap-10" style={{ gridTemplateColumns: `repeat(${items.length || 1}, 1fr)`, minHeight: 520 }}>
            {items.map((it, i) => {
              const v = Number(it.value) || 0;
              const h = Math.max(40, (v / max) * 420);
              const isLast = i === items.length - 1;
              const color = isLast ? brand.tokens.accent : brand.tokens.primary;
              const opacity = isLast ? 1 : 0.35 + (i / Math.max(items.length - 1, 1)) * 0.5;
              return (
                <div key={i} className="flex flex-col items-center justify-end">
                  <div style={{ fontSize: 44, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {s(it.value)}<span style={{ fontSize: 26, color: brand.tokens.accent, marginLeft: 4 }}>{s(it.unit)}</span>
                  </div>
                  <div className="mt-6 w-full" style={{ height: h, background: color, opacity, maxWidth: 220 }} />
                  <div className="mt-6 uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", color: isLast ? brand.tokens.accent : "rgba(10,15,28,0.6)", fontWeight: 600 }}>{s(it.year)}</div>
                  {s(it.note) && <div className="mt-2 text-center" style={{ fontSize: 16, color: "rgba(10,15,28,0.6)", maxWidth: 220 }}>{s(it.note)}</div>}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-BREAKDOWN": {
      const items = arr(c.items).slice(0, 4);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10">
            {items.map((it, i) => {
              const pct = Math.max(0, Math.min(100, Number(it.percent) || 0));
              const delta = s(it.delta);
              const negative = delta.trim().startsWith("-");
              return (
                <div key={i} className="py-8" style={{ borderTop: "1px solid rgba(10,15,28,0.12)", borderBottom: i === items.length - 1 ? "1px solid rgba(10,15,28,0.12)" : "none" }}>
                  <div className="flex items-baseline justify-between gap-6">
                    <div className="flex items-baseline gap-8">
                      <div style={{ fontSize: 28, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.01em" }}>{s(it.label)}</div>
                      {delta && (
                        <div className="uppercase" style={{ fontSize: 16, letterSpacing: "0.24em", fontWeight: 600, color: negative ? "#E53D2E" : brand.tokens.accent }}>{delta}</div>
                      )}
                    </div>
                    <div className="tabular-nums" style={{ fontSize: 40, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em" }}>
                      {s(it.value)}<span style={{ fontSize: 22, marginLeft: 6, color: "rgba(10,15,28,0.55)" }}>{s(it.unit)}</span>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-6">
                    <ProgressBar brand={brand} percent={pct} />
                    <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 600, color: brand.tokens.accent, minWidth: 70, textAlign: "right" }}>{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-REGION-STATS": {
      const stat = obj(c.stat);
      const items = arr(c.items).slice(0, 6);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10 grid gap-16" style={{ gridTemplateColumns: "1fr 1.2fr" }}>
            <div className="flex flex-col justify-center pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
              <StatFigure brand={brand} value={s(stat.value)} unit={s(stat.unit)} label={s(stat.label)} size="monumental" />
            </div>
            <div>
              {items.map((it, i) => {
                const pct = Math.max(0, Math.min(100, Number(it.percent) || 0));
                const delta = s(it.delta);
                const negative = delta.trim().startsWith("-");
                return (
                  <div key={i} className="py-5" style={{ borderTop: "1px solid rgba(10,15,28,0.12)", borderBottom: i === items.length - 1 ? "1px solid rgba(10,15,28,0.12)" : "none" }}>
                    <div className="flex items-baseline justify-between">
                      <div style={{ fontSize: 26, fontWeight: 600, color: brand.tokens.primary }}>{s(it.label)}</div>
                      <div className="uppercase" style={{ fontSize: 16, letterSpacing: "0.24em", fontWeight: 600, color: negative ? "#E53D2E" : brand.tokens.accent }}>{delta}</div>
                    </div>
                    <div className="mt-3"><ProgressBar brand={brand} percent={pct} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </SlideFrame>
      );
    }

    // ── Graph family (Batch 4) ──────────────────────────────────────────
    case "MV-GRAPH-YEAR-SERIES": {
      const items = arr(c.items);
      const vals = items.map((it) => Number(it.value) || 0);
      const max = Math.max(1, ...vals);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8 grid gap-14" style={{ gridTemplateColumns: "1fr 2.4fr" }}>
            <div className="pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
              <Kicker brand={brand}>{s(c.kicker, "Trend")}</Kicker>
              <div className="mt-6" style={{ fontSize: 38, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{s(c.headline)}</div>
            </div>
            <div className="grid items-end gap-4" style={{ gridTemplateColumns: `repeat(${items.length || 1}, 1fr)`, minHeight: 520 }}>
              {items.map((it, i) => {
                const v = Number(it.value) || 0;
                const h = Math.max(20, (v / max) * 420);
                const isLast = i === items.length - 1;
                const color = isLast ? brand.tokens.accent : brand.tokens.primary;
                const opacity = isLast ? 1 : 0.3 + (i / Math.max(items.length - 1, 1)) * 0.55;
                return (
                  <div key={i} className="flex flex-col items-center justify-end">
                    <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 600, color: brand.tokens.primary }}>
                      {s(it.value)}<span style={{ fontSize: 14, color: brand.tokens.accent, marginLeft: 2 }}>{s(it.unit)}</span>
                    </div>
                    <div className="mt-3 w-full" style={{ height: h, background: color, opacity, maxWidth: 90 }} />
                    <div className="mt-3 uppercase" style={{ fontSize: 14, letterSpacing: "0.22em", color: isLast ? brand.tokens.accent : "rgba(10,15,28,0.55)", fontWeight: 600 }}>{s(it.year)}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-1" style={{ height: 1, background: "rgba(10,15,28,0.2)" }} />
        </SlideFrame>
      );
    }

    case "MV-GRAPH-AXIS-BARS": {
      const bars = arr(c.bars).map((b) => ({ label: s(b.label), value: Number(b.value) || 0 }));
      const highlight = s(c.highlight);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10">
            <AxisBarChart brand={brand} bars={bars} height={520} highlight={highlight} unit={s(c.unit)} />
          </div>
          {s(c.legend) && (
            <div className="mt-6 flex items-center gap-4">
              <div style={{ width: 14, height: 14, background: brand.tokens.accent }} />
              <div className="uppercase" style={{ fontSize: 16, letterSpacing: "0.24em", color: "rgba(10,15,28,0.65)", fontWeight: 600 }}>{s(c.legend)}</div>
            </div>
          )}
        </SlideFrame>
      );
    }

    case "MV-GRAPH-CATEGORY-BARS": {
      const items = arr(c.items).map((it) => ({ label: s(it.label), value: Number(it.value) || 0, unit: s(it.unit) }));
      const max = Math.max(1, ...items.map((it) => it.value));
      const stat = obj(c.stat);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10 grid gap-16" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
            <div>
              {items.map((it, i) => {
                const pct = (it.value / max) * 100;
                const isTop = i === 0;
                return (
                  <div key={i} className="py-5" style={{ borderTop: i === 0 ? `2px solid ${brand.tokens.accent}` : "1px solid rgba(10,15,28,0.12)", borderBottom: i === items.length - 1 ? "1px solid rgba(10,15,28,0.12)" : "none" }}>
                    <div className="flex items-baseline justify-between mb-3">
                      <div className="uppercase" style={{ fontSize: 18, letterSpacing: "0.24em", color: brand.tokens.primary, fontWeight: 600 }}>{it.label}</div>
                      <div className="tabular-nums" style={{ fontSize: 28, fontWeight: 600, color: brand.tokens.primary }}>
                        {it.value}<span style={{ fontSize: 16, color: brand.tokens.accent, marginLeft: 4 }}>{it.unit}</span>
                      </div>
                    </div>
                    <div style={{ position: "relative", height: 12, background: "rgba(10,15,28,0.08)" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${pct}%`, background: isTop ? brand.tokens.accent : brand.tokens.primary, opacity: isTop ? 1 : 0.4 + (1 - i / items.length) * 0.4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col justify-center pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
              <StatFigure brand={brand} value={s(stat.value)} unit={s(stat.unit)} label={s(stat.label)} size="xl" />
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-DUAL-DONUT": {
      const items = arr(c.items).slice(0, 2);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10 grid gap-16" style={{ gridTemplateColumns: "1fr 1px 1fr" }}>
            {items[0] && <DonutBlock brand={brand} item={items[0]} />}
            <div style={{ background: "rgba(10,15,28,0.12)" }} />
            {items[1] && <DonutBlock brand={brand} item={items[1]} />}
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-RINGS": {
      const items = arr(c.items).slice(0, 4).map((it) => ({ label: s(it.label), value: Number(it.value) || 0, body: s(it.body) }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10 grid gap-16 items-center" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="flex items-center justify-center">
              <ConcentricRings brand={brand} items={items} size={520} />
            </div>
            <div>
              {items.map((it, i) => {
                const color = i === 0 ? brand.tokens.accent : brand.tokens.primary;
                const opacity = i === 0 ? 1 : 0.35 + (1 - i / items.length) * 0.5;
                return (
                  <div key={i} className="py-4 flex items-start gap-5" style={{ borderTop: "1px solid rgba(10,15,28,0.12)", borderBottom: i === items.length - 1 ? "1px solid rgba(10,15,28,0.12)" : "none" }}>
                    <div style={{ width: 16, height: 16, background: color, opacity, marginTop: 8 }} />
                    <div style={{ flex: 1 }}>
                      <div className="flex items-baseline justify-between">
                        <div style={{ fontSize: 22, fontWeight: 600, color: brand.tokens.primary }}>{it.label}</div>
                        <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 600, color: brand.tokens.accent }}>{it.value}%</div>
                      </div>
                      <div className="mt-2" style={{ fontSize: 16, color: "rgba(10,15,28,0.65)", lineHeight: 1.4 }}>{it.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-TASK-CARDS": {
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-12 grid gap-10" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {items.map((it, i) => {
              const done = Number(it.done) || 0;
              const total = Math.max(1, Number(it.total) || 100);
              const pct = Math.min(100, Math.round((done / total) * 100));
              return (
                <div key={i} className="pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                  <div className="uppercase" style={{ fontSize: 16, letterSpacing: "0.28em", color: "rgba(10,15,28,0.6)", fontWeight: 600 }}>{s(it.label)}</div>
                  <div className="mt-6 flex items-baseline gap-3">
                    <div className="tabular-nums" style={{ fontSize: 88, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.03em", lineHeight: 1 }}>{pct}%</div>
                    <div style={{ fontSize: 20, color: "rgba(10,15,28,0.5)" }}>of 100%</div>
                  </div>
                  <div className="mt-4 tabular-nums" style={{ fontSize: 16, color: "rgba(10,15,28,0.55)" }}>{done.toLocaleString()} / {total.toLocaleString()}</div>
                  <div className="mt-6"><ProgressBar brand={brand} percent={pct} /></div>
                  <div className="mt-6" style={{ fontSize: 18, color: "rgba(10,15,28,0.7)", lineHeight: 1.45 }}>{s(it.body)}</div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-DECADE-AREA": {
      const series = arr(c.series).map((p) => ({ label: s(p.label), value: Number(p.value) || 0 }));
      const callout = obj(c.callout);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="mb-6 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
            <Kicker brand={brand}>{s(c.kicker, "Trajectory")}</Kicker>
            <div className="mt-4" style={{ fontSize: 44, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em", lineHeight: 1.15, maxWidth: 1500 }}>{s(c.headline, s(c.title))}</div>
          </div>
          <div className="mt-4">
            <DecadeAreaChart brand={brand} series={series} height={520} calloutLabel={s(callout.year)} calloutNote={s(callout.note)} />
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-PERCENT-COMPARE": {
      const items = arr(c.items).slice(0, 5);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8">
            {items.map((it, i) => {
              const cur = Math.max(0, Math.min(100, Number(it.current) || 0));
              const bench = Math.max(0, Math.min(100, Number(it.benchmark) || 0));
              return (
                <div key={i} className="py-6" style={{ borderTop: "1px solid rgba(10,15,28,0.12)", borderBottom: i === items.length - 1 ? "1px solid rgba(10,15,28,0.12)" : "none" }}>
                  <div className="flex items-baseline justify-between gap-8 mb-4">
                    <div style={{ fontSize: 24, fontWeight: 600, color: brand.tokens.primary }}>{s(it.label)}</div>
                    <div className="flex items-baseline gap-10">
                      <div className="tabular-nums" style={{ fontSize: 40, fontWeight: 600, color: brand.tokens.accent, letterSpacing: "-0.02em" }}>{cur}%</div>
                      <div className="tabular-nums" style={{ fontSize: 30, fontWeight: 600, color: "rgba(10,15,28,0.4)" }}>{bench}%</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div style={{ position: "relative", height: 8, background: "rgba(10,15,28,0.08)" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${cur}%`, background: brand.tokens.accent }} />
                    </div>
                    <div style={{ position: "relative", height: 8, background: "rgba(10,15,28,0.08)" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${bench}%`, background: brand.tokens.primary, opacity: 0.35 }} />
                    </div>
                  </div>
                  {s(it.range) && (
                    <div className="mt-3 uppercase" style={{ fontSize: 14, letterSpacing: "0.24em", color: "rgba(10,15,28,0.5)", fontWeight: 600 }}>{s(it.range)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-LINE-MULTI": {
      const series = arr(c.series).slice(0, 3).map((p) => ({ label: s(p.label), points: arr(p.points).map((v: unknown) => Number(v) || 0) }));
      const xLabels = arr(obj(c.axis).x).map((v: unknown) => String(v));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="mb-6 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
            <Kicker brand={brand}>{s(c.kicker, "Trend")}</Kicker>
            <div className="mt-4" style={{ fontSize: 42, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em", lineHeight: 1.15, maxWidth: 1500 }}>{s(c.headline, s(c.title))}</div>
          </div>
          <div className="mt-4"><LineMultiChart brand={brand} series={series} xLabels={xLabels} unit={s(c.unit, "%")} height={500} /></div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-STACKED-BAR": {
      const segments = arr(c.segments).map((sg) => ({ label: s(sg.label) }));
      const columns = arr(c.columns).map((col) => ({ label: s(col.label), values: arr(col.values).map((v: unknown) => Number(v) || 0) }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8"><StackedBarChart brand={brand} segments={segments} columns={columns} unit={s(c.unit)} height={520} /></div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-AREA-STACK": {
      const series = arr(c.series).slice(0, 4).map((p) => ({ label: s(p.label), points: arr(p.points).map((v: unknown) => Number(v) || 0) }));
      const xLabels = arr(obj(c.axis).x).map((v: unknown) => String(v));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="mb-6 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
            <Kicker brand={brand}>{s(c.kicker, "Composition")}</Kicker>
            <div className="mt-4" style={{ fontSize: 42, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.02em", lineHeight: 1.15, maxWidth: 1500 }}>{s(c.headline, s(c.title))}</div>
          </div>
          <div className="mt-4"><StackedAreaChart brand={brand} series={series} xLabels={xLabels} unit={s(c.unit)} height={500} /></div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-WATERFALL": {
      const steps = arr(c.steps).map((st) => ({ label: s(st.label), value: Number(st.value) || 0, kind: s(st.kind, "up") as "start" | "up" | "down" | "end" }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8"><WaterfallChart brand={brand} steps={steps} unit={s(c.unit)} height={540} /></div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-BUBBLE": {
      const axis = obj(c.axis);
      const items = arr(c.items).map((it) => ({ label: s(it.label), x: Number(it.x) || 0, y: Number(it.y) || 0, size: Number(it.size) || 20 }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8"><BubbleChart brand={brand} items={items} axisX={s(axis.x, "X")} axisY={s(axis.y, "Y")} height={560} /></div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-HEATMAP": {
      const rows = arr(c.rows).map((v: unknown) => String(v));
      const cols = arr(c.columns).map((v: unknown) => String(v));
      const cells = arr(c.cells).map((row: unknown) => arr(row).map((v: unknown) => Number(v) || 0));
      const scale = obj(c.scale);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8"><HeatmapChart brand={brand} rows={rows} cols={cols} cells={cells} min={Number(scale.min) || 0} max={Number(scale.max) || 100} /></div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-TREEMAP": {
      const items = arr(c.items).map((it) => ({ label: s(it.label), value: Number(it.value) || 0, meta: s(it.meta) }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8"><Treemap brand={brand} items={items} height={560} /></div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-COMBO": {
      const bars = obj(c.bars);
      const line = obj(c.line);
      const points = arr(c.points).map((p) => ({ label: s(p.label), bar: Number(p.bar) || 0, line: Number(p.line) || 0 }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8"><ComboChart brand={brand} points={points} barLabel={s(bars.label, "Volume")} barUnit={s(bars.unit)} lineLabel={s(line.label, "Rate")} lineUnit={s(line.unit, "%")} height={540} /></div>
        </SlideFrame>
      );
    }

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
  overrideUrl,
}: {
  brand: BrandMode;
  seed: string;
  className?: string;
  portrait?: boolean;
  muted?: boolean;
  /**
   * When set (e.g. from a PPTX import that carried through the original
   * picture), skip the deterministic backdrop lookup and render this exact
   * image. Non-empty strings only — falsy values fall back to the seeded
   * division imagery so text-only decks keep their curated look.
   */
  overrideUrl?: string;
}) {
  const mode = useContext(SlideModeContext);
  const h = hash(seed || brand.id);
  const grayscale = muted ? "grayscale(60%) brightness(0.9)" : undefined;

  // Division-specific imagery: photos + abstracts for the active brand.
  const divSet = getDivisionImagery(brand.id);
  const tileBackdrops = [...divSet.photos, ...divSet.abstracts];
  const url =
    overrideUrl && overrideUrl.length > 0
      ? overrideUrl
      : tileBackdrops[h % tileBackdrops.length];
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

// ── Editorial stat grid ────────────────────────────────────────────────
// Editorial stats are borderless columns separated by hairline rules. No
// filled boxes, no shape treatments — the numeral does the work. Density
// is driven purely by cell count; short vs long numerals still align on the
// baseline because StatFigure is sized by name, not by string length.

function StatTile({ brand, item, index, dense, cols, isLastRow }: { brand: BrandMode; item: Item; index: number; dense: boolean; cols: number; isLastRow: boolean }) {
  const isFirstInRow = index % cols === 0;
  const size = dense ? "md" : "lg";
  return (
    <div
      className="relative flex flex-col px-8 py-6"
      style={{
        borderLeft: isFirstInRow ? "none" : "1px solid rgba(10,15,28,0.10)",
        borderBottom: isLastRow ? "none" : "1px solid rgba(10,15,28,0.06)",
      }}
    >
      {s(item.title) && (
        <div className="mb-5">
          <Kicker brand={brand} size={18}>{s(item.title)}</Kicker>
        </div>
      )}
      <StatFigure
        brand={brand}
        value={s(item.value)}
        unit={s(item.unit)}
        label={s(item.label)}
        source={s(item.source)}
        size={size}
      />
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
  const total = items.length;
  const rowCount = rows ?? Math.ceil(total / cols);
  const dense = rowCount * cols >= 4;
  return (
    <SlideFrame brand={brand} pageNumber={pageNumber}>
      <SlideTitle brand={brand} title={title || "Proof"} />
      <div
        className={`mt-14 grid ${gridClass}`}
        style={rows ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } : undefined}
      >
        {items.map((it, i) => {
          const rowIdx = Math.floor(i / cols);
          const isLastRow = rowIdx === rowCount - 1;
          return <StatTile key={i} brand={brand} item={it} index={i} dense={dense} cols={cols} isLastRow={isLastRow} />;
        })}
      </div>
    </SlideFrame>
  );
}



function NumberedList({ brand, pageNumber, title, items }: { brand: BrandMode; pageNumber: number; title: string; items: Item[] }) {
  return (
    <SlideFrame brand={brand} pageNumber={pageNumber}>
      <SlideTitle brand={brand} title={title} />
      <div className="mt-14">
        {items.map((it, i) => {
          const label = s(it.title ?? it.label);
          return (
            <div
              key={i}
              className="grid grid-cols-[80px_88px_1fr] items-start gap-10 py-7"
              style={{ borderTop: i === 0 ? "1px solid rgba(10,15,28,0.10)" : "none", borderBottom: "1px solid rgba(10,15,28,0.10)" }}
            >
              <div
                className="pt-1 font-semibold tabular-nums"
                style={{ fontSize: 40, color: brand.tokens.accent, letterSpacing: "-0.02em" }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <IconBadge brand={brand} label={label} index={i} size="md" override={s(it.icon)} />
              <div>
                <div style={{ fontSize: 32, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em" }}>
                  {label}
                </div>
                <div className="mt-2" style={{ fontSize: 22, lineHeight: 1.4, color: "rgba(10,15,28,0.72)" }}>
                  {s(it.body)}
                </div>
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
  // Hairline-topped column card — borderless surface, single accent rule at
  // top, small-caps ordinal, bold title with tight tracking, muted body.
  return (
    <div className="flex flex-col pt-8" style={{ borderTop: "2px solid currentColor", color: brand.tokens.accent }}>
      <div className="flex items-center justify-between" style={{ color: "rgba(10,15,28,0.55)" }}>
        <div className="uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", fontWeight: 600, color: brand.tokens.accent }}>
          {String(index).padStart(2, "0")}
        </div>
        <IconBadge brand={brand} label={title} index={index - 1} size="sm" override={icon} treatment="soft-circle" />
      </div>
      <div className="mt-8" style={{ fontSize: 36, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.015em", lineHeight: 1.12 }}>
        {title}
      </div>
      <div className="mt-5" style={{ fontSize: 22, lineHeight: 1.42, color: "rgba(10,15,28,0.72)" }}>
        {body}
      </div>
    </div>
  );
}

function Quadrant({ brand, label, highlight }: { brand: BrandMode; label: string; highlight?: boolean }) {
  return (
    <div
      className="flex items-center justify-center p-8 text-center"
      style={{
        border: `1px solid ${highlight ? brand.tokens.accent : "rgba(10,15,28,0.10)"}`,
        backgroundColor: highlight ? `${brand.tokens.accent}18` : "transparent",
        color: brand.tokens.primary,
        fontSize: 30,
        fontWeight: 600,
        letterSpacing: "-0.015em",
        lineHeight: 1.25,
      }}
    >
      {label}
    </div>
  );
}

function LabelBlock({ brand, label, body }: { brand: BrandMode; label: string; body: string }) {
  return (
    <div>
      <Hairline color={brand.tokens.accent} widthPx={56} thicknessPx={2} className="mb-5" />
      <Kicker brand={brand}>{label}</Kicker>
      <div
        className="mt-5"
        style={{ fontSize: 26, lineHeight: 1.38, letterSpacing: "-0.005em", color: "rgba(10,15,28,0.85)" }}
      >
        {body}
      </div>
    </div>
  );
}


// ── Dashboard helpers ──────────────────────────────────────────────────
function toNums(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "number" ? x : Number(x))).filter((n) => Number.isFinite(n));
}

function Sparkline({ brand, values, w = 380, h = 100, filled = true }: { brand: BrandMode; values: number[]; w?: number; h?: number; filled?: boolean }) {
  const vals = values.length ? values : [1, 1];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pad = 4;
  const step = (w - pad * 2) / Math.max(vals.length - 1, 1);
  const pts = vals.map((v, i) => [pad + i * step, h - pad - ((v - min) / range) * (h - pad * 2)] as [number, number]);
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = pts.length ? `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z` : "";
  const id = `spark-${brand.id}-${vals.length}-${Math.round(min * 10)}-${Math.round(max * 10)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={brand.tokens.accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={brand.tokens.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {filled && <path d={areaPath} fill={`url(#${id})`} />}
      <path d={linePath} fill="none" stroke={brand.tokens.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={5} fill={brand.tokens.accent} />}
    </svg>
  );
}

function SummaryStatCard({ brand, label, value, unit, series }: { brand: BrandMode; label: string; value: string; unit: string; series: number[] }) {
  return (
    <div className="pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
      <div className="uppercase" style={{ fontSize: 18, letterSpacing: "0.28em", color: "rgba(10,15,28,0.6)", fontWeight: 600 }}>{label}</div>
      <div className="mt-4 flex items-baseline" style={{ fontSize: 84, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.03em", lineHeight: 1 }}>
        <span className="tabular-nums">{value || "—"}</span>
        {unit && <span style={{ fontSize: 40, marginLeft: 8, color: brand.tokens.accent }}>{unit}</span>}
      </div>
      <div className="mt-4"><Sparkline brand={brand} values={series} h={70} /></div>
    </div>
  );
}

function Donut({ brand, percent, size = 260 }: { brand: BrandMode; percent: number; size?: number }) {
  const p = Math.max(0, Math.min(100, percent));
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={brand.tokens.primary} strokeOpacity={0.1} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={brand.tokens.accent} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.24} fontWeight={600} fill={brand.tokens.primary} style={{ letterSpacing: "-0.02em" }}>
        {Math.round(p)}%
      </text>
    </svg>
  );
}

function SemiGauge({ brand, percent, size = 260 }: { brand: BrandMode; percent: number; size?: number }) {
  const p = Math.max(0, Math.min(100, percent));
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cy = size / 2 + r / 2;
  const arcC = Math.PI * r;
  const dash = (p / 100) * arcC;
  const h = size / 2 + stroke;
  const arc = `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`;
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} aria-hidden>
      <path d={arc} fill="none" stroke={brand.tokens.primary} strokeOpacity={0.1} strokeWidth={stroke} strokeLinecap="round" />
      <path d={arc} fill="none" stroke={brand.tokens.accent} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${arcC}`} />
      <text x={size / 2} y={cy - 20} textAnchor="middle" fontSize={size * 0.22} fontWeight={600} fill={brand.tokens.primary} style={{ letterSpacing: "-0.02em" }}>
        {Math.round(p)}%
      </text>
    </svg>
  );
}

function AreaChart({ brand, series, height = 480 }: { brand: BrandMode; series: { label: string; value: number }[]; height?: number }) {
  const w = 1000;
  const h = height;
  const padL = 20, padR = 20, padT = 20, padB = 60;
  const vals = series.map((p) => p.value);
  const max = Math.max(1, ...vals);
  const min = Math.min(0, ...vals);
  const range = max - min || 1;
  const step = series.length > 1 ? (w - padL - padR) / (series.length - 1) : 0;
  const pts = series.map((p, i) => [padL + i * step, padT + (h - padT - padB) * (1 - (p.value - min) / range)] as [number, number]);
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = pts.length ? `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${h - padB} L${pts[0][0].toFixed(1)},${h - padB} Z` : "";
  const id = `area-${brand.id}-${series.length}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={brand.tokens.primary} stopOpacity="0.22" />
          <stop offset="100%" stopColor={brand.tokens.primary} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="rgba(10,15,28,0.15)" strokeWidth={1} />
      {areaPath && <path d={areaPath} fill={`url(#${id})`} />}
      <path d={linePath} fill="none" stroke={brand.tokens.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={7} fill={brand.tokens.accent} />}
      {series.map((p, i) => (
        <text key={i} x={pts[i]?.[0]} y={h - padB + 32} textAnchor="middle" fontSize={20} fill="rgba(10,15,28,0.6)" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>{p.label}</text>
      ))}
    </svg>
  );
}

function BarChart({ brand, bars, height = 480, highlight }: { brand: BrandMode; bars: { label: string; value: number }[]; height?: number; highlight?: string }) {
  const w = 900;
  const h = height;
  const padL = 20, padR = 20, padT = 30, padB = 60;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(bars.length, 1);
  const barW = slot * 0.55;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="rgba(10,15,28,0.15)" strokeWidth={1} />
      {bars.map((b, i) => {
        const bh = (b.value / max) * chartH;
        const x = padL + i * slot + (slot - barW) / 2;
        const y = h - padB - bh;
        const isHi = highlight ? b.label === highlight : false;
        const color = isHi ? brand.tokens.accent : brand.tokens.primary;
        const opacity = isHi ? 1 : 0.35 + (i / Math.max(bars.length - 1, 1)) * 0.45;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={color} opacity={opacity} />
            <text x={x + barW / 2} y={h - padB + 32} textAnchor="middle" fontSize={20} fill="rgba(10,15,28,0.6)" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>{b.label}</text>
            <text x={x + barW / 2} y={y - 10} textAnchor="middle" fontSize={22} fontWeight={600} fill={brand.tokens.primary}>{b.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ReportCard({ brand, item }: { brand: BrandMode; item: Item }) {
  const delta = s(item.delta);
  const negative = delta.trim().startsWith("-");
  return (
    <div className="pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
      <Kicker brand={brand} color={negative ? "#E53D2E" : undefined}>{negative ? "Reduction" : "Growth"}</Kicker>
      <div className="mt-6" style={{ fontSize: 96, fontWeight: 600, color: brand.tokens.primary, letterSpacing: "-0.035em", lineHeight: 0.95 }}>{delta}</div>
      <div className="mt-6" style={{ fontSize: 26, color: "rgba(10,15,28,0.75)", lineHeight: 1.35, maxWidth: 520 }}>{s(item.label)}</div>
      <div className="mt-8"><Sparkline brand={brand} values={toNums(item.series)} h={80} /></div>
      {s(item.meta) && (
        <div className="mt-4 uppercase" style={{ fontSize: 16, letterSpacing: "0.28em", color: "rgba(10,15,28,0.5)", fontWeight: 600 }}>{s(item.meta)}</div>
      )}
    </div>
  );
}

function ProgressBar({ brand, percent }: { brand: BrandMode; percent: number }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ position: "relative", height: 10, background: "rgba(10,15,28,0.08)", flex: 1, borderRadius: 0 }}>
      <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${p}%`, background: brand.tokens.accent }} />
    </div>
  );
}

// ── Graph helpers (Batch 4) ────────────────────────────────────────────
function AxisBarChart({ brand, bars, height = 480, highlight, unit }: { brand: BrandMode; bars: { label: string; value: number }[]; height?: number; highlight?: string; unit?: string }) {
  const w = 1720;
  const h = height;
  const padL = 90, padR = 40, padT = 30, padB = 60;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const niceMax = Math.ceil(max * 1.1);
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(bars.length, 1);
  const barW = slot * 0.5;
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const y = padT + (chartH / ticks) * i;
        const val = niceMax * (1 - i / ticks);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(10,15,28,0.08)" strokeWidth={1} />
            <text x={padL - 12} y={y + 6} textAnchor="end" fontSize={16} fill="rgba(10,15,28,0.5)">{val.toFixed(1)}{unit || ""}</text>
          </g>
        );
      })}
      {bars.map((b, i) => {
        const bh = (b.value / niceMax) * chartH;
        const x = padL + i * slot + (slot - barW) / 2;
        const y = h - padB - bh;
        const isHi = highlight ? b.label === highlight : false;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={isHi ? brand.tokens.accent : brand.tokens.primary} opacity={isHi ? 1 : 0.55} />
            <text x={x + barW / 2} y={h - padB + 32} textAnchor="middle" fontSize={18} fill="rgba(10,15,28,0.6)" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutBlock({ brand, item }: { brand: BrandMode; item: Item }) {
  return (
    <div className="flex flex-col items-center text-center pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
      <Kicker brand={brand}>{s(item.meta, "Snapshot")}</Kicker>
      <div className="mt-6"><Donut brand={brand} percent={Number(item.value) || 0} size={340} /></div>
      <div className="mt-8 uppercase" style={{ fontSize: 20, letterSpacing: "0.28em", color: brand.tokens.primary, fontWeight: 600 }}>{s(item.label)}</div>
      <div className="mt-4" style={{ fontSize: 20, lineHeight: 1.45, color: "rgba(10,15,28,0.68)", maxWidth: 480 }}>{s(item.body)}</div>
    </div>
  );
}

function ConcentricRings({ brand, items, size = 480 }: { brand: BrandMode; items: { label: string; value: number }[]; size?: number }) {
  const stroke = 22;
  const gap = 8;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {items.map((it, i) => {
        const r = (size - stroke) / 2 - i * (stroke + gap);
        if (r <= 0) return null;
        const circ = 2 * Math.PI * r;
        const dash = (Math.max(0, Math.min(100, it.value)) / 100) * circ;
        const color = i === 0 ? brand.tokens.accent : brand.tokens.primary;
        const opacity = i === 0 ? 1 : 0.35 + (1 - i / items.length) * 0.5;
        return (
          <g key={i}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={brand.tokens.primary} strokeOpacity={0.08} strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          </g>
        );
      })}
    </svg>
  );
}

function DecadeAreaChart({ brand, series, height = 480, calloutLabel, calloutNote }: { brand: BrandMode; series: { label: string; value: number }[]; height?: number; calloutLabel?: string; calloutNote?: string }) {
  const w = 1720;
  const h = height;
  const padL = 30, padR = 30, padT = 40, padB = 60;
  const vals = series.map((p) => p.value);
  const max = Math.max(1, ...vals);
  const min = Math.min(0, ...vals);
  const range = max - min || 1;
  const step = series.length > 1 ? (w - padL - padR) / (series.length - 1) : 0;
  const pts = series.map((p, i) => [padL + i * step, padT + (h - padT - padB) * (1 - (p.value - min) / range)] as [number, number]);
  const smooth = (points: [number, number][]) => {
    if (points.length < 2) return "";
    let d = `M${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0[0] + p1[0]) / 2;
      d += ` C${midX},${p0[1]} ${midX},${p1[1]} ${p1[0]},${p1[1]}`;
    }
    return d;
  };
  const linePath = smooth(pts);
  const areaPath = pts.length ? `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${h - padB} L${pts[0][0].toFixed(1)},${h - padB} Z` : "";
  const id = `dec-${brand.id}`;
  const highlightIdx = series.findIndex((p) => p.label === calloutLabel);
  const hi = highlightIdx >= 0 ? pts[highlightIdx] : null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={brand.tokens.primary} stopOpacity="0.28" />
          <stop offset="100%" stopColor={brand.tokens.primary} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="rgba(10,15,28,0.15)" strokeWidth={1} />
      {areaPath && <path d={areaPath} fill={`url(#${id})`} />}
      <path d={linePath} fill="none" stroke={brand.tokens.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {series.map((p, i) => (
        <text key={i} x={pts[i]?.[0]} y={h - padB + 34} textAnchor="middle" fontSize={18} fill="rgba(10,15,28,0.55)" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>{p.label}</text>
      ))}
      {hi && (
        <g>
          <circle cx={hi[0]} cy={hi[1]} r={9} fill={brand.tokens.accent} />
          <circle cx={hi[0]} cy={hi[1]} r={16} fill="none" stroke={brand.tokens.accent} strokeWidth={2} strokeOpacity={0.35} />
          <line x1={hi[0]} y1={hi[1] - 20} x2={hi[0]} y2={hi[1] - 90} stroke={brand.tokens.accent} strokeWidth={1} />
          <rect x={hi[0] - 240} y={hi[1] - 190} width={480} height={100} fill="#fff" stroke={brand.tokens.accent} strokeWidth={2} />
          <text x={hi[0]} y={hi[1] - 148} textAnchor="middle" fontSize={20} fontWeight={600} fill={brand.tokens.primary} style={{ letterSpacing: "-0.01em" }}>{calloutLabel}</text>
          <text x={hi[0]} y={hi[1] - 118} textAnchor="middle" fontSize={16} fill="rgba(10,15,28,0.7)">{calloutNote}</text>
        </g>
      )}
    </svg>
  );
}

// ── Extended graph helpers ───────────────────────────────────────────────
function LineMultiChart({ brand, series, xLabels, unit, height = 480 }: { brand: BrandMode; series: { label: string; points: number[] }[]; xLabels: string[]; unit?: string; height?: number }) {
  const w = 1720, h = height;
  const padL = 90, padR = 40, padT = 30, padB = 80;
  const cols = [brand.tokens.accent, brand.tokens.primary, "rgba(10,15,28,0.45)"];
  const all = series.flatMap((s) => s.points);
  const max = Math.max(1, ...all);
  const niceMax = Math.ceil(max / 10) * 10 || max;
  const chartH = h - padT - padB;
  const n = Math.max(...series.map((s) => s.points.length), 1);
  const step = n > 1 ? (w - padL - padR) / (n - 1) : 0;
  const ticks = 4;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = padT + (chartH / ticks) * i;
          const val = niceMax * (1 - i / ticks);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(10,15,28,0.08)" strokeWidth={1} />
              <text x={padL - 12} y={y + 6} textAnchor="end" fontSize={16} fill="rgba(10,15,28,0.5)">{Math.round(val)}{unit || ""}</text>
            </g>
          );
        })}
        {series.map((sr, si) => {
          const pts = sr.points.map((v, i) => [padL + i * step, padT + chartH * (1 - v / niceMax)] as [number, number]);
          const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
          return (
            <g key={si}>
              <path d={d} fill="none" stroke={cols[si] || brand.tokens.primary} strokeWidth={si === 0 ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" opacity={si === 0 ? 1 : 0.85} />
              {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={si === 0 ? 5 : 4} fill={cols[si] || brand.tokens.primary} />)}
            </g>
          );
        })}
        {xLabels.map((lb, i) => (
          <text key={i} x={padL + i * step} y={h - padB + 34} textAnchor="middle" fontSize={16} fill="rgba(10,15,28,0.55)" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>{lb}</text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-6">
        {series.map((sr, i) => (
          <div key={i} className="flex items-center gap-2" style={{ fontSize: 16, color: "rgba(10,15,28,0.7)" }}>
            <span style={{ display: "inline-block", width: 22, height: 3, background: cols[i] || brand.tokens.primary }} />
            <span style={{ fontWeight: 600, color: brand.tokens.primary }}>{sr.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StackedBarChart({ brand, segments, columns, unit, height = 480 }: { brand: BrandMode; segments: { label: string }[]; columns: { label: string; values: number[] }[]; unit?: string; height?: number }) {
  const w = 1720, h = height;
  const padL = 90, padR = 40, padT = 30, padB = 80;
  const totals = columns.map((c) => c.values.reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...totals);
  const niceMax = Math.ceil(max * 1.1);
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(columns.length, 1);
  const barW = slot * 0.55;
  const cols = [brand.tokens.accent, brand.tokens.primary, "rgba(10,15,28,0.4)"];
  const ticks = 4;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = padT + (chartH / ticks) * i;
          return <line key={i} x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(10,15,28,0.08)" strokeWidth={1} />;
        })}
        {columns.map((col, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          let yCursor = h - padB;
          return (
            <g key={i}>
              {col.values.map((v, si) => {
                const bh = (v / niceMax) * chartH;
                yCursor -= bh;
                return <rect key={si} x={x} y={yCursor} width={barW} height={bh} fill={cols[si] || brand.tokens.primary} opacity={si === 0 ? 1 : 0.7 - si * 0.15} />;
              })}
              <text x={x + barW / 2} y={h - padB + 32} textAnchor="middle" fontSize={16} fill="rgba(10,15,28,0.6)" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>{col.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-6">
        {segments.map((sg, i) => (
          <div key={i} className="flex items-center gap-2" style={{ fontSize: 16, color: "rgba(10,15,28,0.7)" }}>
            <span style={{ display: "inline-block", width: 16, height: 16, background: cols[i] || brand.tokens.primary, opacity: i === 0 ? 1 : 0.7 - i * 0.15 }} />
            <span style={{ fontWeight: 600, color: brand.tokens.primary }}>{sg.label}</span>
          </div>
        ))}
        {unit && <div style={{ fontSize: 14, color: "rgba(10,15,28,0.5)", marginLeft: "auto" }}>Units: {unit}</div>}
      </div>
    </div>
  );
}

function StackedAreaChart({ brand, series, xLabels, unit, height = 480 }: { brand: BrandMode; series: { label: string; points: number[] }[]; xLabels: string[]; unit?: string; height?: number }) {
  const w = 1720, h = height;
  const padL = 60, padR = 40, padT = 30, padB = 80;
  const n = Math.max(...series.map((s) => s.points.length), 1);
  const totals = Array.from({ length: n }, (_, i) => series.reduce((a, s) => a + (s.points[i] || 0), 0));
  const max = Math.max(1, ...totals);
  const niceMax = Math.ceil(max * 1.1);
  const chartH = h - padT - padB;
  const step = n > 1 ? (w - padL - padR) / (n - 1) : 0;
  const cols = [brand.tokens.accent, brand.tokens.primary, "rgba(10,15,28,0.45)", "rgba(10,15,28,0.25)"];
  let stacks = Array(n).fill(0) as number[];
  const layers = series.map((sr, si) => {
    const bottom = stacks.slice();
    const top = stacks.map((v, i) => v + (sr.points[i] || 0));
    stacks = top;
    const topPts = top.map((v, i) => [padL + i * step, padT + chartH * (1 - v / niceMax)] as [number, number]);
    const botPts = bottom.map((v, i) => [padL + i * step, padT + chartH * (1 - v / niceMax)] as [number, number]).reverse();
    const d = [...topPts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`), ...botPts.map((p) => `L${p[0]},${p[1]}`), "Z"].join(" ");
    return { d, color: cols[si] || brand.tokens.primary, si };
  });
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="rgba(10,15,28,0.15)" strokeWidth={1} />
        {layers.map((l) => <path key={l.si} d={l.d} fill={l.color} opacity={l.si === 0 ? 0.95 : 0.7 - l.si * 0.15} />)}
        {xLabels.map((lb, i) => (
          <text key={i} x={padL + i * step} y={h - padB + 34} textAnchor="middle" fontSize={16} fill="rgba(10,15,28,0.55)" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>{lb}</text>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-6">
        {series.map((sr, i) => (
          <div key={i} className="flex items-center gap-2" style={{ fontSize: 16, color: "rgba(10,15,28,0.7)" }}>
            <span style={{ display: "inline-block", width: 16, height: 16, background: cols[i] || brand.tokens.primary, opacity: i === 0 ? 0.95 : 0.7 - i * 0.15 }} />
            <span style={{ fontWeight: 600, color: brand.tokens.primary }}>{sr.label}</span>
          </div>
        ))}
        {unit && <div style={{ fontSize: 14, color: "rgba(10,15,28,0.5)", marginLeft: "auto" }}>Units: {unit}</div>}
      </div>
    </div>
  );
}

function WaterfallChart({ brand, steps, unit, height = 500 }: { brand: BrandMode; steps: { label: string; value: number; kind: "start" | "up" | "down" | "end" }[]; unit?: string; height?: number }) {
  const w = 1720, h = height;
  const padL = 90, padR = 40, padT = 30, padB = 90;
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(steps.length, 1);
  const barW = slot * 0.55;
  let running = 0;
  const bars = steps.map((st) => {
    if (st.kind === "start" || st.kind === "end") {
      running = st.value;
      return { base: 0, top: st.value, kind: st.kind, label: st.label, value: st.value };
    }
    const base = running;
    running += st.value;
    return { base: Math.min(base, running), top: Math.max(base, running), kind: st.kind, label: st.label, value: st.value };
  });
  const maxVal = Math.max(1, ...bars.map((b) => b.top));
  const niceMax = Math.ceil(maxVal * 1.1);
  const scale = (v: number) => padT + chartH * (1 - v / niceMax);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="rgba(10,15,28,0.15)" strokeWidth={1} />
      {bars.map((b, i) => {
        const x = padL + i * slot + (slot - barW) / 2;
        const y = scale(b.top);
        const bh = scale(b.base) - scale(b.top);
        let fill = brand.tokens.primary;
        if (b.kind === "up") fill = brand.tokens.accent;
        else if (b.kind === "down") fill = "rgba(10,15,28,0.55)";
        else if (b.kind === "start" || b.kind === "end") fill = brand.tokens.primary;
        const prev = bars[i - 1];
        return (
          <g key={i}>
            {prev && (
              <line x1={x - (slot - barW)} y1={scale(prev.kind === "start" || prev.kind === "end" ? prev.top : (b.kind === "up" ? b.base : b.top))} x2={x} y2={scale(prev.kind === "start" || prev.kind === "end" ? prev.top : (b.kind === "up" ? b.base : b.top))} stroke="rgba(10,15,28,0.25)" strokeDasharray="4 4" />
            )}
            <rect x={x} y={y} width={barW} height={Math.max(2, bh)} fill={fill} opacity={b.kind === "start" || b.kind === "end" ? 1 : 0.92} />
            <text x={x + barW / 2} y={y - 12} textAnchor="middle" fontSize={18} fontWeight={600} fill={brand.tokens.primary}>
              {b.kind === "up" ? "+" : b.kind === "down" ? "−" : ""}{Math.abs(b.value).toFixed(1)}{unit || ""}
            </text>
            <text x={x + barW / 2} y={h - padB + 32} textAnchor="middle" fontSize={15} fill="rgba(10,15,28,0.6)" style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function BubbleChart({ brand, items, axisX, axisY, height = 560 }: { brand: BrandMode; items: { label: string; x: number; y: number; size: number }[]; axisX: string; axisY: string; height?: number }) {
  const w = 1720, h = height;
  const padL = 110, padR = 60, padT = 40, padB = 90;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const maxSize = Math.max(1, ...items.map((i) => i.size));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1={padL} y1={padT + chartH * t} x2={w - padR} y2={padT + chartH * t} stroke="rgba(10,15,28,0.06)" strokeWidth={1} />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={`v${i}`} x1={padL + chartW * t} y1={padT} x2={padL + chartW * t} y2={h - padB} stroke="rgba(10,15,28,0.06)" strokeWidth={1} />
      ))}
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="rgba(10,15,28,0.3)" strokeWidth={1} />
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="rgba(10,15,28,0.3)" strokeWidth={1} />
      {items.map((it, i) => {
        const cx = padL + (it.x / 100) * chartW;
        const cy = padT + (1 - it.y / 100) * chartH;
        const r = 20 + (it.size / maxSize) * 60;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={brand.tokens.accent} opacity={0.28} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={brand.tokens.accent} strokeWidth={2} />
            <text x={cx} y={cy + 6} textAnchor="middle" fontSize={22} fontWeight={700} fill={brand.tokens.primary}>{it.label}</text>
          </g>
        );
      })}
      <text x={w / 2} y={h - 24} textAnchor="middle" fontSize={16} fill="rgba(10,15,28,0.6)" style={{ letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}>{axisX} →</text>
      <text x={30} y={h / 2} textAnchor="middle" fontSize={16} fill="rgba(10,15,28,0.6)" style={{ letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }} transform={`rotate(-90 30 ${h / 2})`}>{axisY} →</text>
    </svg>
  );
}

function HeatmapChart({ brand, rows, cols, cells, min, max }: { brand: BrandMode; rows: string[]; cols: string[]; cells: number[][]; min: number; max: number }) {
  const range = Math.max(1, max - min);
  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: `160px repeat(${cols.length}, minmax(0, 1fr))`, gap: 4 }}>
        <div />
        {cols.map((c, i) => (
          <div key={i} className="text-center uppercase" style={{ fontSize: 14, letterSpacing: "0.24em", color: "rgba(10,15,28,0.55)", fontWeight: 600, paddingBottom: 8 }}>{c}</div>
        ))}
        {rows.map((r, ri) => (
          <Fragment key={ri}>
            <div className="pr-4 flex items-center justify-end uppercase" style={{ fontSize: 14, letterSpacing: "0.2em", color: brand.tokens.primary, fontWeight: 600 }}>{r}</div>
            {cols.map((_, ci) => {
              const v = cells[ri]?.[ci] ?? 0;
              const t = Math.max(0, Math.min(1, (v - min) / range));
              return (
                <div key={ci} style={{ aspectRatio: "1.6 / 1", background: brand.tokens.accent, opacity: 0.15 + t * 0.85, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: t > 0.55 ? brand.tokens.primary : "rgba(10,15,28,0.75)" }}>{v}</span>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <span className="uppercase" style={{ fontSize: 12, letterSpacing: "0.24em", color: "rgba(10,15,28,0.55)", fontWeight: 600 }}>Low</span>
        <div style={{ flex: 1, height: 8, background: `linear-gradient(90deg, ${brand.tokens.accent}22, ${brand.tokens.accent})` }} />
        <span className="uppercase" style={{ fontSize: 12, letterSpacing: "0.24em", color: "rgba(10,15,28,0.55)", fontWeight: 600 }}>High</span>
        <span style={{ fontSize: 14, color: "rgba(10,15,28,0.55)" }}>{min}–{max}</span>
      </div>
    </div>
  );
}

function Treemap({ brand, items, height = 560 }: { brand: BrandMode; items: { label: string; value: number; meta?: string }[]; height?: number }) {
  // Simple squarified layout: sort desc, slice vertically then horizontally alternately.
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const w = 1720;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const rects: { x: number; y: number; w: number; h: number; label: string; value: number; meta?: string }[] = [];
  let x = 0, y = 0, remW = w, remH = height;
  let remainingTotal = total;
  let vertical = true;
  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i];
    const share = it.value / remainingTotal;
    const isLast = i === sorted.length - 1;
    if (isLast) {
      rects.push({ x, y, w: remW, h: remH, label: it.label, value: it.value, meta: it.meta });
      break;
    }
    if (vertical) {
      const rw = remW * share;
      rects.push({ x, y, w: rw, h: remH, label: it.label, value: it.value, meta: it.meta });
      x += rw; remW -= rw;
    } else {
      const rh = remH * share;
      rects.push({ x, y, w: remW, h: rh, label: it.label, value: it.value, meta: it.meta });
      y += rh; remH -= rh;
    }
    remainingTotal -= it.value;
    vertical = !vertical;
  }
  const cols = [brand.tokens.accent, brand.tokens.primary, "rgba(10,15,28,0.55)", "rgba(10,15,28,0.35)", "rgba(10,15,28,0.22)"];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden>
      {rects.map((r, i) => (
        <g key={i}>
          <rect x={r.x + 4} y={r.y + 4} width={Math.max(0, r.w - 8)} height={Math.max(0, r.h - 8)} fill={cols[i] || brand.tokens.primary} opacity={i === 0 ? 1 : 0.9} />
          <text x={r.x + 24} y={r.y + 46} fontSize={r.w > 380 ? 26 : 18} fontWeight={700} fill={i === 0 ? brand.tokens.primary : "#fff"} style={{ letterSpacing: "-0.01em" }}>{r.label}</text>
          <text x={r.x + 24} y={r.y + 80} fontSize={r.w > 380 ? 40 : 24} fontWeight={700} fill={i === 0 ? brand.tokens.primary : "#fff"} style={{ letterSpacing: "-0.02em" }}>{r.value}%</text>
          {r.meta && r.w > 260 && r.h > 120 && (
            <text x={r.x + 24} y={r.y + 116} fontSize={16} fill={i === 0 ? "rgba(10,15,28,0.7)" : "rgba(255,255,255,0.85)"}>{r.meta}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

function ComboChart({ brand, points, barLabel, barUnit, lineLabel, lineUnit, height = 520 }: { brand: BrandMode; points: { label: string; bar: number; line: number }[]; barLabel: string; barUnit?: string; lineLabel: string; lineUnit?: string; height?: number }) {
  const w = 1720, h = height;
  const padL = 100, padR = 100, padT = 30, padB = 90;
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(points.length, 1);
  const barW = slot * 0.5;
  const barMax = Math.max(1, ...points.map((p) => p.bar));
  const lineMax = Math.max(1, ...points.map((p) => p.line));
  const niceBar = Math.ceil(barMax * 1.15);
  const niceLine = Math.ceil(lineMax * 1.05);
  const pts = points.map((p, i) => [padL + i * slot + slot / 2, padT + chartH * (1 - p.line / niceLine)] as [number, number]);
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const ticks = 4;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = padT + (chartH / ticks) * i;
          const bv = niceBar * (1 - i / ticks);
          const lv = niceLine * (1 - i / ticks);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(10,15,28,0.08)" strokeWidth={1} />
              <text x={padL - 12} y={y + 6} textAnchor="end" fontSize={14} fill="rgba(10,15,28,0.5)">{bv.toFixed(1)}{barUnit || ""}</text>
              <text x={w - padR + 12} y={y + 6} textAnchor="start" fontSize={14} fill={brand.tokens.accent}>{Math.round(lv)}{lineUnit || ""}</text>
            </g>
          );
        })}
        {points.map((p, i) => {
          const bh = (p.bar / niceBar) * chartH;
          const x = padL + i * slot + (slot - barW) / 2;
          const y = h - padB - bh;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={bh} fill={brand.tokens.primary} opacity={0.85} />
              <text x={x + barW / 2} y={h - padB + 32} textAnchor="middle" fontSize={16} fill="rgba(10,15,28,0.6)" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>{p.label}</text>
            </g>
          );
        })}
        <path d={d} fill="none" stroke={brand.tokens.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={6} fill={brand.tokens.accent} />)}
      </svg>
      <div className="mt-2 flex flex-wrap gap-6">
        <div className="flex items-center gap-2" style={{ fontSize: 16, color: "rgba(10,15,28,0.7)" }}>
          <span style={{ display: "inline-block", width: 16, height: 16, background: brand.tokens.primary, opacity: 0.85 }} />
          <span style={{ fontWeight: 600, color: brand.tokens.primary }}>{barLabel}</span>
        </div>
        <div className="flex items-center gap-2" style={{ fontSize: 16, color: "rgba(10,15,28,0.7)" }}>
          <span style={{ display: "inline-block", width: 22, height: 3, background: brand.tokens.accent }} />
          <span style={{ fontWeight: 600, color: brand.tokens.primary }}>{lineLabel}</span>
        </div>
      </div>
    </div>
  );
}

