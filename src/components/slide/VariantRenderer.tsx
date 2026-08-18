import * as React from "react";
import {
  resolveFunnelStyle,
  funnelBandBackground,
  funnelSheenBackground,
  funnelGhostOpacity,
  funnelChipStyle,
  type ResolvedFunnelStyle,
} from "@/lib/funnel-style";
import { FunnelFigure, type FunnelStage } from "./FunnelFigure";
import { AccentRule, FlowArrow, ProcessRail } from "./Connectors";
import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";
import {
  SlideFrame as BaseSlideFrame,
  SlideModeContext,
  SlideBackdropContext,
  SlideAccentContext,
  SlideInkContext,
  makeSlideInk,
  useSlideInk,
  useSlideMode,

  type SlideMode,
  type SlideBackdrop,
} from "./SlideChrome";
import { SlideTextFormatLayer } from "./SlideTextFormatLayer";
import type { SlideTextFormats } from "@/lib/slide-text-format";
import {
  SlideThumbnailContext,
  SlideVideoPreviewContext,
  SlideForceVideoAutoplayContext,
  useResolvedVideoUrl,
  useResolvedPosterUrl,
  useResolvedImageUrl,
  useResolvedLogoUrl,
} from "@/lib/slide-media-refresh";
import { resolveSlideBackground } from "@/lib/background-library";
import { statGradient } from "@/lib/stat-contrast";
import { backdropForVariant } from "./variantBackdrop";
import { useSlideSkin, SlideSkinProvider } from "./SlideSkinContext";
import { useStylePack } from "./StylePackContext";
import { dashLook, type DashChart, type DashLook } from "@/lib/dash-look";
import { OpenSpaceFillProvider, useChartLabelCap, useChartLabelStride, useOpenSpaceFill } from "./OpenSpaceFill";
import { chartLabelSize, fillPx, statPx, STAT_FIT_STYLE, clampLines } from "@/lib/open-space-fill";
import { useChartStyle } from "./ChartStyleContext";
import {
  barOrnament,
  barPath,
  barWidth,
  gridBands,
  gridLines,
  labelType,
  lineDash,
  lineWeight,
  markerPath,
  markerSize,
  ringBand,
  seriesPath,
  type ChartStyle,
} from "@/lib/chart-styles";
import {
  SlideTemplateProvider,
  templateFillOverride,
  useTemplateIndustry,
} from "./SlideTemplateContext";
import { resolveSlideTemplate } from "@/lib/section-templates";

import { StatLayoutProvider } from "./StatLayoutContext";
import { resolveStatLayout } from "@/lib/stat-layouts";
import { HEADSHOTS, pickHeadshot } from "@/assets/backdrops/portraits";
import { enterpriseWhiteBrand, isEnterpriseWhite, type SlideSkin } from "@/lib/slide-skin";
import {
  cardWashGradient,
  openBottomFrame,
  orbitNodePositions,

  SEAM_HEIGHT_PX,
  SEAM_TICK_INSET_PCT,
  SUMMARY_BAND,

} from "@/lib/surface-tokens";
import { laneCornerRadiusPx, laneLadderPx, railBoxPx } from "@/lib/layer-stack-geometry";
import {
  ORBIT_CX,
  ORBIT_CY,
  ORBIT_R,
  ORBIT_VB_PAD,
  ORBIT_VB_W,
  layoutOrbitLabels,
} from "@/lib/orbit-label-layout";

import { HouseArrow } from "./HouseArrow";
import { SummaryBand, readSummary } from "./SummaryBand";

import { OrbitDisc } from "./OrbitDisc";




import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  Fragment,
} from "react";
import type { ComponentProps, ReactNode } from "react";
import type { DeckSlide } from "@/lib/deck-store";
import {
  TitleBlock,
  Kicker,
  DisplayTitle,
  Hairline,
  SupportingText,
  MetaRow,
  StatFigure,
  QuoteMark,
  Attribution,
  SoftDivider,
  SlideNumeral,
} from "./primitives";
import {
  EditorialTitle,
  PullQuote,
  DuotoneImage,
  GrainOverlay,
  CinematicScrim,
  StatRail,
  GlassTile,
  IconWell,
  AuroraOrb,
  AuroraSidePanel,
  moduleCardTint,
  moduleCardSurface,

  AccentTick,
  EDITORIAL_SERIF,
} from "./flagship";
import { accentInk, hexA } from "@/lib/accent-tokens";
import { APPROVED_LOGOS } from "@/lib/approved-logos";
import { InfographicSlideModule } from "./InfographicSlideModule";
import { ImportedFaithfulSlide, readImportedRef } from "./ImportedFaithfulSlide";


// Example client-logo chip for case study previews. Uses the deck's real
// clientLogoUrl when set (via SlideFrameCtx); otherwise deterministically
// picks an approved filler mark (excluding TransPerfect) so library
// previews always render with a real logo lockup rather than an empty
// "Client" chip. Mode-aware — white variant on dark, color on light.
function ClientLogoChip({
  mode,
  clientName,
  clientLogoUrl,
  size = 40,
  label = "Client",
  accent,
  faint,
}: {
  mode: SlideMode;
  clientName?: string;
  clientLogoUrl?: string | null;
  size?: number;
  label?: string;
  accent: string;
  faint: string;
}) {
  const pool = APPROVED_LOGOS.filter((l) => l.id !== "tp");
  const key = (clientName || "acme").toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const pick = pool[hash % pool.length];
  const filler = mode === "dark" ? pick.white || pick.color : pick.color;
  const src = clientLogoUrl || filler;
  return (
    <div className="inline-flex items-center gap-3">
      <span
        className="uppercase font-semibold"
        style={{
          color: accentInk(accent, mode),
          fontSize: fillPx(11, "kicker"),
          letterSpacing: "0.28em",
        }}
      >
        {label}
      </span>
      <span aria-hidden className="inline-block h-3 w-px" style={{ background: faint }} />
      <img
        src={src}
        alt={clientName ? `${clientName} logo` : `${pick.name} logo (example)`}
        style={{ height: size, width: "auto", maxWidth: size * 4, objectFit: "contain" }}
      />
    </div>
  );
}

// Module-scoped context so helper components (CardGrid, StatGrid, NumberedList,
// etc.) automatically pick up the current slide's clientName + layoutId when
// they wrap themselves in <SlideFrame>. VariantRenderer sets the value once
// per render.
import type { LogoPosition, LogoOrientation } from "@/lib/logo-placement";

const SlideFrameCtx = createContext<{
  clientName?: string;
  layoutId?: string;
  clientLogoUrl?: string | null;
  subCompany?: string;
  logoOrientation?: LogoOrientation;
  logoPosition?: LogoPosition;
}>({});

function SlideFrame(props: ComponentProps<typeof BaseSlideFrame>) {
  const ctx = useContext(SlideFrameCtx);
  return (
    <BaseSlideFrame
      {...props}
      clientName={props.clientName ?? ctx.clientName}
      layoutId={props.layoutId ?? ctx.layoutId}
      clientLogoUrl={props.clientLogoUrl ?? ctx.clientLogoUrl ?? null}
      subCompany={props.subCompany ?? ctx.subCompany}
      logoOrientation={props.logoOrientation ?? ctx.logoOrientation}
      logoPosition={props.logoPosition ?? ctx.logoPosition}
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
  Sparkles,
  Workflow,
  Layers3,
  Users,
  ShieldCheck,
  Target,
  Rocket,
  LineChart,
  Search,
  Cog,
  MessageSquareQuote,
  Building2,
  Landmark,
  Cpu,
  Factory,
  Store,
  HeartPulse,
  Car,
  Plane,
  Coins,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  GitBranch,
  Globe2,
  Lightbulb,
  ClipboardList,
  FileCheck2,
  Send,
  MessagesSquare,
  Mail,
  Phone,
  Timer,
  Trophy,
  Puzzle,
  Handshake,
  Play,
  BarChart3,
  Zap,
  ArrowUpRight,
  Languages,
  Mic,
  Captions,
  FileText,
  BookOpen,
  Video,
  Scale,
  Bot,
  Gavel,
  Globe,
  X as XMark,
  Check,
  ChevronsDown,
  ChevronsRight,


} from "lucide-react";

type IconType = typeof Sparkles;

const ICON_KEYWORDS: Array<[RegExp, IconType]> = [
  [/intake|brief|request/i, ClipboardList],
  // Service-line specifics come before the generic language rule so a card of
  // TransPerfect offerings doesn't render the same globe four times over.
  [/machine translation|\bmt\b|ai transl|neural/i, Bot],
  [/interpret/i, Mic],
  [/subtitl|caption|dub|voice[- ]?over/i, Captions],
  [/multimedia|video|studio|film/i, Video],
  [/e-?discovery|deposition|litigation/i, Gavel],
  [/legal transl|certified transl|sworn/i, Scale],
  [/localiz|internationaliz|\bi18n\b|in-?country/i, Globe],
  [/transcreat|copywrit|content production|editorial/i, BookOpen],
  [/document|dtp|desktop publishing|typeset/i, FileText],
  [/translat|linguist|terminolog|glossar|language/i, Languages],
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
import { approvedIconForLabel } from "@/lib/brand-icon-sets";
import { IconRenderer } from "@/components/IconRenderer";
import { exportMapNodeAsPng } from "@/lib/map-png-export";
import { applySlideAccent } from "@/lib/slide-accent";

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

// Exported so the PPTX exporter resolves the exact same glyph the on-screen
// renderer draws (explicit override → pack ref → keyword match → cycle).
export function pickIcon(
  label: string,
  fallbackIndex = 0,
  override?: string | null,
  /** Active division: its approved icon set is matched before generic keywords. */
  divisionId?: string | null,
): IconType {
  const ref = parseIconRef(override);
  if (ref) return packIconComponent(ref.packId, ref.name);
  const forced = iconByName(override);
  if (forced) return forced as IconType;
  const text = label || "";
  if (divisionId) {
    const approved = approvedIconForLabel(divisionId, text);
    const Icon = approved ? iconByName(approved) : null;
    if (Icon) return Icon as IconType;
  }
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
  sizeToken,
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
  /** Per-cell size token from copy (Slide Studio); wins over `size`. */
  sizeToken?: string | null;
}) {
  // Back-compat: map legacy `tone` values into the new emphasis/treatment axes.
  const legacyOnDark = tone === "onDark";
  const emphasis: IconEmphasis = legacyOnDark
    ? "inverse"
    : tone === "primary"
      ? "primary"
      : tone === "accent"
        ? "accent"
        : (tone as IconEmphasis);
  const spec = withDefaults({
    placement,
    size: (sizeToken && ICON_SIZES[sizeToken as IconSizeToken] ? (sizeToken as IconSizeToken) : size),
    treatment: treatment ?? (legacyOnDark ? "on-dark" : "soft-tile"),
    emphasis,
    a11yRole: ariaLabel ? "semantic" : "decorative",
  });
  const dims = ICON_SIZES[spec.size];
  const badgeMode = useContext(SlideModeContext);
  const colors = resolveEmphasisColors(brand, spec.treatment, spec.emphasis, badgeMode);
  const Icon = pickIcon(label, index, override, brand?.id ?? null);
  const isCircle = spec.treatment === "soft-circle";
  const a11y =
    spec.a11yRole === "semantic"
      ? { role: "img" as const, "aria-label": ariaLabel ?? label }
      : { "aria-hidden": true as const };
  return (
    <div
      data-icon-well=""
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
      {/* Emphasis stroke: badges are frequently viewed scaled-down (library
          thumbnails, print contact sheets) where 1.75 chrome stroke vanishes. */}
      <Icon
        size={dims.glyphPx}
        className="icon-strong"
        aria-hidden={spec.a11yRole === "decorative"}
      />


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
  logoOrientation?: LogoOrientation;
  /** Explicit skin override (defaults to slide.skin → SlideSkinContext). */
  skin?: SlideSkin;
  /**
   * Industry recipe id for the section-template library (deck
   * `context.designRecipeId`). Defaults to the surrounding
   * `SlideTemplateIndustryProvider`; without either, treatments resolve from the
   * level roles alone — still deterministic.
   */
  industryId?: string | null;
};

type Item = Record<string, unknown>;
const s = (v: unknown, fb = ""): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;
/** Loose truth test for authored flags — `true`, "true" and "yes" all count. */
const truthy = (v: unknown): boolean =>
  v === true || v === 1 || (typeof v === "string" && /^(true|yes|1)$/i.test(v.trim()));
const arr = (v: unknown): Item[] => (Array.isArray(v) ? (v as Item[]) : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
const strs = (v: unknown): string[] => (Array.isArray(v) ? (v as unknown[]).map((x) => s(x)) : []);
function lastWord(t: string): string {
  const words = String(t || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words[words.length - 1] ?? "";
}

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

/**
 * Ink that reads on a SOLID accent fill. `ink.onSurface` tints a colour for the
 * slide surface — it is not an "on this fill" contrast pick — so filled lane
 * heads, pillars and status discs use this luminance test instead.
 */
function fillInk(hex: string, darkInk: string): string {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return "#FFFFFF";
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  const lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return lum > 0.45 ? darkInk : "#FFFFFF";
}

/**
 * Public entry point. Wraps the module tree in the typography-override layer so
 * per-slide text formatting applies on EVERY surface (editor, present, share,
 * and the offscreen export stage) without each module knowing about it.
 */
export function VariantRenderer(props: Props) {
  const formats = (props.slide as { textFormats?: SlideTextFormats } | undefined)?.textFormats;
  const packForFill = useStylePack();
  // Per-slide template treatment: library default for the slide's
  // (industry × section × level) cell with the slide's override merged on top.
  const ctxIndustry = useTemplateIndustry();
  const industryId = props.industryId ?? ctxIndustry;
  const template = React.useMemo(
    () =>
      resolveSlideTemplate({
        slide: props.slide as Parameters<typeof resolveSlideTemplate>[0]["slide"],
        industryId,
      }),
    [props.slide, industryId],
  );
  const templateScale = React.useMemo(() => templateFillOverride(template), [template]);
  const fillDensity = template.overridden.includes("fill")
    ? template.fill
    : packForFill?.geometry?.fill;
  return (
    <SlideTemplateProvider template={template}>
    <OpenSpaceFillProvider
      content={props.slide?.content}
      variantId={props.variant?.id}
      density={fillDensity}
      scaleOverride={templateScale}
      industryId={industryId}
    >
    <SlideTextFormatLayer
      formats={formats}
      signature={`${props.variant.id}:${JSON.stringify(props.slide?.content ?? {}).length}`}
    >
      <VariantRendererInner {...props} />
    </SlideTextFormatLayer>
    </OpenSpaceFillProvider>
    </SlideTemplateProvider>
  );
}

function VariantRendererInner(props: Props) {
  const {
    slide,
    variant,
    brand,
    pageNumber,
    clientName,
    clientLogoUrl,
    subCompany,
    mode: modeProp = "light",
    logoOrientation,
  } = props;
  // Resolve the active look and feel: explicit prop → per-slide override →
  // surface context (deck skin) → flagship.
  const ctxSkin = useSlideSkin();
  const skin: SlideSkin = props.skin ?? slide.skin ?? ctxSkin;
  const enterprise = isEnterpriseWhite(skin);
  // A STYLE PACK owns its mode — the look IS light or dark, and its ground
  // layers are built for that mode only. Resolving it here (rather than in each
  // preview surface) means no caller can pair a dark pack ground with
  // light-mode ink, which is what made pack slides unreadable.
  const activePack = useStylePack();
  // Alternate-look dashboards: the active pack reflows the module's blocks and
  // swaps which chart family draws the numbers (lib/dash-look.ts). The approved
  // brand system resolves to the canonical arrangement.
  const dash = dashLook(activePack, props.variant.id);
  // Enterprise is a MASTER TEMPLATE, not a fixed light-only page: it renders on
  // the white page by default and on the brand navy floor when a slide (or the
  // deck) is switched to dark. Forcing "light" here is what made the editor's
  // per-slide Appearance → Dark toggle look broken on Enterprise decks.
  const mode: SlideMode = activePack ? activePack.mode : modeProp;

  const c = slide.content as Record<string, unknown>;
  const contentClientName = s((slide.content as Record<string, unknown>).clientName) || undefined;
  const resolvedClient = clientName || contentClientName;
  // Optional per-slide accent override (`content.accentOverride`, a hex string).
  // Lets a single deck travel a multi-colour palette without inventing new
  // brand modes — the deck's brand mode still supplies every other token.
  // Resolution lives in `@/lib/slide-accent` so export paths can't drift.
  const rawBrand: BrandMode = applySlideAccent(slide, brand);
  const baseBrand: BrandMode = enterprise ? enterpriseWhiteBrand(rawBrand, mode) : rawBrand;

  const themedBrand = themeBrandForMode(baseBrand, mode);
  const semanticInk = makeSlideInk(
    mode,
    baseBrand.tokens.accent,
    baseBrand.tokens.primary,
    baseBrand.tokens.surface,
    baseBrand.tokens.ink,
  );

  // Custom background per slide (from content.background). Falls back to null
  // so variants that render their own MediaTile / deterministic backdrops are
  // unaffected.
  const resolvedBg = resolveSlideBackground((slide.content as Record<string, unknown>).background);
  // Fallback: master TransPerfect/Corporate brand in dark mode auto-applies
  // the curated 10-gradient backdrop set when the slide has no explicit
  // background configured. Light mode intentionally stays clean (white
  // surface + ink text) — do not inject a photo backdrop there.
  // Enterprise White draws its own pastel ground in SlideFrame — never inject
  // a photographic/gradient backdrop underneath it.
  const fallbackBackdrop =
    !resolvedBg && !enterprise && mode === "dark"
      ? backdropForVariant(variant, brand.id, mode)
      : null;
  const rawBg = (slide.content as Record<string, unknown>).background as
    | Record<string, unknown>
    | undefined;
  const bgPath = typeof rawBg?.path === "string" ? rawBg.path : undefined;
  const refreshedBgUrl = useResolvedImageUrl(bgPath, resolvedBg?.url);
  const backdrop: SlideBackdrop | null = resolvedBg
    ? {
        url: refreshedBgUrl,

        css: resolvedBg.css,
        scrim: resolvedBg.scrim,
        scrimStrength: resolvedBg.scrimStrength,
        imageDim: resolvedBg.imageDim,
        tint: resolvedBg.tint,
        darkChrome: resolvedBg.darkChrome,
        fit: resolvedBg.fit,
        zoom: resolvedBg.zoom,
        offsetX: resolvedBg.offsetX,
        offsetY: resolvedBg.offsetY,
      }
    : fallbackBackdrop;


  return (
    <SlideSkinProvider skin={skin}>
    <SlideModeContext.Provider value={mode}>
      <SlideAccentContext.Provider value={themedBrand?.tokens?.accent ?? null}>
        <SlideInkContext.Provider value={semanticInk}>
          <SlideBackdropContext.Provider value={backdrop}>
            <SlideFrameCtx.Provider
              value={{
                clientName: resolvedClient,
                layoutId: slide.layoutId,
                clientLogoUrl: clientLogoUrl ?? null,
                subCompany,
                logoOrientation:
                  slide.logoOrientation && slide.logoOrientation !== "auto"
                    ? slide.logoOrientation
                    : logoOrientation,
                logoPosition:
                  slide.logoPosition && slide.logoPosition !== "auto"
                    ? slide.logoPosition
                    : undefined,
              }}
            >
              {/* display:contents keeps layout untouched while exposing the
                  slide mode to CSS (light mode kills text/content shadows). */}
              <div data-slide-mode={mode} style={{ display: "contents" }}>
                <StatLayoutProvider layout={resolveStatLayout(variant.id, c)}>
                {renderVariantBody({
                  slide,
                  variant,
                  brand: themedBrand,
                  pageNumber,
                  c,
                  mode,
                  clientName: resolvedClient,
                  clientLogoUrl: clientLogoUrl ?? null,
                  dash,
                })}
                </StatLayoutProvider>
              </div>
            </SlideFrameCtx.Provider>
          </SlideBackdropContext.Provider>
        </SlideInkContext.Provider>
      </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
    </SlideSkinProvider>
  );
}

// Given an item that may carry both `logoUrl` (light/color) and
// `logoUrlDark` (white), plus a storage `logoPath`, return the URL that
// matches the current slide mode. Falls back gracefully to whichever URL
// is present.
function pickLogoForMode(it: Record<string, unknown>, mode: SlideMode): string {
  const light = s(it.logoUrl ?? it.logo ?? it.primaryUrl);
  const dark = s(it.logoUrlDark ?? it.logoWhite);
  if (mode === "dark") return dark || light;
  // Safety net for legacy/persisted content that stored the WHITE (on-dark)
  // mark in the light slot: a white logo on a white slide is invisible. Swap
  // to the approved colour counterpart when we can recognise the asset.
  if (light && /white|reverse|on-dark/i.test(light)) {
    const match = APPROVED_LOGOS.find((l) => l.white === light);
    if (match?.color) return match.color;
    const guess = light.replace(/white/gi, "color");
    if (APPROVED_LOGOS.some((l) => l.color === guess)) return guess;
  }
  return light || dark;
}

function renderVariantBody({
  slide,
  variant,
  brand,
  pageNumber,
  c,
  mode,
  clientName,
  clientLogoUrl,
  dash,
}: {
  slide: DeckSlide;
  variant: ModuleVariant;
  brand: BrandMode;
  pageNumber: number;
  c: Record<string, unknown>;
  mode: SlideMode;
  clientName?: string;
  clientLogoUrl?: string | null;
  /** Alternate-look dashboard treatment for this module (lib/dash-look.ts). */
  dash: DashLook;
}): ReactNode {
  // Mode-aware ink palette for charts and data viz. Every chart/graph variant
  // MUST use these tokens (never hardcoded `rgba(10,15,28,X)`) so text stays
  // readable when a dark backdrop is applied.
  const isDark = mode === "dark";
  const semantic = makeSlideInk(
    mode,
    brand.tokens.accent,
    brand.tokens.primary,
    brand.tokens.surface,
    brand.tokens.ink,
  );
  const ink = {
    strong: semantic.text,
    body: semantic.muted,
    muted: semantic.muted,
    faint: semantic.faint,
    axis: semantic.hairlineStrong,
    divider: semantic.hairline,
    hairline: semantic.hairline,
    hairlineStrong: semantic.hairlineStrong,
    surface: semantic.trackFill,
    surfaceRing: semantic.hairline,
    ringOnDark: isDark ? "#0b1024" : "#ffffff",
    onSurface: semantic.onSurface,
    accentText: semantic.accentText,
  };
  // One mode-aware accent tone for every module below: on dark grounds the raw
  // division accent (Blue 500 #003FC7) reads at ~2.5:1 as ink or hairline, so it
  // rides the shared accentInk ramp. Light mode returns the accent unchanged.
  const accentTone = accentInk(brand.tokens.accent, mode, 4.5);

  // Faithful-import passthrough: slides built from an imported PPTX keep a
  // reference to their source layout and render 1:1 until the user converts
  // them to a native module (which clears `importedDeckId`).
  const importedRef = readImportedRef(c);
  if (importedRef) {
    return <ImportedFaithfulSlide deckId={importedRef.deckId} slideIndex={importedRef.slideIndex} />;
  }

  // Spec-driven MV-VIZ-* family renders through the InfographicSpec pipeline.

  if (variant.id.startsWith("MV-VIZ-")) {
    return (
      <InfographicSlideModule
        slide={slide}
        variant={variant}
        brand={brand}
        pageNumber={pageNumber}
        mode={mode}
      />
    );
  }

  switch (variant.id) {
    // ── Opening ────────────────────────────────────────────────────────
    case "MV-OP-COVER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover" logoPosition="top-right">
          {/* Ambient depth — a soft spotlight glow drifting up from bottom-left,
              plus a low-opacity ring signature on the right. Keynote-grade. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(60% 55% at 12% 92%, ${hexA(brand.tokens.accent, 0.2)} 0%, transparent 62%),
                radial-gradient(45% 40% at 92% 8%, ${hexA(brand.tokens.accent, 0.11)} 0%, transparent 70%)
              `,
            }}
          />
          {isDark ? (
            <div
              aria-hidden
              className="pointer-events-none absolute -right-40 top-1/2 h-[820px] w-[820px] -translate-y-1/2 rounded-full"
              style={{
                border: `1px solid ${hexA(brand.tokens.accent, 0.133)}`,
                boxShadow: `inset 0 0 0 1px ${hexA(brand.tokens.accent, 0.067)}, inset 0 0 220px ${hexA(brand.tokens.accent, 0.094)}`,
              }}
            />
          ) : (
            /* Light covers drop the ringed sphere (it read as a hard white
               disc on white) in favour of our accent aura: two soft, heavily
               blurred accent orbs drifting in from the right edge. */
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute -right-52 top-1/2 h-[760px] w-[760px] -translate-y-1/2 rounded-full"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${hexA(brand.tokens.accent, 0.3)} 0%, ${hexA(brand.tokens.accent, 0.12)} 45%, transparent 72%)`,
                  filter: "blur(90px)",
                }}
              />
              <div
                className="absolute -right-24 top-[22%] h-[380px] w-[380px] rounded-full"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${hexA(brand.tokens.primary, 0.22)} 0%, transparent 68%)`,
                  filter: "blur(70px)",
                }}
              />
            </div>
          )}
          <div className="relative flex h-full flex-col justify-end">
            <div className="flex items-center gap-4 tp-rise">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background: brand.tokens.accent,
                  boxShadow: `0 0 24px ${brand.tokens.accent}, 0 0 8px ${brand.tokens.accent}`,
                }}
              />
              <Kicker brand={brand}>Prepared for {s(c.clientName)}</Kicker>
            </div>
            <div className="mt-8 flex items-end gap-8 tp-rise tp-rise-delay-1">
              <StatRail color={"var(--slide-accent-text)"} height={220} className="mb-6" />
              <EditorialTitle
                text={s(c.title, "Client")}
                emphasize={s(c.titleEmphasis) || lastWord(s(c.title, "Client"))}
                color={ink.strong}
                accentColor={brand.tokens.accent}
                size={132}
                maxWidthPx={1520}
              />
            </div>
            {s(c.subtitle) && (
              <SupportingText
                size="xl"
                opacity={0.86}
                maxWidthPx={1200}
                className="mt-10 tp-rise tp-rise-delay-2"
              >
                {s(c.subtitle)}
              </SupportingText>
            )}
            <MetaRow className="mt-16 tp-rise tp-rise-delay-3">
              {s(c.presenter) && <span>{s(c.presenter)}</span>}
              {s(c.date) && <span>{s(c.date)}</span>}
            </MetaRow>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-MEDIA": {
      const _titleLen = s(c.title).length + s(c.subtitle).length;
      const _titleSize = _titleLen > 60 ? "title" : _titleLen > 30 ? "section" : "cover";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover" logoPosition="top-right">

          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.clientName, "cover-media"))}
            overrideUrl={s(c.mediaUrl)}
            fit={s(c.mediaFit) || undefined}
            focus={s(c.mediaFocus) || undefined}
            zoom={Number(c.mediaZoom) || undefined}
            mediaPath={s(c.mediaPath)}
            videoUrl={s(c.videoUrl)}
            videoPosterUrl={s(c.videoPosterUrl)}
            videoPath={s(c.videoPath)}
            videoPosterPath={s(c.videoPosterPath)}
            videoAutoplay={c.videoAutoplay as boolean | undefined}
            videoLoop={c.videoLoop as boolean | undefined}
            videoMuted={c.videoMuted as boolean | undefined}
            videoControls={c.videoControls as boolean | undefined}
            className="absolute inset-0 h-full w-full rounded-none tp-kenburns"
          />
          {/* Duotone-style color wash tinted to the brand accent, plus grain */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: brand.tokens.accent, mixBlendMode: "color", opacity: 0.28 }}
          />
          <GrainOverlay opacity={0.09} />
          <CinematicScrim anchor="bottom" strength={0.9} tint="#050418" vignette={0.28} />
          <div data-on-media className="absolute inset-x-24 top-32 bottom-40 flex flex-col justify-end overflow-hidden text-white">
            <div className="flex items-center gap-4 tp-rise">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background: brand.tokens.accent,
                  boxShadow: `0 0 24px ${brand.tokens.accent}`,
                }}
              />
              <Kicker brand={brand} color="#ffffff">
                Prepared for {s(c.clientName)}
              </Kicker>
            </div>
            <div className="mt-6 flex items-end gap-6 tp-rise tp-rise-delay-1">
              <StatRail color={"#ffffff"} height={180} className="mb-4" />
              <EditorialTitle
                text={s(c.title)}
                emphasize={s(c.titleEmphasis) || lastWord(s(c.title))}
                color="#ffffff"
                accentColor="#ffffff"
                emphasisStyle="bold"
                size={_titleSize === "cover" ? 128 : _titleSize === "section" ? 96 : 72}
                maxWidthPx={1420}
              />
            </div>
            {s(c.subtitle) && (
              <SupportingText
                size="lg"
                opacity={0.92}
                maxWidthPx={1180}
                className="mt-6 line-clamp-2 tp-rise tp-rise-delay-2"
              >
                {s(c.subtitle)}
              </SupportingText>
            )}
            <MetaRow className="mt-10 tp-rise tp-rise-delay-3">
              {s(c.date) && <span>{s(c.date)}</span>}
            </MetaRow>
          </div>
        </SlideFrame>
      );
    }

    case "MV-OP-COVER-MINIMAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover" logoPosition="top-right">
          <div className="flex h-full flex-col justify-center">
            <StatRail color={"var(--slide-accent-text)"} height={120} className="tp-rise" />
            <div className="mt-12 tp-rise tp-rise-delay-1">
              <EditorialTitle
                text={s(c.title)}
                emphasize={s(c.titleEmphasis) || lastWord(s(c.title))}
                color={ink.strong}
                accentColor={brand.tokens.accent}
                size={132}
                maxWidthPx={1520}
              />
            </div>
            {s(c.subtitle) && (
              <SupportingText
                size="xl"
                opacity={0.72}
                maxWidthPx={1080}
                className="mt-8 tp-rise tp-rise-delay-2"
              >
                {s(c.subtitle)}
              </SupportingText>
            )}
            {s(c.date) && (
              <MetaRow className="mt-16 tp-rise tp-rise-delay-3">
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
            <div className="tp-rise">
              <Kicker brand={brand}>{s(c.kicker, "Section")}</Kicker>
            </div>
            <div className="mt-8 tp-rise tp-rise-delay-1">
              <StatRail color={"var(--slide-accent-text)"} height={96} />
            </div>
            <div className="mt-10 tp-rise tp-rise-delay-2">
              <EditorialTitle
                text={s(c.title)}
                emphasize={s(c.titleEmphasis) || lastWord(s(c.title))}
                color={ink.strong}
                accentColor={brand.tokens.accent}
                size={116}
                maxWidthPx={1600}
              />
            </div>
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
                fontSize: fillPx(260, "display"),
                lineHeight: 0.85,
                fontWeight: 600,
                letterSpacing: "-0.05em",
                color: "var(--slide-accent-text)",
                opacity: 0.95,
              }}
            >
              {s(c.chapterNumber, "01")}
            </div>
            <div className="flex-1">
              <Kicker brand={brand} color={ink.muted}>
                {s(c.kicker, "Chapter")}
              </Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={64}
                thicknessPx={2}
                className="mt-6"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={1100} className="mt-8">
                {s(c.title)}
              </DisplayTitle>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-AGENDA": {
      const items = arr(c.items);
      const rule = isDark ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.08)";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          {/* Ambient glow anchoring the composition */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(38% 42% at 88% 12%, ${brand.tokens.accent}${isDark ? "1F" : "12"} 0%, transparent 70%)`,
            }}
          />
          <div className="relative flex h-full flex-col">
            <SlideTitle brand={brand} title={s(c.title, "Agenda")} kicker="Contents" />
            <div
              className="slide-fill-stretch slide-fill-rows mt-16 grid grid-cols-2 gap-x-24"
              style={{ gridTemplateRows: `repeat(${Math.max(1, Math.ceil(items.length / 2))}, minmax(0, 1fr))` }}
            >
              {items.map((it, i) => (
                <div
                  key={i}
                  className="group grid grid-cols-[96px_1fr_auto] items-center gap-6 py-7"
                  style={{ borderTop: `1px solid ${rule}` }}
                >
                  <SlideNumeral value={i + 1} sizePx={48} />
                  <div
                    style={{
                      fontSize: fillPx(34, "figure"),
                      lineHeight: 1.18,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: ink.strong,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div
                    aria-hidden
                    className="h-[1px] w-10"
                    style={{
                      background: `linear-gradient(90deg, ${brand.tokens.accent} 0%, transparent 100%)`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-OP-AGENDA-VERTICAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Agenda")} kicker="Contents" />
          <div className="mt-12">
            {arr(c.items).map((it, i) => (
              <div
                key={i}
                className="relative flex items-baseline gap-10 py-7"
              >
                <AccentRule
                  accent={brand.tokens.accent}
                  cap
                  capLength={90}
                  emphasis={0.28}
                  style={{ position: "absolute", left: 0, right: 0, top: 0, width: "auto" }}
                />
                <SlideNumeral value={i + 1} sizePx={40} style={{ minWidth: 90 }} />
                <div className="flex-1">
                  <div
                    style={{
                      fontSize: fillPx(34, "figure"),
                      fontWeight: 600,
                      letterSpacing: "-0.015em",
                      lineHeight: 1.15,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  {s(it.body) && (
                    <div className="mt-2" style={{ fontSize: fillPx(24, "body"), opacity: 0.66, lineHeight: 1.35 }}>
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
    case "MV-TEAM-BIOS-4": {
      const people = arr(c.items);
      const cols = people.length === 4 ? 4 : people.length === 2 ? 2 : 3;
      const portraitPx = cols === 4 ? 168 : 200;
      const roleColor = isDark ? "rgba(255,255,255,0.62)" : "rgba(10,15,28,0.58)";
      const cardBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(10,15,28,0.02)";
      const cardRing = isDark ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.08)";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Team")} />
          <div
            className={`mt-14 grid gap-8 ${cols === 4 ? "grid-cols-4" : cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}
          >
            {people.map((p, i) => {
              const name = s(p.name);
              const initials = name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() ?? "")
                .join("");
              // Demo fidelity: when no headshot is authored we still show a
              // real face from the shared portrait pool (deterministic by
              // name/index) instead of an initials monogram.
              const photo =
                s(p.photoUrl ?? p.avatarUrl ?? p.imageUrl) || pickHeadshot(name || `person-${i}`);
              return (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-3xl p-10"
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardRing}`,
                    backgroundImage: `radial-gradient(120% 60% at 50% -20%, ${brand.tokens.accent}${isDark ? "1F" : "14"} 0%, transparent 60%)`,
                  }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{
                      background: `linear-gradient(90deg, ${brand.tokens.accent} 0%, ${hexA(brand.tokens.accent, 0.0)} 85%)`,
                    }}
                  />
                  <div className="flex flex-col items-start">
                    <div
                      className="relative mb-8 grid place-items-center rounded-full"
                      style={{
                        width: portraitPx,
                        height: portraitPx,
                        background: photo
                          ? undefined
                          : `radial-gradient(circle at 30% 25%, ${hexA(brand.tokens.accent, 0.333)} 0%, ${brand.tokens.primary}CC 70%)`,
                        boxShadow: `0 0 0 2px ${hexA(brand.tokens.accent, 0.333)}, 0 24px 60px -20px ${hexA(brand.tokens.accent, 0.4)}`,
                        overflow: "hidden",
                      }}
                    >
                      {photo ? (
                        <img src={photo} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        <span
                          style={{
                            color: ink.strong,
                            fontSize: portraitPx * 0.36,
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {initials || "•"}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: fillPx(32, "figure"),
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        color: ink.strong,
                        lineHeight: 1.1,
                      }}
                    >
                      {name}
                    </div>
                    {s(p.role) && (
                      <div
                        className="mt-3 uppercase"
                        style={{
                          fontSize: fillPx(15, "kicker"),
                          letterSpacing: "0.24em",
                          color: roleColor,
                          fontWeight: 600,
                        }}
                      >
                        {s(p.role)}
                      </div>
                    )}
                    {s(p.bio ?? p.note) && (
                      <div
                        className="mt-6"
                        style={{
                          fontSize: fillPx(20, "body"),
                          lineHeight: 1.45,
                          color: ink.muted,
                          maxWidth: 420,
                        }}
                      >
                        {s(p.bio ?? p.note)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    // ── Context & Challenge ───────────────────────────────────────────
    case "MV-CTX-CARDS-3":
    case "MV-SOL-PILLARS-3":
      return (
        <CardGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={3}
        />
      );

    case "MV-CTX-CARDS-2":
    case "MV-SOL-PILLARS-2":
      return (
        <CardGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={2}
        />
      );

    case "MV-CTX-CARDS-4":
    case "MV-SOL-PILLARS-4":
      return (
        <CardGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={2}
          rows={2}
        />
      );

    case "MV-CTX-COST": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[1.05fr_1fr] items-center gap-24">
            <div className="min-w-0">
              <Kicker brand={brand}>Cost of inaction</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={88}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <StatFigure
                brand={brand}
                value={s(c.stat)}
                unit={s(c.unit)}
                label={s(c.label)}
                size="xl"
              icon={s(c.icon)} iconSize={s(c.iconSize)} />
            </div>
            <SupportingText size="xl" opacity={0.85} maxWidthPx={720}>
              {s(c.narrative)}
            </SupportingText>
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-STATS-4":
      return (
        <AuroraStatGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={2}
          rows={2}
          align={s(c.align) === "center" ? "center" : "left"}
        />
      );

    case "MV-CTX-STAT-GRID":
      return (
        <AuroraStatGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={2}
          rows={2}
          align={s(c.align) === "center" ? "center" : "left"}
        />
      );

    case "MV-PROOF-STATS-2":
      return (
        <AuroraStatGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={2}
          align={s(c.align) === "center" ? "center" : "left"}
        />
      );

    case "MV-PROOF-STATS-3":
    case "MV-INS-OPPORTUNITY-SIZE":
      return (
        <AuroraStatGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={3}
          align={s(c.align) === "center" ? "center" : "left"}
        />
      );

    case "MV-CTX-TREND":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand}>
              <span
                className="mr-4 inline-block align-[-0.15em]"
                style={{ fontSize: fillPx(44, "figure"), letterSpacing: 0 }}
              >
                {s(c.direction) === "down" ? "\u2193" : "\u2191"}
              </span>
              Trend
            </Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={88}
              thicknessPx={2}
              className="mt-6 mb-8"
            />
            <DisplayTitle size="section" color={ink.strong} maxWidthPx={1500}>
              {s(c.headline)}
            </DisplayTitle>
            <SupportingText size="lg" opacity={0.8} maxWidthPx={1180} className="mt-10">
              {s(c.narrative)}
            </SupportingText>
          </div>
        </SlideFrame>
      );

    case "MV-CTX-CHALLENGE-STACK":
      return (
        <NumberedList
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
        />
      );

    // ── Insight ────────────────────────────────────────────────────────
    case "MV-INS-CALLOUT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand}>Insight</Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={88}
              thicknessPx={2}
              className="mt-6 mb-10"
            />
            <DisplayTitle size="section" color={ink.strong} maxWidthPx={1520}>
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
          {/* Ambient spotlight — a large diffuse glow behind the idea makes
              the hero moment breathe. Second, tighter halo adds focus. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(60% 55% at 22% 55%, ${brand.tokens.accent}${isDark ? "28" : "1A"} 0%, transparent 65%),
                radial-gradient(28% 26% at 22% 55%, ${brand.tokens.accent}${isDark ? "3A" : "22"} 0%, transparent 70%)
              `,
            }}
          />
          <div className="relative flex h-full flex-col justify-center">
            <div className="flex items-center gap-4 tp-rise">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background: brand.tokens.accent,
                  boxShadow: `0 0 24px ${brand.tokens.accent}, 0 0 8px ${brand.tokens.accent}`,
                }}
              />
              <Kicker brand={brand}>{s(c.kicker, "The big idea")}</Kicker>
            </div>
            <div className="mt-10 flex items-start gap-8 tp-rise tp-rise-delay-1">
              <StatRail color={"var(--slide-accent-text)"} height={220} className="mt-4" />
              <div className="flex-1">
                <EditorialTitle
                  text={s(c.idea)}
                  emphasize={s(c.ideaEmphasis) || lastWord(s(c.idea))}
                  color={ink.strong}
                  accentColor={brand.tokens.accent}
                  size={124}
                  maxWidthPx={1580}
                />
              </div>
            </div>
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
                <div
                  key={i}
                  className="px-10 first:pl-0 last:pr-0"
                  style={{
                    borderLeft: i === 0 ? undefined : "1px solid rgba(10,15,28,0.10)",
                  }}
                >
                  <Hairline
                    color={"var(--slide-accent-text)"}
                    widthPx={44}
                    thicknessPx={2}
                    className="mb-6"
                  />
                  <Kicker brand={brand}>{b.label}</Kicker>
                  <div
                    className="mt-6"
                    style={{
                      fontSize: fillPx(34, "figure"),
                      lineHeight: 1.28,
                      letterSpacing: "-0.01em",
                      color: ink.strong,
                    }}
                  >
                    {b.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-INS-QUOTE": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="relative flex h-full flex-col justify-center">
            <GlassTile radius={28} padding="px-24 py-24" className="relative overflow-visible">
              <div className="relative">
                <div className="flex items-center gap-4 tp-rise">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      background: brand.tokens.accent,
                      boxShadow: `0 0 20px ${brand.tokens.accent}`,
                    }}
                  />
                  <Kicker brand={brand}>In their words</Kicker>
                </div>
                <div className="mt-16 mb-16 tp-rise tp-rise-delay-1">
                  <PullQuote
                    quote={s(c.quote)}
                    brand={brand}
                    size={78}
                    color={ink.strong}
                    closingGlyph
                  />
                </div>
                <div
                  className="mt-10 h-[2px] w-[120px] rounded-full tp-rise tp-rise-delay-2"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${brand.tokens.accent} 0%, ${hexA(brand.tokens.accent, 0.0)} 100%)`,
                  }}
                />
                <div className="mt-8 tp-rise tp-rise-delay-3">
                  <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
                </div>
              </div>
            </GlassTile>
          </div>
        </SlideFrame>
      );
    }

    // ── Solution & Process ─────────────────────────────────────────────
    case "MV-SOL-PILLARS-5": {
      const hero = obj(c.hero);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={92} y={30} size={820} />
          <div className="relative">
            <SlideTitle brand={brand} title={s(c.title)} />
            <div
              className="mt-10 grid grid-cols-2 gap-8"
              style={{ gridTemplateRows: "1fr 1fr", height: 760 }}
            >
              <GlassTile radius={26} padding="px-10 py-9" className="row-span-2 overflow-hidden">
                <Kicker brand={brand}>Hero</Kicker>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
                  thicknessPx={2}
                  className="mt-4 mb-6"
                />
                <div
                  style={{
                    fontSize: fillPx(48, "figure"),
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                    color: ink.strong,
                  }}
                >
                  {s(hero.title)}
                </div>
                <SupportingText size="md" opacity={0.78} className="mt-5" maxWidthPx={560}>
                  {s(hero.body)}
                </SupportingText>
              </GlassTile>
              {arr(c.items)
                .slice(0, 4)
                .map((it, i) => (
                  <Card
                    key={i}
                    brand={brand}
                    title={s(it.title)}
                    body={s(it.body)}
                    index={i + 1}
                    icon={s(it.icon)}
                  />
                ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-SOL-ARCHITECTURE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={92} y={72} size={820} />
          <div className="relative">
            <SlideTitle brand={brand} title={s(c.title)} />
            <GlassTile radius={26} padding="px-12 py-8" className="mt-12">
              {arr(c.items).map((it, i) => (
                <div key={i}>
                  {i > 0 && <SoftDivider />}
                  <div className="flex items-center gap-10 py-7">
                    <SlideNumeral value={i + 1} sizePx={26} className="w-16" />
                    <div
                      className="w-72"
                      style={{
                        fontSize: fillPx(30, "figure"),
                        fontWeight: 600,
                        letterSpacing: "-0.015em",
                        color: "var(--slide-ink)",
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <SupportingText size="md" opacity={0.75} className="flex-1">
                      {s(it.body)}
                    </SupportingText>
                  </div>
                </div>
              ))}
            </GlassTile>
          </div>
        </SlideFrame>
      );

    case "MV-SOL-FEATURE-LIST":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={90} y={28} size={860} />
          <div className="relative flex h-full flex-col">
            <SlideTitle brand={brand} title={s(c.title)} />
            <GlassTile radius={26} padding="px-12 py-12" className="slide-fill-stretch mt-12 flex flex-col">
              <div
                className="slide-fill-stretch slide-fill-rows grid grid-cols-2 items-center gap-x-16 gap-y-8"
                style={{
                  gridTemplateRows: `repeat(${Math.max(1, Math.ceil(arr(c.items).length / 2))}, minmax(0, 1fr))`,
                }}
              >
                {arr(c.items).map((it, i) => (
                  <div key={i} className="flex items-start gap-5">
                    <IconBadge
                      brand={brand}
                      label={s(it.label)}
                      index={i}
                      size="md"
                      override={s(it.icon)} sizeToken={s(it.iconSize)}
                    />
                    <div className="flex-1">
                      <div className="text-3xl font-semibold" style={{ color: ink.strong }}>
                        {s(it.label)}
                      </div>
                      <div className="mt-2 text-2xl opacity-80" style={{ color: ink.muted }}>
                        {s(it.body)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassTile>
          </div>
        </SlideFrame>
      );

    case "MV-PROC-TIMELINE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="slide-fill-stretch relative mt-24 flex flex-col">
            {/* Brand process rail at node baseline */}
            <ProcessRail
              accent={brand.tokens.accent}
              thickness={2}
              arrow
              style={{ left: 0, right: 32, top: 8, width: "auto" }}
            />
            <div
              className="slide-fill-stretch grid gap-10"
              style={{
                gridTemplateColumns: `repeat(${Math.max(arr(c.items).length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {arr(c.items).map((it, i) => (
                <div key={i} className="flex h-full flex-col justify-between gap-3 pr-8">
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
                    style={{
                      fontSize: fillPx(18, "body"),
                      letterSpacing: "0.28em",
                      color: "var(--slide-accent-text)",
                      fontWeight: 600,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      fontSize: fillPx(30, "figure"),
                      fontWeight: 600,
                      color: ink.strong,
                      letterSpacing: "-0.015em",
                      lineHeight: 1.15,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div
                    className="mt-4"
                    style={{
                      fontSize: fillPx(22, "body"),
                      lineHeight: 1.4,
                      color: "color-mix(in oklab, currentColor 72%, transparent)",
                    }}
                  >
                    {s(it.body)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-PROC-STEP-CHAIN": {
      // Up to nine connected steps on one rail. Each tile shows its index by
      // default; `item.icon` swaps the number for a mark. `item.highlight`
      // flags a step in the tertiary pop and surfaces `item.note` beneath it.
      const steps = arr(c.items).slice(0, 9);
      const count = Math.max(steps.length, 1);
      // Tiles cap at these widths on the full 1920 canvas but are free to shrink
      // fluidly on narrower stages via container-query units below.
      const tile = count >= 8 ? 108 : count >= 6 ? 132 : 168;
      const gap = count >= 8 ? 12 : 20;
      // Column width as a share of the row container, so every size below can be
      // expressed as `min(<fluid cqw>, <cap px>)` and never overlap its neighbour.
      const colCqw = 100 / count;
      const fluid = (share: number, cap: number) =>
        `min(${(colCqw * share).toFixed(3)}cqw, ${Math.round(cap)}px)`;
      // ---- Global type scale -------------------------------------------------
      // Numerals, titles and sub-text are sized from FIXED px baselines (not the
      // per-count tile width) so a 3-step chain and a 9-step chain read at the
      // same weight. The `cqw` term only kicks in on genuinely narrow stages,
      // where it keeps neighbours from colliding.
      const typeK = (raw: unknown, fallback = 100) => {
        const n = Number(raw);
        return (Number.isFinite(n) && n > 0 ? Math.max(50, Math.min(200, n)) : fallback) / 100;
      };
      const numeralK = typeK(c.stepNumeralPct);
      const titleK = typeK(c.stepTitlePct);
      const bodyK = typeK(c.stepBodyPct);
      const NUMERAL_BASE = 56;
      const TITLE_BASE = 23;
      const BODY_BASE = 17;
      const glyphSize = (mult: number) => fluid(0.52 * mult, NUMERAL_BASE * numeralK * mult);
      const titleSize = fluid(0.19 * titleK, TITLE_BASE * titleK);
      const bodySize = fluid(0.155 * bodyK, BODY_BASE * bodyK);
      const hasNote = steps.some((it) => truthy(it.highlight) && s(it.note));

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          {/* Tagged intro items: the title leads, then every step lands on its
              own beat (see slide-intro.ts "steps" recipe) so the sequence reads
              as discrete moves rather than one soft wash. */}
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} />
          </div>
          <div className="relative mt-20 @container">
            <div
              className="grid items-start"
              style={{
                gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
                columnGap: gap,
              }}
            >

              {steps.map((it, i) => {
                const flagged = truthy(it.highlight);
                const StepIcon = it.icon ? iconByName(s(it.icon)) : null;
                // Per-step glyph size token, matching the Studio icon stepper.
                const stepIconK =
                  ({ xs: 0.6, sm: 0.8, md: 1, lg: 1.25, xl: 1.6, display: 2.2 } as Record<
                    string,
                    number
                  >)[String(it.iconSize ?? "md")] ?? 1;
                // Flagged steps break out of the division accent into the brand
                // pink pop so the risk point reads instantly.
                // Mode-aware tone: raw pink/blue is unreadable as ink or hairline on
                // the dark ground, so both flavours ride the accentInk ramp.
                const line = flagged ? accentInk("#EC388A", mode, 3) : accentTone;
                return (
                  <div
                    key={i}
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="relative flex flex-col items-center text-center"
                  >
                    {/* Connector segment — drawn ONLY in the gutter between two
                        tile edges, never underneath or across a tile/glyph, and
                        faded at both tails per the house connector style. */}
                    {i > 0 && (
                      <div
                        aria-hidden
                        data-decorative
                        data-chain-connector=""
                        className="absolute"
                        style={{
                          top: `calc(${fluid(1.45, tile * 1.45)} * 0.5)`,
                          right: `calc(50% + ${fluid(0.5, tile / 2)})`,
                          left: `calc(-50% - ${gap}px + ${fluid(0.5, tile / 2)})`,
                          height: 1,
                          backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${brand.tokens.accent} 6%, transparent) 0%, color-mix(in oklab, ${brand.tokens.accent} 42%, transparent) 50%, color-mix(in oklab, ${brand.tokens.accent} 6%, transparent) 100%)`,
                        }}
                      />
                    )}
                    <div
                      data-step-tile=""
                      className="relative flex justify-center"
                      style={{
                        width: fluid(1, tile),
                        height: fluid(1.45, tile * 1.45),
                      }}
                    >
                      {/* Card wash — top-lit accent gradient dissolving into the
                          ground, matching moduleCardSurface. */}
                      <div
                        className="absolute inset-0"
                        style={{
                          borderRadius: `min(22px, 13%)`,
                          backgroundImage: cardWashGradient(line),
                        }}
                      />
                      {/* Hairline frame, masked so BOTH the bottom edge and the
                          lower thirds of the side rails fade out — no closed box
                          line anywhere along the bottom of the gradient. */}
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute inset-0"
                        style={openBottomFrame(line, "min(22px, 13%)")}
                      />
                      {/* Accent seam across the top edge + inner top highlight,
                          the same signature the other module cards carry. */}
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute"
                        style={{
                          top: 0,
                          left: `${SEAM_TICK_INSET_PCT}%`,
                          right: `${SEAM_TICK_INSET_PCT}%`,
                          height: SEAM_HEIGHT_PX,
                          borderRadius: SEAM_HEIGHT_PX,
                          backgroundImage: `linear-gradient(90deg, transparent 0%, ${line} 50%, transparent 100%)`,
                          opacity: flagged ? 0.95 : 0.7,
                        }}
                      />

                      {/* Fixed-height glyph well: the number/icon is centered
                          inside it so per-step icon sizes never shift the copy.
                          `iconAlign` / `iconOffsetPct` nudge the glyph inside the
                          well without touching the tile frame itself. */}
                      <div
                        data-icon-well=""
                        className="absolute left-0 right-0 flex justify-center"
                        style={{
                          top: "16%",
                          height: "62%",
                          alignItems:
                            String(it.iconAlign ?? "center") === "top"
                              ? "flex-start"
                              : String(it.iconAlign ?? "center") === "bottom"
                                ? "flex-end"
                                : "center",
                          transform: `translateY(${Math.max(
                            -40,
                            Math.min(40, Number(it.iconOffsetPct ?? 0) || 0),
                          )}%)`,
                        }}
                      >

                        {StepIcon ? (
                          <StepIcon
                            size={Math.round(NUMERAL_BASE * numeralK * 0.86 * stepIconK)}
                            strokeWidth={1.6}
                            color={line}
                            aria-hidden
                            style={{
                              width: glyphSize(0.86 * stepIconK),
                              height: glyphSize(0.86 * stepIconK),
                            }}
                          />
                        ) : (
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: glyphSize(stepIconK),
                              fontWeight: 800,
                              color: line,
                              letterSpacing: "-0.04em",
                              lineHeight: 1,
                            }}
                          >
                            {i + 1}
                          </span>
                        )}
                      </div>

                    </div>


                    {/* Reserved title band keeps sub-text baselines aligned even
                        when one step's label wraps to two lines. */}
                    <div
                      data-step-copy=""
                      className="mt-6 flex items-start justify-center"
                      style={{
                        width: fluid(1, tile),
                        minHeight: "2.4em",
                        fontSize: titleSize,
                        fontWeight: 600,
                        lineHeight: 1.2,
                        letterSpacing: "-0.01em",
                        color: flagged ? line : ink.strong,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    {s(it.body) && (
                      <div
                        data-step-copy=""
                        style={{
                          width: fluid(1, tile),
                          fontSize: bodySize,
                          lineHeight: 1.35,
                          color: "color-mix(in oklab, currentColor 66%, transparent)",
                        }}
                      >

                        {s(it.body)}
                      </div>
                    )}


                    {flagged && s(it.note) && (
                      <div className="mt-5 flex flex-col items-center">
                        <div
                          aria-hidden
                          style={{
                            width: 1,
                            height: 28,
                            backgroundColor: `color-mix(in oklab, ${line} 60%, transparent)`,
                          }}
                        />
                        <AlertTriangle size={30} strokeWidth={1.7} color={line} aria-hidden />
                        <div
                          className="mt-3"
                          style={{
                            fontSize: fluid(0.17 * bodyK, 19 * bodyK),
                            fontWeight: 600,
                            lineHeight: 1.25,
                            color: line,
                          }}
                        >
                          {s(it.note)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Reserve space so a flagged callout never collides with the footer. */}
            {hasNote && <div style={{ height: 24 }} />}
            {/* Module-specific bottom content band — a single takeaway line that
                sits under the chain. Accepts either a plain `summary` string or
                `{ lead, emphasis }` so the second clause can pop in the accent.
                Geometry/type come from the shared SummaryBand component. */}
            {(() => {
              const sum = readSummary(c.summary);
              if (!sum.lead && !sum.emphasis) return null;
              return (
                <SummaryBand
                  data-intro-item=""
                  data-intro-step={count + 1}
                  data-step-summary=""
                  lead={sum.lead}
                  emphasis={sum.emphasis}
                  accent={brand.tokens.accent}
                  leadTone={ink.strong}
                  fontSize={fluid(0.26, SUMMARY_BAND.fontSize)}
                />
              );
            })()}

          </div>
        </SlideFrame>
      );
    }

    case "MV-PROC-PHASES":
      return (
        <NumberedList
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items).map((it) => ({ title: s(it.label), body: s(it.body) }))}
        />
      );

    case "MV-PROC-STEP-SPOTLIGHT": {
      // One process step, spotlit. A circular media medallion carries the step
      // numeral on the left; the right column runs the hero step title over an
      // icon-led capability chain. House treatment throughout: accentInk tones,
      // hairline rings with faded tails, cardWashGradient tiles.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const rows = arr(c.items).slice(0, 5);
      const stepNo = s(c.stepNumber, String(Math.max(1, Number(c.stepIndex) || pageNumber || 1)));
      const rowCount = Math.max(rows.length, 1);
      const iconBox = rowCount > 4 ? 82 : 96;
      const labelSize = rowCount > 4 ? 34 : 40;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full items-center" style={{ gridTemplateColumns: "0.92fr 1.08fr", columnGap: 96 }}>
            {/* ── Numbered medallion ───────────────────────────────────── */}
            <div data-intro-item="" data-intro-step={0} className="relative mx-auto aspect-square w-full" style={{ maxWidth: 620 }}>
              {/* Outer orbit ring — one continuous hairline, no masked breaks
                  (the old conic mask read as several stacked arcs). */}
              <div
                aria-hidden
                data-decorative
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid color-mix(in oklab, ${accent} 40%, transparent)` }}
              />
              {/* Orbit nodes centred exactly on the ring. */}
              {orbitNodePositions(4, 26).map((pos, i) => (
                <div
                  key={i}
                  aria-hidden
                  data-decorative
                  className="absolute rounded-full"
                  style={{
                    ...pos,
                    width: 16,
                    height: 16,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: accent,
                  }}
                />
              ))}

              {/* Photo medallion. */}
              <div className="absolute overflow-hidden rounded-full" style={{ inset: "7%" }}>
                <MediaTile
                  brand={brand}
                  seed={s(c.mediaSeed, s(c.title, "step-spotlight"))}
                  overrideUrl={s(c.mediaUrl)}
                  mediaPath={s(c.mediaPath)}
                  fit={s(c.mediaFit) || undefined}
                  focus={s(c.mediaFocus) || undefined}
                  zoom={Number(c.mediaZoom) || undefined}
                  className="h-full w-full rounded-full"
                />
                {/* Accent duotone wash so the numeral always clears contrast. */}
                <div
                  aria-hidden
                  data-decorative
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundImage: `linear-gradient(150deg, color-mix(in oklab, ${brand.tokens.primary} 62%, transparent) 0%, color-mix(in oklab, ${accent} 34%, transparent) 100%)`,
                  }}
                />
                <div
                  data-on-media
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    color: "#FFFFFF",
                    fontSize: fillPx(220, "display"),
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: "-0.05em",
                  }}
                >
                  {stepNo}
                </div>
              </div>
            </div>

            {/* ── Hero title + icon chain ──────────────────────────────── */}
            <div className="flex flex-col justify-center">
              <div data-intro-item="" data-intro-step={1}>
                <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
              </div>
              {/* gap:0 on the stack — the chevron carries equal margins above
                  and below itself so every row sits on the same rhythm. */}
              <div className="mt-12 flex flex-col" style={{ gap: 0 }}>
                {rows.map((raw, i) => {
                  const it = obj(raw);
                  const RowIcon = it.icon ? iconByName(s(it.icon)) : null;
                  const chainGap = rowCount > 4 ? 10 : 18;
                  return (
                    <div key={i} data-intro-item="" data-intro-step={i + 2}>
                      {i > 0 && (
                        <div
                          aria-hidden
                          data-decorative
                          className="flex items-center justify-center"
                          style={{
                            width: iconBox,
                            height: rowCount > 4 ? 20 : 30,
                            marginTop: chainGap,
                            marginBottom: chainGap,
                            color: accent,
                          }}
                        >
                          <ChevronsDown size={rowCount > 4 ? 22 : 28} strokeWidth={2.5} />
                        </div>
                      )}

                      <div className="flex items-center" style={{ gap: 34 }}>
                        <div
                          className="relative flex shrink-0 items-center justify-center"
                          style={{ width: iconBox, height: iconBox }}
                        >
                          <div
                            aria-hidden
                            data-decorative
                            className="absolute inset-0"
                            style={{ borderRadius: 20, backgroundImage: cardWashGradient(accent) }}
                          />
                          <div
                            aria-hidden
                            data-decorative
                            className="absolute inset-0"
                            style={openBottomFrame(accent, 20)}
                          />
                          <span className="relative" style={{ color: accent }}>
                            {RowIcon ? (
                              <RowIcon size={Math.round(iconBox * 0.46)} strokeWidth={1.7} />
                            ) : (
                              <span style={{ fontSize: fillPx(30, "figure"), fontWeight: 700 }}>{i + 1}</span>
                            )}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div
                            style={{
                              fontSize: labelSize,
                              fontWeight: 600,
                              letterSpacing: "-0.02em",
                              lineHeight: 1.15,
                              color: ink.strong,
                            }}
                          >
                            {s(it.label)}
                          </div>
                          {s(it.body) && (
                            <div
                              className="mt-1.5"
                              style={{ fontSize: fillPx(22, "body"), lineHeight: 1.35, color: ink.body }}
                            >
                              {s(it.body)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROC-STAGE-ORBITS": {
      // Two-to-four numbered stages across the slide. Each stage is a circular
      // photo medallion in an orbit ring carrying its numeral and stage name,
      // with a vertical icon-led task chain beneath it. Chevron pairs carry the
      // eye between stages. House treatment: accentInk tones, hairline rings
      // with faded tails, cardWashGradient + openBottomFrame task tiles.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const stages = arr(c.stages).slice(0, 4).map((raw) => obj(raw));
      const stageCount = Math.max(stages.length, 1);
      const wide = stageCount <= 3;
      const iconBox = wide ? 78 : 64;
      const taskSize = wide ? 27 : 22;
      const numeralSize = wide ? 96 : 74;
      const stageNameSize = wide ? 40 : 32;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            {s(c.title) && (
              <div data-intro-item="" data-intro-step={0}>
                <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
              </div>
            )}
            <div className="mt-10 flex items-start justify-center" style={{ gap: wide ? 28 : 18 }}>
              {stages.map((st, si) => {
                const tasks = arr(st.items).slice(0, 4).map((t) => obj(t));
                return (
                  <React.Fragment key={si}>
                    {si > 0 && (
                      <div
                        aria-hidden
                        data-decorative
                        className="flex shrink-0 items-center justify-center"
                        style={{ color: accent, paddingTop: wide ? 168 : 140 }}
                      >
                        <ChevronsRight size={wide ? 58 : 44} strokeWidth={3} />
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col items-center">
                      {/* ── Numbered stage medallion ─────────────────────── */}
                      <div
                        data-intro-item=""
                        data-intro-step={si * 2 + 1}
                        className="relative aspect-square w-full"
                        style={{ maxWidth: wide ? 380 : 310 }}
                      >
                        {/* Outer orbit ring — one continuous hairline. */}
                        <div
                          aria-hidden
                          data-decorative
                          className="absolute inset-0 rounded-full"
                          style={{ border: `2px solid color-mix(in oklab, ${accent} 38%, transparent)` }}
                        />
                        {/* Inner containment ring. */}
                        <div
                          aria-hidden
                          data-decorative
                          className="absolute rounded-full"
                          style={{
                            inset: "5.5%",
                            border: `1px solid color-mix(in oklab, ${accent} 26%, transparent)`,
                          }}
                        />
                        {/* Orbit nodes centred exactly on the outer ring. */}
                        {orbitNodePositions(4, 26).map((pos, i) => (

                          <div
                            key={i}
                            aria-hidden
                            data-decorative
                            className="absolute rounded-full"
                            style={{
                              ...pos,
                              width: wide ? 13 : 10,
                              height: wide ? 13 : 10,
                              transform: "translate(-50%, -50%)",
                              backgroundColor: accent,
                            }}
                          />
                        ))}
                        {/* Photo medallion with duotone wash so type clears. */}
                        <div className="absolute overflow-hidden rounded-full" style={{ inset: "11%" }}>
                          <MediaTile
                            brand={brand}
                            seed={s(st.mediaSeed, s(st.label, `stage-${si + 1}`))}
                            overrideUrl={s(st.mediaUrl)}
                            mediaPath={s(st.mediaPath)}
                            fit={s(st.mediaFit) || undefined}
                            focus={s(st.mediaFocus) || undefined}
                            zoom={Number(st.mediaZoom) || undefined}
                            className="h-full w-full rounded-full"
                          />
                          <div
                            aria-hidden
                            data-decorative
                            className="absolute inset-0 rounded-full"
                            style={{
                              backgroundImage: `linear-gradient(150deg, color-mix(in oklab, ${brand.tokens.primary} 66%, transparent) 0%, color-mix(in oklab, ${accent} 36%, transparent) 100%)`,
                            }}
                          />
                          <div
                            data-on-media
                            className="absolute inset-0 flex flex-col items-center justify-center px-[12%] text-center"
                            style={{ color: "#FFFFFF" }}
                          >
                            <div
                              style={{
                                fontSize: numeralSize,
                                fontWeight: 700,
                                lineHeight: 1,
                                letterSpacing: "-0.05em",
                              }}
                            >
                              {s(st.stepNumber, String(si + 1))}
                            </div>
                            <div
                              className="mt-2"
                              style={{
                                fontSize: stageNameSize,
                                fontWeight: 700,
                                lineHeight: 1.08,
                                letterSpacing: "-0.02em",
                                textTransform: "uppercase",
                              }}
                            >
                              {s(st.label)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Task chain ───────────────────────────────────── */}
                      <div
                        data-intro-item=""
                        data-intro-step={si * 2 + 2}
                        className="mt-8 flex w-full flex-col"
                        style={{ gap: 0 }}
                      >
                        {tasks.map((t, ti) => {
                          const TaskIcon = t.icon ? iconByName(s(t.icon)) : null;
                          const taskGap = wide ? 4 : 3;
                          return (
                            <React.Fragment key={ti}>
                              {ti > 0 && (
                                <div
                                  aria-hidden
                                  data-decorative
                                  className="flex items-center justify-center"
                                  style={{
                                    width: iconBox,
                                    height: wide ? 26 : 20,
                                    marginTop: taskGap,
                                    marginBottom: taskGap,
                                    color: accent,
                                  }}
                                >
                                  <ChevronsDown size={wide ? 24 : 18} strokeWidth={2.5} />
                                </div>
                              )}

                              <div className="flex items-center" style={{ gap: wide ? 24 : 18 }}>
                                <div
                                  className="relative flex shrink-0 items-center justify-center"
                                  style={{ width: iconBox, height: iconBox }}
                                >
                                  <div
                                    aria-hidden
                                    data-decorative
                                    className="absolute inset-0"
                                    style={{ borderRadius: 18, backgroundImage: cardWashGradient(accent) }}
                                  />
                                  <div
                                    aria-hidden
                                    data-decorative
                                    className="absolute inset-0"
                                    style={openBottomFrame(accent, 18)}
                                  />
                                  <span className="relative" style={{ color: accent }}>
                                    {TaskIcon ? (
                                      <TaskIcon size={Math.round(iconBox * 0.46)} strokeWidth={1.7} />
                                    ) : (
                                      <span style={{ fontSize: fillPx(24, "body"), fontWeight: 700 }}>{ti + 1}</span>
                                    )}
                                  </span>
                                </div>
                                <div
                                  className="min-w-0"
                                  style={{
                                    fontSize: taskSize,
                                    fontWeight: 600,
                                    letterSpacing: "-0.015em",
                                    lineHeight: 1.2,
                                    color: ink.strong,
                                  }}
                                >
                                  {s(t.label)}
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </SlideFrame>
      );
    }



    case "MV-PROC-BEFORE-AFTER": {

      const before = obj(c.before);
      const after = obj(c.after);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="slide-fill-stretch mt-14 grid grid-cols-2 gap-16">
            <div
              className="flex flex-col pt-8"
              style={{ borderTop: "1px solid rgba(10,15,28,0.15)" }}
            >
              <Kicker brand={brand} color="color-mix(in oklab, currentColor 62%, transparent)">
                Before
              </Kicker>
              <div
                className="mt-8"
                style={{
                  fontSize: fillPx(40, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {s(before.title)}
              </div>
              <div
                className="mt-6"
                style={{
                  fontSize: fillPx(24, "body"),
                  lineHeight: 1.4,
                  color: "color-mix(in oklab, currentColor 72%, transparent)",
                }}
              >
                {s(before.body)}
              </div>
            </div>
            <div
              className="flex flex-col pt-8"
              style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
            >
              <Kicker brand={brand}>After</Kicker>
              <div
                className="mt-8"
                style={{
                  fontSize: fillPx(40, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {s(after.title)}
              </div>
              <div
                className="mt-6"
                style={{
                  fontSize: fillPx(24, "body"),
                  lineHeight: 1.4,
                  color: "color-mix(in oklab, currentColor 82%, transparent)",
                }}
              >
                {s(after.body)}
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-INFO-HUB-SATELLITES": {
      // Hub & satellites: one centre disc ringed by icon nodes, each node paired
      // with a feature block in the flanking columns. Scales 4-8 features — the
      // ring angles, node size and type all derive from the count so a 4-up and
      // an 8-up read with the same weight.
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const cool = isDark ? "#7FB3F5" : "#3E7BD1";
      const hub = obj(c.hub);
      const feats = arr(c.items).slice(0, 8);
      const count = Math.max(feats.length, 1);
      const half = Math.ceil(count / 2);
      const left = feats.slice(0, half);
      const right = feats.slice(half);
      const dense = count >= 7;
      const labelSize = dense ? 22 : 24;
      const bodySize = dense ? 17 : 18;
      const node = dense ? 58 : 66;
      // Orbit radius is set so the node's INNER edge clears the hub's dashed
      // ring (OrbitDisc draws it at size * 1.347 / 2 = 186px) — no hairline may
      // cut through a satellite disc.
      const ring = 222;

      // Satellite angles: the left group hugs the left arc, the right group the
      // right arc, so every node sits beside the column its copy lives in.
      const angleFor = (i: number, total: number, side: "left" | "right") => {
        const span = total > 1 ? 108 : 0;
        const start = side === "left" ? 180 - span / 2 : -span / 2;
        const step = total > 1 ? span / (total - 1) : 0;
        const deg = side === "left" ? start + step * i : start + step * i;
        return (deg * Math.PI) / 180;
      };

      const Satellite = ({
        it,
        i,
        total,
        side,
      }: {
        it: Record<string, unknown>;
        i: number;
        total: number;
        side: "left" | "right";
      }) => {
        const NodeIcon = it.icon ? iconByName(s(it.icon)) : null;
        const a = angleFor(i, total, side);
        const x = Math.cos(a) * ring;
        const y = Math.sin(a) * ring;
        return (
          <div
            className="absolute flex items-center justify-center rounded-full"
            style={{
              width: node,
              height: node,
              left: `calc(50% + ${x}px - ${node / 2}px)`,
              top: `calc(50% + ${y}px - ${node / 2}px)`,
              border: `1px solid color-mix(in oklab, ${accent} 46%, transparent)`,
              // Neutral base under the accent wash so the connector ring (and
              // any ground pattern) is occluded rather than showing through the
              // icon — same treatment as the pill-orbit chips.
              backgroundColor: `color-mix(in oklab, ${isDark ? "#03002C" : "#FFFFFF"} ${isDark ? 72 : 82}%, transparent)`,
              backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${accent} ${isDark ? 30 : 18}%, transparent), color-mix(in oklab, ${accent} ${isDark ? 10 : 5}%, transparent))`,
              zIndex: 4,
            }}
          >
            {NodeIcon ? (
              <NodeIcon size={Math.round(node * 0.42)} strokeWidth={1.8} color={accent} aria-hidden />
            ) : (
              <span
                style={{
                  fontSize: Math.round(node * 0.36),
                  fontWeight: 800,
                  color: accent,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String((side === "left" ? i : half + i) + 1).padStart(2, "0")}
              </span>
            )}
          </div>
        );
      };

      const Feature = ({
        it,
        n,
        side,
      }: {
        it: Record<string, unknown>;
        n: number;
        side: "left" | "right";
      }) => (
        <div
          className="relative px-6 py-4"
          style={{ textAlign: side === "left" ? "right" : "left" }}
        >
          {/* Accent seam on the inner edge — the house "open" card signature,
              rotated to point back at the hub. */}
          <div
            aria-hidden
            data-decorative
            className="absolute top-4 bottom-4"
            style={{
              width: SEAM_HEIGHT_PX,
              [side === "left" ? "right" : "left"]: 0,
              borderRadius: SEAM_HEIGHT_PX,
              backgroundImage: `linear-gradient(180deg, transparent, ${accent}, transparent)`,
            }}
          />
          <div
            style={{
              fontSize: labelSize,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: ink.strong,
            }}
          >
            {s(it.label)}
          </div>
          {s(it.body) && (
            <div
              className="mt-1.5"
              style={{
                fontSize: bodySize,
                lineHeight: 1.35,
                color: "color-mix(in oklab, currentColor 68%, transparent)",
              }}
            >
              {s(it.body)}
            </div>
          )}
        </div>
      );

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="relative mt-8">
            <div
              className="grid items-center"
              style={{ gridTemplateColumns: "1fr 520px 1fr", columnGap: 8 }}
            >
              <div className="flex flex-col justify-center gap-2">
                {left.map((it, i) => (
                  <Feature key={i} it={it} n={i + 1} side="left" />
                ))}
              </div>
              <div className="relative flex items-center justify-center" style={{ height: 540 }}>
                {/* Connector ring: the satellites read as one orbit rather than
                    loose discs. Drawn as SVG arc SEGMENTS with a gap around
                    every node, so the hairline never crosses a satellite disc
                    or its icon. Each segment carries its own dash length, which
                    also lets the intro choreography draw the orbit on. */}
                {(() => {
                  const box = ring * 2 + 4;
                  const cx = box / 2;
                  const gapDeg =
                    (Math.asin(Math.min(0.85, (node / 2 + 12) / ring)) * 180) / Math.PI;
                  const degs = [
                    ...left.map((_, i) => (angleFor(i, left.length, "left") * 180) / Math.PI),
                    ...right.map((_, i) => (angleFor(i, right.length, "right") * 180) / Math.PI),
                  ]
                    .map((d) => ((d % 360) + 360) % 360)
                    .sort((a, b) => a - b);
                  const at = (deg: number) => {
                    const r = (deg * Math.PI) / 180;
                    return { x: cx + Math.cos(r) * ring, y: cx + Math.sin(r) * ring };
                  };
                  const segs = degs
                    .map((d, i) => {
                      const next = degs[(i + 1) % degs.length]!;
                      const start = d + gapDeg;
                      let end = next - gapDeg;
                      if (end <= start) end += 360;
                      return { start, end, sweep: end - start };
                    })
                    .filter((sg) => sg.sweep > 3);
                  return (
                    <svg
                      aria-hidden
                      className="absolute"
                      width={box}
                      height={box}
                      viewBox={`0 0 ${box} ${box}`}
                      style={{ zIndex: 1 }}
                    >
                      {segs.map((sg, i) => {
                        const p1 = at(sg.start);
                        const p2 = at(sg.end);
                        const len = (sg.sweep * Math.PI * ring) / 180;
                        return (
                          <path
                            key={i}
                            d={`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${ring} ${ring} 0 ${sg.sweep > 180 ? 1 : 0} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`}
                            fill="none"
                            stroke={accent}
                            strokeOpacity={0.22}
                            strokeWidth={1}
                            strokeLinecap="round"
                            strokeDasharray={`${len.toFixed(1)} ${len.toFixed(1)}`}
                          />
                        );
                      })}
                    </svg>
                  );
                })()}
                <OrbitDisc size={276} accent={accent} cool={cool} isDark={isDark}>
                  <div
                    style={{
                      fontSize: fillPx(34, "figure"),
                      fontWeight: 800,
                      letterSpacing: "-0.035em",
                      lineHeight: 1.05,
                      color: ink.strong,
                    }}
                  >
                    {s(hub.title)}
                  </div>
                  {s(hub.subtitle) && (
                    <div
                      className="mt-3"
                      style={{
                        fontSize: fillPx(19, "body"),
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: accent,
                      }}
                    >
                      {s(hub.subtitle)}
                    </div>
                  )}
                </OrbitDisc>
                {left.map((it, i) => (
                  <Satellite key={`l${i}`} it={it} i={i} total={left.length} side="left" />
                ))}
                {right.map((it, i) => (
                  <Satellite key={`r${i}`} it={it} i={i} total={right.length} side="right" />
                ))}
              </div>
              <div className="flex flex-col justify-center gap-2">
                {right.map((it, i) => (
                  <Feature key={i} it={it} n={half + i + 1} side="right" />
                ))}
              </div>
            </div>
            <SummaryBand {...readSummary(c.summary)} accent={accent} leadTone={ink.strong} scale={0.8} />
          </div>
        </SlideFrame>
      );
    }

    case "MV-INFO-HUB-PILL-ORBIT": {
      // Hub & pill orbit: a centre hub flanked by two stacks of pill chips whose
      // inner edges follow the hub's arc, so the column silhouette curves around
      // the circle instead of sitting in a flat block. Takes 4-12 chips; chip
      // height, type and hub size all derive from the count.
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const cool = isDark ? "#7FB3F5" : "#3E7BD1";
      const hub = obj(c.hub);
      const chips = arr(c.items).slice(0, 12);
      const count = Math.max(chips.length, 1);
      const half = Math.ceil(count / 2);
      const leftChips = chips.slice(0, half);
      const rightChips = chips.slice(half);
      const perSide = Math.max(leftChips.length, rightChips.length, 1);

      const STAGE_H = 560;
      const discSize = count >= 10 ? 252 : count >= 8 ? 272 : 296;
      // OrbitDisc's dashed ring sits at size * 1.347 — keep chips clear of it.
      const clearR = (discSize * 1.347) / 2 + 16;
      const pillH = perSide >= 6 ? 52 : perSide >= 5 ? 58 : 64;
      const pillW = perSide >= 6 ? 322 : 344;
      const labelSize = perSide >= 6 ? 20 : perSide >= 5 ? 22 : 23;
      const step =
        perSide > 1
          ? Math.min(pillH + 26, (STAGE_H - pillH - 8) / (perSide - 1))
          : 0;
      const LEAD = 30; // breathing room between chip edge and the hub arc

      const rowOffset = (i: number, total: number) =>
        (i - (total - 1) / 2) * step;

      /** Horizontal distance from the hub centre to a chip's inner edge, tracing
       *  the hub arc so middle rows step outward and end rows tuck inward. */
      const innerEdge = (dy: number) => {
        const inside = clearR * clearR - dy * dy;
        const arc = inside > 0 ? Math.sqrt(inside) : 0;
        return Math.max(arc, clearR * 0.34) + LEAD;
      };

      const Pill = ({
        it,
        i,
        total,
        side,
      }: {
        it: Record<string, unknown>;
        i: number;
        total: number;
        side: "left" | "right";
      }) => {
        const dy = rowOffset(i, total);
        const edge = innerEdge(dy);
        const PillIcon = it.icon ? iconByName(s(it.icon)) : null;
        const inner = side === "left" ? "right" : "left";
        return (
          <div
            className="absolute"
            data-intro-step={i + 1}
            style={{
              width: pillW,
              height: pillH,
              top: `calc(50% + ${dy}px - ${pillH / 2}px)`,
              [side === "left" ? "right" : "left"]: `calc(50% + ${edge}px)`,
              zIndex: 3,
            }}
          >
            {/* Tapered hand-off line: chip edge toward the hub, fading out so the
                arc never reads as a hard spoke. */}
            <div
              aria-hidden
              data-decorative
              className="absolute top-1/2"
              style={{
                width: LEAD - 8,
                height: 1,
                [inner]: -(LEAD - 8),
                transform: "translateY(-0.5px)",
                backgroundImage: `linear-gradient(${side === "left" ? "90deg" : "270deg"}, color-mix(in oklab, ${accent} 62%, transparent), transparent)`,
              }}
            />
            <div
              className="flex h-full items-center gap-3 px-5"
              style={{
                borderRadius: pillH / 2,
                border: `1px solid color-mix(in oklab, ${accent} ${isDark ? 46 : 34}%, transparent)`,
                // Neutral base under the accent wash so the chip holds its own
                // against bright or busy patches of the ground.
                backgroundColor: `color-mix(in oklab, ${isDark ? "#03002C" : "#FFFFFF"} ${isDark ? 62 : 58}%, transparent)`,
                backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${accent} ${isDark ? 26 : 12}%, transparent), color-mix(in oklab, ${accent} ${isDark ? 8 : 3}%, transparent))`,
                flexDirection: side === "left" ? "row-reverse" : "row",
              }}
            >
              <span
                aria-hidden
                data-decorative
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{
                  width: Math.round(pillH * 0.56),
                  height: Math.round(pillH * 0.56),
                  border: `1px solid color-mix(in oklab, ${accent} 48%, transparent)`,
                  backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${accent} ${isDark ? 34 : 20}%, transparent), transparent)`,
                }}
              >
                {PillIcon ? (
                  <PillIcon size={Math.round(pillH * 0.3)} strokeWidth={1.8} color={accent} aria-hidden />
                ) : (
                  <span
                    style={{
                      fontSize: Math.round(pillH * 0.26),
                      fontWeight: 800,
                      color: accent,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String((side === "left" ? i : half + i) + 1).padStart(2, "0")}
                  </span>
                )}
              </span>
              <span
                className="min-w-0 flex-1 truncate"
                style={{
                  fontSize: labelSize,
                  fontWeight: 700,
                  letterSpacing: "-0.015em",
                  color: ink.strong,
                  textAlign: "center",
                }}
              >
                {s(it.label)}
              </span>
            </div>
          </div>
        );
      };

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.kicker) || undefined} />
          {s(c.subtitle) && (
            <div
              data-title-subline
              className="mt-2"
              style={{
                fontSize: fillPx(26, "body"),
                fontWeight: 600,
                letterSpacing: "-0.015em",
                color: accent,
              }}
            >
              {s(c.subtitle)}
            </div>
          )}
          <div className="relative mt-8">

            <div className="relative" style={{ height: STAGE_H }}>
              {/* Clearance halo: ties the two stacks to one orbit. */}
              <div
                aria-hidden
                data-decorative
                className="absolute left-1/2 top-1/2 rounded-full"
                style={{
                  width: (clearR + LEAD) * 2,
                  height: (clearR + LEAD) * 2,
                  marginLeft: -(clearR + LEAD),
                  marginTop: -(clearR + LEAD),
                  border: `1px solid color-mix(in oklab, ${accent} 14%, transparent)`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
                <OrbitDisc size={discSize} accent={accent} cool={cool} isDark={isDark}>
                  <div
                    style={{
                      fontSize: discSize >= 290 ? 36 : 31,
                      fontWeight: 800,
                      letterSpacing: "-0.035em",
                      lineHeight: 1.05,
                      color: ink.strong,
                    }}
                  >
                    {s(hub.title)}
                  </div>
                  {s(hub.subtitle) && (
                    <div
                      className="mt-2.5"
                      style={{
                        fontSize: fillPx(17, "body"),
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: accent,
                      }}
                    >
                      {s(hub.subtitle)}
                    </div>
                  )}
                </OrbitDisc>
              </div>
              {leftChips.map((it, i) => (
                <Pill key={`l${i}`} it={it} i={i} total={leftChips.length} side="left" />
              ))}
              {rightChips.map((it, i) => (
                <Pill key={`r${i}`} it={it} i={i} total={rightChips.length} side="right" />
              ))}
            </div>
            <SummaryBand {...readSummary(c.summary)} accent={accent} leadTone={ink.strong} scale={0.8} />
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROC-ARC-FLOW": {
      // Arc flow: nodes alternate between an upper and lower band, joined by
      // swooping house arcs. Reads as a journey without the rigid rail of the
      // step chain, and takes 2-6 stages.
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const stages = arr(c.items).slice(0, 6);
      const count = Math.max(stages.length, 1);
      const STAGE_W = 1640;
      const STAGE_H = 540;
      const colW = STAGE_W / count;
      const nodeD = count >= 5 ? 92 : 108;
      const topY = 104;
      const botY = STAGE_H - 104;
      const labelSize = count >= 5 ? 24 : 27;
      const bodySize = count >= 5 ? 17 : 19;
      const centreOf = (i: number) => ({
        x: colW * (i + 0.5),
        y: i % 2 === 0 ? topY : botY,
      });
      // Copy sits inside its ring: narrower than the column and nudged toward
      // the partner node (the ring's centre) so the arc never crosses text.
      const copyW = colW - 96;
      const copyShift = (i: number) => {
        const partner = i < count - 1 ? i + 1 : i - 1;
        if (partner < 0) return 0;
        return Math.sign(centreOf(partner).x - centreOf(i).x) * colW * 0.16;
      };

      // House connector for this module: a true circular arc through both node
      // centres — the reference reads as a chain of open half/three-quarter
      // circles, not a soft bezier swoop. Each connector is a circle whose
      // diameter is the segment between the two nodes, drawn as a >180deg
      // sweep so the ring visibly opens around the stage, alternating side so
      // the whole row serpentines. Segments carry their own opacity so both
      // tails fade out (a linear gradient can't fade the ends of a curve).
      const ARC_SPAN_DEG = 250;
      const ARC_SEGMENTS = 30;
      const arcSegments = (
        a: { x: number; y: number },
        b: { x: number; y: number },
        dir: 1 | -1,
      ) => {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const r = Math.hypot(b.x - a.x, b.y - a.y) / 2;
        const from = Math.atan2(a.y - my, a.x - mx);
        const span = (ARC_SPAN_DEG * Math.PI) / 180;
        // Start a touch before the first node and end a touch after the last so
        // the ring overshoots the discs like the reference.
        const start = from - dir * ((span - Math.PI) / 2);
        const pt = (t: number) => {
          const ang = start + dir * span * t;
          return { x: mx + r * Math.cos(ang), y: my + r * Math.sin(ang) };
        };
        const out: { d: string; o: number }[] = [];
        for (let k = 0; k < ARC_SEGMENTS; k++) {
          const t0 = k / ARC_SEGMENTS;
          const t1 = (k + 1) / ARC_SEGMENTS;
          const p0 = pt(t0);
          const p1 = pt(t1);
          // Fade both tails, hold the body of the arc.
          const tm = (t0 + t1) / 2;
          const edge = Math.min(tm, 1 - tm) / 0.22;
          const o = 0.1 + 0.34 * Math.min(1, edge);
          out.push({ d: `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`, o });
        }
        return out;
      };

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} />
          </div>

          <div className="relative mt-6" style={{ height: STAGE_H, width: STAGE_W }}>
            {/* Arcs live behind the nodes and fade at both tails, matching the
                house connector treatment. */}
            <svg
              aria-hidden
              data-decorative
              className="absolute inset-0 overflow-visible"
              width={STAGE_W}
              height={STAGE_H}
              viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
              fill="none"
            >
              {/* Rings pair up (1-2, 3-4, 5-6) exactly like the reference, so
                  each half-circle reads as its own open loop instead of a
                  continuous overlapping chain. */}
              {stages.slice(0, -1).map((_, i) => {
                if (i % 2 !== 0) return null;
                const a = centreOf(i);
                const b = centreOf(i + 1);
                return (
                  <g key={i}>
                    {arcSegments(a, b, -1).map((seg, k) => (
                      <path
                        key={k}
                        d={seg.d}
                        stroke={accent}
                        strokeOpacity={seg.o}
                        strokeWidth={1.6}
                        strokeLinecap="round"
                      />
                    ))}
                  </g>
                );
              })}
              {/* Tiny vertical ellipsis marks the hand-off between two rings. */}
              {stages.slice(0, -1).map((_, i) =>
                i % 2 === 1 ? (
                  <g key={`dot-${i}`}>
                    {[-9, 0, 9].map((dy) => (
                      <circle
                        key={dy}
                        cx={colW * (i + 1)}
                        cy={STAGE_H / 2 + dy}
                        r={2}
                        fill={accent}
                        fillOpacity={0.34}
                      />
                    ))}
                  </g>
                ) : null,
              )}
            </svg>

            {stages.map((it, i) => {
              const { x, y } = centreOf(i);
              const StageIcon = it.icon ? iconByName(s(it.icon)) : null;
              const above = i % 2 === 0;
              return (
                <React.Fragment key={i}>
                  {/* Node disc — pinned to intro beat `i + 1` so the stage disc
                      and its copy land together, one stage per beat. */}
                  <div
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                      width: nodeD,
                      height: nodeD,
                      left: x - nodeD / 2,
                      top: y - nodeD / 2,
                      border: `1px solid color-mix(in oklab, ${accent} 48%, transparent)`,
                      backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${accent} ${isDark ? 30 : 18}%, transparent), color-mix(in oklab, ${accent} ${isDark ? 10 : 5}%, transparent))`,
                      zIndex: 3,
                    }}
                  >
                    {StageIcon ? (
                      <StageIcon
                        size={Math.round(nodeD * 0.4)}
                        strokeWidth={1.8}
                        color={accent}
                        aria-hidden
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: Math.round(nodeD * 0.36),
                          fontWeight: 800,
                          color: accent,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  {/* Copy block sits opposite the node and is nudged toward the
                      centre of its ring, so the half-circle passes outside the
                      text instead of cutting through it (as in the reference). */}
                  <div
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="absolute"
                    style={{
                      width: copyW,
                      left: x + copyShift(i) - copyW / 2,
                      top: above ? y + nodeD / 2 + 26 : undefined,
                      bottom: above ? undefined : STAGE_H - (y - nodeD / 2 - 26),
                      textAlign: "center",
                      zIndex: 2,
                    }}
                  >
                    <div
                      aria-hidden
                      data-decorative
                      className="mx-auto"
                      style={{
                        height: SEAM_HEIGHT_PX,
                        width: 64,
                        marginBottom: 12,
                        borderRadius: SEAM_HEIGHT_PX,
                        backgroundImage: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                      }}
                    />
                    <div
                      style={{
                        fontSize: labelSize,
                        fontWeight: 700,
                        letterSpacing: "-0.025em",
                        lineHeight: 1.12,
                        color: ink.strong,
                      }}
                    >
                      <span style={{ color: accent, marginRight: 10 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s(it.label)}
                    </div>
                    {s(it.body) && (
                      <div
                        className="mt-2 mx-auto"
                        style={{
                          fontSize: bodySize,
                          lineHeight: 1.36,
                          maxWidth: copyW - 26,
                          color: "color-mix(in oklab, currentColor 68%, transparent)",
                        }}
                      >
                        {s(it.body)}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={stages.length + 1}
            accent={accent}
            leadTone={ink.strong}
            scale={0.8}
          />

        </SlideFrame>
      );
    }

    case "MV-PROC-TIMELINE-RAIL": {
      // Advanced horizontal timeline: one faded axis, icon (or numeral) nodes on
      // the axis, and cards alternating above/below so long journeys fit without
      // shrinking the copy. `item.meta` carries the date / duration marker.
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const stops = arr(c.items).slice(0, 7);
      const count = Math.max(stops.length, 1);
      const STAGE_W = 1640;
      const STAGE_H = 560;
      const colW = STAGE_W / count;
      const axisY = STAGE_H / 2;
      const nodeD = count >= 6 ? 78 : 92;
      const cardW = Math.min(colW - 28, 300);
      const cardGap = 46;
      // Vertical room a card owns on its side of the axis.
      const cardHalf = axisY - nodeD / 2 - cardGap;
      const labelSize = count >= 6 ? 22 : 25;
      const bodySize = count >= 6 ? 16 : 18;
      const bodyLines = count >= 6 ? 2 : 3;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          <div className="relative mt-10" style={{ width: STAGE_W, height: STAGE_H }}>
            {/* Axis — fades at both tails, house connector treatment. */}
            <div
              aria-hidden
              data-decorative
              className="absolute"
              style={{
                left: colW * 0.18,
                right: colW * 0.18,
                top: axisY,
                height: 1,
                backgroundImage: `linear-gradient(90deg, transparent 0%, color-mix(in oklab, ${accent} 46%, transparent) 22%, color-mix(in oklab, ${accent} 46%, transparent) 78%, transparent 100%)`,
              }}
            />
            {stops.map((it, i) => {
              const x = colW * (i + 0.5);
              const above = i % 2 === 0;
              const flagged = truthy(it.highlight);
              const line = flagged ? "#EC388A" : accent;
              const StopIcon = it.icon ? iconByName(s(it.icon)) : null;
              return (
                <React.Fragment key={i}>
                  <div
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                      width: nodeD,
                      height: nodeD,
                      left: x - nodeD / 2,
                      top: axisY - nodeD / 2,
                      zIndex: 3,
                      border: `1px solid color-mix(in oklab, ${line} 50%, transparent)`,
                      backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${line} ${isDark ? 30 : 17}%, transparent), color-mix(in oklab, ${line} ${isDark ? 9 : 4}%, transparent))`,
                    }}
                  >
                    {StopIcon ? (
                      <StopIcon size={Math.round(nodeD * 0.42)} strokeWidth={1.7} color={line} aria-hidden />
                    ) : (
                      <span
                        className="tabular-nums"
                        style={{ fontSize: Math.round(nodeD * 0.38), fontWeight: 800, color: line, letterSpacing: "-0.04em" }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  {/* Stem from the node to its card. */}
                  <div
                    aria-hidden
                    data-decorative
                    className="absolute"
                    style={{
                      left: x,
                      width: 1,
                      height: cardGap - 12,
                      top: above ? undefined : axisY + nodeD / 2 + 4,
                      bottom: above ? STAGE_H - (axisY - nodeD / 2 - 4) : undefined,
                      backgroundImage: `linear-gradient(${above ? "0deg" : "180deg"}, color-mix(in oklab, ${line} 46%, transparent), transparent)`,
                    }}
                  />
                  <div
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="absolute"
                    style={{
                      width: cardW,
                      left: x - cardW / 2,
                      top: above ? undefined : axisY + nodeD / 2 + cardGap,
                      bottom: above ? STAGE_H - (axisY - nodeD / 2 - cardGap) : undefined,
                      // A card taller than its half of the stage used to run past
                      // the axis and overprint the title above / summary band
                      // below. Cap it at the room it actually owns.
                      maxHeight: cardHalf,
                      overflow: "hidden",
                      zIndex: 2,
                    }}
                  >
                    <div className="relative px-5 pb-7 pt-5" style={{ borderRadius: 20, backgroundImage: cardWashGradient(line), maxHeight: cardHalf, overflow: "hidden" }}>

                      <div aria-hidden data-decorative className="absolute inset-0" style={openBottomFrame(line, "20px")} />
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute"
                        style={{
                          top: 0,
                          left: `${SEAM_TICK_INSET_PCT}%`,
                          right: `${SEAM_TICK_INSET_PCT}%`,
                          height: SEAM_HEIGHT_PX,
                          borderRadius: SEAM_HEIGHT_PX,
                          backgroundImage: `linear-gradient(90deg, transparent, ${line}, transparent)`,
                          opacity: flagged ? 0.95 : 0.7,
                        }}
                      />
                      {s(it.meta) && (
                        <div
                          style={{
                            fontSize: fillPx(14, "kicker"),
                            fontWeight: 700,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: line,
                          }}
                        >
                          {s(it.meta)}
                        </div>
                      )}
                      <div
                        className="mt-2"
                        style={{
                          fontSize: labelSize,
                          fontWeight: 700,
                          letterSpacing: "-0.02em",
                          lineHeight: 1.15,
                          color: flagged ? line : ink.strong,
                          ...clampLines(2),
                        }}
                      >
                        {s(it.label)}
                      </div>
                      {s(it.body) && (
                        <div
                          className="mt-2"
                          style={{
                            fontSize: bodySize,
                            lineHeight: 1.36,
                            color: "color-mix(in oklab, currentColor 68%, transparent)",
                            ...clampLines(bodyLines),
                          }}
                        >
                          {s(it.body)}
                        </div>
                      )}

                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={count + 1}
            accent={accent}
            leadTone={ink.strong}
            scale={0.8}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-JOURNEY-VERTICAL": {
      // Vertical journey: a single rail down the left with icon nodes, a phase
      // marker (item.meta) and room for a real paragraph per stage. Best for
      // 3-6 stages where each one needs explaining, not just naming.
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const stages = arr(c.items).slice(0, 6);
      const count = Math.max(stages.length, 1);
      const nodeD = count >= 5 ? 74 : 86;
      const labelSize = count >= 5 ? 27 : 31;
      const bodySize = count >= 5 ? 18 : 19;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          <div className="relative mt-8" style={{ width: 1560 }}>
            {/* Rail behind the nodes, fading at both ends. */}
            <div
              aria-hidden
              data-decorative
              className="absolute"
              style={{
                left: nodeD / 2,
                top: nodeD * 0.4,
                bottom: nodeD * 0.4,
                width: 1,
                backgroundImage: `linear-gradient(180deg, transparent, color-mix(in oklab, ${accent} 44%, transparent) 14%, color-mix(in oklab, ${accent} 44%, transparent) 86%, transparent)`,
              }}
            />
            <div className="flex flex-col" style={{ gap: count >= 5 ? 22 : 30 }}>
              {stages.map((it, i) => {
                const flagged = truthy(it.highlight);
                const line = flagged ? "#EC388A" : accent;
                const StageIcon = it.icon ? iconByName(s(it.icon)) : null;
                return (
                  <div
                    key={i}
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="relative flex items-start"
                    style={{ gap: 32 }}
                  >
                    <div
                      className="relative flex shrink-0 items-center justify-center rounded-full"
                      style={{
                        width: nodeD,
                        height: nodeD,
                        border: `1px solid color-mix(in oklab, ${line} 50%, transparent)`,
                        backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${line} ${isDark ? 30 : 17}%, transparent), color-mix(in oklab, ${line} ${isDark ? 9 : 4}%, transparent))`,
                        zIndex: 2,
                      }}
                    >
                      {StageIcon ? (
                        <StageIcon size={Math.round(nodeD * 0.42)} strokeWidth={1.7} color={line} aria-hidden />
                      ) : (
                        <span
                          className="tabular-nums"
                          style={{ fontSize: Math.round(nodeD * 0.38), fontWeight: 800, color: line, letterSpacing: "-0.04em" }}
                        >
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div
                      className="relative min-w-0 flex-1 px-7 pb-8 pt-6"
                      style={{ borderRadius: 22, backgroundImage: cardWashGradient(line) }}
                    >
                      <div aria-hidden data-decorative className="absolute inset-0" style={openBottomFrame(line, "22px")} />
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute"
                        style={{
                          top: 0,
                          left: `${SEAM_TICK_INSET_PCT}%`,
                          // Stop the seam well short of the stage pill on the
                          // right so the hairline never reads as a line struck
                          // through the badge.
                          right: s(it.meta) ? "34%" : `${SEAM_TICK_INSET_PCT}%`,
                          height: SEAM_HEIGHT_PX,
                          borderRadius: SEAM_HEIGHT_PX,
                          backgroundImage: `linear-gradient(90deg, transparent, ${line}, transparent)`,
                          opacity: flagged ? 0.95 : 0.7,
                        }}
                      />

                      <div className="flex items-baseline justify-between" style={{ gap: 24 }}>
                        <div
                          style={{
                            fontSize: labelSize,
                            fontWeight: 700,
                            letterSpacing: "-0.025em",
                            lineHeight: 1.1,
                            color: flagged ? line : ink.strong,
                          }}
                        >
                          {s(it.label)}
                        </div>
                        {s(it.meta) && (
                          <div
                            className="shrink-0 px-3 py-1"
                            style={{
                              fontSize: fillPx(14, "kicker"),
                              fontWeight: 700,
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              color: line,
                              borderRadius: 999,
                              border: `1px solid color-mix(in oklab, ${line} 40%, transparent)`,
                              backgroundColor: `color-mix(in oklab, ${line} ${isDark ? 16 : 8}%, transparent)`,
                            }}
                          >
                            {s(it.meta)}
                          </div>
                        )}
                      </div>
                      {s(it.body) && (
                        <div
                          className="mt-3"
                          style={{
                            fontSize: bodySize,
                            lineHeight: 1.4,
                            maxWidth: 1080,
                            color: "color-mix(in oklab, currentColor 70%, transparent)",
                          }}
                        >
                          {s(it.body)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={count + 1}
            accent={accent}
            leadTone={ink.strong}
            scale={0.8}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-SWIMLANE-FLOW": {
      // Swimlane flow: phases across the top, workstreams down the side, and an
      // icon chip per cell. Shows *who* does what *when* — the piece a single
      // rail can't carry.
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const phases = arr(c.phases).slice(0, 5);
      const lanes = arr(c.lanes).slice(0, 4);
      const pCount = Math.max(phases.length, 1);
      const railW = 260;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          <div className="mt-8" style={{ width: 1640 }}>
            {/* Phase header row */}
            <div
              data-intro-item=""
              data-intro-step={1}
              className="grid items-end"
              style={{ gridTemplateColumns: `${railW}px repeat(${pCount}, minmax(0, 1fr))`, columnGap: 18 }}
            >
              <div />
              {phases.map((p, i) => (
                <div key={i} className="relative pb-3">
                  <div
                    style={{
                      fontSize: fillPx(15, "kicker"),
                      fontWeight: 700,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: accent,
                    }}
                  >
                    {s(typeof p === "string" ? p : (p as { meta?: unknown }).meta) || `Phase ${i + 1}`}
                  </div>
                  <div
                    className="mt-1"
                    style={{ fontSize: fillPx(23, "body"), fontWeight: 700, letterSpacing: "-0.02em", color: ink.strong }}
                  >
                    {s(typeof p === "string" ? p : (p as { label?: unknown }).label)}
                  </div>
                  <div
                    aria-hidden
                    data-decorative
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: SEAM_HEIGHT_PX,
                      borderRadius: SEAM_HEIGHT_PX,
                      backgroundImage: `linear-gradient(90deg, ${accent}, transparent)`,
                      opacity: 0.7,
                    }}
                  />
                </div>
              ))}
            </div>

            {lanes.map((laneRaw, li) => {
              const lane = obj(laneRaw);
              const cells = arr(lane.items).slice(0, pCount);
              const LaneIcon = lane.icon ? iconByName(s(lane.icon)) : null;
              return (
                <div
                  key={li}
                  data-intro-item=""
                  data-intro-step={li + 2}
                  className="grid items-stretch"
                  style={{
                    gridTemplateColumns: `${railW}px repeat(${pCount}, minmax(0, 1fr))`,
                    columnGap: 18,
                    marginTop: 20,
                  }}
                >
                  <div className="flex items-center" style={{ gap: 14 }}>
                    {LaneIcon && <LaneIcon size={30} strokeWidth={1.7} color={accent} aria-hidden />}
                    <div>
                      <div style={{ fontSize: fillPx(22, "body"), fontWeight: 700, letterSpacing: "-0.02em", color: ink.strong }}>
                        {s(lane.label)}
                      </div>
                      {s(lane.meta) && (
                        <div
                          style={{
                            fontSize: fillPx(15, "kicker"),
                            lineHeight: 1.3,
                            color: "color-mix(in oklab, currentColor 62%, transparent)",
                          }}
                        >
                          {s(lane.meta)}
                        </div>
                      )}
                    </div>
                  </div>
                  {Array.from({ length: pCount }).map((_, ci) => {
                    const cell = obj(cells[ci]);
                    const text = s(cell.label);
                    const flagged = truthy(cell.highlight);
                    const line = flagged ? "#EC388A" : accent;
                    const CellIcon = cell.icon ? iconByName(s(cell.icon)) : null;
                    if (!text && !CellIcon) {
                      return (
                        <div
                          key={ci}
                          aria-hidden
                          data-decorative
                          className="flex items-center justify-center"
                          style={{ minHeight: 108 }}
                        >
                          <div
                            style={{
                              width: "62%",
                              height: 1,
                              backgroundImage: `linear-gradient(90deg, transparent, color-mix(in oklab, ${accent} 26%, transparent), transparent)`,
                            }}
                          />
                        </div>
                      );
                    }
                    return (
                      <div
                        key={ci}
                        className="relative flex items-start px-5 pb-6 pt-4"
                        style={{ minHeight: 108, gap: 12, borderRadius: 18, backgroundImage: cardWashGradient(line) }}
                      >
                        <div aria-hidden data-decorative className="absolute inset-0" style={openBottomFrame(line, "18px")} />
                        <div
                          aria-hidden
                          data-decorative
                          className="absolute"
                          style={{
                            top: 0,
                            left: `${SEAM_TICK_INSET_PCT}%`,
                            right: `${SEAM_TICK_INSET_PCT}%`,
                            height: SEAM_HEIGHT_PX,
                            borderRadius: SEAM_HEIGHT_PX,
                            backgroundImage: `linear-gradient(90deg, transparent, ${line}, transparent)`,
                            opacity: flagged ? 0.95 : 0.65,
                          }}
                        />
                        {CellIcon && (
                          <CellIcon size={24} strokeWidth={1.7} color={line} aria-hidden className="mt-0.5 shrink-0" />
                        )}
                        <div
                          className="min-w-0"
                          style={{
                            fontSize: fillPx(18, "body"),
                            fontWeight: 600,
                            lineHeight: 1.3,
                            color: flagged ? line : ink.strong,
                          }}
                        >
                          {text}
                          {s(cell.body) && (
                            <div
                              className="mt-1.5"
                              style={{
                                fontSize: fillPx(16, "body"),
                                fontWeight: 400,
                                lineHeight: 1.34,
                                color: "color-mix(in oklab, currentColor 66%, transparent)",
                              }}
                            >
                              {s(cell.body)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={lanes.length + 2}
            accent={accent}
            leadTone={ink.strong}
            scale={0.8}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-LAYER-STACK": {
      // Stacked architecture lanes. Each lane opens with an arrow-headed label
      // block (the direction cue is the block itself, so no stock arrow glyph)
      // and carries hairline-divided capability cells in the lane's own tone.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const lanes = arr(c.items).slice(0, 5);
      const laneTones = [
        accent,
        accentInk(isDark ? "#A1FBF9" : "#0E7A86", mode, 4.5),
        accentInk("#EC388A", mode, 4.5),
        accentInk(isDark ? "#C2A3FF" : "#5B3FBF", mode, 4.5),
        accentInk(isDark ? "#A6FA87" : "#2F7A3C", mode, 4.5),
      ];
      const laneCount = Math.max(lanes.length, 1);
      // Sized so 2–5 lanes plus the title block and summary band always land
      // inside the stage — no lane ever runs under the footer. Shared with the
      // exporter so lane/rail rounding matches 1:1.
      const { height: laneH, gap: laneGap } = laneLadderPx(laneCount);
      const laneRadiusPx = laneCornerRadiusPx(laneH);
      const laneRail = railBoxPx(laneH);





      const headW = 356;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          {s(c.question) && (
            <div
              data-title-subline
              className="mt-3"
              style={{
                fontSize: fillPx(28, "figure"),
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: ink.strong,
              }}
            >
              {s(c.question)}
            </div>
          )}
          <div className="mt-6 flex flex-col" style={{ gap: laneGap }}>
            {lanes.map((laneRaw, li) => {
              const lane = obj(laneRaw);
              const tone = laneTones[li % laneTones.length];
              const cells = arr(lane.cells).slice(0, 4);
              const LaneIcon = lane.icon ? iconByName(s(lane.icon)) : null;
              return (
                <div
                  key={li}
                  data-intro-item=""
                  data-intro-step={li + 1}
                  className="relative flex items-stretch"
                  style={{ height: laneH }}
                >
                  {/* Lane body wash + open-bottom frame */}
                  <div
                    aria-hidden
                    data-decorative
                    className="absolute inset-0"
                    style={{ borderRadius: laneRadiusPx, backgroundImage: cardWashGradient(tone) }}
                  />
                  <div
                    aria-hidden
                    data-decorative
                    className="absolute inset-0"
                    style={openBottomFrame(tone, laneRadiusPx)}
                  />
                  {/* Lane head — a quiet tone-tinted plate with a numeral rail.
                      No arrow wedge: the stack reads top-to-bottom already, and
                      the tinted plate keeps copy on slide ink so light and dark
                      modes both hold contrast without white-on-navy blocks. */}
                  <div
                    className="relative flex shrink-0 items-center"
                    style={{ width: headW, gap: 16, paddingLeft: 26, paddingRight: 22 }}
                  >
                    <div
                      aria-hidden
                      data-decorative
                      className="absolute inset-0"
                      style={{
                        borderTopLeftRadius: laneRadiusPx,
                        borderBottomLeftRadius: laneRadiusPx,
                        backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${tone} ${isDark ? 24 : 15}%, transparent) 0%, color-mix(in oklab, ${tone} ${isDark ? 8 : 5}%, transparent) 78%, transparent 100%)`,
                      }}
                    />
                    {/* Accent rail — a true pill inset from the lane's rounded
                        corners. A 4px bar cannot carry an 18px corner radius, so
                        the old version rendered as a pinched wedge at both ends. */}
                    <div
                      aria-hidden
                      data-decorative
                      className="absolute"
                      style={{
                        top: laneRail.inset,
                        height: laneRail.height,
                        left: 8,
                        width: laneRail.width,
                        borderRadius: laneRail.radius,
                        backgroundColor: tone,
                      }}
                    />

                    <div
                      className="relative flex shrink-0 items-center justify-center"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        border: `1px solid color-mix(in oklab, ${tone} 46%, transparent)`,
                        backgroundColor: `color-mix(in oklab, ${tone} ${isDark ? 22 : 12}%, transparent)`,
                        color: tone,
                      }}
                    >
                      {LaneIcon ? (
                        <LaneIcon size={22} strokeWidth={1.8} color={tone} aria-hidden />
                      ) : (
                        <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em" }}>
                          {li + 1}
                        </span>
                      )}
                    </div>
                    <div className="relative min-w-0">
                      <div
                        style={{
                          fontSize: fillPx(14, "body"),
                          fontWeight: 700,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: tone,
                        }}
                      >
                        {s(lane.meta) || `Layer ${li + 1}`}
                      </div>
                      <div
                        className="mt-1"
                        style={{
                          fontSize: laneCount > 4 ? 21 : laneCount > 3 ? 23 : 25,
                          fontWeight: 700,
                          letterSpacing: "-0.02em",
                          lineHeight: 1.16,
                          color: ink.strong,
                        }}
                      >
                        {s(lane.label)}
                      </div>
                    </div>
                  </div>
                  {/* Capability cells */}
                  <div
                    className="relative grid flex-1 items-center"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(cells.length, 1)}, minmax(0, 1fr))`,
                    }}
                  >
                    {cells.map((cellRaw, ci) => {
                      const cell = obj(cellRaw);
                      return (
                        <div
                          key={ci}
                          className="relative px-6"
                          style={{
                            fontSize: laneCount > 4 ? 18 : laneCount > 3 ? 19 : 21,
                            fontWeight: 700,
                            letterSpacing: "-0.015em",
                            lineHeight: 1.22,
                            color: ink.strong,
                          }}
                        >
                          {ci > 0 && (
                            <span
                              aria-hidden
                              data-decorative
                              className="absolute left-0"
                              style={{
                                top: "12%",
                                bottom: "12%",
                                width: 1,
                                backgroundImage: `linear-gradient(180deg, transparent, color-mix(in oklab, ${tone} 42%, transparent), transparent)`,
                              }}
                            />
                          )}
                          {s(typeof cellRaw === "string" ? cellRaw : cell.label)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={laneCount + 1}
            accent={accent}
            leadTone={ink.strong}
            scale={0.85}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-PROOF-PAIRS": {
      // Problem → outcome pairs. The left pill stays deliberately quiet (muted
      // frame, neutral ink); the right pill carries the accent wash so the
      // resolved state is the one the eye lands on.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const cool = isDark ? "#7FB3F5" : "#3E7BD1";
      const before = obj(c.before);
      const after = obj(c.after);
      const rows = arr(c.items).slice(0, 6);
      const rowCount = Math.max(rows.length, 1);
      const rowH = rowCount > 5 ? 108 : rowCount > 4 ? 122 : 138;
      const rowFont = rowCount > 5 ? 24 : rowCount > 4 ? 26 : 28;
      const XIcon = XMark;
      const CheckIcon = Check;

      const Pill = ({
        text,
        tone,
        emphasis,
        Glyph,
      }: {
        text: string;
        tone: string;
        emphasis: boolean;
        Glyph: typeof Check;
      }) => (
        <div className="relative flex items-center" style={{ height: rowH, gap: 22 }}>
          <div
            aria-hidden
            data-decorative
            className="absolute"
            style={{
              left: 44,
              right: 0,
              top: 8,
              bottom: 8,
              borderRadius: 22,
              backgroundImage: cardWashGradient(tone),
            }}
          />
          <div
            aria-hidden
            data-decorative
            className="absolute"
            style={{ left: 44, right: 0, top: 8, bottom: 8, ...openBottomFrame(tone, 22) }}
          />
          <div
            className="relative z-10 flex shrink-0 items-center justify-center rounded-full"
            style={{
              width: 88,
              height: 88,
              backgroundColor: emphasis ? tone : "transparent",
              border: `2px solid ${tone}`,
              color: emphasis ? fillInk(tone, brand.tokens.primary) : tone,
            }}
          >
            <Glyph size={40} strokeWidth={2.4} aria-hidden />
          </div>
          <div
            className="relative min-w-0 pr-8"
            style={{
              fontSize: rowFont,
              fontWeight: emphasis ? 700 : 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: emphasis ? ink.strong : "color-mix(in oklab, currentColor 78%, transparent)",
            }}
          >
            {text}
          </div>
        </div>
      );

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          {s(c.question) && (
            <div
              data-title-subline
              className="mt-3"
              style={{
                fontSize: fillPx(28, "body"),
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: accent,
              }}
            >
              {s(c.question)}
            </div>
          )}
          <div className="mt-8">
            {(s(before.label) || s(after.label)) && (
              <div
                data-intro-item=""
                data-intro-step={1}
                className="grid"
                style={{ gridTemplateColumns: "1fr 130px 1fr" }}
              >
                <div
                  style={{
                    fontSize: fillPx(17, "body"),
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: cool,
                    paddingLeft: 44,
                  }}
                >
                  {s(before.label)}
                </div>
                <div />
                <div
                  style={{
                    fontSize: fillPx(17, "body"),
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: accent,
                    paddingLeft: 44,
                  }}
                >
                  {s(after.label)}
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-col" style={{ gap: 14 }}>
              {rows.map((rowRaw, i) => {
                const row = obj(rowRaw);
                return (
                  <div
                    key={i}
                    data-intro-item=""
                    data-intro-step={i + 2}
                    className="grid items-center"
                    style={{ gridTemplateColumns: "1fr 130px 1fr" }}
                  >
                    <Pill text={s(row.before)} tone={cool} emphasis={false} Glyph={XIcon} />
                    <div className="flex items-center justify-center">
                      <HouseArrow tone={accent} length={92} thickness={2} headScale={0.9} />
                    </div>
                    <Pill text={s(row.after)} tone={accent} emphasis Glyph={CheckIcon} />
                  </div>
                );
              })}
            </div>
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={rowCount + 2}
            accent={accent}
            leadTone={ink.strong}
            scale={0.85}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-PLATFORM-LOOP": {
      // Serpentine capability pipeline: the chain wraps across two rows, then
      // resolves into three pillar claims and a full-width promise band.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const cool = isDark ? "#7FB3F5" : "#3E7BD1";
      const chips = arr(c.items).slice(0, 16);
      const pillars = arr(c.pillars).slice(0, 3);
      const half = Math.ceil(chips.length / 2) || 1;
      const rowsOfChips = [chips.slice(0, half), chips.slice(half)].filter((r) => r.length);
      const perRow = Math.max(...rowsOfChips.map((r) => r.length), 1);
      const chipFont = perRow > 7 ? 17 : perRow > 5 ? 19 : 21;
      const pillarTones = [
        accent,
        accentInk(isDark ? "#A1FBF9" : "#0E7A86", mode, 4.5),
        accentInk("#EC388A", mode, 4.5),
      ];

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          {s(c.question) && (
            <div
              data-title-subline
              className="mt-3"
              style={{
                fontSize: fillPx(30, "figure"),
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: ink.strong,
              }}
            >
              {s(c.question)}
            </div>
          )}
          <div className="mt-8 flex flex-col" style={{ gap: 26 }}>
            {rowsOfChips.map((row, ri) => (
              <div
                key={ri}
                data-intro-item=""
                data-intro-step={ri + 1}
                className="relative grid items-stretch"
                style={{
                  gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
                  columnGap: 16,
                  marginLeft: ri === 1 ? 96 : 0,
                }}
              >
                {/* Dotted travel rail behind the row, fading at both ends */}
                <div
                  aria-hidden
                  data-decorative
                  className="absolute"
                  style={{
                    left: 0,
                    right: 0,
                    top: "50%",
                    height: 1,
                    backgroundImage: `repeating-linear-gradient(90deg, color-mix(in oklab, ${cool} 55%, transparent) 0 6px, transparent 6px 14px)`,
                    maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
                    WebkitMaskImage:
                      "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
                  }}
                />
                {row.map((chipRaw, ci) => {
                  const chip = obj(chipRaw);
                  return (
                    <div
                      key={ci}
                      className="relative flex items-center justify-center px-4 text-center"
                      style={{ minHeight: 118 }}
                    >
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute inset-0"
                        style={{ borderRadius: 20, backgroundImage: cardWashGradient(cool) }}
                      />
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute inset-0"
                        style={openBottomFrame(cool, 20)}
                      />
                      <div
                        className="relative"
                        style={{
                          fontSize: chipFont,
                          fontWeight: 700,
                          letterSpacing: "-0.015em",
                          lineHeight: 1.24,
                          color: ink.strong,
                        }}
                      >
                        {s(typeof chipRaw === "string" ? chipRaw : chip.label)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {pillars.length > 0 && (
            <div
              data-intro-item=""
              data-intro-step={rowsOfChips.length + 1}
              className="mt-9 grid"
              style={{
                gridTemplateColumns: `repeat(${pillars.length}, minmax(0, 1fr))`,
                columnGap: 18,
              }}
            >
              {pillars.map((pillarRaw, pi) => {
                const pillar = obj(pillarRaw);
                const tone = pillarTones[pi % pillarTones.length];
                return (
                  <div
                    key={pi}
                    className="relative flex items-center justify-center px-6"
                    style={{
                      minHeight: 96,
                      borderRadius: 20,
                      backgroundColor: tone,
                      color: fillInk(tone, brand.tokens.primary),
                    }}
                  >
                    <div
                      style={{
                        fontSize: fillPx(28, "body"),
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.15,
                        textAlign: "center",
                      }}
                    >
                      {s(typeof pillarRaw === "string" ? pillarRaw : pillar.label)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={rowsOfChips.length + 2}
            accent={accent}
            leadTone={ink.strong}
            scale={0.85}
          />
        </SlideFrame>
      );
    }


    case "MV-PROC-BEFORE-AFTER-SPLIT": {
      // Two-state split with a centre hub: the "without" column reads in muted
      // neutral ink, the "with" column carries the division accent, and the hub
      // holds the platform promise. Panels fade out at the bottom (no bottom
      // frame) to match every other module surface in the system.
      const before = obj(c.before);
      const after = obj(c.after);
      const hub = obj(c.hub);
      const summary = obj(c.summary);
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const cool = isDark ? "#7FB3F5" : "#3E7BD1";
      const beforeRows = arr(before.items).slice(0, 5);
      const afterRows = arr(after.items).slice(0, 5);
      const hubLines = arr(hub.lines)
        .map((l) => s(typeof l === "string" ? l : (l as { text?: unknown })?.text))
        .filter(Boolean)
        .slice(0, 4);

      const Column = ({
        side,
        heading,
        rows,
        tone,
      }: {
        side: "before" | "after";
        heading: string;
        rows: ReturnType<typeof arr>;
        tone: string;
      }) => (
        <div className="flex min-w-0 flex-col">
          {/* Column head: a kicker + accent seam instead of a heavy solid bar,
              so the panel opens with the same signature as every module card. */}
          <div className="relative pb-4">
            <div
              className="text-center"
              style={{
                fontSize: fillPx(20, "body"),
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: tone,
              }}
            >
              {heading}
            </div>
            <div
              aria-hidden
              data-decorative
              className="mx-auto mt-4"
              style={{
                height: SEAM_HEIGHT_PX,
                width: "56%",
                borderRadius: SEAM_HEIGHT_PX,
                backgroundImage: `linear-gradient(90deg, transparent, ${tone}, transparent)`,
              }}
            />
          </div>
          <div className="relative flex flex-1 flex-col px-2 pt-6">
            {/* Panel wash + open-bottom frame from the shared surface tokens. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ borderRadius: 24, backgroundImage: cardWashGradient(tone) }}
            />
            <div
              aria-hidden
              data-decorative
              className="absolute inset-0"
              style={openBottomFrame(tone, 24)}
            />
            {rows.map((it, i) => (
              <div
                key={i}
                className="relative flex items-start gap-4 px-5 py-3.5"
                style={
                  i > 0
                    ? {
                        borderTop: `1px solid color-mix(in oklab, ${tone} 14%, transparent)`,
                      }
                    : undefined
                }
              >
                {/* Marker plate: soft accent disc, hairline ring, glyph inside. */}
                <span
                  className="relative flex shrink-0 items-center justify-center rounded-full"
                  style={{
                    width: 40,
                    height: 40,
                    marginTop: 2,
                    border: `1px solid color-mix(in oklab, ${tone} ${side === "after" ? 55 : 34}%, transparent)`,
                    backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${tone} ${isDark ? 26 : 16}%, transparent), color-mix(in oklab, ${tone} ${isDark ? 8 : 4}%, transparent))`,
                    opacity: side === "after" ? 1 : 0.82,
                  }}
                >
                  {side === "after" ? (
                    <Check size={20} strokeWidth={2.6} color={tone} aria-hidden />
                  ) : (
                    <XMark size={18} strokeWidth={2.4} color={tone} aria-hidden />
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className="block"
                    style={{
                      fontSize: fillPx(23, "body"),
                      fontWeight: 700,
                      color: side === "after" ? tone : ink.strong,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.15,
                    }}
                  >
                    {s(it.label)}
                  </span>
                  {s(it.body) && (
                    <span
                      className="mt-1 block"
                      style={{
                        fontSize: fillPx(18, "body"),
                        lineHeight: 1.35,
                        color: "color-mix(in oklab, currentColor 68%, transparent)",
                      }}
                    >
                      {s(it.body)}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="relative mt-7">
            <div
              className="grid items-stretch"
              style={{ gridTemplateColumns: "1fr 430px 1fr", columnGap: 0 }}
            >
              <Column
                side="before"
                heading={s(before.label) || "Before"}
                rows={beforeRows}
                tone={cool}
              />
              {/* Centre hub column: house arrows out to each state, promise inside
                  a layered orbit disc. */}
              <div className="relative flex items-center justify-center">
                <OrbitDisc size={300} accent={accent} cool={cool} isDark={isDark}>
                  <div
                    style={{
                      fontSize: fillPx(33, "figure"),
                      fontWeight: 800,
                      letterSpacing: "-0.035em",
                      color: ink.strong,
                      lineHeight: 1.05,
                    }}
                  >
                    {s(hub.title)}
                  </div>
                  <div
                    aria-hidden
                    className="mt-4 mb-4"
                    style={{
                      height: 1,
                      width: 54,
                      backgroundColor: `color-mix(in oklab, ${accent} 45%, transparent)`,
                    }}
                  />
                  <div className="flex flex-col gap-1.5">
                    {hubLines.map((line, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: fillPx(22, "body"),
                          fontWeight: 600,
                          lineHeight: 1.2,
                          letterSpacing: "-0.01em",
                          color:
                            i === hubLines.length - 1
                              ? accent
                              : "color-mix(in oklab, currentColor 72%, transparent)",
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </OrbitDisc>

                <HouseArrow
                  tone={cool}
                  direction="left"
                  length={70}
                  className="absolute"
                  style={{ left: -40, zIndex: 3 }}
                />
                <HouseArrow
                  tone={accent}
                  direction="right"
                  length={70}
                  className="absolute"
                  style={{ right: -40, zIndex: 3 }}
                />
              </div>
              <Column
                side="after"
                heading={s(after.label) || "After"}
                rows={afterRows}
                tone={accent}
              />
            </div>
            <SummaryBand
              lead={s(summary.lead)}
              emphasis={s(summary.emphasis)}
              accent={accent}
              leadTone={ink.strong}
              scale={0.8}
            />

          </div>
        </SlideFrame>
      );
    }



    // ── Proof & Data ──────────────────────────────────────────────────
    case "MV-PROOF-LOGOS":
    case "MV-CASE-LOGO-GRID": {
      const tileText = ink.strong;
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const tileBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(10,15,28,0.02)";
      const tileRing = isDark ? "rgba(255,255,255,0.08)" : "rgba(10,15,28,0.06)";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid grid-cols-4 gap-6">
            {arr(c.items).map((it, i) => {
              const name = s(it.name ?? it.client);
              const logoUrl = pickLogoForMode(it, mode);
              const logoPath = s(it.logoPath);
              const result = s(it.result);
              return (
                <div
                  key={i}
                  className="relative flex aspect-[3/2] flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl px-6 py-8 text-center"
                  style={{
                    color: tileText,
                    background: tileBg,
                    border: `1px solid ${tileRing}`,
                    backgroundImage: `radial-gradient(120% 80% at 50% 0%, ${accent}${isDark ? "18" : "0C"} 0%, transparent 65%)`,
                  }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{
                      background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)`,
                    }}
                  />
                  <div className="flex w-full flex-1 items-center justify-center">
                    {logoUrl || logoPath ? (
                      <ClientLogoImg
                        path={logoPath}
                        url={logoUrl}
                        alt={name ? `${name} logo` : "Client logo"}
                        className="max-h-[110px] max-w-[80%] object-contain"
                        style={{ filter: isDark ? "brightness(1.05)" : undefined }}
                      />
                    ) : (
                      <div style={{ fontSize: fillPx(24, "body"), fontWeight: 600, letterSpacing: "-0.01em" }}>
                        {name}
                      </div>
                    )}
                  </div>
                  {result && (
                    <div
                      className="tabular-nums"
                      style={{
                        color: accentInk(accent, mode),
                        fontSize: fillPx(22, "body"),
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.15,
                      }}
                    >
                      {result}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-LOGOS-STRIP": {
      const items = arr(c.items).slice(0, 6);
      const rule = mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.08)";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          {s(c.kicker) && <Kicker brand={brand}>{s(c.kicker)}</Kicker>}
          <SlideTitle brand={brand} title={s(c.title)} />
          <Hairline
            color={"var(--slide-accent-text)"}
            widthPx={96}
            thicknessPx={2}
            className="mt-10"
          />
          <div
            className="slide-fill-stretch mt-16 flex items-center justify-between gap-10 px-4 py-14"
            style={{ borderTop: `1px solid ${rule}`, borderBottom: `1px solid ${rule}` }}
          >
            {items.map((it, i) => {
              const url = pickLogoForMode(it, mode);
              const path = s(it.logoPath);
              const name = s(it.name);
              return (
                <div key={i} className="flex h-24 flex-1 items-center justify-center">
                  {url || path ? (
                    <ClientLogoImg
                      url={url}
                      path={path}
                      alt={`${name} logo`}
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-xl font-semibold" style={{ color: ink.strong }}>
                      {name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-LOGOS-MARQUEE": {
      const items = arr(c.items).slice(0, 10);
      const row1 = items.slice(0, 5);
      const row2 = items.slice(5, 10);
      const renderRow = (row: Item[], offset: boolean, key: string) => (
        <div
          key={key}
          className={`grid grid-cols-5 items-center gap-10 ${offset ? "px-16" : ""}`}
        >
          {row.map((it, i) => {
            const url = pickLogoForMode(it, mode);
            const path = s(it.logoPath);
            const name = s(it.name);
            return (
              <div key={i} className="flex h-full min-h-[88px] items-center justify-center p-4">
                {url || path ? (
                  <ClientLogoImg
                    url={url}
                    path={path}
                    alt={`${name} logo`}
                    className="max-h-14 max-w-[88%] object-contain"
                  />
                ) : (
                  <div className="text-lg font-semibold" style={{ color: ink.strong }}>
                    {name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          {s(c.subtitle) && (
            <SupportingText size="md" opacity={0.75} maxWidthPx={1180} className="mt-6">
              {s(c.subtitle)}
            </SupportingText>
          )}
          <div className="slide-fill-stretch mt-12 flex flex-col justify-evenly gap-8">
            {renderRow(row1, false, "row1")}
            {renderRow(row2, true, "row2")}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-LOGOS-FEATURED": {
      const featuredUrl =
        pickLogoForMode(
          { logoUrl: c.featuredLogoUrl, logoUrlDark: c.featuredLogoUrlDark },
          mode,
        );
      const featuredName = s(c.featuredName, "Anchor partner");
      const featuredNote = s(c.featuredNote);
      const supports = arr(c.items).slice(0, 4);
      const divider = mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.08)";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div
            className="mt-14 grid h-[540px] grid-cols-[1.4fr_1fr] gap-14"
            style={{ borderTop: `1px solid ${divider}` }}
          >
            <div
              className="flex flex-col items-center justify-center p-8 text-center"
              style={{ borderRight: `1px solid ${divider}` }}
            >
              {featuredUrl ? (
                <ClientLogoImg
                  url={featuredUrl}
                  alt={`${featuredName} logo`}
                  className="max-h-44 max-w-[72%] object-contain"
                />
              ) : (
                <div className="text-4xl font-semibold" style={{ color: ink.strong }}>
                  {featuredName}
                </div>
              )}
              {featuredNote && (
                <div className="mt-10 max-w-md text-lg opacity-75" style={{ color: ink.strong }}>
                  {featuredNote}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 grid-rows-2">
              {supports.map((it, i) => {
                const url = pickLogoForMode(it, mode);
                const path = s(it.logoPath);
                const name = s(it.name);
                // Inner hairline grid for structure without card chrome
                const cellBorders = {
                  borderRight: i % 2 === 0 ? `1px solid ${divider}` : undefined,
                  borderBottom: i < 2 ? `1px solid ${divider}` : undefined,
                };
                return (
                  <div key={i} className="flex items-center justify-center p-6" style={cellBorders}>
                    {url || path ? (
                      <ClientLogoImg
                        url={url}
                        path={path}
                        alt={`${name} logo`}
                        className="max-h-14 max-w-[80%] object-contain"
                      />
                    ) : (
                      <div className="text-lg font-semibold" style={{ color: ink.strong }}>
                        {name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-LOGOS-CATEGORIZED": {
      const groups = arr(c.items).slice(0, 2);
      const textColor = ink.strong;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid grid-cols-2 gap-14">
            {groups.map((g, gi) => {
              const logos = arr(g.logos).slice(0, 4);
              return (
                <div key={gi} className="flex flex-col gap-6">
                  <div className="flex items-baseline gap-3">
                    <div
                      className="text-xl font-semibold uppercase tracking-[0.14em]"
                      style={{ color: "var(--slide-accent-text)" }}
                    >
                      {String.fromCharCode(65 + gi)}
                    </div>
                    <div className="text-2xl font-medium" style={{ color: textColor }}>
                      {s(g.label)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    {logos.map((it, i) => {
                      const url = pickLogoForMode(it, mode);
                      const path = s(it.logoPath);
                      const name = s(it.name);
                      return (
                        <div key={i} className="flex aspect-[3/2] items-center justify-center p-3">
                          {url || path ? (
                            <ClientLogoImg
                              url={url}
                              path={path}
                              alt={`${name} logo`}
                              className="max-h-12 max-w-[86%] object-contain"
                            />
                          ) : (
                            <div className="text-base font-semibold" style={{ color: textColor }}>
                              {name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-LOGOS-MOSAIC": {
      const items = arr(c.items).slice(0, 7);
      const textColor = ink.strong;
      // Mosaic grid template: 4 cols × 3 rows, asymmetric spans.
      const spans = [
        "col-span-2 row-span-2", // 0 anchor
        "col-span-1 row-span-1",
        "col-span-1 row-span-1",
        "col-span-1 row-span-2",
        "col-span-1 row-span-1",
        "col-span-1 row-span-1",
        "col-span-2 row-span-1",
      ];
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          {s(c.kicker) && <Kicker brand={brand}>{s(c.kicker)}</Kicker>}
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid h-[560px] grid-cols-4 grid-rows-3 gap-6">
            {items.map((it, i) => {
              const url = pickLogoForMode(it, mode);
              const path = s(it.logoPath);
              const name = s(it.name);
              const isAnchor = i === 0;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-center p-6 ${spans[i] ?? "col-span-1 row-span-1"}`}
                >
                  {url || path ? (
                    <ClientLogoImg
                      url={url}
                      path={path}
                      alt={`${name} logo`}
                      className={`object-contain ${isAnchor ? "max-h-[75%] max-w-[85%]" : "max-h-[65%] max-w-[80%]"}`}
                    />
                  ) : (
                    <div
                      className={`font-semibold ${isAnchor ? "text-3xl" : "text-xl"}`}
                      style={{ color: textColor }}
                    >
                      {name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-TESTIMONIAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="relative grid h-full grid-cols-[1.35fr_1fr] items-center gap-24">
            <QuoteMark
              color={"var(--slide-accent-text)"}
              size={560}
              className="absolute -top-6 -left-4"
            />
            <div className="relative">
              <Kicker brand={brand}>Testimonial</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <div
                style={{
                  fontSize: fillPx(60, "display"),
                  fontWeight: 500,
                  lineHeight: 1.2,
                  letterSpacing: "-0.015em",
                  color: ink.strong,
                  maxWidth: 980,
                }}
              >
                {s(c.quote)}
              </div>
              <div className="mt-12">
                <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
              </div>
            </div>
            <div className="flex flex-col items-start">
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={56}
                thicknessPx={2}
                className="mb-6"
              />
              <Kicker brand={brand}>Measurable outcome</Kicker>
              <div className="mt-8">
                <StatFigure brand={brand} value={s(c.metric)} size="lg" icon={s(c.icon)} iconSize={s(c.iconSize)} />
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
      const winnerIdx =
        typeof (c as { winnerIndex?: number }).winnerIndex === "number"
          ? (c as { winnerIndex?: number }).winnerIndex
          : undefined;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={92} y={28} size={860} />
          <div className="relative flex h-full flex-col">
            <SlideTitle brand={brand} title={s(c.title)} />
            <GlassTile radius={26} padding="px-12 py-10" className="slide-fill-stretch mt-12 flex flex-col">
              <div
                className="slide-fill-stretch slide-fill-rows grid items-center gap-x-8"
                style={{ gridTemplateColumns: `2fr ${columns.map(() => "1fr").join(" ")}` }}
              >
                <div
                  className="pb-4 uppercase"
                  style={{
                    fontSize: fillPx(18, "body"),
                    letterSpacing: "0.28em",
                    color: ink.faint,
                    fontWeight: 600,
                    borderBottom: `1px solid ${ink.hairlineStrong}`,
                  }}
                >
                  Criteria
                </div>
                {columns.map((col, i) => (
                  <div
                    key={i}
                    className="pb-4 uppercase"
                    style={{
                      fontSize: fillPx(20, "body"),
                      letterSpacing: "0.24em",
                      fontWeight: 600,
                      color: winnerIdx === i ? "var(--slide-accent-text)" : ink.strong,
                      borderBottom: `${winnerIdx === i ? 2 : 1}px solid ${winnerIdx === i ? brand.tokens.accent : ink.hairlineStrong}`,
                    }}
                  >
                    {s(col.label)}
                  </div>
                ))}
                {rows.map((r, ri) => (
                  <div key={ri} className="contents">
                    <div
                      className="py-5"
                      style={{
                        fontSize: fillPx(24, "body"),
                        letterSpacing: "-0.01em",
                        color: ink.strong,
                        borderBottom: `1px solid ${ink.hairline}`,
                      }}
                    >
                      {s(r.criterion)}
                    </div>
                    {strs(r.values).map((v, ci) => (
                      <div
                        key={ci}
                        className="py-5"
                        style={{
                          fontSize: fillPx(24, "body"),
                          color: winnerIdx === ci ? ink.strong : ink.muted,
                          fontWeight: winnerIdx === ci ? 600 : 400,
                          borderBottom: `1px solid ${ink.hairline}`,
                          background:
                            winnerIdx === ci
                              ? `color-mix(in oklab, ${brand.tokens.accent} 8%, transparent)`
                              : undefined,
                        }}
                      >
                        {v}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </GlassTile>
          </div>
        </SlideFrame>
      );
    }

    case "MV-DEC-CHECKLIST":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="slide-fill-stretch slide-fill-rows mt-12 grid grid-cols-2 gap-x-20 gap-y-0">
            {arr(c.items).map((it, i) => (
              <div
                key={i}
                className="flex items-center gap-6 py-6"
                style={{ borderBottom: `1px solid ${ink.hairline}` }}
              >
                <div
                  className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center"
                  style={{
                    border: `2px solid ${brand.tokens.accent}`,
                    color: "var(--slide-accent-text)",
                    fontSize: fillPx(18, "body"),
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
                <div>
                  <div
                    style={{
                      fontSize: fillPx(26, "body"),
                      fontWeight: 600,
                      color: ink.strong,
                      letterSpacing: "-0.01em",
                      lineHeight: 1.25,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  {s(it.note) && (
                    <div
                      className="mt-2"
                      style={{
                        fontSize: fillPx(20, "body"),
                        lineHeight: 1.4,
                        color: "color-mix(in oklab, currentColor 65%, transparent)",
                      }}
                    >
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
                  style={{
                    borderTop: `${featured ? 3 : 1}px solid ${featured ? brand.tokens.accent : `${ink.hairline}`}`,
                  }}
                >
                  <Kicker brand={brand} color={featured ? "var(--slide-accent-text)" : ink.faint}>
                    {s(tier.name)}
                  </Kicker>
                  <div
                    className="mt-6 font-semibold tabular-nums"
                    style={{
                      fontSize: fillPx(88, "display"),
                      lineHeight: 0.95,
                      letterSpacing: "-0.03em",
                      color: ink.strong,
                    }}
                  >
                    {s(tier.price)}
                    {s(tier.unit) && (
                      <span
                        className="ml-2 font-medium"
                        style={{
                          fontSize: fillPx(26, "body"),
                          color: "var(--slide-accent-text)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {s(tier.unit)}
                      </span>
                    )}
                  </div>
                  <div className="mt-8 space-y-4">
                    {strs(tier.features).map((f, k) => (
                      <div key={k}>
                        {k > 0 && <SoftDivider />}
                        <div className="flex gap-4 py-3" style={{ fontSize: fillPx(22, "body"), lineHeight: 1.35 }}>
                          <span style={{ color: "var(--slide-accent-text)", fontWeight: 600 }}>
                            —
                          </span>
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
            <div className="min-w-0">
              <Kicker brand={brand}>{s(c.title, "Investment")}</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={88}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <StatFigure brand={brand} value={s(c.amount)} unit={s(c.unit)} size="xl" icon={s(c.icon)} iconSize={s(c.iconSize)} />
            </div>
            <div className="min-w-0">
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={56}
                thicknessPx={2}
                className="mb-6"
              />
              <Kicker brand={brand}>Included</Kicker>
              <div className="mt-8 space-y-5">
                {arr(c.items).map((it, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-5 pt-5"
                    style={{ borderTop: i === 0 ? "none" : "1px solid rgba(10,15,28,0.10)" }}
                  >
                    <span
                      className="mt-3 h-2 w-8 shrink-0"
                      style={{ backgroundColor: brand.tokens.accent }}
                    />
                    <span
                      style={{
                        fontSize: fillPx(26, "body"),
                        lineHeight: 1.3,
                        letterSpacing: "-0.01em",
                        color: ink.strong,
                      }}
                    >
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
          <div className="slide-fill-stretch mt-12 flex flex-col">
            <div
              className="grid grid-cols-[80px_1fr_1fr] gap-10 pb-4 uppercase"
              style={{
                fontSize: fillPx(18, "body"),
                letterSpacing: "0.28em",
                color: ink.faint,
                borderBottom: `1px solid ${brand.tokens.accent}`,
              }}
            >
              <div className="tabular-nums">№</div>
              <div>Risk</div>
              <div>Mitigation</div>
            </div>
            {arr(c.items).map((it, i) => (
              <div key={i} className="flex flex-1 flex-col justify-center">
                {i > 0 && <SoftDivider />}
                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-10 py-6">
                  <SlideNumeral value={i + 1} sizePx={26} />
                  <div
                    style={{
                      fontSize: fillPx(26, "body"),
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: ink.strong,
                    }}
                  >
                    {s(it.risk)}
                  </div>
                  <SupportingText size="md" opacity={0.72}>
                    {s(it.mitigation)}
                  </SupportingText>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    // ── Case Study ─────────────────────────────────────────────────────
    case "MV-CASE-SPREAD": {
      const rows: Array<{ label: string; body: string; icon: string }> = [
        { label: "Challenge", body: s(c.challenge), icon: "◇" },
        { label: "Solution", body: s(c.solution), icon: "◆" },
        { label: "Result", body: s(c.result), icon: "★" },
      ];
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <Kicker brand={brand}>Case study</Kicker>
          <Hairline
            color={"var(--slide-accent-text)"}
            widthPx={88}
            thicknessPx={2}
            className="mt-6 mb-8"
          />
          <DisplayTitle size="section" color={ink.strong}>
            {s(c.client)}
          </DisplayTitle>
          <div className="mt-6">
            <ClientLogoChip
              mode={mode}
              clientName={clientName ?? s(c.client)}
              clientLogoUrl={clientLogoUrl}
              accent="var(--slide-accent-text)"
              faint={ink.faint}
              size={36}
            />
          </div>
          <div className="mt-10 grid grid-cols-3 gap-8">
            {rows.map((r, i) => (
              <GlassTile
                key={i}
                radius={22}
                padding="px-8 py-8"
                className={`tp-rise tp-rise-delay-${Math.min(i + 1, 3) as 1 | 2 | 3}`}
              >
                <div className="flex items-center gap-4">
                  <IconWell accent={brand.tokens.accent}>
                    <span style={{ fontSize: fillPx(20, "body"), color: "var(--slide-accent-text)" }}>
                      {r.icon}
                    </span>
                  </IconWell>
                  <div
                    className="uppercase font-semibold"
                    style={{
                      color: "var(--slide-accent-text)",
                      fontSize: fillPx(12, "kicker"),
                      letterSpacing: "0.28em",
                    }}
                  >
                    {r.label}
                  </div>
                </div>
                <div
                  className="mt-6"
                  style={{
                    fontSize: fillPx(22, "body"),
                    lineHeight: 1.35,
                    color: ink.strong,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {r.body}
                </div>
              </GlassTile>
            ))}
          </div>
          {s(c.metric) && (
            <div className="mt-10">
              <StatFigure brand={brand} value={s(c.metric)} label="Outcome" size="md" icon={s(c.icon)} iconSize={s(c.iconSize)} />
            </div>
          )}
        </SlideFrame>
      );
    }

    case "MV-CASE-METRICS":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <Kicker brand={brand}>Case study</Kicker>
          <Hairline
            color={"var(--slide-accent-text)"}
            widthPx={88}
            thicknessPx={2}
            className="mt-6 mb-8"
          />
          <DisplayTitle size="section" color={ink.strong}>
            {s(c.client)}
          </DisplayTitle>
          <div className="mt-6">
            <ClientLogoChip
              mode={mode}
              clientName={clientName ?? s(c.client)}
              clientLogoUrl={clientLogoUrl}
              accent="var(--slide-accent-text)"
              faint={ink.faint}
              size={36}
            />
          </div>
          <SupportingText size="lg" opacity={0.72} className="mt-8" maxWidthPx={1180}>
            {s(c.summary)}
          </SupportingText>
          <div className="slide-fill-stretch mt-14 grid grid-cols-3 items-center gap-14">
            {arr(c.items).map((it, i) => (
              <div
                key={i}
                className={i > 0 ? "slide-fill-center h-full pl-10" : "slide-fill-center h-full"}
                style={i > 0 ? { borderLeft: `1px solid ${ink.hairline}` } : undefined}
              >
                <StatFigure
                  brand={brand}
                  value={s(it.value)}
                  unit={s(it.unit)}
                  label={s(it.label)}
                  size="lg"
                icon={s(it.icon)} iconSize={s(it.iconSize)} />
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
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-8"
              />
              <DisplayTitle size="section" color={ink.strong}>
                {s(c.client)}
              </DisplayTitle>
              <div className="mt-6">
                <ClientLogoChip
                  mode={mode}
                  clientName={clientName ?? s(c.client)}
                  clientLogoUrl={clientLogoUrl}
                  accent="var(--slide-accent-text)"
                  faint={ink.faint}
                  size={36}
                />
              </div>
              <div
                className="mt-8"
                style={{ fontSize: fillPx(42, "figure"), fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em" }}
              >
                {s(c.headline)}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <SupportingText size="lg" opacity={0.82}>
                {s(c.story)}
              </SupportingText>
              <div className="mt-10 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <Kicker brand={brand}>Result</Kicker>
                <div
                  className="mt-4"
                  style={{
                    fontSize: fillPx(40, "figure"),
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: ink.strong,
                  }}
                >
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
          <div className="slide-fill-stretch mt-12 flex flex-col">
            <div
              className="grid grid-cols-[1.3fr_1fr_2fr] gap-10 pb-4 uppercase"
              style={{
                fontSize: fillPx(18, "body"),
                letterSpacing: "0.28em",
                color: ink.faint,
                borderBottom: `1px solid ${brand.tokens.accent}`,
              }}
            >
              <div>Forum</div>
              <div>Cadence</div>
              <div>Purpose</div>
            </div>
            {arr(c.items).map((it, i) => (
              <div key={i} className="flex flex-1 flex-col justify-center">
                {i > 0 && <SoftDivider />}
                <div className="grid grid-cols-[1.3fr_1fr_2fr] items-center gap-10 py-6">
                  <div
                    style={{
                      fontSize: fillPx(26, "body"),
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: ink.strong,
                    }}
                  >
                    {s(it.forum)}
                  </div>
                  <div
                    className="uppercase"
                    style={{
                      fontSize: fillPx(18, "body"),
                      letterSpacing: "0.28em",
                      color: "var(--slide-accent-text)",
                      fontWeight: 600,
                    }}
                  >
                    {s(it.cadence)}
                  </div>
                  <SupportingText size="md" opacity={0.72}>
                    {s(it.purpose)}
                  </SupportingText>
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
          <div className="slide-fill-stretch slide-fill-center mt-10">
            <div className="max-w-6xl text-5xl font-medium leading-tight">{s(c.recommendation)}</div>
            <div className="mt-8 max-w-5xl text-3xl opacity-75">{s(c.rationale)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-CTA": {
      const steps: Item[] =
        arr(c.items).length > 0
          ? arr(c.items)
          : s(c.nextSteps)
            ? s(c.nextSteps)
                .split(/\n+/)
                .filter(Boolean)
                .map((line) => ({ label: line }) as Item)
            : [];
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={88} y={28} size={860} />
          <div className="relative grid h-full grid-cols-[1.1fr_0.9fr] items-center gap-24">
            <div>
              <div className="flex items-center gap-4">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background: brand.tokens.accent,
                    boxShadow: `0 0 24px ${brand.tokens.accent}`,
                  }}
                />
                <Kicker brand={brand}>What happens next</Kicker>
              </div>
              <div
                className="mt-8 h-[2px] w-[160px] rounded-full"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${brand.tokens.accent} 0%, ${hexA(brand.tokens.accent, 0.0)} 100%)`,
                }}
              />
              <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1080} className="mt-10">
                {s(c.message, "Let's start.")}
              </DisplayTitle>
              {(s(c.owner) || s(c.followUp)) && (
                <MetaRow className="mt-14">
                  {s(c.owner) && <span>{s(c.owner)}</span>}
                  {s(c.followUp) && <span>{s(c.followUp)}</span>}
                </MetaRow>
              )}
            </div>
            {steps.length > 0 && (
              <AuroraSidePanel
                kicker="Next steps"
                items={steps
                  .slice(0, 4)
                  .map((it) => ({ label: s(it.label ?? it.title ?? it.body) }))}
              />
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-CLOSE-THANKS":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="flex h-full flex-col justify-center">
            <Hairline color={"var(--slide-accent-text)"} widthPx={120} thicknessPx={2} />
            <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1600} className="mt-10">
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
                color: "var(--slide-accent-text)",
                fontSize: fillPx(520, "display"),
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
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6"
              />
              <DisplayTitle size="cover" color={ink.strong} maxWidthPx={1400} className="mt-10">
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

    case "MV-CLOSE-CONTACT": {
      const people = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={90} y={30} size={880} />
          <div className="relative grid h-full grid-cols-[1.05fr_0.95fr] items-center gap-24">
            <div>
              <Kicker brand={brand}>Stay in touch</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={96}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1080}>
                {s(c.title, "Let's keep the conversation going.")}
              </DisplayTitle>
              {s(c.subtitle) && (
                <SupportingText size="lg" opacity={0.78} className="mt-8" maxWidthPx={880}>
                  {s(c.subtitle)}
                </SupportingText>
              )}
            </div>
            {people.length > 0 && (
              <GlassTile radius={28} padding="px-12 py-12">
                <div
                  className="uppercase"
                  style={{
                    fontSize: fillPx(18, "body"),
                    letterSpacing: "0.28em",
                    fontWeight: 600,
                    color: ink.faint,
                  }}
                >
                  Your team
                </div>
                <div className="mt-10 space-y-10">
                  {people.slice(0, 4).map((p, i) => (
                    <div
                      key={i}
                      className={`tp-rise tp-rise-delay-${Math.min(i + 1, 3) as 1 | 2 | 3}`}
                    >
                      <div
                        style={{
                          fontSize: fillPx(30, "figure"),
                          fontWeight: 600,
                          letterSpacing: "-0.015em",
                          color: ink.strong,
                        }}
                      >
                        {s(p.name)}
                      </div>
                      <div
                        className="mt-1 uppercase"
                        style={{
                          color: "var(--slide-accent-text)",
                          fontSize: fillPx(15, "kicker"),
                          letterSpacing: "0.28em",
                          fontWeight: 600,
                        }}
                      >
                        {s(p.role)}
                      </div>
                      <div className="mt-4 space-y-1" style={{ fontSize: fillPx(20, "body"), color: ink.muted }}>
                        <div>{s(p.email)}</div>
                        {s(p.phone) && <div style={{ opacity: 0.7 }}>{s(p.phone)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassTile>
            )}
          </div>
        </SlideFrame>
      );
    }

    // ── Extended covers ────────────────────────────────────────────────
    case "MV-OP-COVER-EDITORIAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="grid h-full grid-cols-[1.5fr_1fr] gap-16">
            <div className="flex flex-col justify-between">
              <Kicker brand={brand} tracking="0.32em">
                {s(c.kicker, "Vol. 01")}
              </Kicker>
              <div>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={96}
                  thicknessPx={2}
                  className="mb-8"
                />
                <DisplayTitle size="cover" color={ink.strong} maxWidthPx={1080}>
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
              <MediaTile
                brand={brand}
                seed={s(c.mediaSeed, s(c.clientName, "editorial"))}
                className="aspect-[3/4] w-full"
              />
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-SPLIT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="-m-24 grid h-[calc(100%+192px)] grid-cols-2">
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(c.clientName, "split"))}
              className="h-full w-full rounded-none"
            />
            <div
              data-on-media className="relative flex flex-col justify-center p-24 text-white"
              style={{ backgroundColor: brand.tokens.primary }}
            >
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
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
                  thicknessPx={2}
                  className="mt-6"
                />
                <DisplayTitle size="section" color={ink.strong} maxWidthPx={720} className="mt-8">
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
            <Kicker brand={brand} tracking="0.42em">
              {s(c.kicker, "A briefing")}
            </Kicker>
            <DisplayTitle size="hero" color={ink.strong} className="uppercase">
              {s(c.title, "Signal")}
            </DisplayTitle>
            <div className="flex items-center justify-between">
              <Hairline color={"var(--slide-accent-text)"} widthPx={140} thicknessPx={2} />
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
        <SlideFrame
          brand={brand}
          pageNumber={pageNumber}
          variant="cover"
          logoPosition="top-left"
        >
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2 p-2">
            {(items.length ? items : [{}, {}, {}, {}]).slice(0, 4).map((it, i) => (
              <MediaTile
                key={i}
                brand={brand}
                seed={s(it.seed, `grid-${i}`)}
                className="h-full w-full rounded-none"
              />
            ))}
          </div>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(180deg, ${brand.tokens.primary}26 0%, ${brand.tokens.primary}8C 55%, ${brand.tokens.primary}E6 100%)`,
            }}
          />
          <div
            data-on-media
            data-media-backing
            className="relative flex h-full flex-col justify-end"
            style={{ color: "#ffffff" }}
          >
            <Kicker brand={brand} color="rgba(255,255,255,0.82)">
              {s(c.date, "Briefing")}
            </Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={96}
              thicknessPx={2}
              className="mt-8"
            />
            <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1520} className="mt-10">
              {s(c.title)}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText size="xl" opacity={0.92} maxWidthPx={1180} className="mt-8">
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
          <div className="flex h-full flex-col justify-between" style={{ color: ink.strong }}>
            <div className="flex items-start justify-between">
              <div
                className="uppercase"
                style={{ fontSize: fillPx(18, "body"), letterSpacing: "0.32em", opacity: 0.65 }}
              >
                Dossier · Ref {s(c.reference, "TP-0001")}
              </div>
              <div
                className="px-4 py-2 uppercase"
                style={{
                  border: `1px solid ${brand.tokens.accent}`,
                  color: "var(--slide-accent-text)",
                  fontSize: fillPx(18, "body"),
                  letterSpacing: "0.32em",
                  fontWeight: 600,
                }}
              >
                Confidential
              </div>
            </div>
            <div>
              <Hairline color={"var(--slide-accent-text)"} widthPx={120} thicknessPx={2} />
              <DisplayTitle size="cover" color={ink.strong} maxWidthPx={1520} className="mt-10">
                {s(c.title)}
              </DisplayTitle>
              <SupportingText size="lg" opacity={0.75} maxWidthPx={1180} className="mt-8">
                Prepared for {s(c.clientName)}
              </SupportingText>
            </div>
            <div
              className="relative grid grid-cols-3 gap-16 pt-8"
            >
              <AccentRule
                accent={brand.tokens.accent}
                cap
                capLength={120}
                emphasis={0.32}
                style={{ position: "absolute", left: 0, right: 0, top: 0, width: "auto" }}
              />
              {[
                ["Prepared by", s(c.prepared, "TransPerfect")],
                ["Date", s(c.date)],
                ["Distribution", "Internal"],
              ].map(([label, value], i) => (
                <div key={i}>
                  <Kicker brand={brand} size={14} tracking="0.32em">
                    {label}
                  </Kicker>
                  <div className="mt-3" style={{ fontSize: fillPx(22, "body"), letterSpacing: "-0.01em" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-GRADIENT": {
      const _titleLen = s(c.title).length + s(c.subtitle).length;
      const _titleSize = _titleLen > 60 ? "title" : _titleLen > 30 ? "section" : "cover";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.clientName, "cover-image"))}
            className="absolute inset-0 h-full w-full rounded-none"
          />
          <HeroScrim brand={brand} anchor="bottom" />
          <div data-on-media className="absolute inset-x-24 top-32 bottom-24 flex flex-col justify-end overflow-hidden text-white">
            <Kicker brand={brand} tracking="0.32em">
              Prepared for {s(c.clientName)}
            </Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={96}
              thicknessPx={2}
              className="mt-6"
            />
            <DisplayTitle size={_titleSize} color={ink.strong} maxWidthPx={1520} className="mt-6">
              {s(c.title)}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText
                size="lg"
                opacity={0.9}
                maxWidthPx={1180}
                className="mt-6 line-clamp-2"
              >
                {s(c.subtitle)}
              </SupportingText>
            )}
            <MetaRow className="mt-10">
              <span>{s(c.date)}</span>
            </MetaRow>
          </div>
        </SlideFrame>
      );
    }

    case "MV-OP-COVER-MONOGRAM":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="grid h-full grid-cols-[1.15fr_1fr] gap-16">
            <div
              className="relative flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: `radial-gradient(120% 90% at 20% 15%, ${brand.tokens.primary} 0%, ${brand.tokens.primary}DD 55%, ${brand.tokens.primary}66 100%)`,
                color: ink.strong,
              }}
            >
              <div
                className="relative"
                style={{
                  color: "var(--slide-accent-text)",
                  fontSize: fillPx(400, "display"),
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
              <Hairline color={"var(--slide-accent-text)"} widthPx={72} thicknessPx={2} />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={720} className="mt-8">
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
              <MediaTile
                brand={brand}
                seed={s(c.mediaSeed, "stacked")}
                className="aspect-[4/5] w-full"
              />
              <div>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
                  thicknessPx={2}
                  className="mb-8"
                />
                <DisplayTitle size="section" color={ink.strong} maxWidthPx={1000}>
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
    case "MV-IMG-FULL-BLEED": {
      const _titleLen = s(c.title).length + s(c.body).length;
      const _titleSize = _titleLen > 60 ? "title" : _titleLen > 30 ? "section" : "cover";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.title, "hero"))}
            overrideUrl={s(c.mediaUrl)}
            fit={s(c.mediaFit) || undefined}
            focus={s(c.mediaFocus) || undefined}
            zoom={Number(c.mediaZoom) || undefined}
            mediaPath={s(c.mediaPath)}
            videoUrl={s(c.videoUrl)}
            videoPosterUrl={s(c.videoPosterUrl)}
            videoPath={s(c.videoPath)}
            videoPosterPath={s(c.videoPosterPath)}
            videoAutoplay={c.videoAutoplay as boolean | undefined}
            videoLoop={c.videoLoop as boolean | undefined}
            videoMuted={c.videoMuted as boolean | undefined}
            videoControls={c.videoControls as boolean | undefined}
            className="absolute inset-0 h-full w-full rounded-none"
          />
          <HeroScrim brand={brand} anchor="bottom" />
          {/* Bottom offset clears the locked chrome band (wordmark lockup +
              confidentiality footer) so full-bleed copy never collides with it. */}
          <div data-on-media className="absolute inset-x-24 top-32 bottom-[208px] flex flex-col justify-end overflow-hidden text-white">
            <Kicker brand={brand}>{s(c.kicker, "In focus")}</Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={96}
              thicknessPx={2}
              className="mt-6 mb-6"
            />
            <DisplayTitle size={_titleSize} color={ink.strong} maxWidthPx={1600}>
              {s(c.title)}
            </DisplayTitle>
            <SupportingText size="lg" opacity={0.9} maxWidthPx={1180} className="mt-6 line-clamp-2">
              {s(c.body)}
            </SupportingText>
          </div>
        </SlideFrame>
      );
    }

    case "MV-IMG-SPLIT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-14">
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(c.title, "split"))}
              overrideUrl={s(c.mediaUrl)}
              fit={s(c.mediaFit) || undefined}
              focus={s(c.mediaFocus) || undefined}
              zoom={Number(c.mediaZoom) || undefined}
              mediaPath={s(c.mediaPath)}
              videoUrl={s(c.videoUrl)}
              videoPosterUrl={s(c.videoPosterUrl)}
              videoPath={s(c.videoPath)}
              videoPosterPath={s(c.videoPosterPath)}
              videoAutoplay={c.videoAutoplay as boolean | undefined}
              videoLoop={c.videoLoop as boolean | undefined}
              videoMuted={c.videoMuted as boolean | undefined}
              videoControls={c.videoControls as boolean | undefined}
              className="h-full w-full"
            />
            <div className="flex flex-col justify-center">
              <SlideTitle brand={brand} title={s(c.title)} />
              <SupportingText size="lg" opacity={0.82} className="mt-8" maxWidthPx={720}>
                {s(c.body)}
              </SupportingText>
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
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={72}
              thicknessPx={2}
              className="mt-6 mb-8"
            />
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(c.title, "framed"))}
              overrideUrl={s(c.mediaUrl)}
              fit={s(c.mediaFit) || undefined}
              focus={s(c.mediaFocus) || undefined}
              zoom={Number(c.mediaZoom) || undefined}
              mediaPath={s(c.mediaPath)}
              videoUrl={s(c.videoUrl)}
              videoPosterUrl={s(c.videoPosterUrl)}
              videoPath={s(c.videoPath)}
              videoPosterPath={s(c.videoPosterPath)}
              videoAutoplay={c.videoAutoplay as boolean | undefined}
              videoLoop={c.videoLoop as boolean | undefined}
              videoMuted={c.videoMuted as boolean | undefined}
              videoControls={c.videoControls as boolean | undefined}
              className="aspect-[16/9] w-[80%]"
            />
            <SupportingText
              size="lg"
              opacity={0.85}
              className="mt-10 text-center"
              maxWidthPx={1100}
            >
              {s(c.caption)}
            </SupportingText>
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
                <MediaTile
                  brand={brand}
                  seed={s(it.seed, `grid3-${i}`)}
                  className="aspect-[4/3] w-full"
                />
                <div
                  className="mt-5"
                  style={{
                    fontSize: fillPx(26, "body"),
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: ink.strong,
                  }}
                >
                  {s(it.label)}
                </div>
                <SupportingText size="md" opacity={0.72} className="mt-2">
                  {s(it.caption)}
                </SupportingText>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-IMG-GRID-6":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Selected work")} />
          <div className="mt-8 grid grid-cols-3 grid-rows-2 gap-4">
            {arr(c.items)
              .slice(0, 6)
              .map((it, i) => (
                <div key={i}>
                  <MediaTile
                    brand={brand}
                    seed={s(it.seed, `grid6-${i}`)}
                    className="h-[286px] w-full"
                  />
                  {s(it.caption) && (
                    <div
                      className="mt-3 uppercase"
                      style={{
                        fontSize: fillPx(16, "body"),
                        letterSpacing: "0.28em",
                        color: "color-mix(in oklab, currentColor 60%, transparent)",
                      }}
                    >
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
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(c.name, "portrait"))}
              pool="portrait"
              overrideUrl={s(c.mediaUrl)}
              fit={s(c.mediaFit) || undefined}
              focus={s(c.mediaFocus) || undefined}
              zoom={Number(c.mediaZoom) || undefined}
              mediaPath={s(c.mediaPath)}
              videoUrl={s(c.videoUrl)}
              videoPosterUrl={s(c.videoPosterUrl)}
              videoPath={s(c.videoPath)}
              videoPosterPath={s(c.videoPosterPath)}
              videoAutoplay={c.videoAutoplay as boolean | undefined}
              videoLoop={c.videoLoop as boolean | undefined}
              videoMuted={c.videoMuted as boolean | undefined}
              videoControls={c.videoControls as boolean | undefined}
              className="h-full w-full"
              portrait
            />
            <div className="flex flex-col justify-center">
              <Kicker brand={brand}>{s(c.role)}</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-8"
              />
              <DisplayTitle size="section" color={ink.strong}>
                {s(c.name)}
              </DisplayTitle>
              {s(c.quote) && (
                <div
                  className="relative mt-10 pl-8"
                  style={{ borderLeft: `2px solid ${brand.tokens.accent}` }}
                >
                  <div
                    style={{
                      fontSize: fillPx(34, "figure"),
                      fontWeight: 500,
                      lineHeight: 1.3,
                      letterSpacing: "-0.01em",
                      color: ink.strong,
                    }}
                  >
                    “{s(c.quote)}”
                  </div>
                </div>
              )}
              <SupportingText size="lg" opacity={0.78} className="mt-8" maxWidthPx={720}>
                {s(c.narrative)}
              </SupportingText>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-IMG-QUOTE-BG":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.attribution, "quote"))}
            overrideUrl={s(c.mediaUrl)}
            fit={s(c.mediaFit) || undefined}
            focus={s(c.mediaFocus) || undefined}
            zoom={Number(c.mediaZoom) || undefined}
            mediaPath={s(c.mediaPath)}
            videoUrl={s(c.videoUrl)}
            videoPosterUrl={s(c.videoPosterUrl)}
            videoPath={s(c.videoPath)}
            videoPosterPath={s(c.videoPosterPath)}
            videoAutoplay={c.videoAutoplay as boolean | undefined}
            videoLoop={c.videoLoop as boolean | undefined}
            videoMuted={c.videoMuted as boolean | undefined}
            videoControls={c.videoControls as boolean | undefined}
            className="absolute inset-0 h-full w-full rounded-none"
          />
          <HeroScrim brand={brand} anchor="center" />
          <div data-on-media className="relative flex h-full flex-col justify-center text-white">
            <QuoteMark
              color={"var(--slide-accent-text)"}
              size={520}
              opacity={0.18}
              className="absolute -top-4 -left-4"
            />
            <div className="relative max-w-[1500px]">
              <Kicker brand={brand} color={"var(--slide-accent-text)"}>
                In their words
              </Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <div
                style={{
                  fontSize: fillPx(72, "display"),
                  fontWeight: 500,
                  lineHeight: 1.18,
                  letterSpacing: "-0.02em",
                  color: ink.strong,
                }}
              >
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
            {[
              { label: "Before", panel: before },
              { label: "After", panel: after },
            ].map((p, i) => (
              <div key={i} className="pt-0">
                <MediaTile
                  brand={brand}
                  seed={s(p.panel.seed, `${p.label}-${s(p.panel.label)}`)}
                  className="aspect-[16/9] w-full rounded-[22px]"
                  muted={i === 0}
                />
                <div
                  className="mt-8 pt-6"
                  style={{
                    borderTop: `${i === 1 ? 2 : 1}px solid ${i === 1 ? brand.tokens.accent : `${ink.hairline}`}`,
                  }}
                >
                  <Kicker brand={brand} color={i === 1 ? "var(--slide-accent-text)" : ink.faint}>
                    {p.label}
                  </Kicker>
                  <div
                    className="mt-4"
                    style={{
                      fontSize: fillPx(34, "figure"),
                      fontWeight: 600,
                      letterSpacing: "-0.015em",
                      color: ink.strong,
                    }}
                  >
                    {s(p.panel.label)}
                  </div>
                  <SupportingText size="md" opacity={0.72} className="mt-3">
                    {s(p.panel.body)}
                  </SupportingText>
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
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(c.label, "stat"))}
              className="h-full w-full"
            />
            <div className="flex flex-col justify-center">
              <Kicker brand={brand}>Signal</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <StatFigure
                brand={brand}
                value={s(c.stat)}
                unit={s(c.unit)}
                label={s(c.label)}
                size="xl"
              icon={s(c.icon)} iconSize={s(c.iconSize)} />
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
            {arr(c.items)
              .slice(0, 5)
              .map((it, i) => (
                <div key={i}>
                  <MediaTile
                    brand={brand}
                    seed={s(it.seed, `strip-${i}`)}
                    className="aspect-[3/4] w-full"
                  />
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
            {arr(c.items)
              .slice(0, 3)
              .map((it, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[80px_1fr_320px] items-start gap-10 py-10"
                  style={{ borderTop: i === 0 ? "none" : "1px solid rgba(10,15,28,0.10)" }}
                >
                  <QuoteMark
                    color={"var(--slide-accent-text)"}
                    size={110}
                    opacity={0.9}
                    className="-mt-4"
                  />
                  <div
                    style={{
                      fontSize: fillPx(30, "figure"),
                      lineHeight: 1.32,
                      letterSpacing: "-0.01em",
                      color: ink.strong,
                    }}
                  >
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
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(c.attribution, "portrait"))}
              pool="portrait"
              className="h-full w-full"
              portrait
            />
            <div className="relative flex flex-col justify-center">
              <QuoteMark
                color={"var(--slide-accent-text)"}
                size={520}
                className="absolute -top-4 -left-2"
              />
              <div className="relative">
                <Kicker brand={brand}>In their words</Kicker>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
                  thicknessPx={2}
                  className="mt-6 mb-10"
                />
                <div
                  style={{
                    fontSize: fillPx(60, "display"),
                    fontWeight: 500,
                    lineHeight: 1.2,
                    letterSpacing: "-0.015em",
                    color: ink.strong,
                    maxWidth: 1080,
                  }}
                >
                  {s(c.quote)}
                </div>
                <div className="mt-14">
                  <Attribution
                    brand={brand}
                    name={s(c.attribution)}
                    role={s(c.role)}
                    org={s(c.org)}
                  />
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
              <QuoteMark
                color={"var(--slide-accent-text)"}
                size={560}
                className="absolute -top-10 -left-6"
              />
              <div className="relative">
                <Kicker brand={brand}>Testimonial</Kicker>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
                  thicknessPx={2}
                  className="mt-6 mb-10"
                />
                <div
                  style={{
                    fontSize: fillPx(56, "display"),
                    fontWeight: 500,
                    lineHeight: 1.22,
                    letterSpacing: "-0.015em",
                    color: ink.strong,
                  }}
                >
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
            <QuoteMark
              color={"var(--slide-accent-text)"}
              size={520}
              className="absolute -top-6 -left-4"
            />
            <div className="relative">
              <Kicker brand={brand}>In their words</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <div
                style={{
                  fontSize: fillPx(58, "display"),
                  fontWeight: 500,
                  lineHeight: 1.2,
                  letterSpacing: "-0.015em",
                  color: ink.strong,
                }}
              >
                {s(c.quote)}
              </div>
              <div className="mt-12">
                <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
              </div>
            </div>
            <div>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={56}
                thicknessPx={2}
                className="mb-6"
              />
              <Kicker brand={brand}>{s(c.metricLabel, "Outcome")}</Kicker>
              <div className="mt-8">
                <StatFigure brand={brand} value={s(c.metric)} unit={s(c.unit)} size="xl" icon={s(c.icon)} iconSize={s(c.iconSize)} />
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-QUOTE-POSTER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div data-on-media className="relative flex h-full flex-col justify-center text-white">
            <QuoteMark
              color={"var(--slide-accent-text)"}
              size={780}
              opacity={0.16}
              className="absolute -top-6 -left-4"
            />
            <div className="relative">
              <Kicker brand={brand} color={"var(--slide-accent-text)"}>
                Testimonial
              </Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={120}
                thicknessPx={2}
                className="mt-8 mb-12"
              />
              <DisplayTitle size="cover" color={ink.strong} maxWidthPx={1620}>
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
      const total =
        items.reduce(
          (sum, it) => sum + (typeof it.value === "number" ? it.value : Number(it.value) || 0),
          0,
        ) || 1;
      const palette = [brand.tokens.primary, brand.tokens.accent, "#4A90A4", "#8E44AD", "#22C1C3"];
      let cum = 0;
      const segments = items
        .map((it, i) => {
          const v = typeof it.value === "number" ? it.value : Number(it.value) || 0;
          const start = (cum / total) * 360;
          cum += v;
          const end = (cum / total) * 360;
          return `${palette[i % palette.length]} ${start}deg ${end}deg`;
        })
        .join(", ");
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Where the effort goes")} />
          <div className="mt-10 grid grid-cols-[560px_1fr] items-center gap-16">
            <div className="relative aspect-square w-[560px]">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `conic-gradient(${segments})` }}
              />
              {/* House circle centre: glass disc + seam sitting in the donut hole. */}
              <div className="absolute inset-0 grid place-items-center">
                <OrbitDisc
                  size={358}
                  accent={brand.tokens.accent}
                  cool={brand.tokens.primary}
                  isDark={isDark}
                  rings={false}
                >
                  <div className="text-8xl font-semibold leading-none" style={{ color: ink.strong }}>
                    {s(c.centerValue)}
                    <span className="text-4xl" style={{ color: "var(--slide-accent-text)" }}>
                      {s(c.centerUnit)}
                    </span>
                  </div>
                  <div className="mt-4 max-w-[80%] text-xl opacity-80">{s(c.centerLabel)}</div>
                </OrbitDisc>
              </div>

            </div>
            <div className="space-y-5">
              {items.map((it, i) => (
                <div key={i} className="flex items-start gap-5">
                  <div
                    className="mt-3 h-5 w-5 shrink-0 rounded"
                    style={{ backgroundColor: palette[i % palette.length] }}
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-6">
                      <div className="text-2xl font-semibold" style={{ color: ink.strong }}>
                        {s(it.label)}
                      </div>
                      <div
                        className="text-2xl font-semibold"
                        style={{ color: "var(--slide-accent-text)" }}
                      >
                        {s(it.value)}%
                      </div>
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
          <div className="slide-fill-stretch mt-12 flex flex-col gap-3">
            {items.map((it, i) => {
              const widthPct = 100 - (i / n) * 55;
              const shade = 1 - (i / n) * 0.55;
              return (
                <div key={i} className="flex flex-1 items-center gap-8">
                  <div
                    data-on-fill className="flex h-full min-h-24 items-center justify-between rounded-xl px-10 text-white"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: brand.tokens.primary,
                      opacity: 0.55 + shade * 0.45,
                    }}
                  >
                    <div className="text-2xl font-semibold">{s(it.label)}</div>
                    <div className="text-3xl font-semibold">
                      {s(it.value)}
                      <span className="ml-2 text-xl opacity-80">{s(it.unit)}</span>
                    </div>
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
      const values = items.map((it) =>
        typeof it.value === "number" ? it.value : Number(it.value) || 0,
      );
      const max = Math.max(1, ...values);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={90} y={30} size={840} />
          <div className="relative">
            <SlideTitle brand={brand} title={s(c.title, "Comparison")} />
            <GlassTile radius={26} padding="px-12 py-10" className="mt-12">
              <div className="space-y-6">
                {items.map((it, i) => {
                  const v = values[i];
                  const pct = Math.max(6, (v / max) * 100);
                  const highlight = i === items.length - 1;
                  return (
                    <div key={i} className="grid grid-cols-[260px_1fr_140px] items-center gap-6">
                      <div
                        className="text-2xl font-semibold"
                        style={{ color: ink.strong, letterSpacing: "-0.01em" }}
                      >
                        {s(it.label)}
                      </div>
                      <div className="relative h-10 w-full">
                        <div
                          className="absolute left-0 right-0 top-1/2 -translate-y-1/2"
                          style={{
                            height: 2,
                            background: `color-mix(in oklab, ${brand.tokens.accent} 14%, transparent)`,
                          }}
                        />
                        <div
                          className="absolute top-1/2 left-0 -translate-y-1/2"
                          style={{
                            width: `${pct}%`,
                            height: highlight ? 10 : 6,
                            background: highlight
                              ? `linear-gradient(90deg, color-mix(in oklab, ${brand.tokens.accent} 40%, transparent), ${brand.tokens.accent})`
                              : `linear-gradient(90deg, color-mix(in oklab, ${brand.tokens.primary} 18%, transparent), color-mix(in oklab, ${brand.tokens.primary} 60%, transparent))`,
                          }}
                        />
                        {s(it.note) && (
                          <div
                            className="absolute right-3 top-1/2 -translate-y-[135%] uppercase"
                            style={{
                              fontSize: fillPx(13, "kicker"),
                              letterSpacing: "0.22em",
                              color: ink.faint,
                              fontWeight: 600,
                            }}
                          >
                            {s(it.note)}
                          </div>
                        )}
                      </div>
                      <div
                        className="text-right tabular-nums"
                        style={{
                          fontSize: fillPx(34, "figure"),
                          fontWeight: 600,
                          letterSpacing: "-0.02em",
                          color: highlight ? "var(--slide-accent-text)" : ink.strong,
                        }}
                      >
                        {s(it.value)}
                        <span className="ml-1" style={{ fontSize: fillPx(18, "body"), color: ink.faint }}>
                          {s(c.unit)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassTile>
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
            {/* Hub uses the house circle so the cycle reads like the rest of the system. */}
            <div className="absolute inset-0 grid place-items-center">
              <OrbitDisc
                size={300}
                accent={brand.tokens.accent}
                cool={brand.tokens.primary}
                isDark={isDark}
              >
                <div
                  className="px-2 text-3xl font-semibold leading-tight"
                  style={{ color: ink.strong }}
                >
                  {s(c.hub, "Program")}
                </div>
              </OrbitDisc>
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
                  <OrbitDisc
                    size={76}
                    accent={brand.tokens.accent}
                    cool={brand.tokens.primary}
                    isDark={isDark}
                    rings={false}
                    seam={false}
                    className="mx-auto"
                    contentClassName="flex items-center justify-center"
                    style={{ color: "var(--slide-accent-text)" }}
                  >
                    {(() => {
                      const Ic = pickIcon(s(it.label), i, s(it.icon));
                      return <Ic size={30} />;
                    })()}
                  </OrbitDisc>

                  <div
                    className="mt-4"
                    style={{
                      fontSize: fillPx(24, "body"),
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: ink.strong,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <SupportingText size="sm" opacity={0.72} className="mt-2">
                    {s(it.body)}
                  </SupportingText>
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
          <div className="slide-fill-stretch mt-12 grid grid-cols-[1fr_1fr] items-center gap-16">
            <div className="flex h-full flex-col items-center gap-3">
              {items.map((it, i) => {
                const widthPct = 40 + ((items.length - 1 - i) / Math.max(items.length - 1, 1)) * 55;
                // Emphasis rises toward the base of the pyramid so the glass
                // reads as stacked strata rather than four identical tiles.
                const emphasis = 0.85 + (i / Math.max(items.length - 1, 1)) * 0.5;
                return (
                  <div
                    key={i}
                    className="relative flex h-full min-h-20 flex-1 items-center justify-center overflow-hidden"
                    style={{
                      width: `${widthPct}%`,
                      ...moduleCardSurface(brand.tokens.accent, isDark ? "dark" : "light", {
                        radius: 18,
                        emphasis,
                      }),
                    }}
                  >
                    <AccentTick accent={brand.tokens.accent} height={3} radius={18} />
                    <div className="text-2xl font-semibold" style={{ color: ink.strong }}>
                      {s(it.label)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-6">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="border-l-4 pl-6"
                  style={{ borderColor: brand.tokens.accent }}
                >
                  <div className="text-2xl font-semibold" style={{ color: ink.strong }}>
                    {s(it.label)}
                  </div>
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
          <div className="mt-10 grid grid-cols-[720px_1fr] items-center gap-12">
            <div className="relative h-[600px] w-[720px]">
              {[
                { left: "20%", top: "18%" },
                { left: "50%", top: "18%" },
                { left: "35%", top: "48%" },
              ].map((pos, i) => (
                <div
                  key={i}
                  className="absolute h-[380px] w-[380px] rounded-full"
                  style={{
                    left: pos.left,
                    top: pos.top,
                    backgroundColor: colors[i],
                    opacity: 0.45,
                    mixBlendMode: "multiply",
                  }}
                />
              ))}
              <div className="absolute left-1/2 top-1/2 z-10 max-w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95 p-6 text-center shadow-lg">
                <div
                  className="text-lg uppercase tracking-[0.25em]"
                  style={{ color: "var(--slide-accent-text)" }}
                >
                  Intersection
                </div>
                <div className="mt-2 text-2xl font-semibold" style={{ color: ink.strong }}>
                  {s(c.intersection)}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {items.map((it, i) => (
                <div key={i} className="flex items-start gap-5">
                  <div
                    className="mt-2 h-6 w-6 shrink-0 rounded-full"
                    style={{ backgroundColor: colors[i] }}
                  />
                  <div>
                    <div className="text-2xl font-semibold" style={{ color: ink.strong }}>
                      {s(it.label)}
                    </div>
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
    case "MV-CLIENT-MATRIX": {
      const rows = arr(c.items).slice(0, 6);
      // Two-row layouts have to fit the same 1080px stage as a single row, so
      // the card rhythm compresses instead of overflowing off the slide.
      const dense = rows.length > 3;
      const nums = rows.map(
        (it) => Number(String(s(it.metric)).replace(/[^0-9.]/g, "")) || 0,
      );
      const peak = Math.max(1, ...nums);
      // Contrast-guarded: stops are auto-corrected against the slide backdrop
      // and the glow is dropped when the accent has no headroom.
      const figureStat = statGradient(brand.tokens.accent, isDark ? "dark" : "light", "96deg", {
        ink: ink.strong,
      });
      const figureGradient = {
        backgroundImage: figureStat.backgroundImage,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        filter: figureStat.filter,
      } as const;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Client outcomes")} />
          <div className={`grid grid-cols-3 ${dense ? "mt-8 gap-5" : "mt-10 gap-6"}`}>
            {rows.map((it, i) => {
              const logoUrl = s(it.logoUrl);
              const logoPath = s(it.logoPath);
              const pct = Math.max(0.12, (nums[i] || 0) / peak);
              return (
                <div
                  key={i}
                  className="relative overflow-hidden"
                  style={{
                    ...moduleCardSurface(brand.tokens.accent, isDark ? "dark" : "light", {
                      radius: 22,
                    }),
                    padding: dense ? 24 : 32,
                  }}
                >
                  <AccentTick accent={brand.tokens.accent} height={3} radius={22} />

                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex items-center justify-center"
                      style={{
                        height: 56,
                        minWidth: 96,
                        padding: "0 14px",
                        borderRadius: 12,
                        backgroundColor: "#FFFFFF",
                        border: `1px solid ${ink.hairline}`,
                      }}
                    >
                      {logoUrl || logoPath ? (
                        <ClientLogoImg
                          path={logoPath}
                          url={logoUrl}
                          alt={s(it.client) ? `${s(it.client)} logo` : "Client logo"}
                          style={{ maxHeight: 34, maxWidth: 130, objectFit: "contain" }}
                        />
                      ) : (
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: fillPx(20, "body"),
                            fontWeight: 700,
                            letterSpacing: "0.16em",
                            color: accentInk(brand.tokens.accent, mode),
                          }}
                        >
                          {s(it.client)
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 3)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span
                      className="uppercase"
                      style={{
                        fontSize: fillPx(14, "kicker"),
                        letterSpacing: "0.2em",
                        padding: `${fillPx(7, "plate")} ${fillPx(12, "plate")}`,
                        borderRadius: 999,
                        border: `1px solid ${ink.hairline}`,
                        color: ink.muted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s(it.sector)}
                    </span>
                  </div>
                  <div
                    className={dense ? "mt-5" : "mt-7"}
                    style={{
                      fontSize: dense ? 26 : 30,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: ink.strong,
                    }}
                  >
                    {s(it.client)}
                  </div>
                  <SupportingText size={dense ? "sm" : "md"} opacity={0.72} className="mt-3">
                    {s(it.result)}
                  </SupportingText>
                  <div
                    className={dense ? "mt-5 pt-4" : "mt-7 pt-6"}
                    style={{ borderTop: `1px solid ${ink.hairline}` }}
                  >
                    <StatFigure
                      brand={brand}
                      value={s(it.metric)}
                      unit={s(it.unit)}
                      size="sm"
                      shape="column"
                      progress={pct}
                    icon={s(it.icon)} iconSize={s(it.iconSize)} />

                  </div>

                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }


    case "MV-CLIENT-DETAIL-3":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Client engagements")} />
          <div className="mt-10 grid grid-cols-3 gap-8">
            {arr(c.items)
              .slice(0, 3)
              .map((it, i) => {
                const logoUrl = s(it.logoUrl);
                const logoPath = s(it.logoPath);
                return (
                  <div key={i}>
                    {logoUrl || logoPath ? (
                      <div
                        className="flex aspect-[16/10] w-full items-center justify-center rounded-md"
                        style={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid rgba(10,15,28,0.08)",
                        }}
                      >
                        <ClientLogoImg
                          path={logoPath}
                          url={logoUrl}
                          alt={s(it.client) ? `${s(it.client)} logo` : "Client logo"}
                          style={{ maxHeight: "70%", maxWidth: "75%", objectFit: "contain" }}
                        />
                      </div>
                    ) : (
                      <MediaTile
                        brand={brand}
                        seed={s(it.seed, s(it.client, `client-${i}`))}
                        className="aspect-[16/10] w-full"
                      />
                    )}
                    <div
                      className="mt-6 pt-5"
                      style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
                    >
                      <Kicker
                        brand={brand}
                        color="color-mix(in oklab, currentColor 62%, transparent)"
                        size={16}
                      >
                        {s(it.sector)}
                      </Kicker>
                      <div
                        className="mt-4"
                        style={{
                          fontSize: fillPx(30, "figure"),
                          fontWeight: 600,
                          letterSpacing: "-0.015em",
                          color: ink.strong,
                        }}
                      >
                        {s(it.client)}
                      </div>
                      <SupportingText size="md" opacity={0.78} className="mt-3">
                        {s(it.story)}
                      </SupportingText>
                      <div
                        className="mt-6"
                        style={{
                          fontSize: fillPx(22, "body"),
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: "var(--slide-accent-text)",
                        }}
                      >
                        {s(it.metric)}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </SlideFrame>
      );

    case "MV-IMG-MATRIX-4":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "In practice")} />
          <div
            className="slide-fill-stretch slide-fill-rows mt-10 grid grid-cols-2 gap-x-10 gap-y-10"
            style={{ gridTemplateRows: "repeat(2, minmax(0, 1fr))" }}
          >
            {arr(c.items)
              .slice(0, 4)
              .map((it, i) => (
                <div key={i} className="grid grid-cols-[240px_1fr] items-center gap-8">
                  <MediaTile
                    brand={brand}
                    seed={s(it.seed, `mx-${i}`)}
                    className="aspect-[4/3] w-full"
                  />
                  <div className="pt-2">
                    <div
                      className="tabular-nums uppercase"
                      style={{
                        fontSize: fillPx(18, "body"),
                        letterSpacing: "0.28em",
                        color: "var(--slide-accent-text)",
                        fontWeight: 600,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div
                      className="mt-4"
                      style={{
                        fontSize: fillPx(30, "figure"),
                        fontWeight: 600,
                        letterSpacing: "-0.015em",
                        color: ink.strong,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <SupportingText size="md" opacity={0.75} className="mt-3">
                      {s(it.body)}
                    </SupportingText>
                  </div>
                </div>
              ))}
          </div>
        </SlideFrame>
      );

    case "MV-IMG-MATRIX-6":
      // Six tiles + captions in two rows: the tile height is fixed rather than
      // aspect-derived, because a 16/9 tile at this column width makes the
      // second row's caption run into the footer.
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Program surface area")} />
          <div className="mt-6 grid grid-cols-3 gap-x-8 gap-y-5">
            {arr(c.items)
              .slice(0, 6)
              .map((it, i) => (
                <div key={i} className="min-w-0">
                  <MediaTile
                    brand={brand}
                    seed={s(it.seed, `mx6-${i}`)}
                    className="h-[226px] w-full"
                  />
                  <div
                    className="mt-3 line-clamp-1"
                    style={{
                      fontSize: fillPx(24, "body"),
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: ink.strong,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <SupportingText size="sm" opacity={0.72} className="mt-2 line-clamp-2">
                    {s(it.body)}
                  </SupportingText>
                </div>
              ))}
          </div>
        </SlideFrame>
      );


    case "MV-CLIENT-COMPARE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={90} y={30} size={860} />
          <div className="relative">
            <SlideTitle brand={brand} title={s(c.title, "Three engagements")} />
            <div className="mt-10 grid grid-cols-3 gap-8">
              {arr(c.items)
                .slice(0, 3)
                .map((it, i) => {
                  const logoUrl = s(it.logoUrl);
                  const logoPath = s(it.logoPath);
                  return (
                    <GlassTile key={i} radius={24} padding="px-8 py-8" className="flex flex-col">
                      <Kicker brand={brand} color="var(--slide-accent-text)" size={16}>
                        Client · {String(i + 1).padStart(2, "0")}
                      </Kicker>
                      <div className="mt-4 flex items-center gap-4">
                        {(logoUrl || logoPath) && (
                          <ClientLogoImg
                            path={logoPath}
                            url={logoUrl}
                            alt={s(it.client) ? `${s(it.client)} logo` : "Client logo"}
                            style={{ maxHeight: 36, maxWidth: 120, objectFit: "contain" }}
                          />
                        )}
                        <div
                          style={{
                            fontSize: fillPx(28, "body"),
                            fontWeight: 600,
                            letterSpacing: "-0.015em",
                            color: ink.strong,
                          }}
                        >
                          {s(it.client)}
                        </div>
                      </div>
                      <div className="mt-8">
                        <Kicker brand={brand} size={16}>
                          Challenge
                        </Kicker>
                        <SupportingText size="md" opacity={0.82} className="mt-3">
                          {s(it.challenge)}
                        </SupportingText>
                      </div>
                      <div className="mt-8 flex-1">
                        <Kicker brand={brand} size={16}>
                          Outcome
                        </Kicker>
                        <SupportingText size="md" opacity={0.82} className="mt-3">
                          {s(it.outcome)}
                        </SupportingText>
                      </div>
                      <div className="mt-10">
                        <StatFigure brand={brand} value={s(it.metric)} size="md" icon={s(it.icon)} iconSize={s(it.iconSize)} />
                      </div>
                    </GlassTile>
                  );
                })}
            </div>
          </div>
        </SlideFrame>
      );

    // ── Expanded CTA / close variants ─────────────────────────────────
    case "MV-CLOSE-TIMELINE": {
      const items = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={92} y={72} size={780} />
          <div className="relative grid h-full grid-cols-[1.05fr_0.95fr] items-center gap-24">
            <div>
              <Kicker brand={brand}>Timeline</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={96}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={780}>
                {s(c.title, "What happens next.")}
              </DisplayTitle>
              {s(c.subtitle) && (
                <SupportingText size="lg" opacity={0.78} className="mt-8" maxWidthPx={720}>
                  {s(c.subtitle)}
                </SupportingText>
              )}
            </div>
            {items.length > 0 && (
              <AuroraSidePanel
                kicker="Milestones"
                items={items.slice(0, 4).map((it) => ({
                  label: s(it.label),
                  body: s(it.body),
                  meta: s(it.owner) ? `Owner · ${s(it.owner)}` : undefined,
                }))}
              />
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-CLOSE-CHECKLIST": {
      const items = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={90} y={30} size={820} />
          <div className="relative grid h-full grid-cols-[1fr_1fr] items-center gap-24">
            <div>
              <Kicker brand={brand}>Action plan</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={96}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={780}>
                {s(c.title, "What happens next.")}
              </DisplayTitle>
              {s(c.subtitle) && (
                <SupportingText size="lg" opacity={0.78} className="mt-8" maxWidthPx={720}>
                  {s(c.subtitle)}
                </SupportingText>
              )}
            </div>
            {items.length > 0 && (
              <AuroraSidePanel
                kicker="Checklist"
                items={items.slice(0, 4).map((it) => ({
                  label: s(it.label),
                  meta: [s(it.owner), s(it.when)].filter(Boolean).join(" · ") || undefined,
                }))}
              />
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-CLOSE-DECISION":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={88} y={30} size={860} />
          <div className="relative grid h-full grid-cols-[1.15fr_0.85fr] items-center gap-24">
            <div>
              <Kicker brand={brand}>{s(c.kicker, "The ask")}</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={96}
                thicknessPx={2}
                className="mt-8 mb-10"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={780}>
                {s(c.ask)}
              </DisplayTitle>
              <SupportingText size="lg" opacity={0.82} className="mt-8" maxWidthPx={720}>
                {s(c.rationale)}
              </SupportingText>
            </div>
            <GlassTile radius={28} padding="px-12 py-12">
              <div
                className="uppercase"
                style={{ fontSize: fillPx(18, "body"), letterSpacing: "0.28em", fontWeight: 600, color: ink.faint }}
              >
                Decision by
              </div>
              <div
                className="mt-8 tabular-nums"
                style={{
                  fontSize: fillPx(96, "display"),
                  lineHeight: 1,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  color: "var(--slide-accent-text)",
                }}
              >
                {s(c.decisionBy, "—")}
              </div>
              {s(c.owner) && (
                <div className="mt-10 pt-8" style={{ borderTop: `1px solid ${ink.hairline}` }}>
                  <div
                    className="uppercase"
                    style={{
                      fontSize: fillPx(14, "kicker"),
                      letterSpacing: "0.28em",
                      fontWeight: 600,
                      color: ink.faint,
                    }}
                  >
                    Owner
                  </div>
                  <div
                    className="mt-2"
                    style={{ fontSize: fillPx(24, "body"), fontWeight: 600, color: ink.strong }}
                  >
                    {s(c.owner)}
                  </div>
                </div>
              )}
            </GlassTile>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-CALENDAR":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[520px_1fr] items-center gap-20">
            <div className="flex flex-col items-center text-center">
              <Kicker brand={brand}>Kickoff</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <div
                className="tabular-nums"
                style={{
                  fontSize: fillPx(200, "display"),
                  lineHeight: 0.92,
                  fontWeight: 600,
                  letterSpacing: "-0.035em",
                  color: ink.strong,
                }}
              >
                {s(c.date)}
              </div>
              <div
                className="mt-6"
                style={{
                  fontSize: fillPx(32, "figure"),
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: ink.strong,
                }}
              >
                {s(c.day)}
              </div>
              <div
                className="mt-2 uppercase"
                style={{
                  fontSize: fillPx(18, "body"),
                  letterSpacing: "0.28em",
                  color: "color-mix(in oklab, currentColor 60%, transparent)",
                }}
              >
                {s(c.monthYear)}
              </div>
            </div>
            <div>
              <Kicker brand={brand}>{s(c.title, "Kickoff")}</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-8"
              />
              <div
                style={{
                  fontSize: fillPx(48, "figure"),
                  fontWeight: 600,
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  color: ink.strong,
                }}
              >
                {s(c.body)}
              </div>
              <SoftDivider className="mt-10 mb-6" />
              <MetaRow>
                <span>{s(c.owner)}</span>
              </MetaRow>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-STATEMENT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={86} y={68} size={900} />
          <div className="relative grid h-full grid-cols-[1.2fr_0.8fr] items-center gap-24">
            <div>
              <Kicker brand={brand}>{s(c.kicker, "A closing note")}</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={96}
                thicknessPx={2}
                className="mt-8 mb-10"
              />
              <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1100}>
                {s(c.statement)}
              </DisplayTitle>
              <MetaRow className="mt-14">
                <span>{s(c.signoff)}</span>
              </MetaRow>
            </div>
            {(s(c.attribution) || s(c.role)) && (
              <GlassTile radius={28} padding="px-12 py-12">
                <div
                  className="uppercase"
                  style={{
                    fontSize: fillPx(18, "body"),
                    letterSpacing: "0.28em",
                    fontWeight: 600,
                    color: ink.faint,
                  }}
                >
                  Signed
                </div>
                <div
                  className="mt-8"
                  style={{
                    fontSize: fillPx(36, "figure"),
                    fontWeight: 600,
                    letterSpacing: "-0.015em",
                    color: ink.strong,
                    lineHeight: 1.15,
                  }}
                >
                  {s(c.attribution, s(c.signoff))}
                </div>
                {s(c.role) && (
                  <div
                    className="mt-3 uppercase"
                    style={{
                      color: "var(--slide-accent-text)",
                      fontSize: fillPx(15, "kicker"),
                      letterSpacing: "0.28em",
                      fontWeight: 600,
                    }}
                  >
                    {s(c.role)}
                  </div>
                )}
              </GlassTile>
            )}
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-SPLIT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-16">
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(c.title, "cta"))}
              className="h-full w-full"
            />
            <div className="flex flex-col justify-center">
              <Kicker brand={brand}>Next step</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-8"
              />
              <DisplayTitle size="title" color={ink.strong}>
                {s(c.title)}
              </DisplayTitle>
              <SupportingText size="lg" opacity={0.82} className="mt-8" maxWidthPx={720}>
                {s(c.body)}
              </SupportingText>
              <div className="mt-12 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <Kicker brand={brand}>Call to action</Kicker>
                <div
                  className="mt-4"
                  style={{
                    fontSize: fillPx(44, "figure"),
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: ink.strong,
                  }}
                >
                  {s(c.ctaLabel)}
                </div>
                <SupportingText size="md" opacity={0.75} className="mt-3">
                  {s(c.ctaDetail)}
                </SupportingText>
              </div>
              <MetaRow className="mt-10">
                <span>{s(c.owner)}</span>
              </MetaRow>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-DUAL-CTA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Two ways to start")} />
          <div className="mt-14 grid grid-cols-2 gap-16">
            {arr(c.items)
              .slice(0, 2)
              .map((it, i) => {
                const highlight = i === 0;
                return (
                  <div
                    key={i}
                    className="flex flex-col pt-8"
                    style={{
                      borderTop: `${highlight ? 3 : 1}px solid ${highlight ? brand.tokens.accent : `${ink.hairline}`}`,
                    }}
                  >
                    <Kicker
                      brand={brand}
                      color={highlight ? "var(--slide-accent-text)" : ink.faint}
                    >
                      {highlight ? "Recommended" : "Alternative"}
                    </Kicker>
                    <div
                      className="mt-6"
                      style={{
                        fontSize: fillPx(56, "display"),
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.05,
                        color: ink.strong,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <SupportingText
                      size="lg"
                      opacity={0.78}
                      className="mt-6 flex-1"
                      maxWidthPx={620}
                    >
                      {s(it.body)}
                    </SupportingText>
                    <div
                      className="mt-10 flex items-center gap-4"
                      style={{
                        fontSize: fillPx(24, "body"),
                        fontWeight: 600,
                        letterSpacing: "-0.005em",
                        color: highlight ? "var(--slide-accent-text)" : ink.strong,
                      }}
                    >
                      <span>{s(it.ctaLabel)}</span>
                      <FlowArrow
                        accent={highlight ? brand.tokens.accent : ink.strong}
                        color={highlight ? undefined : ink.strong}
                        size={22}
                      />
                    </div>
                    {s(it.note) && (
                      <MetaRow className="mt-6">
                        <span>{s(it.note)}</span>
                      </MetaRow>
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
            <Kicker brand={brand} color={"var(--slide-accent-text)"}>
              <Trophy size={20} className="mr-3 inline-block align-[-0.15em]" />
              {s(c.kicker, "Our commitment")}
            </Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={120}
              thicknessPx={2}
              className="mt-8 mb-12"
            />
            <StatFigure
              brand={brand}
              value={s(c.metric)}
              unit={s(c.unit)}
              size="monumental"
              valueColor={ink.strong}
            icon={s(c.icon)} iconSize={s(c.iconSize)} />
            <div className="mt-14 max-w-[1500px]">
              <DisplayTitle size="section" color={ink.strong}>
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
    case "MV-BENTO-5":
    case "MV-BENTO-6":
    case "MV-BENTO-7":
    case "MV-BENTO-8": {
      // One bento engine, four densities. The anchor cell always sits top-left
      // and spans two rows; every other cell is placed through an explicit
      // grid-area mosaic so no density ever degrades into a plain equal grid.
      const cellCount =
        variant.id === "MV-BENTO-8"
          ? 8
          : variant.id === "MV-BENTO-7"
            ? 7
            : variant.id === "MV-BENTO-6"
              ? 6
              : 5;
      const MOSAIC: Record<number, { cols: string; rows: string; areas: string[] }> = {
        5: { cols: "1.5fr 1fr 1fr", rows: "1fr 1fr", areas: ['"a b c"', '"a d e"'] },
        6: {
          cols: "repeat(5, minmax(0, 1fr))",
          rows: "1fr 1fr",
          areas: ['"a a b c d"', '"a a e f d"'],
        },
        7: {
          cols: "repeat(6, minmax(0, 1fr))",
          rows: "1fr 1fr",
          areas: ['"a a b c d e"', '"a a f f g g"'],
        },
        8: {
          cols: "repeat(4, minmax(0, 1fr))",
          rows: "1fr 1fr 1fr",
          areas: ['"a a b c"', '"a a d e"', '"f f g h"'],
        },
      };
      const mosaic = MOSAIC[cellCount]!;
      // The mosaic still fills the sheet, but cell copy is optically centred in
      // the space it gets instead of being pinned to the bottom edge — that
      // bottom pin is what read as a dead band above every short cell.
      const mosaicRows = mosaic.rows;
      // Denser mosaics step the type and padding down so cells never overflow.
      const k = cellCount >= 8 ? 0.84 : cellCount === 7 ? 0.89 : cellCount === 6 ? 0.94 : 1;
      const px = (n: number) => Math.round(n * k);
      const items = arr(c.items);
      const anchor = items[0] ?? {};
      const rest = items.slice(1, cellCount);
      const cellStyle = moduleCardSurface(brand.tokens.accent, isDark ? "dark" : "light", {
        radius: 22,
      });
      const pad = cellCount >= 7 ? "p-7" : cellCount === 6 ? "p-8" : "p-10";
      const cellClass = `flex flex-col ${pad}`;
      // Growing, centred content well: consumes the leftover height instead of
      // leaving it above the copy.
      const wellClass = "relative flex flex-1 flex-col justify-center";
      // Contrast-guarded: stops are auto-corrected against the slide backdrop
      // and the glow is dropped when the accent has no headroom.
      const figureStat = statGradient(brand.tokens.accent, isDark ? "dark" : "light", "96deg", {
        ink: ink.strong,
      });
      const figureGradient = {
        backgroundImage: figureStat.backgroundImage,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        filter: figureStat.filter,
      } as const;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div
            className="mt-10 grid gap-6"
            style={{
              gridTemplateColumns: mosaic.cols,
              gridTemplateRows: mosaicRows,
              gridTemplateAreas: mosaic.areas.join(" "),
              height: 720,
            }}
          >
            <div className={cellClass} style={{ ...cellStyle, gridArea: "a" }}>
                  <AccentTick accent={brand.tokens.accent} height={3} radius={22} />
              <div
                className="pointer-events-none absolute"
                style={{
                  inset: "-30% -40% auto -30%",
                  height: "70%",
                  background: `radial-gradient(60% 60% at 30% 20%, color-mix(in oklab, ${brand.tokens.accent} 22%, transparent), transparent 70%)`,
                }}
              />
              <div className="relative flex items-center gap-4">
                <IconBadge
                  brand={brand}
                  label={s(anchor.title)}
                  index={0}
                  size="md"
                  override={s(anchor.icon)} sizeToken={s(anchor.iconSize)}
                  treatment="soft-tile"
                />
                <Kicker brand={brand}>Anchor</Kicker>
                <span
                  className="ml-auto tabular-nums"
                  style={{ fontSize: fillPx(16, "body"), letterSpacing: "0.24em", color: ink.faint }}
                >
                  01
                </span>
              </div>
              <div className={`${wellClass} pt-8`}>
                <div
                  style={{
                    height: 3,
                    width: 96,
                    marginBottom: 24,
                    backgroundImage: `linear-gradient(90deg, ${brand.tokens.accent}, transparent)`,
                  }}
                />
                <div
                  style={{
                    fontSize: px(46),
                    fontWeight: 650,
                    color: ink.strong,
                    letterSpacing: "-0.025em",
                    lineHeight: 1.08,
                  }}
                >
                  {s(anchor.title)}
                </div>
                <div
                  className="mt-5"
                  style={{
                    fontSize: px(24),
                    lineHeight: 1.45,
                    color: "color-mix(in oklab, currentColor 70%, transparent)",
                  }}
                >
                  {s(anchor.body)}
                </div>
              </div>
            </div>
            {rest.map((it, i) => {
              const kind = s(it.kind, "body");
              const idx = String(i + 2).padStart(2, "0");
              // b, c, d, … in mosaic order.
              const area = String.fromCharCode(98 + i);
              if (kind === "media") {
                return (
                  <div key={i} style={{ ...cellStyle, gridArea: area }}>
                  <AccentTick accent={brand.tokens.accent} height={3} radius={22} />
                    <MediaTile
                      brand={brand}
                      seed={s(it.mediaSeed, s(it.title, `bento-${i}`))}
                      overrideUrl={s(it.mediaUrl)}
                      fit={s(it.mediaFit) || undefined}
                      focus={s(it.mediaFocus) || undefined}
                      mediaPath={s(it.mediaPath) || undefined}
                      zoom={Number(it.mediaZoom) || undefined}
                      className="absolute inset-0 h-full w-full rounded-none"
                    />

                    <div
                      className="absolute inset-x-0 bottom-0"
                      style={{
                        height: "58%",
                        backgroundImage:
                          "linear-gradient(to top, rgba(3,0,44,0.82), rgba(3,0,44,0.28) 55%, transparent)",
                      }}
                    />
                    <div className="absolute inset-x-8 bottom-8">
                      <div
                        style={{
                          height: 2,
                          width: 56,
                          marginBottom: 12,
                          backgroundImage: `linear-gradient(90deg, ${brand.tokens.accent}, transparent)`,
                        }}
                      />
                      <div
                        className="uppercase"
                        style={{
                          fontSize: px(18),
                          letterSpacing: "0.26em",
                          color: "#FFFFFF",
                        }}
                      >
                        {s(it.title)}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className={cellClass} style={{ ...cellStyle, gridArea: area }}>
                  <AccentTick accent={brand.tokens.accent} height={3} radius={22} />
                  <div className="flex items-center gap-4">
                    <IconBadge
                      brand={brand}
                      label={s(kind === "stat" ? it.label : it.title)}
                      index={i + 1}
                      size={(ICON_SIZES as Record<string, unknown>)[s(it.iconSize)] ? (s(it.iconSize) as IconSizeToken) : "sm"}

                      override={s(it.icon)} sizeToken={s(it.iconSize)}
                      treatment="soft-tile"
                    />
                    <span
                      className="ml-auto tabular-nums"
                      style={{ fontSize: fillPx(15, "kicker"), letterSpacing: "0.24em", color: ink.faint }}
                    >
                      {idx}
                    </span>
                  </div>
                  {kind === "stat" ? (
                    <div className={wellClass}>
                      <StatFigure
                        brand={brand}
                        value={s(it.value)}
                        unit={s(it.unit)}
                        size="sm"
                        shape="column"
                        progress={0.72}
                      icon={s(it.icon)} iconSize={s(it.iconSize)} />

                      <div
                        className="mt-4 uppercase"
                        style={{ fontSize: px(16), letterSpacing: "0.2em", color: ink.muted }}
                      >
                        {s(it.label)}
                      </div>
                    </div>
                  ) : (
                    <div className={wellClass}>
                      <div
                        style={{
                          fontSize: px(28),
                          fontWeight: 620,
                          color: ink.strong,
                          letterSpacing: "-0.018em",
                          lineHeight: 1.15,
                        }}
                      >
                        {s(it.title)}
                      </div>
                      <div
                        className="mt-3"
                        style={{ fontSize: px(20), lineHeight: 1.42, color: ink.muted }}
                      >
                        {s(it.body)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    // Bento — value grid + close. A full closing argument on one slide:
    // title + accent promise line, a lead-in band, a bento grid of value cells
    // (icon, coloured label, accent rule, proof line) and a two-clause close
    // band. Bands are the shared SummaryBand so geometry never drifts.
    case "MV-BENTO-VALUE-CLOSE": {
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const cool = isDark ? "#7FB3F5" : "#3E7BD1";
      const promise = obj(c.promise);
      const close = obj(c.close);
      const items = arr(c.items).slice(0, 6);
      const cols = items.length >= 5 ? 3 : items.length >= 3 ? 3 : 2;
      const rowCount = Math.max(1, Math.ceil(items.length / cols));
      // Vertical contract: the module is a flex column inside the fixed content
      // box, so the value grid is the only flexible band. Everything else (title,
      // subtitle, promise line, items label, close band) is flex-none and the
      // grid absorbs the remainder — long copy shortens the grid instead of
      // pushing the close band down into it or off the page. `minH` keeps the
      // grid legible; below it the cells clamp their body copy.
      const cellMinH = rowCount >= 2 ? 132 : 172;
      // Responsive contract: the grid and the close band are containers, and
      // every type step is `min(<px cap>, <fluid cqw>)`. On a 1920 stage the px
      // cap wins so the design is pixel-identical to the approved look; on
      // narrower stages (4:3 crops, half-width compare views, thumbnails,
      // aspect variants) the cqw term takes over so nothing clips or collides.
      // One column of the grid is ~ (100 - gaps) / cols of the container width.
      const colCqw = (100 - (cols - 1) * 2.2) / cols;
      // Each cell is its own SIZE container, so a step can be expressed against
      // the width AND the height the cell actually received. Shares stay in
      // column terms (`colCqw * share`) and are converted to cell-relative cqw,
      // so the 1920 look is unchanged while a short row scales its own type down
      // instead of letting the copy run past the card's bottom edge.
      const cellText = (capPx: number, share: number, hShare: number) =>
        `min(${capPx}px, ${(share * 100).toFixed(2)}cqw, ${hShare}cqh)`;
      // Vertical rhythm inside a cell: never more than the design gap, never
      // more than a fixed share of the cell height (the safe-area contract).
      const cellGap = (capPx: number, hShare: number) => `min(${capPx}px, ${hShare}cqh)`;

      // Body copy clamps so a long cell can never win height against its
      // siblings: 2 lines on a two-row grid, 4 when there's a single row.
      const bodyLines = rowCount >= 2 ? 2 : 4;
      const clamp = (lines: number) => ({
        display: "-webkit-box" as const,
        WebkitBoxOrient: "vertical" as const,
        WebkitLineClamp: lines,
        overflow: "hidden" as const,
      });
      // Restrained tone rotation: division accent, a cool companion and neutral
      // ink. No off-brand pops — the source deck's rainbow is normalised here.
      const toneFor = (i: number) => [accent, cool, accent, ink.strong, cool, accent][i % 6]!;
      const cellStyle = moduleCardSurface(accent, isDark ? "dark" : "light", { radius: 20 });
      const hasClose = !!(s(close.lead) || s(close.emphasis) || s(close.ctaTitle));

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full min-h-0 flex-col">
            {/* Header is capped at two title lines so an overlong title can't
                eat the grid's height or push the close band off the page. */}
            <div className="flex-none overflow-hidden" style={{ maxHeight: 200 }}>
              <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.kicker) || undefined} />
            </div>
            {s(c.subtitle) && (
              <div
                data-title-subline
                className="mt-4 flex-none"

                style={{
                  fontSize: fillPx(34, "figure"),
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.18,
                  color: accentInk(accent, mode, 4.5),
                  ...clamp(2),
                }}
              >
                {s(c.subtitle)}
              </div>
            )}
            {(s(promise.lead) || s(promise.emphasis)) && (
              <SummaryBand
                lead={s(promise.lead)}
                emphasis={s(promise.emphasis)}
                accent={accent}
                leadTone={ink.strong}
                scale={0.72}
                className="flex-none"
                style={{ marginTop: 22 }}
              />
            )}
            {s(c.itemsLabel) && (
              <div
                className="mt-8 flex-none text-center uppercase"
                style={{
                  fontSize: fillPx(19, "body"),
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: ink.muted,
                }}
              >
                {s(c.itemsLabel)}
              </div>
            )}
            <div
              className="mt-5 grid min-h-0 flex-1"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                // Rows share the flexible remainder equally, with a legibility
                // floor. Long copy shortens a row rather than growing the grid.
                gridTemplateRows: `repeat(${rowCount}, minmax(min(${cellMinH}px, ${(cellMinH / 10.4).toFixed(2)}cqw), 1fr))`,
                // Floor for the whole grid so it can never be squeezed to icons
                // only by long copy above it.
                minHeight: `min(${rowCount * cellMinH + (rowCount - 1) * 16}px, ${((rowCount * cellMinH + (rowCount - 1) * 16) / 10.4).toFixed(2)}cqw)`,
                gap: "min(16px, 2.2cqw)",
                containerType: "inline-size",
              }}
            >
            {items.map((it, i) => {
              const tone = toneFor(i);
              return (
                <div
                  key={i}
                  className="flex min-w-0 flex-col items-center justify-center overflow-hidden text-center"
                  style={{
                    ...cellStyle,
                    // cqw is cell-relative inside the size container below.
                    paddingInline: "min(24px, 5cqw)",
                    paddingTop: cellGap(20, 12),
                    paddingBottom: cellGap(24, 14),
                    // Cell owns a size container so the steps below can fall back
                    // to a share of the height it actually received.
                    containerType: "size",
                  }}
                >
                  <AccentTick accent={accent} height={3} radius={20} />
                  <IconBadge
                    brand={brand}
                    label={s(it.title)}
                    index={i}
                    size="sm"
                    override={s(it.icon)}
                    sizeToken={s(it.iconSize)}
                    treatment="soft-circle"
                  />
                  <div
                    className="min-w-0 flex-none"
                    style={{
                      marginTop: cellGap(14, 8),
                      fontSize: cellText(23, 0.048, 15),
                      fontWeight: 700,
                      letterSpacing: "-0.018em",
                      lineHeight: 1.14,
                      color: tone === ink.strong ? ink.strong : accentInk(tone, mode, 4.5),
                      ...clamp(2),
                    }}
                  >
                    {s(it.title)}
                  </div>
                  <div
                    aria-hidden
                    data-decorative
                    className="flex-none"
                    style={{
                      marginTop: cellGap(12, 7),
                      height: SEAM_HEIGHT_PX,
                      width: `min(56px, ${(0.12 * 100).toFixed(2)}cqw)`,
                      borderRadius: SEAM_HEIGHT_PX,
                      backgroundImage: `linear-gradient(90deg, transparent, ${tone}, transparent)`,
                    }}
                  />
                  <div
                    className="min-w-0 flex-none"
                    style={{
                      marginTop: cellGap(12, 7),
                      fontSize: cellText(17, 0.036, 11),
                      lineHeight: 1.38,
                      color: ink.muted,
                      ...clamp(bodyLines),
                    }}
                  >
                    {s(it.body)}
                  </div>
                </div>

              );
            })}
            </div>
            {hasClose && (
              // Pinned to the bottom of the content box with a guaranteed gap
              // above it: `mt-auto` eats any slack, the wrapper's paddingTop is
              // the minimum breathing room from the grid, and the band's own
              // token margin is zeroed so the two never double up.
              <div
                className="mt-auto flex-none"
                style={{ paddingTop: `min(${SUMMARY_BAND.marginTop}px, 2.6cqw)` }}
              >
                <SummaryBand
                  accent={accent}
                  leadTone={ink.strong}
                  scale={0.78}
                  style={{ marginTop: 0 }}
                >
                  <div className="@container w-full">
                    <div
                      className="grid w-full grid-cols-1 items-center gap-y-2 @[620px]:grid-cols-[1fr_1px_1fr]"
                      style={{ columnGap: "min(40px, 2.6cqw)" }}
                    >
                      <div className="min-w-0 text-left">
                        <div
                          style={{
                            fontSize: "min(24px, 2.9cqw)",
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.22,
                            color: ink.strong,
                            ...clamp(2),
                          }}
                        >
                          {s(close.lead)}
                        </div>
                        {s(close.emphasis) && (
                          <div
                            style={{
                              fontSize: "min(24px, 2.9cqw)",
                              fontWeight: 700,
                              letterSpacing: "-0.02em",
                              lineHeight: 1.22,
                              color: accentInk(accent, mode, 4.5),
                              ...clamp(2),
                            }}
                          >
                            {s(close.emphasis)}
                          </div>
                        )}
                      </div>
                      <div
                        aria-hidden
                        data-decorative
                        className="hidden self-stretch @[620px]:block"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${accent} 32%, transparent)`,
                        }}
                      />
                      <div className="min-w-0 text-left">
                        <div
                          style={{
                            fontSize: "min(24px, 2.9cqw)",
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.22,
                            color: ink.strong,
                            ...clamp(2),
                          }}
                        >
                          {s(close.ctaTitle)}
                        </div>
                        {s(close.ctaBody) && (
                          <div
                            className="mt-1"
                            style={{
                              fontSize: "min(19px, 2.3cqw)",
                              lineHeight: 1.32,
                              color: ink.muted,
                              ...clamp(2),
                            }}
                          >
                            {s(close.ctaBody)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </SummaryBand>
              </div>
            )}
          </div>
        </SlideFrame>
      );
    }






    case "MV-KPI-DASHBOARD": {
      const items = arr(c.items).slice(0, 6);
      // Deterministic pseudo-random per slide so sparklines stay stable but
      // differ per tile. Mulberry32-style.
      const rng = (seed: number) => {
        let a = (seed * 2654435761) >>> 0;
        return () => {
          a = (a + 0x6d2b79f5) >>> 0;
          let t = a;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      };
      const numeric = (v: string) => {
        const m = String(v).replace(/[^0-9.\-]/g, "");
        const n = parseFloat(m);
        return Number.isFinite(n) ? n : 60;
      };
      const seriesFor = (label: string, trend: string, base: number) => {
        const seed =
          Array.from(label).reduce((a, ch) => a + ch.charCodeAt(0), 7) + Math.round(base * 13);
        const r = rng(seed);
        const dir = trend === "down" ? -1 : 1;
        const arr: number[] = [];
        for (let i = 0; i < 14; i++) {
          const t = i / 13;
          const noise = (r() - 0.5) * 0.18;
          arr.push(0.55 + dir * t * 0.42 + noise);
        }
        return arr;
      };
      const ringPct = (v: string, unit: string) => {
        const n = numeric(v);
        if (unit === "%") return Math.max(4, Math.min(99, n));
        if (unit === "/5") return Math.max(4, Math.min(99, (n / 5) * 100));
        // fallback: normalize small numbers to a sane arc
        if (n <= 10) return 40 + n * 5;
        if (n <= 100) return Math.max(20, n);
        return 78;
      };
      const usedIcons = new Set<IconType>();
      const dedupPool: IconType[] = [
        LineChart,
        TrendingUp,
        Target,
        Zap,
        Trophy,
        Rocket,
        Sparkles,
        BarChart3,
      ];
      const pickTileIcon = (label: string, override: string, i: number) => {
        let Icon = pickIcon(label || "kpi", i, override);
        if (usedIcons.has(Icon)) {
          const alt = dedupPool.find((c) => !usedIcons.has(c));
          if (alt) Icon = alt;
        }
        usedIcons.add(Icon);
        return Icon;
      };

      // Bento assignment — a defined 12-col × 3-row mosaic (172px rows):
      //   [ HERO (7×2) ][ RING (5×1) ]
      //                 [ SPARK (5×1) ]
      //   [ BAR (4×1) ][ BAR (4×1) ][ BAR (4×1) ]
      // Every tile clips its own content so charts can never leak past the card.
      type TileKind = "hero" | "ring" | "spark" | "bar";
      const layout: { col: number; row: number; kind: TileKind }[] = [
        { col: 7, row: 2, kind: "hero" },
        { col: 5, row: 1, kind: "ring" },
        { col: 5, row: 1, kind: "spark" },
        { col: 4, row: 1, kind: "bar" },
        { col: 4, row: 1, kind: "bar" },
        { col: 4, row: 1, kind: "bar" },
      ];

      // Trend accent — up uses the brand accent, down uses TransPerfect Red so
      // the mosaic reads as a real infographic (green/red visual grammar) while
      // still respecting the brand palette.
      const upInk = "var(--slide-accent-text)";
      const downInk = "#E53D2E";
      const trendInk = (t: string) => (t === "down" ? downInk : upInk);

      const chip = (tInk: string, arrow: string, delta: string, size = 15) => (
        <div
          className="inline-flex items-center gap-1.5 rounded-full"
          style={{
            padding: size >= 15 ? "5px 12px" : "4px 10px",
            background: `color-mix(in oklab, ${tInk} 13%, transparent)`,
            border: `1px solid color-mix(in oklab, ${tInk} 30%, transparent)`,
            color: tInk,
            fontSize: size,
            fontWeight: 600,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span aria-hidden>{arrow}</span>
          <span className="tabular-nums">{delta}</span>
        </div>
      );

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div
            className="mt-10 grid gap-5"
            style={{
              gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
              gridAutoRows: "214px",
            }}
          >
            {items.map((it, i) => {
              const cfg = layout[i] ?? { col: 4, row: 1, kind: "bar" as TileKind };
              const label = s(it.label);
              const value = s(it.value);
              const unit = s(it.unit);
              const delta = s(it.delta);
              const trend = s(it.trend) || (delta.startsWith("-") ? "down" : "up");
              const Icon = pickTileIcon(label, s(it.icon), i);
              const tInk = trendInk(trend);
              const arrow = trend === "down" ? "▼" : "▲";

              const tileStyle: React.CSSProperties = {
                gridColumn: `span ${cfg.col}`,
                gridRow: `span ${cfg.row}`,
                ...moduleCardSurface(brand.tokens.accent, isDark ? "dark" : "light", {
                  radius: 22,
                }),
                padding: cfg.kind === "hero" ? 34 : 24,
                position: "relative",
                overflow: "hidden",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              };

              // Numbered corner label — infographic wayfinding.
              const cornerNum = (
                <div
                  className="absolute font-mono"
                  style={{
                    top: 16,
                    right: 20,
                    fontSize: fillPx(12, "kicker"),
                    letterSpacing: "0.28em",
                    color: ink.faint,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
              );

              const iconChip = (size: number, box: number, radius: number) => (
                <div
                  aria-hidden
                  className="flex shrink-0 items-center justify-center"
                  style={{
                    width: box,
                    height: box,
                    borderRadius: radius,
                    background: "color-mix(in oklab, var(--slide-accent-text) 11%, transparent)",
                    border: `1px solid color-mix(in oklab, var(--slide-accent-text) 30%, transparent)`,
                    color: "var(--slide-accent-text)",
                  }}
                >
                  <Icon size={size} aria-hidden />
                </div>
              );

              if (cfg.kind === "hero") {
                const series = seriesFor(label, trend, numeric(value));
                return (
                  <div key={i} style={tileStyle}>
                    <AccentTick accent={brand.tokens.accent} height={3} radius={22} />
                    {cornerNum}
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: `radial-gradient(120% 95% at 0% 100%, color-mix(in oklab, var(--slide-accent-text) 13%, transparent), transparent 62%)`,
                        pointerEvents: "none",
                      }}
                    />
                    <div className="relative flex min-h-0 flex-1 gap-8">
                      {/* Reading column — figure + label */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div className="flex items-center gap-4">
                          {iconChip(28, 60, 18)}
                          <div>
                            <div
                              className="uppercase font-mono"
                              style={{ fontSize: fillPx(12, "kicker"), letterSpacing: "0.3em", color: ink.faint }}
                            >
                              Headline metric
                            </div>
                            <div
                              className="mt-1.5"
                              style={{
                                fontSize: fillPx(19, "body"),
                                fontWeight: 600,
                                color: ink.strong,
                                letterSpacing: "-0.01em",
                              }}
                            >
                              {label}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-end gap-5">
                          <div
                            className="tabular-nums"
                            style={{
                              fontSize: fillPx(176, "display"),
                              lineHeight: 0.84,
                              fontWeight: 700,
                              letterSpacing: "-0.05em",
                              color: ink.strong,
                            }}
                          >
                            {value}
                            {unit && (
                              <span
                                style={{
                                  fontSize: fillPx(52, "figure"),
                                  marginLeft: 6,
                                  color: "var(--slide-accent-text)",
                                  letterSpacing: "-0.03em",
                                }}
                              >
                                {unit}
                              </span>
                            )}
                          </div>
                          {delta && <div className="pb-4">{chip(tInk, arrow, delta, 16)}</div>}
                        </div>
                      </div>
                      {/* Chart column — bounded, never stretched past the card */}
                      <div
                        className="flex min-w-0 flex-col justify-end"
                        style={{ width: "42%", borderLeft: `1px solid ${ink.hairline}`, paddingLeft: 22 }}
                      >
                        <div
                          className="uppercase font-mono"
                          style={{ fontSize: fillPx(11, "kicker"), letterSpacing: "0.28em", color: ink.faint }}
                        >
                          Trailing 14 periods
                        </div>
                        <div className="mt-3">
                          <Sparkline brand={brand} values={series} w={420} h={168} peakPin />
                        </div>
                        <div
                          className="mt-2 flex justify-between font-mono"
                          style={{ fontSize: fillPx(11, "kicker"), letterSpacing: "0.18em", color: ink.faint }}
                        >
                          <span>T-13</span>
                          <span>NOW</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (cfg.kind === "ring") {
                const pct = ringPct(value, unit);
                const R = 54;
                const C = 2 * Math.PI * R;
                const dash = (pct / 100) * C;
                return (
                  <div key={i} style={tileStyle}>
                    <AccentTick accent={brand.tokens.accent} height={3} radius={22} />
                    {cornerNum}
                    <div className="flex min-h-0 flex-1 items-center gap-6">
                      <svg
                        width={128}
                        height={128}
                        viewBox="-64 -64 128 128"
                        className="shrink-0"
                        aria-hidden
                      >
                        <circle r={R} fill="none" stroke={ink.hairline} strokeWidth={9} />
                        <circle
                          r={R}
                          fill="none"
                          stroke="var(--slide-accent-text)"
                          strokeWidth={9}
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${C - dash}`}
                          transform="rotate(-90)"
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={34}
                          fontWeight={700}
                          fill={ink.strong}
                          style={{ letterSpacing: "-0.03em" }}
                        >
                          {value}
                        </text>
                      </svg>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <Icon
                            size={19}
                            style={{ color: "var(--slide-accent-text)" }}
                            aria-hidden
                          />
                          <div
                            className="truncate"
                            style={{
                              fontSize: fillPx(21, "body"),
                              fontWeight: 600,
                              color: ink.strong,
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {label}
                            {unit && (
                              <span style={{ color: ink.faint, fontSize: fillPx(16, "body") }}> · {unit}</span>
                            )}
                          </div>
                        </div>
                        {delta && (
                          <div className="mt-3 flex items-center gap-2.5">
                            {chip(tInk, arrow, delta, 14)}
                            <span style={{ color: ink.faint, fontSize: fillPx(14, "kicker") }}>vs. baseline</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (cfg.kind === "spark") {
                const series = seriesFor(label, trend, numeric(value));
                return (
                  <div key={i} style={tileStyle}>
                    <AccentTick accent={brand.tokens.accent} height={3} radius={22} />
                    {cornerNum}
                    <div className="flex min-h-0 flex-1 items-center gap-6">
                      <div className="flex min-w-0 shrink-0 flex-col" style={{ width: "44%" }}>
                        <div className="flex items-center gap-3">
                          {iconChip(19, 42, 12)}
                          <div
                            className="truncate"
                            style={{ fontSize: fillPx(16, "body"), color: ink.muted, letterSpacing: "-0.005em" }}
                          >
                            {label}
                          </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1.5">
                          <span
                            className="tabular-nums font-semibold"
                            style={{
                              fontSize: fillPx(70, "display"),
                              lineHeight: 0.88,
                              letterSpacing: "-0.045em",
                              color: ink.strong,
                            }}
                          >
                            {value}
                          </span>
                          {unit && (
                            <span
                              style={{
                                fontSize: fillPx(22, "body"),
                                color: "var(--slide-accent-text)",
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {unit}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Sparkline brand={brand} values={series} w={320} h={96} />
                        {delta && <div className="mt-2.5">{chip(tInk, arrow, delta, 14)}</div>}
                      </div>
                    </div>
                  </div>
                );
              }

              // Uniform bottom rail — value, delta, progress meter
              const pct = ringPct(value, unit);
              return (
                <div key={i} style={tileStyle}>
                  <AccentTick accent={brand.tokens.accent} height={3} radius={22} />
                  {cornerNum}
                  <div className="flex items-center gap-3" style={{ paddingRight: 44 }}>
                    {iconChip(20, 44, 13)}
                    <div
                      className="truncate"
                      style={{ fontSize: fillPx(16, "body"), color: ink.muted, letterSpacing: "-0.005em" }}
                    >
                      {label}
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="tabular-nums font-semibold"
                        style={{
                          fontSize: fillPx(54, "figure"),
                          lineHeight: 0.9,
                          letterSpacing: "-0.04em",
                          color: ink.strong,
                        }}
                      >
                        {value}
                      </span>
                      {unit && (
                        <span
                          style={{
                            fontSize: fillPx(21, "body"),
                            color: "var(--slide-accent-text)",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {unit}
                        </span>
                      )}
                    </div>
                    {delta && chip(tInk, arrow, delta, 14)}
                  </div>
                  <div
                    style={{
                      height: 7,
                      borderRadius: 4,
                      background: ink.hairline,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: `${Math.max(6, Math.min(100, pct))}%`,
                        background: `linear-gradient(90deg, color-mix(in oklab, var(--slide-accent-text) 45%, transparent), var(--slide-accent-text))`,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-ROADMAP-QUARTERS": {
      const quarters = strs(c.quarters).length ? strs(c.quarters) : ["Q1", "Q2", "Q3", "Q4"];
      // Rows are unbounded in authored content; past six the table used to run
      // through the footer, so cap the run and tighten the row rhythm as it grows.
      const items = arr(c.items).slice(0, 6);
      const dense = items.length >= 5;
      const rowPad = dense ? "py-3" : "py-5";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className={dense ? "mt-8" : "mt-14"}>

            <div
              className="grid gap-6"
              style={{ gridTemplateColumns: `240px repeat(${quarters.length}, minmax(0, 1fr))` }}
            >
              <div />
              {quarters.map((q, i) => (
                <div
                  key={i}
                  className="pb-4 uppercase"
                  style={{
                    fontSize: fillPx(20, "body"),
                    letterSpacing: "0.28em",
                    color: "var(--slide-accent-text)",
                    fontWeight: 600,
                    borderBottom: `2px solid ${brand.tokens.accent}`,
                  }}
                >
                  {q}
                </div>
              ))}
              {items.map((it, i) => {
                const start = Math.max(1, Number(it.start ?? 1));
                const end = Math.min(quarters.length, Number(it.end ?? start));
                const span = end - start + 1;
                return (
                  <>
                    <div
                      key={`l-${i}`}
                      className={`${rowPad} pr-6`}
                      style={{
                        fontSize: fillPx(22, "body"),
                        fontWeight: 600,
                        color: ink.strong,
                        letterSpacing: "-0.01em",
                        borderTop: `1px solid ${ink.hairline}`,
                      }}
                    >
                      {s(it.label)}
                      {s(it.note) && (
                        <div
                          className="mt-1"
                          style={{
                            fontSize: fillPx(16, "body"),
                            fontWeight: 400,
                            color: "color-mix(in oklab, currentColor 60%, transparent)",
                            letterSpacing: 0,
                          }}
                        >
                          {s(it.note)}
                        </div>
                      )}
                    </div>
                    {Array.from({ length: quarters.length }).map((_, q) => {
                      const active = q + 1 >= start && q + 1 <= end;
                      const isStart = q + 1 === start;
                      return (
                        <div
                          key={`c-${i}-${q}`}
                          className={rowPad}
                          style={{ borderTop: `1px solid ${ink.hairline}` }}
                        >
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
      const fstyle = resolveFunnelStyle((c as Record<string, unknown>).funnelStyle, brand);
      const stages: FunnelStage[] = items.map((it) => {
        const raw = typeof it.value === "number" ? it.value : Number(String(it.value ?? "").replace(/[^0-9.]/g, ""));
        return {
          label: s(it.label),
          note: s(it.note),
          value: s(it.value),
          unit: s(it.unit),
          icon: s(it.icon),
          num: Number.isFinite(raw) && raw > 0 ? raw : 0,
        };
      });
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={88} y={22} size={780} />
          <AuroraOrb x={6} y={92} size={620} />
          <div className="relative">
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-10">
              <FunnelFigure
                stages={stages}
                style={fstyle}
                ink={{
                  strong: ink.strong,
                  body: ink.body,
                  muted: ink.muted,
                  faint: ink.faint,
                  hairline: ink.hairline,
                }}
                renderIcon={(st, i) => (
                  <IconBadge brand={brand} label={st.label} index={i} size="md" override={st.icon} />
                )}
              />
            </div>
          </div>
        </SlideFrame>
      );
    }


    case "MV-FLYWHEEL": {
      const items = arr(c.items).slice(0, 6);
      const list = items.length ? items : [{ label: "Create" }, { label: "Localize" }, { label: "Publish" }, { label: "Measure" }];
      const n = list.length;
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const accentText = accentInk(accent, mode);
      const uid = `fw-${variant.id}-${n}`;
      // Geometry — one square stage for the wheel, everything derived from it so
      // nodes, arcs and labels can never drift apart.
      const S = 660;
      const CX = S / 2;
      const CY = S / 2;
      const R = 232; // track radius
      const NODE = 92; // node chip diameter
      const GAP = 0.23; // arc gap (fraction of a segment) reserved for the node
      const ang = (t: number) => t * Math.PI * 2 - Math.PI / 2;
      const pt = (t: number, r = R) => ({ x: CX + Math.cos(ang(t)) * r, y: CY + Math.sin(ang(t)) * r });
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col">
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-8 grid flex-1 items-center gap-12" style={{ gridTemplateColumns: "660px 1fr" }}>
              {/* ── Wheel ─────────────────────────────────────────────── */}
              <div className="relative" style={{ width: S, height: S }}>
                <svg
                  viewBox={`0 0 ${S} ${S}`}
                  className="absolute inset-0 h-full w-full"
                  aria-hidden
                  data-decorative
                >
                  <defs>
                    <linearGradient id={`${uid}-arc`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity={isDark ? 0.55 : 0.45} />
                      <stop offset="55%" stopColor={accent} />
                      <stop offset="100%" stopColor={accentText} />
                    </linearGradient>
                    <radialGradient id={`${uid}-hub`} cx="50%" cy="45%" r="60%">
                      <stop offset="0%" stopColor={accent} stopOpacity={isDark ? 0.34 : 0.2} />
                      <stop offset="100%" stopColor={accent} stopOpacity={0} />
                    </radialGradient>
                    <marker
                      id={`${uid}-tip`}
                      viewBox="0 0 12 12"
                      refX="9"
                      refY="6"
                      markerWidth="6.5"
                      markerHeight="6.5"
                      orient="auto"
                    >
                      <path d="M 0 0 L 12 6 L 0 12 L 3.2 6 Z" fill={accentText} />
                    </marker>
                  </defs>

                  {/* hub aura + concentric guides */}
                  <circle cx={CX} cy={CY} r={R - 46} fill={`url(#${uid}-hub)`} />
                  <circle
                    cx={CX}
                    cy={CY}
                    r={R}
                    fill="none"
                    stroke={hexA(accent, isDark ? 0.28 : 0.22)}
                    strokeWidth={16}
                  />
                  <circle
                    cx={CX}
                    cy={CY}
                    r={R + 30}
                    fill="none"
                    stroke={ink.hairline}
                    strokeWidth={1}
                    strokeDasharray="2 10"
                  />
                  <circle
                    cx={CX}
                    cy={CY}
                    r={R - 74}
                    fill="none"
                    stroke={ink.hairline}
                    strokeWidth={1}
                  />

                  {/* momentum arcs — one per hand-off, arrow lands on next node */}
                  {list.map((_, i) => {
                    const a = (i + GAP) / n;
                    const b = (i + 1 - GAP) / n;
                    const p1 = pt(a);
                    const p2 = pt(b);
                    return (
                      <path
                        key={`arc-${i}`}
                        d={`M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y}`}
                        fill="none"
                        stroke={`url(#${uid}-arc)`}
                        strokeWidth={7}
                        strokeLinecap="round"
                        markerEnd={`url(#${uid}-tip)`}
                      />
                    );
                  })}

                  {/* spokes from hub to each node */}
                  {list.map((_, i) => {
                    const inner = pt(i / n, R - 74);
                    const outer = pt(i / n, R - NODE / 2 - 6);
                    return (
                      <line
                        key={`spoke-${i}`}
                        x1={inner.x}
                        y1={inner.y}
                        x2={outer.x}
                        y2={outer.y}
                        stroke={hexA(accent, isDark ? 0.4 : 0.3)}
                        strokeWidth={1.5}
                        strokeDasharray="3 6"
                      />
                    );
                  })}
                </svg>

                {/* hub */}
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center"
                  style={{
                    width: (R - 74) * 2 - 24,
                    height: (R - 74) * 2 - 24,
                    borderRadius: "50%",
                    ...moduleCardSurface(accent, mode, { radius: 9999, emphasis: 1.1 }),
                    padding: fillPx(28, "plate"),
                  }}
                >
                  <div
                    style={{
                      fontSize: fillPx(13, "kicker"),
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: accentText,
                    }}
                  >
                    {s(c.hubKicker, "Flywheel hub")}
                  </div>
                  <div
                    className="mt-2"
                    style={{
                      fontSize: fillPx(30, "figure"),
                      fontWeight: 600,
                      lineHeight: 1.12,
                      letterSpacing: "-0.02em",
                      color: ink.strong,
                    }}
                  >
                    {s(c.hub, "Program")}
                  </div>
                  {s(c.hubNote) && (
                    <div
                      className="mt-2"
                      style={{ fontSize: fillPx(15, "kicker"), lineHeight: 1.35, color: ink.muted, maxWidth: 200 }}
                    >
                      {s(c.hubNote)}
                    </div>
                  )}
                </div>

                {/* node chips */}
                {list.map((it, i) => {
                  const p = pt(i / n);
                  return (
                    <div
                      key={`node-${i}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: p.x, top: p.y, width: NODE, height: NODE }}
                    >
                      <div
                        className="flex h-full w-full items-center justify-center rounded-full"
                        style={{
                          background: isDark ? "rgba(8,6,40,0.72)" : "#ffffff",
                          border: `2px solid ${hexA(accent, isDark ? 0.7 : 0.55)}`,
                          boxShadow: isDark
                            ? `0 0 0 8px ${hexA(accent, 0.08)}`
                            : `0 12px 28px -18px ${hexA(accent, 0.55)}, 0 0 0 8px ${hexA(accent, 0.07)}`,
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        <IconBadge
                          brand={brand}
                          label={s(it.label)}
                          index={i}
                          size="md"
                          override={s(it.icon)} sizeToken={s(it.iconSize)}
                          treatment="glyph"
                        />
                      </div>
                      <div
                        className="absolute -right-1 -top-1 flex items-center justify-center rounded-full"
                        style={{
                          width: 26,
                          height: 26,
                          background: accentText,
                          color: isDark ? "#06052a" : "#ffffff",
                          fontSize: fillPx(13, "kicker"),
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Ledger ────────────────────────────────────────────── */}
              <div className="flex flex-col gap-4">
                {s(c.subtitle) && (
                  <div style={{ fontSize: fillPx(21, "body"), lineHeight: 1.4, color: ink.muted, maxWidth: 640 }}>
                    {s(c.subtitle)}
                  </div>
                )}
                {list.map((it, i) => (
                  <div
                    key={`row-${i}`}
                    className="flex items-start gap-5 px-6 py-5"
                    style={moduleCardSurface(accent, mode, { radius: 18 })}
                  >
                    <AccentTick accent={accent} radius={18} />
                    <SlideNumeral
                      value={i + 1}
                      sizePx={34}
                      color={accentText}
                      className="shrink-0"
                      style={{ width: 52 }}
                    />
                    <div className="min-w-0">
                      <div
                        style={{
                          fontSize: fillPx(23, "body"),
                          fontWeight: 600,
                          letterSpacing: "-0.015em",
                          color: ink.strong,
                        }}
                      >
                        {s(it.label)}
                      </div>
                      {s(it.note) && (
                        <div className="mt-1" style={{ fontSize: 16.5, lineHeight: 1.4, color: ink.muted }}>
                          {s(it.note)}
                        </div>
                      )}
                    </div>
                    {s(it.metric) && (
                      <div
                        className="ml-auto shrink-0 self-center"
                        style={{
                          fontSize: fillPx(26, "body"),
                          fontWeight: 700,
                          letterSpacing: "-0.02em",
                          color: accentText,
                        }}
                      >
                        {s(it.metric)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }


    case "MV-MATURITY-CURVE": {
      const items = arr(c.items);
      const n = Math.max(items.length, 2);
      // Reserve generous horizontal padding so the leftmost/rightmost labels
      // never get clipped, and vertical padding for stage-label + note lines.
      const PAD_X = 200;
      const PAD_TOP = 90;
      const PAD_BOT = 110;
      const W = 1760;
      const H = 520;
      const curveId = `mc-fill-${variant.id}`;
      const glowId = `mc-glow-${variant.id}`;
      const gradId = `mc-line-${variant.id}`;
      const primary = brand.tokens.primary;
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      // Anchor left/right, sinusoidal ease so the S-curve reads as a real
      // maturity ramp rather than a straight diagonal.
      const px = (i: number) => PAD_X + (i / (n - 1)) * (W - PAD_X * 2);
      const py = (i: number) => {
        const t = i / (n - 1);
        const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
        return PAD_TOP + (1 - eased) * (H - PAD_TOP - PAD_BOT) * 0.9 + (H - PAD_BOT) * 0.05;
      };
      const points = items.map((_, i) => ({ x: px(i), y: py(i) }));
      const path = points
        .map((p, i) => {
          if (i === 0) return `M ${p.x} ${p.y}`;
          const prev = points[i - 1];
          const mx = (prev.x + p.x) / 2;
          return `C ${mx} ${prev.y} ${mx} ${p.y} ${p.x} ${p.y}`;
        })
        .join(" ");
      const areaPath = `${path} L ${points[points.length - 1]?.x ?? W - PAD_X} ${H - PAD_BOT} L ${points[0]?.x ?? PAD_X} ${H - PAD_BOT} Z`;
      const currentIdx = items.findIndex((it) => Boolean(it.current));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          {s(c.subtitle) && (
            <div
              className="mt-10 max-w-[1080px]"
              style={{ fontSize: fillPx(22, "body"), lineHeight: 1.4, color: ink.muted }}
            >
              {s(c.subtitle)}
            </div>
          )}
          <div className="mt-10">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.55} />
                  <stop offset="55%" stopColor={primary} />
                  <stop offset="100%" stopColor={accent} />
                </linearGradient>
                <linearGradient id={curveId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={isDark ? 0.28 : 0.2} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
                <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Baseline & tick guides */}
              {Array.from({ length: 4 }, (_, i) => {
                const y = PAD_TOP + ((H - PAD_TOP - PAD_BOT) / 3) * i;
                return (
                  <line
                    key={i}
                    x1={PAD_X}
                    y1={y}
                    x2={W - PAD_X}
                    y2={y}
                    stroke={ink.axis}
                    strokeDasharray={i === 3 ? "0" : "2 8"}
                    strokeWidth={1}
                  />
                );
              })}
              {/* Y-axis frame labels */}
              <text
                x={PAD_X - 24}
                y={PAD_TOP + 6}
                textAnchor="end"
                fontSize={16}
                letterSpacing="0.28em"
                fill={ink.faint}
                style={{ textTransform: "uppercase", fontWeight: 600 }}
              >
                High
              </text>
              <text
                x={PAD_X - 24}
                y={H - PAD_BOT + 6}
                textAnchor="end"
                fontSize={16}
                letterSpacing="0.28em"
                fill={ink.faint}
                style={{ textTransform: "uppercase", fontWeight: 600 }}
              >
                Low
              </text>
              {/* Curve fill under-glow */}
              <path d={areaPath} fill={`url(#${curveId})`} />
              {/* Curve stroke */}
              <path
                d={path}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={5}
                strokeLinecap="round"
                filter={`url(#${glowId})`}
              />
              {/* Nodes */}
              {items.map((it, i) => {
                const current = Boolean(it.current) || i === currentIdx;
                const p = points[i];
                const isFirst = i === 0;
                const isLast = i === n - 1;
                const anchor: "start" | "middle" | "end" = isFirst
                  ? "start"
                  : isLast
                    ? "end"
                    : "middle";
                const labelX = isFirst ? p.x - 6 : isLast ? p.x + 6 : p.x;
                const noteX = labelX;
                const label = s(it.label);
                const note = s(it.note);
                return (
                  <g key={i}>
                    {current && <circle cx={p.x} cy={p.y} r={26} fill={accent} opacity={0.18} />}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={current ? 14 : 9}
                      fill={current ? accent : ink.ringOnDark}
                      stroke={current ? accent : primary}
                      strokeWidth={current ? 0 : 3}
                    />
                    {current && <circle cx={p.x} cy={p.y} r={5} fill={ink.ringOnDark} />}
                    <text
                      x={labelX}
                      y={p.y - 32}
                      textAnchor={anchor}
                      fontSize={28}
                      fontWeight={700}
                      fill={ink.strong}
                      style={{ letterSpacing: "-0.015em" }}
                    >
                      {label}
                    </text>
                    {note && (
                      <text
                        x={noteX}
                        y={H - PAD_BOT + 40}
                        textAnchor={anchor}
                        fontSize={18}
                        fill={ink.muted}
                      >
                        {note}
                      </text>
                    )}
                    {current && (
                      <text
                        x={p.x}
                        y={p.y + 44}
                        textAnchor="middle"
                        fontSize={13}
                        fontWeight={700}
                        fill={accent}
                        style={{ letterSpacing: "0.32em", textTransform: "uppercase" }}
                      >
                        You are here
                      </text>
                    )}
                  </g>
                );
              })}
              {/* X-axis kicker */}
              <text
                x={PAD_X}
                y={H - 14}
                fontSize={13}
                letterSpacing="0.32em"
                fill={ink.faint}
                style={{ textTransform: "uppercase", fontWeight: 700 }}
              >
                {s(c.axisLabel, "Program maturity")}
              </text>
            </svg>
          </div>
        </SlideFrame>
      );
    }

    case "MV-JOURNEY-MAP": {
      const items = arr(c.items);
      const n = Math.max(items.length, 2);
      const W = 1600,
        H = 260;
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
                <div
                  key={i}
                  className="pb-5"
                  style={{ borderBottom: `2px solid ${brand.tokens.accent}` }}
                >
                  <div className="flex items-center gap-3">
                    <IconBadge
                      brand={brand}
                      label={s(it.phase)}
                      index={i}
                      size="sm"
                      override={s(it.icon)} sizeToken={s(it.iconSize)}
                      treatment="soft-circle"
                    />
                    <Kicker brand={brand}>Phase {String(i + 1).padStart(2, "0")}</Kicker>
                  </div>
                  <div
                    className="mt-2"
                    style={{
                      fontSize: fillPx(28, "body"),
                      fontWeight: 600,
                      color: ink.strong,
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {s(it.phase)}
                  </div>
                  <div className="mt-2" style={{ fontSize: fillPx(18, "body"), color: ink.muted, lineHeight: 1.4 }}>
                    {s(it.touchpoint)}
                  </div>
                </div>
              ))}
            </div>
            <svg viewBox={`0 0 ${W} ${H + 40}`} className="mt-8 w-full">
              <path d={path} fill="none" stroke={ink.strong} strokeWidth={3} />
              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={11}
                    fill="var(--slide-accent-text)"
                    stroke="#fff"
                    strokeWidth={3}
                  />
                  <text
                    x={p.x}
                    y={p.y - 20}
                    textAnchor="middle"
                    fontSize={18}
                    fontWeight={600}
                    fill={ink.strong}
                  >
                    {String(p.it.sentiment ?? "")}/5
                  </text>
                </g>
              ))}
              <text
                x={20}
                y={20}
                fontSize={14}
                fill={ink.faint}
                style={{ letterSpacing: "0.28em", textTransform: "uppercase" }}
              >
                High
              </text>
              <text
                x={20}
                y={H}
                fontSize={14}
                fill={ink.faint}
                style={{ letterSpacing: "0.28em", textTransform: "uppercase" }}
              >
                Low
              </text>
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
          <div
            className="mt-14 grid"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {items.map((it, i) => {
              const name = s(it.name);
              const initials = name
                .split(/\s+/)
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <div
                  key={i}
                  className="flex aspect-[4/3] items-center justify-center"
                  style={{
                    borderRight: (i + 1) % cols === 0 ? "none" : `1px solid ${ink.divider}`,
                    borderBottom: `1px solid ${ink.divider}`,
                    borderTop: i < cols ? `1px solid ${ink.divider}` : "none",
                    borderLeft: i % cols === 0 ? `1px solid ${ink.divider}` : "none",
                  }}
                >
                  {pickLogoForMode(it, mode) || s(it.logoPath) ? (
                    <ClientLogoImg
                      path={s(it.logoPath)}
                      url={pickLogoForMode(it, mode)}
                      alt={name}
                      className="max-h-16 max-w-[70%] object-contain"
                      style={{ opacity: 0.9 }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div
                        style={{
                          fontSize: fillPx(44, "figure"),
                          fontWeight: 600,
                          color: ink.strong,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {initials || "—"}
                      </div>
                      <div
                        className="uppercase"
                        style={{ fontSize: fillPx(14, "kicker"), letterSpacing: "0.28em", color: ink.faint }}
                      >
                        {name}
                      </div>
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
                    <div
                      key={q}
                      className="flex items-start justify-start p-6"
                      style={{
                        border: `1px solid ${ink.hairline}`,
                        background: isTarget ? `${hexA(brand.tokens.accent, 0.078)}` : "transparent",
                      }}
                    >
                      <div
                        className="uppercase"
                        style={{
                          fontSize: fillPx(16, "body"),
                          letterSpacing: "0.28em",
                          color: isTarget ? "var(--slide-accent-text)" : ink.faint,
                          fontWeight: 600,
                        }}
                      >
                        {quadrants[q] ?? `Q${q + 1}`}
                      </div>
                    </div>
                  );
                })}
              </div>
              {items.map((it, i) => {
                const x = Math.max(0.05, Math.min(0.95, Number(it.x ?? 0.5))) * S;
                const y = (1 - Math.max(0.05, Math.min(0.95, Number(it.y ?? 0.5)))) * S;
                return (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: x, top: y }}
                  >
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{
                        background: brand.tokens.primary,
                        boxShadow: `0 0 0 4px ${brand.tokens.primary}22`,
                      }}
                    />
                    <div
                      className="mt-2 whitespace-nowrap"
                      style={{
                        fontSize: fillPx(18, "body"),
                        fontWeight: 600,
                        color: ink.strong,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {s(it.label)}
                    </div>
                  </div>
                );
              })}
              <div
                className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 uppercase"
                style={{
                  fontSize: fillPx(16, "body"),
                  letterSpacing: "0.28em",
                  color: "var(--slide-accent-text)",
                  fontWeight: 600,
                }}
              >
                {s(c.axisY)}
              </div>
              <div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 uppercase"
                style={{
                  fontSize: fillPx(16, "body"),
                  letterSpacing: "0.28em",
                  color: "var(--slide-accent-text)",
                  fontWeight: 600,
                }}
              >
                {s(c.axisX)}
              </div>
            </div>
            <div className="flex flex-col justify-center gap-6">
              <Kicker brand={brand}>Reading</Kicker>
              <div style={{ fontSize: fillPx(22, "body"), lineHeight: 1.45, color: ink.body }}>
                Position on <b>{s(c.axisX)}</b> and <b>{s(c.axisY)}</b>. The tinted quadrant is
                where the program should live.
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
            <div
              className="grid gap-8"
              style={{
                gridTemplateColumns: `repeat(${Math.max(above.length, 2)}, minmax(0, 1fr))`,
              }}
            >
              {above.map((it, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3">
                    <IconBadge
                      brand={brand}
                      label={s(it.label)}
                      index={i}
                      size="sm"
                      override={s(it.icon)} sizeToken={s(it.iconSize)}
                      treatment="glyph"
                    />
                    <Kicker brand={brand}>Visible</Kicker>
                  </div>
                  <div
                    className="mt-3"
                    style={{
                      fontSize: fillPx(28, "body"),
                      fontWeight: 600,
                      color: ink.strong,
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div className="mt-2" style={{ fontSize: fillPx(20, "body"), lineHeight: 1.42, color: ink.body }}>
                    {s(it.body)}
                  </div>
                </div>
              ))}
            </div>
            <div className="my-10 flex items-center gap-6">
              <div className="h-[2px] flex-1" style={{ background: brand.tokens.accent }} />
              <div
                className="uppercase"
                style={{
                  fontSize: fillPx(18, "body"),
                  letterSpacing: "0.28em",
                  color: "var(--slide-accent-text)",
                  fontWeight: 600,
                }}
              >
                Waterline — {s(c.waterline, "what leadership sees")}
              </div>
              <div className="h-[2px] flex-1" style={{ background: brand.tokens.accent }} />
            </div>
            <div
              className="grid gap-8"
              style={{
                gridTemplateColumns: `repeat(${Math.max(Math.min(below.length, 3), 2)}, minmax(0, 1fr))`,
              }}
            >
              {below.map((it, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden p-6"
                  style={moduleCardTint(brand.tokens.accent, mode)}
                >
                  <AccentTick accent={brand.tokens.accent} />
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className="uppercase"
                      style={{
                        fontSize: fillPx(14, "kicker"),
                        letterSpacing: "0.28em",
                        color: ink.faint,
                        fontWeight: 600,
                      }}
                    >
                      Hidden
                    </div>
                    <IconBadge
                      brand={brand}
                      label={s(it.label)}
                      index={i}
                      size="sm"
                      override={s(it.icon)} sizeToken={s(it.iconSize)}
                      treatment="soft-tile"
                    />
                  </div>
                  <div
                    className="mt-3"
                    style={{
                      fontSize: fillPx(24, "body"),
                      fontWeight: 600,
                      color: ink.strong,
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div className="mt-2" style={{ fontSize: fillPx(18, "body"), lineHeight: 1.42, color: ink.body }}>
                    {s(it.body)}
                  </div>
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
                <StatFigure
                  brand={brand}
                  value={s(c.pullValue, "3×")}
                  unit={s(c.pullUnit)}
                  label={s(c.pullLabel)}
                  size="xl"
                icon={s(c.icon)} iconSize={s(c.iconSize)} />
              </div>
              <MetaRow>
                <span>{s(c.folio)}</span>
              </MetaRow>
            </div>
            <div className="flex h-full flex-col">
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={120}
                thicknessPx={2}
                className="mb-6"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={1080}>
                {s(c.title)}
              </DisplayTitle>
              <div
                className="slide-fill-stretch mt-10 grid items-start gap-12"
                style={{ gridTemplateColumns: "1fr 1px 1fr" }}
              >
                <div
                  style={{
                    fontSize: fillPx(22, "body"),
                    lineHeight: 1.5,
                    color: "color-mix(in oklab, currentColor 78%, transparent)",
                  }}
                >
                  {s(c.bodyLeft)}
                </div>
                <div style={{ background: "rgba(10,15,28,0.15)" }} />
                <div
                  style={{
                    fontSize: fillPx(22, "body"),
                    lineHeight: 1.5,
                    color: "color-mix(in oklab, currentColor 78%, transparent)",
                  }}
                >
                  {s(c.bodyRight)}
                </div>
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
          <div
            className="grid h-full gap-0"
            style={{
              gridTemplateColumns: "40% 1fr",
              margin: "-64px",
              minHeight: "calc(100% + 128px)",
            }}
          >
            <div
              className="relative flex flex-col justify-between overflow-hidden p-16"
              style={{ background: "#03002C", color: "#FFFFFF" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full"
                style={{
                  background: `radial-gradient(circle, ${hexA(brand.tokens.accent, 0.2)}, transparent 70%)`,
                }}
              />
              <Kicker brand={brand} color={ink.strong}>
                {s(c.kicker, "Our belief")}
              </Kicker>
              <div className="relative">
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={96}
                  thicknessPx={2}
                  className="mb-8"
                />
                <DisplayTitle size="section" color={ink.strong}>
                  {s(c.statement)}
                </DisplayTitle>
              </div>
              <MetaRow>
                <span>{s(c.signoff, "TransPerfect")}</span>
              </MetaRow>
            </div>
            <div className="flex flex-col justify-center gap-12 p-16">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="pt-6"
                  style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
                >
                  <div className="flex items-baseline gap-6">
                    <SlideNumeral value={i + 1} sizePx={26} />
                    <div className="flex-1">
                      <div
                        style={{
                          fontSize: fillPx(34, "figure"),
                          fontWeight: 600,
                          color: ink.strong,
                          letterSpacing: "-0.015em",
                          lineHeight: 1.15,
                        }}
                      >
                        {s(it.title)}
                      </div>
                      <div
                        className="mt-2"
                        style={{
                          fontSize: fillPx(22, "body"),
                          lineHeight: 1.42,
                          color: "color-mix(in oklab, currentColor 72%, transparent)",
                        }}
                      >
                        {s(it.body)}
                      </div>
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
          <div
            className="slide-fill-stretch mt-16 grid"
            style={{ gridTemplateColumns: "1fr 1px 1fr 1px 1fr" }}
          >
            {items.map((it, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ background: ink.hairline }} />}
                <div className="flex h-full flex-col justify-between px-10 py-2">
                  <div
                    className="uppercase"
                    style={{
                      fontSize: fillPx(13, "kicker"),
                      letterSpacing: "0.28em",
                      fontWeight: 700,
                      color: "var(--slide-accent-text)",
                    }}
                  >
                    {s(it.label) || `0${i + 1}`}
                  </div>
                  <div
                    className="mt-6 tabular-nums flex items-baseline gap-2"
                    style={{
                      fontSize: fillPx(108, "display"),
                      fontWeight: 600,
                      lineHeight: 0.95,
                      letterSpacing: "-0.04em",
                      color: ink.strong,
                    }}
                  >
                    <span>{s(it.value) || "—"}</span>
                    {s(it.unit) && (
                      <span style={{ fontSize: fillPx(52, "figure"), fontWeight: 500, letterSpacing: "-0.02em" }}>
                        {s(it.unit)}
                      </span>
                    )}
                  </div>
                  {s(it.note) && (
                    <div
                      className="mt-8"
                      style={{ fontSize: fillPx(20, "body"), lineHeight: 1.5, color: ink.muted, maxWidth: 460 }}
                    >
                      {s(it.note)}
                    </div>
                  )}
                  {s(it.source) && (
                    <div
                      className="mt-6 uppercase"
                      style={{
                        fontSize: fillPx(11, "kicker"),
                        letterSpacing: "0.24em",
                        color: ink.faint,
                        fontWeight: 600,
                      }}
                    >
                      {s(it.source)}
                    </div>
                  )}
                </div>
              </React.Fragment>
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
            <div
              className="absolute bottom-2 left-24 top-2 w-[2px]"
              style={{ background: brand.tokens.accent }}
            />
            <div className="flex flex-col gap-10">
              {items.map((it, i) => (
                <div key={i} className="relative">
                  <div
                    className="absolute -left-[38px] top-3 h-4 w-4 rounded-full"
                    style={{ background: "#fff", border: `3px solid ${brand.tokens.accent}` }}
                  />
                  <div
                    className="absolute -left-32 top-1 w-24 pr-4 text-right tabular-nums uppercase"
                    style={{
                      fontSize: fillPx(18, "body"),
                      letterSpacing: "0.24em",
                      color: "var(--slide-accent-text)",
                      fontWeight: 600,
                    }}
                  >
                    {s(it.date)}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: fillPx(30, "figure"),
                        fontWeight: 600,
                        color: ink.strong,
                        letterSpacing: "-0.015em",
                        lineHeight: 1.15,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <div
                      className="mt-2"
                      style={{ fontSize: fillPx(22, "body"), lineHeight: 1.42, color: ink.muted, maxWidth: 1080 }}
                    >
                      {s(it.body)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-COMPARE-VS-LISTS": {
      // Two label lists set head-to-head with a centre VS disc. Panels use the
      // house open-bottom frame + accent seam head; the close line rides in a
      // SummaryBand so it matches every other module surface.
      const left = obj(c.left);
      const right = obj(c.right);
      const summary = obj(c.summary);
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const cool = isDark ? "#7FB3F5" : "#3E7BD1";
      const leftRows = arr(left.items).slice(0, 8);
      const rightRows = arr(right.items).slice(0, 8);
      const rowCount = Math.max(leftRows.length, rightRows.length, 1);
      const rowFont = rowCount > 7 ? 24 : rowCount > 5 ? 26 : 28;
      const rowPad = rowCount > 7 ? 12 : rowCount > 5 ? 16 : 20;

      const VsColumn = ({
        heading,
        rows,
        tone,
        emphasis,
      }: {
        heading: string;
        rows: ReturnType<typeof arr>;
        tone: string;
        emphasis: boolean;
      }) => (
        <div className="flex min-w-0 flex-col">
          <div className="relative pb-4">
            <div
              className="text-center"
              style={{
                fontSize: fillPx(20, "body"),
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: tone,
              }}
            >
              {heading}
            </div>
            <div
              aria-hidden
              data-decorative
              className="mx-auto mt-4"
              style={{
                height: SEAM_HEIGHT_PX,
                width: "62%",
                borderRadius: SEAM_HEIGHT_PX,
                backgroundImage: `linear-gradient(90deg, transparent, ${tone}, transparent)`,
              }}
            />
          </div>
          <div className="relative flex flex-1 flex-col justify-center px-2 pt-5">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ borderRadius: 24, backgroundImage: cardWashGradient(tone) }}
            />
            <div
              aria-hidden
              data-decorative
              className="absolute inset-0"
              style={openBottomFrame(tone, 24)}
            />
            {rows.map((it, i) => {
              const label = s(typeof it === "string" ? it : it.label);
              return (
                <div
                  key={i}
                  className="relative flex items-center gap-5 px-7"
                  style={{
                    paddingTop: rowPad,
                    paddingBottom: rowPad,
                    borderTop:
                      i > 0
                        ? `1px solid color-mix(in oklab, ${tone} 16%, transparent)`
                        : undefined,
                  }}
                >
                  <span
                    aria-hidden
                    className="shrink-0 rounded-full"
                    style={{
                      width: 14,
                      height: 14,
                      backgroundColor: tone,
                      opacity: emphasis ? 1 : 0.85,
                      boxShadow: emphasis
                        ? `0 0 0 4px color-mix(in oklab, ${tone} 18%, transparent)`
                        : undefined,
                    }}
                  />
                  <span
                    className="min-w-0"
                    style={{
                      fontSize: rowFont,
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.15,
                      color: emphasis ? ink.strong : "color-mix(in oklab, currentColor 82%, transparent)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          {s(c.subtitle) && (
            <div
              data-title-subline
              className="mt-3"

              style={{
                fontSize: fillPx(30, "figure"),
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: accent,
              }}
            >
              {s(c.subtitle)}
            </div>
          )}
          <div className="relative mt-8">
            <div
              className="grid items-stretch"
              style={{ gridTemplateColumns: "1fr 170px 1fr", columnGap: 0 }}
            >
              <VsColumn
                heading={s(left.label) || "Option A"}
                rows={leftRows}
                tone={cool}
                emphasis={false}
              />
              <div className="relative flex items-center justify-center">
                <OrbitDisc size={130} accent={accent} cool={cool} isDark={isDark}>
                  <div
                    style={{
                      fontSize: fillPx(34, "figure"),
                      fontWeight: 800,
                      letterSpacing: "0.02em",
                      color: ink.strong,
                      lineHeight: 1,
                    }}
                  >
                    VS
                  </div>
                </OrbitDisc>
              </div>
              <VsColumn
                heading={s(right.label) || "Option B"}
                rows={rightRows}
                tone={accent}
                emphasis
              />
            </div>
            {(s(summary.lead) || s(summary.emphasis)) && (
              <SummaryBand
                lead={s(summary.lead)}
                emphasis={s(summary.emphasis)}
                accent={accent}
                leadTone={ink.strong}
                scale={0.85}
              />
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-COMPARE-SLIDER": {

      const before = obj(c.before);
      const after = obj(c.after);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={92} y={32} size={880} />
          <div className="relative flex h-full flex-col">
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div
              className="slide-fill-stretch relative mt-16 grid items-stretch gap-8"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <GlassTile radius={26} padding="px-12 py-12" intensity={0.65}>
                <div style={{ opacity: 0.72 }}>
                  <div className="mb-6" style={{ height: 2, background: ink.axis, width: 96 }} />
                  <Kicker brand={brand} color={ink.muted}>
                    {s(before.label, "Before")}
                  </Kicker>
                  <div className="mt-8">
                    <StatFigure
                      brand={brand}
                      value={s(before.value)}
                      unit={s(before.unit)}
                      size="lg"
                      valueColor={ink.muted}
                    icon={s(before.icon)} iconSize={s(before.iconSize)} />
                  </div>
                  <div
                    className="mt-6"
                    style={{ fontSize: fillPx(22, "body"), lineHeight: 1.42, color: ink.muted }}
                  >
                    {s(before.body)}
                  </div>
                </div>
              </GlassTile>
              <GlassTile radius={26} padding="px-12 py-12">
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={96}
                  thicknessPx={2}
                  className="mb-6"
                />
                <Kicker brand={brand}>{s(after.label, "After")}</Kicker>
                <div className="mt-8">
                  <StatFigure brand={brand} value={s(after.value)} unit={s(after.unit)} size="xl" icon={s(after.icon)} iconSize={s(after.iconSize)} />
                </div>
                <div className="mt-6" style={{ fontSize: fillPx(24, "body"), lineHeight: 1.42, color: ink.body }}>
                  {s(after.body)}
                </div>
              </GlassTile>
              <div
                aria-hidden
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: "50%" }}
              >
                <div
                  data-accent-glow
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    background: brand.tokens.accent,
                    color: ink.onSurface(brand.tokens.accent),
                    fontSize: fillPx(28, "body"),
                    fontWeight: 600,
                    boxShadow: `0 8px 32px -6px ${brand.tokens.accent}`,
                  }}
                >
                  <FlowArrow
                    size={26}
                    color={ink.onSurface(brand.tokens.accent)}
                    accent={brand.tokens.accent}
                  />
                </div>
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
          <div className="relative flex h-full flex-col justify-between">
            <QuoteMark
              color={"var(--slide-accent-text)"}
              size={520}
              className="absolute -left-6 -top-24"
            />
            <div className="relative">
              <Kicker brand={brand}>Voices</Kicker>
              <div
                className="mt-8 max-w-[1500px]"
                style={{
                  fontSize: fillPx(60, "display"),
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  fontWeight: 600,
                  color: ink.strong,
                }}
              >
                &ldquo;{s(hero.quote)}&rdquo;
              </div>
              <div className="mt-10">
                <Attribution
                  brand={brand}
                  name={s(hero.name)}
                  role={s(hero.role)}
                  org={s(hero.org)}
                />
              </div>
            </div>
          </div>
          <div className="mt-12 grid gap-12" style={{ gridTemplateColumns: "1fr 1px 1fr" }}>
            {items[0] && (
              <div className="pt-6" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <div
                  style={{
                    fontSize: fillPx(26, "body"),
                    lineHeight: 1.35,
                    color: "color-mix(in oklab, currentColor 82%, transparent)",
                  }}
                >
                  &ldquo;{s(items[0].quote)}&rdquo;
                </div>
                <div className="mt-5">
                  <Attribution
                    brand={brand}
                    name={s(items[0].name)}
                    role={s(items[0].role)}
                    org={s(items[0].org)}
                  />
                </div>
              </div>
            )}
            <div style={{ background: `${ink.hairline}` }} />
            {items[1] && (
              <div className="pt-6" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <div
                  style={{
                    fontSize: fillPx(26, "body"),
                    lineHeight: 1.35,
                    color: "color-mix(in oklab, currentColor 82%, transparent)",
                  }}
                >
                  &ldquo;{s(items[1].quote)}&rdquo;
                </div>
                <div className="mt-5">
                  <Attribution
                    brand={brand}
                    name={s(items[1].name)}
                    role={s(items[1].role)}
                    org={s(items[1].org)}
                  />
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
              <DisplayTitle size="section" color={ink.strong}>
                {s(c.term)}
              </DisplayTitle>
            </div>
            <div className="mt-6 flex flex-wrap items-baseline gap-6">
              <span
                className="uppercase"
                style={{ fontSize: fillPx(20, "body"), letterSpacing: "0.28em", color: ink.faint, fontWeight: 500 }}
              >
                {s(c.pronunciation)}
              </span>
              <span style={{ fontSize: fillPx(24, "body"), color: "var(--slide-accent-text)", fontWeight: 600 }}>
                {s(c.partOfSpeech, "n.")}
              </span>
            </div>
            <div
              className="mt-10"
              style={{
                fontSize: fillPx(34, "figure"),
                lineHeight: 1.35,
                color: "color-mix(in oklab, currentColor 85%, transparent)",
                maxWidth: 1400,
              }}
            >
              {s(c.definition)}
            </div>
            {s(c.usage) && (
              <div
                className="mt-12 pt-8"
                style={{ borderTop: "1px solid rgba(10,15,28,0.15)", maxWidth: 1400 }}
              >
                <span
                  className="uppercase mr-4"
                  style={{
                    fontSize: fillPx(14, "kicker"),
                    letterSpacing: "0.28em",
                    color: "var(--slide-accent-text)",
                    fontWeight: 600,
                  }}
                >
                  Usage
                </span>
                <span
                  style={{
                    fontSize: fillPx(24, "body"),
                    lineHeight: 1.45,
                    color: "color-mix(in oklab, currentColor 65%, transparent)",
                  }}
                >
                  {s(c.usage)}
                </span>
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
              <div
                key={i}
                className="relative grid items-center gap-8 py-8"
                style={{
                  gridTemplateColumns: "160px 1fr",
                  borderTop: i === 0 ? `1px solid ${ink.hairline}` : "none",
                  borderBottom: `1px solid ${ink.hairline}`,
                }}
              >
                <div
                  className="tabular-nums font-semibold"
                  style={{
                    fontSize: fillPx(120, "display"),
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                    color: "var(--slide-accent-text)",
                    opacity: 0.18,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: fillPx(40, "figure"),
                      fontWeight: 600,
                      color: ink.strong,
                      letterSpacing: "-0.015em",
                      lineHeight: 1.1,
                    }}
                  >
                    {s(it.statement)}
                  </div>
                  <div
                    className="mt-2"
                    style={{
                      fontSize: fillPx(22, "body"),
                      lineHeight: 1.42,
                      color: "color-mix(in oklab, currentColor 72%, transparent)",
                    }}
                  >
                    {s(it.body)}
                  </div>
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
          <AuroraOrb x={92} y={30} size={880} />
          <div className="relative grid h-full grid-cols-[1fr_1fr] items-center gap-16">
            <div>
              <Kicker brand={brand} color={"var(--slide-accent-text)"}>
                {s(c.kicker, "Three to remember")}
              </Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={120}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <DisplayTitle size="hero" color={ink.strong} maxWidthPx={880}>
                {s(c.title)}
              </DisplayTitle>
            </div>
            <GlassTile radius={28} padding="px-10 py-8">
              {items.map((it, i) => {
                const n = items.length - i;
                return (
                  <div
                    key={i}
                    className="grid items-center gap-8 py-6"
                    style={{
                      gridTemplateColumns: "140px 1fr",
                      borderTop: i === 0 ? "none" : `1px solid ${ink.hairline}`,
                    }}
                  >
                    <div
                      className="tabular-nums font-semibold"
                      style={{
                        fontSize: fillPx(96, "display"),
                        lineHeight: 0.95,
                        letterSpacing: "-0.025em",
                        color: "var(--slide-accent-text)",
                      }}
                    >
                      {n}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: fillPx(32, "figure"),
                          fontWeight: 600,
                          color: ink.strong,
                          letterSpacing: "-0.02em",
                          lineHeight: 1.12,
                        }}
                      >
                        {s(it.statement)}
                      </div>
                      <div
                        className="mt-2"
                        style={{ fontSize: fillPx(20, "body"), lineHeight: 1.42, color: ink.muted }}
                      >
                        {s(it.body)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </GlassTile>
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
              const itemInk = i === 0 ? ink.strong : i === 1 ? ink.muted : ink.faint;
              const labelColor = i === 0 ? "var(--slide-accent-text)" : ink.faint;
              return (
                <div
                  key={i}
                  className="grid gap-12 py-10"
                  style={{
                    gridTemplateColumns: "200px 1fr",
                    borderTop: `1px solid ${ink.hairline}`,
                    borderBottom: i === items.length - 1 ? `1px solid ${ink.hairline}` : "none",
                  }}
                >
                  <div
                    className="uppercase"
                    style={{
                      fontSize: fillPx(20, "body"),
                      letterSpacing: "0.28em",
                      color: labelColor,
                      fontWeight: 600,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: fillPx(44, "figure"),
                        fontWeight: 600,
                        color: itemInk,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.1,
                      }}
                    >
                      {s(it.headline)}
                    </div>
                    <div
                      className="mt-3"
                      style={{
                        fontSize: fillPx(22, "body"),
                        lineHeight: 1.42,
                        color: itemInk,
                        opacity: 0.85,
                        maxWidth: 1200,
                      }}
                    >
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

    // ── Dashboard family ────────────────────────────────────────────────
    case "MV-DASH-SUMMARY": {
      const primary = obj(c.primary);
      const secondary = obj(c.secondary);
      const balance = obj(c.balance);
      const bItems = arr(balance.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div
            className="slide-fill-stretch mt-10 grid"
            style={{
              gridTemplateColumns:
                dash.flow === "bands" || dash.flow === "ribbonBottom" ? "1fr" : dash.columns,
              gap: 56 * dash.gap,
            }}
          >
            <div
              className="flex flex-col justify-center gap-10"
              style={{ order: dash.reverse ? 2 : 1 }}
            >
              <SummaryStatCard
                brand={brand}
                label={s(primary.label)}
                value={s(primary.value)}
                unit={s(primary.unit)}
                series={toNums(primary.series)}
              />
              <SummaryStatCard
                brand={brand}
                label={s(secondary.label)}
                value={s(secondary.value)}
                unit={s(secondary.unit)}
                series={toNums(secondary.series)}
              />
            </div>
            <div style={{ order: dash.reverse ? 1 : 2 }}>
              <Kicker brand={brand}>Balance</Kicker>
              <div className="mt-8">
                <StatFigure
                  brand={brand}
                  value={s(balance.value)}
                  unit={s(balance.unit)}
                  label={s(balance.label)}
                  size="xl"
                icon={s(balance.icon)} iconSize={s(balance.iconSize)} />
              </div>
              <div className="mt-10">
                {bItems.map((it, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between py-5"
                    style={{
                      borderTop: `1px solid ${ink.hairline}`,
                      borderBottom: i === bItems.length - 1 ? `1px solid ${ink.hairline}` : "none",
                    }}
                  >
                    <div
                      className="uppercase"
                      style={{
                        fontSize: fillPx(18, "body"),
                        letterSpacing: "0.24em",
                        color: "color-mix(in oklab, currentColor 60%, transparent)",
                        fontWeight: 600,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: fillPx(32, "figure"),
                        fontWeight: 600,
                        color: ink.strong,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s(it.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-DONUT-TRIO": {
      // Free-form Aurora v2. Each donut is a hairline track ring + accent
      // arc with soft glow. A feathered radial halo blooms BEHIND the donut
      // so it reads as a floating bloom rather than a puck. Center numeral
      // floats with no plate; label/body sit as free text on the aurora.
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div style={{ maxWidth: 900 }}>
            <Kicker brand={brand}>{s(c.kicker, "Portfolio")}</Kicker>
            <div
              className="mt-4"
              style={{
                fontSize: fillPx(52, "figure"),
                fontWeight: 600,
                color: ink.strong,
                letterSpacing: "-0.03em",
                lineHeight: 1.02,
              }}
            >
              {s(c.title, variant.name)}
            </div>
          </div>
          <div
            className="slide-fill-stretch mt-12 grid"
            style={{
              gridTemplateColumns: `repeat(${Math.min(items.length || 1, dash.metricColumns)}, 1fr)`,
              gap: 64 * dash.gap,
            }}
          >
            {items.map((it, i) => (
              <div
                key={i}
                className="flex h-full flex-col items-center justify-evenly gap-3 text-center"
              >
                <DashMetricViz
                  brand={brand}
                  kind={dash.chart}
                  percent={Number(it.value) || 0}
                  size={280}
                  bloom={i === 0}
                  value={s(it.value)}
                  unit={s(it.unit)}
                />
                <div
                  className="mt-8 uppercase"
                  style={{
                    fontSize: fillPx(15, "kicker"),
                    letterSpacing: "0.28em",
                    color: ink.strong,
                    fontWeight: 700,
                  }}
                >
                  {s(it.label)}
                </div>
                <div
                  className="mt-3"
                  style={{ fontSize: fillPx(17, "body"), lineHeight: 1.45, color: ink.muted, maxWidth: 320 }}
                >
                  {s(it.body)}
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-SALES-CHART": {
      // Free-form aurora rebuild — no panel, no card, no border around the
      // chart. Feathered accent gradient fill, gently glowing line, thin
      // confident strokes, generous whitespace. Content (kicker, headline,
      // stat) sits directly on the aurora above and below the chart, on
      // the same left-aligned rail so it reads as one composition.
      const series = arr(c.series).map((p) => ({ label: s(p.label), value: Number(p.value) || 0 }));
      const stat = obj(c.stat);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex items-start justify-between gap-16">
            <div style={{ maxWidth: 780 }}>
              <Kicker brand={brand}>{s(c.kicker, "Trend")}</Kicker>
              <div
                className="mt-4"
                style={{
                  fontSize: fillPx(60, "display"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.02,
                }}
              >
                {s(c.title, variant.name)}
              </div>
              {s(c.headline) && (
                <div
                  className="mt-5"
                  style={{
                    fontSize: fillPx(22, "body"),
                    color: ink.muted,
                    letterSpacing: "-0.005em",
                    lineHeight: 1.45,
                    maxWidth: 680,
                  }}
                >
                  {s(c.headline)}
                </div>
              )}
            </div>
            {s(stat.value) && (
              <div className="flex flex-col items-end text-right" style={{ minWidth: 220 }}>
                <div className="flex items-baseline gap-2">
                  <span
                    className="tabular-nums font-semibold"
                    style={{
                      fontSize: fillPx(104, "display"),
                      lineHeight: 0.9,
                      letterSpacing: "-0.04em",
                      color: ink.strong,
                    }}
                  >
                    {s(stat.value)}
                  </span>
                  {s(stat.unit) && (
                    <span
                      className="font-medium"
                      style={{
                        fontSize: fillPx(36, "figure"),
                        color: "var(--slide-accent-text)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s(stat.unit)}
                    </span>
                  )}
                </div>
                {s(stat.label) && (
                  <div
                    className="mt-3 uppercase"
                    style={{
                      fontSize: fillPx(13, "kicker"),
                      letterSpacing: "0.3em",
                      color: ink.muted,
                      fontWeight: 600,
                      maxWidth: 260,
                    }}
                  >
                    {s(stat.label)}
                  </div>
                )}
                {s(stat.delta) && (
                  <div
                    className="mt-2 uppercase tabular-nums"
                    style={{
                      fontSize: fillPx(14, "kicker"),
                      letterSpacing: "0.24em",
                      color: "var(--slide-accent-text)",
                      fontWeight: 700,
                    }}
                  >
                    ▲ {s(stat.delta)}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="slide-fill-stretch mt-12 flex flex-col justify-center">
            <DashSeriesViz brand={brand} kind={dash.chart} series={series} height={560} />
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-GAUGE-ROW": {
      // Free-form Aurora v2. Each gauge = hairline semicircular track +
      // accent-glowing stroke arc. A feathered halo blooms behind the arc
      // terminus so it reads as an accent bloom, not a puck. Central value
      // and label sit as free text — no plates, no dividers between gauges.
      const items = arr(c.items).slice(0, 5);
      const cols = items.length || 1;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div style={{ maxWidth: 900 }}>
            <Kicker brand={brand}>{s(c.kicker, "Signals")}</Kicker>
            <div
              className="mt-4"
              style={{
                fontSize: fillPx(52, "figure"),
                fontWeight: 600,
                color: ink.strong,
                letterSpacing: "-0.03em",
                lineHeight: 1.02,
              }}
            >
              {s(c.title, variant.name)}
            </div>
          </div>
          <div
            className="slide-fill-stretch mt-10 grid"
            style={{
              gridTemplateColumns:
                dash.flow === "bands" || dash.flow === "quadrant"
                  ? `repeat(${Math.min(cols, dash.metricColumns)}, 1fr)`
                  : `repeat(${cols}, 1fr)`,
              gap: 32 * dash.gap,
            }}
          >
            {items.map((it, i) => (
              <div key={i} className="flex flex-col items-center justify-center">
                <DashMetricViz
                  brand={brand}
                  kind={dash.chart}
                  percent={Number(it.value) || 0}
                  size={240}
                  bloom={i === 0}
                  value={s(it.value)}
                  unit={s(it.unit)}
                />
                <div
                  className="mt-4 uppercase text-center"
                  style={{
                    fontSize: fillPx(14, "kicker"),
                    letterSpacing: "0.26em",
                    color: ink.strong,
                    fontWeight: 700,
                    maxWidth: 220,
                  }}
                >
                  {s(it.label)}
                </div>
                {s(it.body) && (
                  <div
                    className="mt-2 text-center"
                    style={{ fontSize: fillPx(14, "kicker"), lineHeight: 1.4, color: ink.muted, maxWidth: 220 }}
                  >
                    {s(it.body)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-PERFORMANCE": {
      // Free-form Aurora v2 rebuild. Bars sit directly on the aurora — no
      // panel, no axis cage, no gridlines. Feathered accent gradient fill
      // (matches FreeformAreaChart bloom), soft glow + halo on the highlight
      // bar, legend as inline swatch pills on a shared hairline.
      const bars = arr(c.bars).map((b) => ({ label: s(b.label), value: Number(b.value) || 0 }));
      const highlight = s(c.highlight);
      const stat = obj(c.stat);
      const legend = arr(c.legend);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex items-start justify-between gap-16">
            <div style={{ maxWidth: 780 }}>
              <Kicker brand={brand}>{s(c.kicker, "Performance")}</Kicker>
              <div
                className="mt-4"
                style={{
                  fontSize: fillPx(60, "display"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.02,
                }}
              >
                {s(c.title, variant.name)}
              </div>
              {s(c.headline) && (
                <div
                  className="mt-5"
                  style={{
                    fontSize: fillPx(22, "body"),
                    color: ink.muted,
                    letterSpacing: "-0.005em",
                    lineHeight: 1.45,
                    maxWidth: 680,
                  }}
                >
                  {s(c.headline)}
                </div>
              )}
            </div>
            {s(stat.value) && (
              <div className="flex flex-col items-end text-right" style={{ minWidth: 220 }}>
                <div className="flex items-baseline gap-2">
                  <span
                    className="tabular-nums font-semibold"
                    style={{
                      fontSize: fillPx(104, "display"),
                      lineHeight: 0.9,
                      letterSpacing: "-0.04em",
                      color: ink.strong,
                    }}
                  >
                    {s(stat.value)}
                  </span>
                  {s(stat.unit) && (
                    <span
                      className="font-medium"
                      style={{
                        fontSize: fillPx(36, "figure"),
                        color: "var(--slide-accent-text)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s(stat.unit)}
                    </span>
                  )}
                </div>
                {s(stat.label) && (
                  <div
                    className="mt-3 uppercase"
                    style={{
                      fontSize: fillPx(13, "kicker"),
                      letterSpacing: "0.3em",
                      color: ink.muted,
                      fontWeight: 600,
                      maxWidth: 260,
                    }}
                  >
                    {s(stat.label)}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-12">
            <DashSeriesViz
              brand={brand}
              kind={dash.chart}
              series={bars}
              height={520}
              highlight={highlight}
            />
          </div>
          {legend.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-3">
              {legend.map((l, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    data-accent-glow
                    aria-hidden
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      background:
                        i === 0
                          ? "var(--slide-accent-text)"
                          : `color-mix(in oklab, var(--slide-accent-text) ${Math.max(20, 55 - i * 12)}%, transparent)`,
                      boxShadow:
                        i === 0
                          ? "0 0 12px 2px color-mix(in oklab, var(--slide-accent-text) 55%, transparent)"
                          : "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: fillPx(18, "body"),
                      color: ink.strong,
                      fontWeight: 600,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {s(l.label)}
                  </span>
                  {s(l.value) && (
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: fillPx(18, "body"),
                        color: ink.faint,
                        fontWeight: 500,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {s(l.value)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </SlideFrame>
      );
    }

    case "MV-DASH-REPORT-CARDS": {
      // Free-form Aurora v2. No card plate, no border. Two items sit as free
      // typography on the aurora, separated by a single vertical hairline.
      // The first item halos (its numeral carries a radial bloom) so the
      // primary reading dominates. Reuses the MV-KPI-DASHBOARD language.
      const items = arr(c.items).slice(0, 2);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div style={{ maxWidth: 900 }}>
            <Kicker brand={brand}>{s(c.kicker, "Report")}</Kicker>
            <div
              className="mt-4"
              style={{
                fontSize: fillPx(52, "figure"),
                fontWeight: 600,
                color: ink.strong,
                letterSpacing: "-0.03em",
                lineHeight: 1.02,
              }}
            >
              {s(c.title, variant.name)}
            </div>
          </div>
          <div
            className="slide-fill-stretch mt-14 grid items-center"
            style={{
              gridTemplateColumns:
                dash.flow === "bands" || dash.flow === "ribbonBottom" ? "1fr" : "1fr 1px 1fr",
              gap: 80 * dash.gap,
            }}
          >
            {items[0] && <FreeformReportItem brand={brand} item={items[0]} bloom />}
            <div style={{ background: ink.hairline }} />
            {items[1] && <FreeformReportItem brand={brand} item={items[1]} />}
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-GROWTH-COLUMNS": {
      // Free-form Aurora v2. Columns sit on a single hairline baseline that
      // spans the whole slide — no plate, no per-column border, no rounded
      // pill. Feathered multi-stop bloom on every column; the last column
      // gets a radial halo behind it + full-strength bloom + soft glow so
      // the "now" reading carries without any label.
      const items = arr(c.items).slice(0, 5);
      const vals = items.map((it) => Number(it.value) || 0);
      const max = Math.max(1, ...vals);
      // Collision fix: cap chart height and add generous bottom padding so
      // the year row + note text clear the SlideFrame footer with margin.
      const CHART_H = 300;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex items-start justify-between gap-16">
            <div style={{ maxWidth: 780 }}>
              <Kicker brand={brand}>{s(c.kicker, "Trajectory")}</Kicker>
              <div
                className="mt-4"
                style={{
                  fontSize: fillPx(52, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.02,
                }}
              >
                {s(c.title, variant.name)}
              </div>
              {s(c.headline) && (
                <div
                  className="mt-5"
                  style={{
                    fontSize: fillPx(20, "body"),
                    color: ink.muted,
                    letterSpacing: "-0.005em",
                    lineHeight: 1.45,
                    maxWidth: 680,
                  }}
                >
                  {s(c.headline)}
                </div>
              )}
            </div>
          </div>
          <div
            className="mt-10 grid items-end gap-10"
            style={{
              gridTemplateColumns: `repeat(${items.length || 1}, 1fr)`,
              borderBottom: `1px solid ${ink.hairline}`,
              paddingBottom: 0,
              marginBottom: 96,
            }}
          >
            {items.map((it, i) => {
              const v = Number(it.value) || 0;
              const h = Math.max(48, (v / max) * CHART_H);
              const isLast = i === items.length - 1;
              const bloom = isLast
                ? `linear-gradient(180deg,
                    color-mix(in oklab, var(--slide-accent-text) 72%, transparent) 0%,
                    color-mix(in oklab, var(--slide-accent-text) 38%, transparent) 35%,
                    color-mix(in oklab, var(--slide-accent-text) 12%, transparent) 70%,
                    color-mix(in oklab, var(--slide-accent-text) 0%, transparent) 100%)`
                : `linear-gradient(180deg,
                    color-mix(in oklab, var(--slide-accent-text) 30%, transparent) 0%,
                    color-mix(in oklab, var(--slide-accent-text) 14%, transparent) 45%,
                    color-mix(in oklab, var(--slide-accent-text) 4%, transparent) 80%,
                    color-mix(in oklab, var(--slide-accent-text) 0%, transparent) 100%)`;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center justify-end"
                  style={{ position: "relative" }}
                >
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: fillPx(44, "figure"),
                      fontWeight: 600,
                      color: ink.strong,
                      letterSpacing: "-0.025em",
                      lineHeight: 1,
                    }}
                  >
                    {s(it.value)}
                    <span
                      style={{ fontSize: fillPx(22, "body"), color: "var(--slide-accent-text)", marginLeft: 4 }}
                    >
                      {s(it.unit)}
                    </span>
                  </div>
                  <div
                    className="mt-4 w-full"
                    style={{
                      position: "relative",
                      height: h,
                      maxWidth: 220,
                    }}
                  >
                    {/* Feathered column bloom */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: bloom,
                        filter: isLast ? "blur(0.5px)" : "none",
                      }}
                    />
                    {/* Radial halo bloom behind the last column */}
                    {isLast && (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: -40,
                          width: 260,
                          height: 260,
                          transform: "translateX(-50%)",
                          background:
                            "radial-gradient(circle, color-mix(in oklab, var(--slide-accent-text) 40%, transparent) 0%, color-mix(in oklab, var(--slide-accent-text) 12%, transparent) 45%, transparent 75%)",
                          pointerEvents: "none",
                          zIndex: -1,
                        }}
                      />
                    )}
                    {/* Thin accent stroke on the top edge of the last column */}
                    {isLast && (
                      <div
                        data-accent-glow
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: 0,
                          height: 2,
                          background: "var(--slide-accent-text)",
                          boxShadow:
                            "0 0 14px 2px color-mix(in oklab, var(--slide-accent-text) 55%, transparent)",
                        }}
                      />
                    )}
                  </div>
                  <div
                    className="mt-4 uppercase"
                    style={{
                      fontSize: fillPx(13, "kicker"),
                      letterSpacing: "0.26em",
                      color: isLast ? "var(--slide-accent-text)" : ink.faint,
                      fontWeight: 700,
                    }}
                  >
                    {s(it.year)}
                  </div>
                  {s(it.note) && (
                    <div
                      className="mt-1 text-center"
                      style={{ fontSize: fillPx(13, "kicker"), lineHeight: 1.35, color: ink.muted, maxWidth: 200 }}
                    >
                      {s(it.note)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-DASH-BREAKDOWN": {
      // Free-form Aurora v2. Horizontal rows stacked on a single vertical
      // hairline rail on the left. Each row = feathered left-to-right
      // multi-stop accent gradient (no track plate, no rounded pill). Top
      // row is the highlight: halo + accent stroke tip at the value edge.
      const items = arr(c.items).slice(0, 5);
      const rowVals = items.map((it) => Math.max(0, Number(it.percent) || Number(it.value) || 1));
      const max = Math.max(1, ...rowVals);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div style={{ maxWidth: 900 }}>
            <Kicker brand={brand}>{s(c.kicker, "Breakdown")}</Kicker>
            <div
              className="mt-4"
              style={{
                fontSize: fillPx(52, "figure"),
                fontWeight: 600,
                color: ink.strong,
                letterSpacing: "-0.03em",
                lineHeight: 1.02,
              }}
            >
              {s(c.title, variant.name)}
            </div>
          </div>
          <div
            className="slide-fill-stretch mt-12 flex flex-col justify-between"
            style={{ borderLeft: `1px solid ${ink.hairline}`, paddingLeft: 32 }}
          >
            {items.map((it, i) => {
              const v = rowVals[i];
              const widthPct = (v / max) * 100;
              const isTop = i === 0;
              const delta = s(it.delta);
              const negative = delta.trim().startsWith("-");
              return (
                <FreeformBreakdownRow
                  key={i}
                  label={s(it.label, "—")}
                  value={s(it.value, `${v.toFixed(1)}%`)}
                  unit={s(it.unit)}
                  delta={delta}
                  negative={negative}
                  widthPct={widthPct}
                  bloom={isTop}
                />
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
            <div className="flex min-w-0 flex-col justify-center">
              <StatFigure
                brand={brand}
                value={s(stat.value)}
                unit={s(stat.unit)}
                label={s(stat.label)}
                size="xl"
              icon={s(stat.icon)} iconSize={s(stat.iconSize)} />
            </div>
            <div>
              {items.map((it, i) => {
                const pct = Math.max(0, Math.min(100, Number(it.percent) || 0));
                const delta = s(it.delta);
                const negative = delta.trim().startsWith("-");
                return (
                  <div
                    key={i}
                    className="py-5"
                    style={{
                      borderTop: `1px solid ${ink.hairline}`,
                      borderBottom: i === items.length - 1 ? `1px solid ${ink.hairline}` : "none",
                    }}
                  >
                    <div className="flex items-baseline justify-between">
                      <div style={{ fontSize: fillPx(26, "body"), fontWeight: 600, color: ink.strong }}>
                        {s(it.label)}
                      </div>
                      <div
                        className="uppercase"
                        style={{
                          fontSize: fillPx(16, "body"),
                          letterSpacing: "0.24em",
                          fontWeight: 600,
                          color: negative ? "#B42318" : "var(--slide-accent-text)",
                        }}
                      >
                        {delta}
                      </div>
                    </div>
                    <div className="mt-3">
                      <ProgressBar brand={brand} percent={pct} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SlideFrame>
      );
    }

    // ── Typographic statistics family ───────────────────────────────────
    // Numbers are treated as layout: the numeral is the primary shape and the
    // supporting type is positioned in relation to its optical box.

    case "MV-STAT-HERO-NUMBER": {
      const stat = obj(c.stat);
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand}>{s(c.kicker, "The number that matters")}</Kicker>
            <div className="mt-8 grid items-end gap-20" style={{ gridTemplateColumns: "1.35fr 1fr" }}>
              <div className="min-w-0">
                <StatFigure
                  brand={brand}
                  value={s(stat.value, "68")}
                  unit={s(stat.unit, "%")}
                  size="monumental"
                  shape="auto"
                icon={s(stat.icon)} iconSize={s(stat.iconSize)} />
                <div
                  className="mt-8"
                  style={{
                    fontSize: fillPx(40, "figure"),
                    lineHeight: 1.16,
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    color: ink.strong,
                    maxWidth: 900,
                  }}
                >
                  {s(stat.label)}
                </div>
              </div>
              <div className="min-w-0 pb-6">
                {s(c.narrative) && (
                  <SupportingText size="lg" maxWidthPx={640}>
                    <span style={{ color: ink.body }}>{s(c.narrative)}</span>
                  </SupportingText>
                )}
                {items.length > 0 && (
                  <div className="mt-12">
                    {items.map((it, i) => (
                      <div
                        key={i}
                        className="flex items-baseline justify-between py-5"
                        style={{ borderTop: `1px solid ${ink.hairline}` }}
                      >
                        <div
                          className="uppercase"
                          style={{
                            fontSize: fillPx(18, "body"),
                            letterSpacing: "0.24em",
                            fontWeight: 600,
                            color: ink.muted,
                          }}
                        >
                          {s(it.label)}
                        </div>
                        <div
                          className="tabular-nums"
                          style={{
                            fontSize: fillPx(42, "figure"),
                            fontWeight: 600,
                            letterSpacing: "-0.03em",
                            color: ink.strong,
                          }}
                        >
                          {s(it.value)}
                        </div>
                      </div>
                    ))}
                    <div style={{ borderTop: `1px solid ${ink.hairline}` }} />
                  </div>
                )}
                {s(c.source) && (
                  <div
                    className="mt-6 uppercase"
                    style={{ fontSize: fillPx(15, "kicker"), letterSpacing: "0.26em", color: ink.faint }}
                  >
                    Source · {s(c.source)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-STAT-TYPE-WALL": {
      const items = arr(c.items).slice(0, 9);
      const cols = items.length <= 4 ? 2 : 3;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
          <div
            className="mt-10 grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              columnGap: 72,
            }}
          >
            {items.map((it, i) => {
              // Graded sizes give the wall its rhythm — every third figure
              // steps up so the grid never reads as a table of equals.
              const emphasis = i % 3 === 0;
              return (
                <div
                  key={i}
                  className="min-w-0 py-8"
                  style={{ borderTop: `1px solid ${i < cols ? "transparent" : ink.hairline}` }}
                >
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: statPx(emphasis ? 116 : 86, it.value, { budget: 5 }),
                      lineHeight: 0.94,
                      fontWeight: 600,
                      letterSpacing: "-0.04em",
                      color: emphasis ? ink.strong : ink.body,
                      ...STAT_FIT_STYLE,
                    }}
                  >
                    {s(it.value)}
                    {s(it.unit) && (
                      <span
                        className="align-top font-medium"
                        style={{
                          fontSize: emphasis ? 40 : 30,
                          marginLeft: 6,
                          color: "var(--slide-accent-text)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {s(it.unit)}
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-5 uppercase"
                    style={{
                      fontSize: fillPx(17, "body"),
                      letterSpacing: "0.24em",
                      fontWeight: 600,
                      color: ink.muted,
                      lineHeight: 1.3,
                      maxWidth: 380,
                    }}
                  >
                    {s(it.label)}
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-STAT-KPI-RAIL": {
      const items = arr(c.items).slice(0, 5);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
          <div className="slide-fill-stretch mt-14 flex items-stretch">
            {items.map((it, i) => {
              const delta = s(it.delta);
              const negative = delta.trim().startsWith("-");
              return (
                <div
                  key={i}
                  className="slide-fill-center min-w-0 flex-1 px-10 first:pl-0 last:pr-0"
                  style={{ borderLeft: i === 0 ? "none" : `1px solid ${ink.hairline}` }}
                >
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: statPx(104, it.value, { budget: 5 }),
                      lineHeight: 0.94,
                      fontWeight: 600,
                      letterSpacing: "-0.045em",
                      color: ink.strong,
                      ...STAT_FIT_STYLE,
                    }}
                  >
                    {s(it.value)}
                  </div>

                  {s(it.unit) && (
                    <div
                      className="mt-3 font-medium"
                      style={{
                        fontSize: fillPx(26, "body"),
                        letterSpacing: "-0.01em",
                        color: "var(--slide-accent-text)",
                      }}
                    >
                      {s(it.unit)}
                    </div>
                  )}
                  <div
                    className="mt-6"
                    style={{
                      height: 3,
                      width: 64,
                      background: `linear-gradient(90deg, ${hexA(brand.tokens.accent, 1)} 0%, ${hexA(brand.tokens.accent, 0.12)} 100%)`,
                    }}
                  />
                  <div
                    className="mt-6 uppercase"
                    style={{
                      fontSize: fillPx(17, "body"),
                      letterSpacing: "0.24em",
                      fontWeight: 600,
                      color: ink.muted,
                      lineHeight: 1.35,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  {delta && (
                    <div
                      className="mt-4 tabular-nums"
                      style={{
                        fontSize: fillPx(22, "body"),
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: negative ? "#B42318" : "var(--slide-accent-text)",
                      }}
                    >
                      {delta}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-STAT-ORBIT": {
      const stat = obj(c.stat);
      const items = arr(c.items).slice(0, 6);
      const total =
        items.reduce((n, it) => n + (Number(it.value) || 0), 0) || 1;
      // Ring geometry + label placement/wrapping come from the shared layout
      // module (src/lib/orbit-label-layout.ts) so the clipping regression suite
      // measures exactly what this renderer draws.
      const R = ORBIT_R;
      const CX = ORBIT_CX;
      const CY = ORBIT_CY;
      const VB_PAD = ORBIT_VB_PAD;
      const VB_W = ORBIT_VB_W;
      const DISPLAY_W = 780;
      const SVG_SCALE = DISPLAY_W / VB_W;
      const circumference = 2 * Math.PI * R;
      const laidOut = layoutOrbitLabels(
        items.map((it) => ({ label: s(it.label), value: Number(it.value) || 0 })),
      );
      let acc = 0;
      const segs = laidOut.map((lab) => {
        const share = (Number(items[lab.index]?.value) || 0) / total;
        const start = acc;
        acc += share;
        return {
          i: lab.index,
          lines: lab.lines,
          pct: lab.pct,
          dash: share * circumference,
          offset: start * circumference,
          lx: lab.x,
          ly: lab.y,
          lineYs: lab.lineYs,
          fontScale: lab.fontScale,
          anchor: lab.anchor,
        };
      });


      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
          <div className="mt-10 grid items-center gap-16" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="relative flex justify-center">
              <svg
                viewBox={`${-VB_PAD} 0 ${VB_W} 640`}
                style={{ width: DISPLAY_W, maxWidth: "100%", overflow: "visible" }}
              >

                <circle
                  cx={CX}
                  cy={CY}
                  r={R}
                  fill="none"
                  stroke={hexA(brand.tokens.accent, isDark ? 0.16 : 0.1)}
                  strokeWidth={26}
                />
                {segs.map((seg) => (
                  <circle
                    key={seg.i}
                    cx={CX}
                    cy={CY}
                    r={R}
                    fill="none"
                    stroke={hexA(brand.tokens.accent, 1 - seg.i * 0.14)}
                    strokeWidth={26}
                    strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                    strokeDashoffset={-seg.offset}
                    transform={`rotate(-90 ${CX} ${CY})`}
                    strokeLinecap="butt"
                  />
                ))}
                {segs.map((seg) => (
                  <g key={`l${seg.i}`}>
                    <text
                      x={seg.lx}
                      y={seg.ly}
                      textAnchor={seg.anchor}
                      style={{
                        fontSize: fillPx(28, "figure"),
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        fill: ink.strong,
                      }}
                    >
                      {seg.pct}%
                    </text>
                    {seg.lines.map((line, li) => (
                      <text
                        key={li}
                        x={seg.lx}
                        y={seg.lineYs[li] ?? seg.ly + 24}
                        textAnchor={seg.anchor}
                        style={{
                          fontSize: fillPx(Math.round(15 * seg.fontScale), "body"),
                          letterSpacing: "0.14em",
                          fontWeight: 600,
                          fill: ink.muted,
                        }}
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                ))}
              </svg>
              {/* Total sits in the house circle, centred on the ring. */}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <OrbitDisc
                  size={Math.round(300 * SVG_SCALE)}
                  accent={brand.tokens.accent}
                  cool={brand.tokens.primary}
                  isDark={isDark}
                  rings={false}
                >
                  <div
                    className="tabular-nums leading-none"
                    style={{ fontSize: fillPx(Math.round(92 * SVG_SCALE), "display"), fontWeight: 600, letterSpacing: "-0.04em", color: ink.strong }}
                  >
                    {s(stat.value, "24.1")}
                    <span style={{ fontSize: fillPx(Math.round(38 * SVG_SCALE), "figure"), color: ink.muted }}>{s(stat.unit)}</span>
                  </div>
                  <div
                    className="mt-2"
                    style={{
                      fontSize: fillPx(13, "body"),
                      letterSpacing: "0.24em",
                      fontWeight: 600,
                      color: ink.faint,
                    }}
                  >
                    TOTAL
                  </div>
                </OrbitDisc>
              </div>

            </div>

            <div className="min-w-0">
              {s(stat.label) && (
                <div
                  style={{
                    fontSize: fillPx(34, "figure"),
                    lineHeight: 1.2,
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    color: ink.strong,
                    maxWidth: 640,
                  }}
                >
                  {s(stat.label)}
                </div>
              )}
              <div className="mt-10">
                {items.map((it, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between py-4"
                    style={{ borderTop: `1px solid ${ink.hairline}` }}
                  >
                    <div style={{ fontSize: fillPx(24, "body"), fontWeight: 600, color: ink.body }}>
                      {s(it.label)}
                    </div>
                    <div
                      className="tabular-nums"
                      style={{ fontSize: fillPx(30, "figure"), fontWeight: 600, color: ink.strong }}
                    >
                      {Math.round(((Number(it.value) || 0) / total) * 100)}%
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${ink.hairline}` }} />
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-STAT-ACTUAL-TARGET": {
      const beats = [
        { key: "actual", data: obj(c.actual), fallbackLabel: "Actual" },
        { key: "target", data: obj(c.target), fallbackLabel: "Target" },
        { key: "delta", data: obj(c.delta), fallbackLabel: "Delta" },
      ];
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
          <div className="mt-14 flex items-start">
            {beats.map((beat, i) => {
              const isDelta = beat.key === "delta";
              return (
                <Fragment key={beat.key}>
                  {i > 0 && (
                    <div
                      aria-hidden
                      className="flex flex-shrink-0 items-center px-8"
                      style={{ height: 200 }}
                    >
                      <span
                        style={{
                          fontSize: fillPx(64, "display"),
                          fontWeight: 400,
                          color: hexA(brand.tokens.accent, 0.55),
                          lineHeight: 1,
                        }}
                      >
                        →
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      className="uppercase"
                      style={{
                        fontSize: fillPx(18, "body"),
                        letterSpacing: "0.26em",
                        fontWeight: 700,
                        color: isDelta ? "var(--slide-accent-text)" : ink.muted,
                      }}
                    >
                      {beat.fallbackLabel}
                    </div>
                    <div
                      className="mt-6 tabular-nums"
                      style={{
                        fontSize: statPx(isDelta ? 168 : 148, beat.data.value, { budget: 4 }),
                        lineHeight: 0.92,
                        fontWeight: 600,
                        letterSpacing: "-0.05em",
                        color: isDelta ? "var(--slide-accent-text)" : ink.strong,
                        ...STAT_FIT_STYLE,
                      }}
                    >
                      {s(beat.data.value, "—")}
                      {s(beat.data.unit) && (
                        <span
                          className="align-top font-medium"
                          style={{ fontSize: isDelta ? 58 : 50, marginLeft: 6, color: ink.muted }}
                        >
                          {s(beat.data.unit)}
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-8"
                      style={{
                        height: isDelta ? 4 : 2,
                        width: "100%",
                        background: isDelta
                          ? `linear-gradient(90deg, ${hexA(brand.tokens.accent, 1)} 0%, ${hexA(brand.tokens.accent, 0.1)} 100%)`
                          : ink.hairline,
                      }}
                    />
                    <div
                      className="mt-6"
                      style={{
                        fontSize: fillPx(24, "body"),
                        lineHeight: 1.35,
                        color: ink.body,
                        maxWidth: 420,
                      }}
                    >
                      {s(beat.data.label)}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
          {s(c.narrative) && (
            <div className="mt-16">
              <SupportingText size="lg" maxWidthPx={1280}>
                <span style={{ color: ink.body }}>{s(c.narrative)}</span>
              </SupportingText>
            </div>
          )}
        </SlideFrame>
      );
    }

    case "MV-STAT-EDITORIAL-DASH": {
      const items = arr(c.items).slice(0, 4);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex items-end justify-between gap-16">
            <div className="min-w-0">
              <Kicker brand={brand}>{s(c.kicker, "Performance ledger")}</Kicker>
              <DisplayTitle size="section" color={ink.strong} className="mt-5">
                {s(c.title, variant.name)}
              </DisplayTitle>
            </div>
            {s(c.standfirst) && (
              <div
                className="min-w-0 pb-2"
                style={{
                  fontSize: fillPx(24, "body"),
                  lineHeight: 1.42,
                  color: ink.body,
                  maxWidth: 620,
                  fontFamily: EDITORIAL_SERIF,
                }}
              >
                {s(c.standfirst)}
              </div>
            )}
          </div>
          <div
            className="mt-8"
            style={{ height: 3, width: "100%", background: ink.hairlineStrong }}
          />
          <div
            className="mt-2 grid"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))`,
              columnGap: 56,
            }}
          >
            {items.map((it, i) => {
              const vals = (Array.isArray(it.series) ? (it.series as unknown[]) : []).map(
                (v) => Number(v) || 0,
              );
              return (
                <div
                  key={i}
                  className="min-w-0 pt-10"
                  style={{ borderLeft: i === 0 ? "none" : `1px solid ${ink.hairline}`, paddingLeft: i === 0 ? 0 : 40 }}
                >
                  <div
                    className="uppercase"
                    style={{
                      fontSize: fillPx(16, "body"),
                      letterSpacing: "0.26em",
                      fontWeight: 700,
                      color: "var(--slide-accent-text)",
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div
                    className="mt-6 tabular-nums"
                    style={{
                      fontSize: statPx(100, it.value, { budget: 5 }),
                      lineHeight: 0.94,
                      fontWeight: 600,
                      letterSpacing: "-0.045em",
                      color: ink.strong,
                      ...STAT_FIT_STYLE,
                    }}
                  >
                    {s(it.value)}
                  </div>
                  {s(it.unit) && (
                    <div
                      className="mt-3 font-medium"
                      style={{ fontSize: fillPx(24, "body"), color: ink.muted, letterSpacing: "-0.01em" }}
                    >
                      {s(it.unit)}
                    </div>
                  )}
                  {vals.length > 1 && (
                    <div className="mt-8">
                      <Sparkline brand={brand} values={vals} w={360} h={78} />
                    </div>
                  )}
                  {s(it.body) && (
                    <div
                      className="mt-6"
                      style={{
                        fontSize: fillPx(22, "body"),
                        lineHeight: 1.42,
                        color: ink.body,
                        fontFamily: EDITORIAL_SERIF,
                      }}
                    >
                      {s(it.body)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-STAT-MOSAIC": {
      const items = arr(c.items).slice(0, 6);
      const [lead, ...rest] = items;
      // Asymmetry is authored, not random: one dominant figure holds the left
      // two-thirds while satellites step down in weight across an uneven grid.
      const spans = ["span 2", "span 1", "span 1", "span 2", "span 1"];
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
          <div className="mt-10 grid gap-12" style={{ gridTemplateColumns: "1.15fr 1fr" }}>
            <div
              className="min-w-0 p-12"
              style={{ ...moduleCardSurface(brand.tokens.accent, mode), borderRadius: 4 }}
            >
              <AccentTick accent={brand.tokens.accent} />
              <StatFigure
                brand={brand}
                value={s(lead?.value, "68")}
                unit={s(lead?.unit, "%")}
                label={s(lead?.label)}
                size="xl"
                shape="auto"
                progress={(Number(lead?.percent) || 68) / 100}
              icon={s(lead?.icon)} iconSize={s(lead?.iconSize)} />
            </div>
            <div
              className="grid gap-8"
              style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gridAutoRows: "minmax(0, 1fr)" }}
            >
              {rest.map((it, i) => (
                <div
                  key={i}
                  className="relative min-w-0 overflow-hidden p-8"
                  style={{
                    ...moduleCardSurface(brand.tokens.accent, mode),
                    borderRadius: 4,
                    gridColumn: spans[i % spans.length],
                  }}
                >
                  <AccentTick accent={brand.tokens.accent} />
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: statPx(spans[i % spans.length] === "span 2" ? 84 : 64, it.value, {
                        budget: 6,
                      }),
                      lineHeight: 0.94,
                      fontWeight: 600,
                      letterSpacing: "-0.04em",
                      color: ink.strong,
                      ...STAT_FIT_STYLE,
                    }}
                  >
                    {s(it.value)}
                    {s(it.unit) && (
                      <span
                        className="align-top font-medium"
                        style={{ fontSize: fillPx(28, "body"), marginLeft: 4, color: "var(--slide-accent-text)" }}
                      >
                        {s(it.unit)}
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-4 uppercase"
                    style={{
                      fontSize: fillPx(15, "kicker"),
                      letterSpacing: "0.22em",
                      fontWeight: 600,
                      color: ink.muted,
                      lineHeight: 1.3,
                    }}
                  >
                    {s(it.label)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-STAT-IMAGE-TYPE": {
      const stat = obj(c.stat);
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(stat.label, "stat-image-type"))}
            overrideUrl={s(c.mediaUrl)}
            fit={s(c.mediaFit) || undefined}
            focus={s(c.mediaFocus) || undefined}
            zoom={Number(c.mediaZoom) || undefined}
            mediaPath={s(c.mediaPath)}
            className="absolute inset-y-0 right-0 h-full w-[52%] rounded-none"
          />
          <div
            aria-hidden
            className="absolute inset-y-0"
            style={{
              left: "42%",
              width: "22%",
              background: `linear-gradient(90deg, ${brand.tokens.primary} 0%, ${brand.tokens.primary}99 45%, ${brand.tokens.primary}00 100%)`,
            }}
          />
          <div
            aria-hidden
            className="absolute inset-y-0 left-0"
            style={{ width: "44%", background: brand.tokens.primary }}
          />
          <div
            data-on-media
            className="relative flex h-full flex-col justify-center text-white"
            style={{ width: "56%" }}
          >
            <Kicker brand={brand} color="rgba(255,255,255,0.72)">
              {s(c.kicker, "Field evidence")}
            </Kicker>
            <div
              className="mt-6 tabular-nums"
              style={{
                fontSize: fillPx(300, "display"),
                lineHeight: 0.82,
                fontWeight: 700,
                letterSpacing: "-0.05em",
                color: "var(--slide-accent-text)",
              }}
            >
              {s(stat.value, "41")}
              <span style={{ fontSize: fillPx(140, "display"), marginLeft: 8 }}>{s(stat.unit, "%")}</span>
            </div>
            <div
              className="mt-6"
              style={{ fontSize: fillPx(40, "figure"), fontWeight: 500, letterSpacing: "-0.02em", maxWidth: 860 }}
            >
              {s(stat.label)}
            </div>
            {s(c.narrative) && (
              <SupportingText size="md" opacity={0.86} maxWidthPx={780} className="mt-6">
                {s(c.narrative)}
              </SupportingText>
            )}
            {items.length > 0 && (
              <div className="mt-10 flex gap-16">
                {items.map((it, i) => (
                  <div key={i}>
                    <div
                      className="tabular-nums"
                      style={{ fontSize: fillPx(46, "figure"), fontWeight: 600, letterSpacing: "-0.03em" }}
                    >
                      {s(it.value)}
                    </div>
                    <div
                      className="mt-2 uppercase"
                      style={{ fontSize: fillPx(15, "kicker"), letterSpacing: "0.24em", opacity: 0.78 }}
                    >
                      {s(it.label)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SlideFrame>
      );
    }

    // ── Stat + imagery: figures composed with photography ───────────────

    case "MV-STAT-PHOTO-TRIO": {
      const items = arr(c.items).slice(0, 3);
      const cols = Math.max(2, items.length || 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
          <div
            className="mt-10 grid gap-8"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, height: 610 }}
          >
            {items.map((it, i) => (
              <div key={i} className="relative min-w-0 overflow-hidden rounded-[22px]">
                <MediaTile
                  brand={brand}
                  seed={s(it.mediaSeed, s(it.label, `stat-photo-${i}`))}
                  overrideUrl={s(it.mediaUrl)}
                  fit={s(it.mediaFit) || undefined}
                  focus={s(it.mediaFocus) || undefined}
                  mediaPath={s(it.mediaPath)}
                  className="absolute inset-0 h-full w-full rounded-[22px]"
                />
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{
                    background: `linear-gradient(90deg, ${brand.tokens.accent} 0%, ${hexA(brand.tokens.accent, 0)} 85%)`,
                  }}
                />
                <div
                  data-on-media
                  className="relative flex h-full flex-col justify-end p-10 text-white"
                >
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: fillPx(120, "display"),
                      lineHeight: 0.86,
                      fontWeight: 700,
                      letterSpacing: "-0.045em",
                      color: "#FFFFFF",
                    }}
                  >
                    {s(it.value)}
                    {s(it.unit) && (
                      <span
                        className="align-top font-medium"
                        style={{
                          fontSize: fillPx(44, "figure"),
                          marginLeft: 6,
                          color: "var(--slide-accent-text)",
                        }}
                      >
                        {s(it.unit)}
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-5 uppercase"
                    style={{
                      fontSize: fillPx(16, "body"),
                      letterSpacing: "0.22em",
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  {s(it.body) && (
                    <div
                      className="mt-4"
                      style={{ fontSize: fillPx(19, "body"), lineHeight: 1.45, opacity: 0.88, maxWidth: 380 }}
                    >
                      {s(it.body)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-STAT-PHOTO-BAND": {
      const items = arr(c.items).slice(0, 4);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
          {s(c.narrative) && (
            <SupportingText size="md" maxWidthPx={860} className="mt-6">
              {s(c.narrative)}
            </SupportingText>
          )}
          <div
            className="relative mt-10 overflow-hidden rounded-[22px]"
            style={{ height: 470 }}
          >
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(c.title, "stat-photo-band"))}
              overrideUrl={s(c.mediaUrl)}
              fit={s(c.mediaFit) || undefined}
              focus={s(c.mediaFocus) || undefined}
              zoom={Number(c.mediaZoom) || undefined}
              mediaPath={s(c.mediaPath)}
              className="absolute inset-0 h-full w-full rounded-[22px]"
            />
            <div
              data-on-media
              className="relative grid h-full items-end text-white"
              style={{ gridTemplateColumns: `repeat(${Math.max(2, items.length)}, minmax(0, 1fr))` }}
            >
              {items.map((it, i) => (
                <div
                  key={i}
                  className="px-10 pb-12"
                  style={{
                    borderLeft:
                      i === 0 ? undefined : `1px solid ${hexA(brand.tokens.accent, 0.42)}`,
                  }}
                >
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: statPx(96, it.value, { budget: 5 }),
                      lineHeight: 0.94,
                      fontWeight: 700,
                      letterSpacing: "-0.045em",
                      ...STAT_FIT_STYLE,
                    }}
                  >
                    {s(it.value)}
                    {s(it.unit) && (
                      <span
                        className="align-top font-medium"
                        style={{ fontSize: fillPx(36, "figure"), marginLeft: 4, color: "var(--slide-accent-text)" }}
                      >
                        {s(it.unit)}
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-4 uppercase"
                    style={{
                      fontSize: fillPx(15, "kicker"),
                      letterSpacing: "0.22em",
                      fontWeight: 600,
                      opacity: 0.9,
                      lineHeight: 1.3,
                    }}
                  >
                    {s(it.label)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-STAT-PORTRAIT-PROOF": {
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
          <div
            className="mt-10 grid items-stretch gap-14"
            style={{ gridTemplateColumns: "420px 1fr", height: 600 }}
          >
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(c.attribution, "portrait-proof"))}
              overrideUrl={s(c.mediaUrl)}
              fit={s(c.mediaFit) || undefined}
              focus={s(c.mediaFocus) || undefined}
              zoom={Number(c.mediaZoom) || undefined}
              mediaPath={s(c.mediaPath)}
              pool="portrait"
              portrait
              className="h-full w-full rounded-[22px]"
            />
            <div className="flex min-w-0 flex-col justify-start pt-2">
              <div
                style={{
                  fontSize: fillPx(40, "figure"),
                  lineHeight: 1.24,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  color: ink.strong,
                  maxWidth: 820,
                }}
              >
                “{s(c.quote)}”
              </div>
              <div className="mt-8">
                <div style={{ fontSize: fillPx(22, "body"), fontWeight: 600, color: ink.strong }}>
                  {s(c.attribution)}
                </div>
                {s(c.role) && (
                  <div
                    className="mt-2 uppercase"
                    style={{
                      fontSize: fillPx(14, "kicker"),
                      letterSpacing: "0.24em",
                      fontWeight: 600,
                      color: ink.muted,
                    }}
                  >
                    {s(c.role)}
                  </div>
                )}
              </div>
              <AccentRule accent={brand.tokens.accent} cap fade className="mt-8" />
              <div className="mt-8 grid gap-10" style={{ gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))` }}>
                {items.map((it, i) => (
                  <StatFigure
                    key={i}
                    brand={brand}
                    value={s(it.value)}
                    unit={s(it.unit)}
                    label={s(it.label)}
                    size="md"
                  icon={s(it.icon)} iconSize={s(it.iconSize)} />
                ))}
              </div>
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
          <div className="mt-10 grid gap-14" style={{ gridTemplateColumns: "1fr 2.4fr" }}>
            <div>
              <Kicker brand={brand}>{s(c.kicker, "Trend")}</Kicker>
              <div
                className="mt-6"
                style={{
                  fontSize: fillPx(38, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {s(c.headline)}
              </div>
            </div>
            <div
              className="grid items-end gap-4"
              style={{ gridTemplateColumns: `repeat(${items.length || 1}, 1fr)`, minHeight: 520 }}
            >
              {items.map((it, i) => {
                const v = Number(it.value) || 0;
                const h = Math.max(20, (v / max) * 420);
                const isLast = i === items.length - 1;
                return (
                  <div key={i} className="flex flex-col items-center justify-end">
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: isLast ? 26 : 18,
                        fontWeight: 600,
                        color: isLast ? ink.strong : ink.muted,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s(it.value)}
                      <span style={{ fontSize: isLast ? 14 : 11, color: ink.faint, marginLeft: 2 }}>
                        {s(it.unit)}
                      </span>
                    </div>
                    <div
                      className="mt-3 w-full"
                      style={{
                        height: h,
                        background: isLast ? "var(--slide-accent-text)" : ink.surface,
                        maxWidth: 90,
                      }}
                    />
                    <div
                      className="mt-3 uppercase tabular-nums"
                      style={{
                        fontSize: fillPx(12, "kicker"),
                        letterSpacing: "0.22em",
                        color: ink.faint,
                        fontWeight: 600,
                      }}
                    >
                      {s(it.year)}
                    </div>
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
          <div className="mt-16">
            <AxisBarChart
              brand={brand}
              bars={bars}
              height={520}
              highlight={highlight}
              unit={s(c.unit)}
            />
          </div>
          {s(c.legend) && (
            <div className="mt-6 flex items-center gap-4">
              <div style={{ width: 14, height: 14, background: brand.tokens.accent }} />
              <div
                className="uppercase"
                style={{
                  fontSize: fillPx(16, "body"),
                  letterSpacing: "0.24em",
                  color: "color-mix(in oklab, currentColor 65%, transparent)",
                  fontWeight: 600,
                }}
              >
                {s(c.legend)}
              </div>
            </div>
          )}
        </SlideFrame>
      );
    }

    case "MV-GRAPH-CATEGORY-BARS": {
      const items = arr(c.items).map((it) => ({
        label: s(it.label),
        value: Number(it.value) || 0,
        unit: s(it.unit),
      }));
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
                  <div
                    key={i}
                    className="py-5"
                    style={{
                      borderTop:
                        i === 0 ? `2px solid ${brand.tokens.accent}` : `1px solid ${ink.hairline}`,
                      borderBottom: i === items.length - 1 ? `1px solid ${ink.hairline}` : "none",
                    }}
                  >
                    <div className="flex items-baseline justify-between mb-3">
                      <div
                        className="uppercase"
                        style={{
                          fontSize: fillPx(18, "body"),
                          letterSpacing: "0.24em",
                          color: ink.strong,
                          fontWeight: 600,
                        }}
                      >
                        {it.label}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{ fontSize: fillPx(28, "body"), fontWeight: 600, color: ink.strong }}
                      >
                        {it.value}
                        <span
                          style={{ fontSize: fillPx(16, "body"), color: "var(--slide-accent-text)", marginLeft: 4 }}
                        >
                          {it.unit}
                        </span>
                      </div>
                    </div>
                    <div style={{ position: "relative", height: 4, background: ink.surface }}>
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          height: "100%",
                          width: `${pct}%`,
                          background: isTop ? "var(--slide-accent-text)" : ink.strong,
                          opacity: isTop ? 1 : 0.55,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="flex flex-col justify-center pt-8"
              style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
            >
              <StatFigure
                brand={brand}
                value={s(stat.value)}
                unit={s(stat.unit)}
                label={s(stat.label)}
                size="xl"
              icon={s(stat.icon)} iconSize={s(stat.iconSize)} />
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
            <div style={{ background: `${ink.hairline}` }} />
            {items[1] && <DonutBlock brand={brand} item={items[1]} />}
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-RINGS": {
      const items = arr(c.items)
        .slice(0, 4)
        .map((it) => ({ label: s(it.label), value: Number(it.value) || 0, body: s(it.body) }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div
            className="mt-10 grid gap-16 items-center"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <div className="flex items-center justify-center">
              <ConcentricRings brand={brand} items={items} size={520} />
            </div>
            <div>
              {items.map((it, i) => {
                const color = i === 0 ? brand.tokens.accent : brand.tokens.primary;
                const opacity = i === 0 ? 1 : 0.35 + (1 - i / items.length) * 0.5;
                return (
                  <div
                    key={i}
                    className="py-4 flex items-start gap-5"
                    style={{
                      borderTop: `1px solid ${ink.hairline}`,
                      borderBottom: i === items.length - 1 ? `1px solid ${ink.hairline}` : "none",
                    }}
                  >
                    <div
                      style={{ width: 16, height: 16, background: color, opacity, marginTop: 8 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="flex items-baseline justify-between">
                        <div style={{ fontSize: fillPx(22, "body"), fontWeight: 600, color: ink.strong }}>
                          {it.label}
                        </div>
                        <div
                          className="tabular-nums"
                          style={{
                            fontSize: fillPx(22, "body"),
                            fontWeight: 600,
                            color: "var(--slide-accent-text)",
                          }}
                        >
                          {it.value}%
                        </div>
                      </div>
                      <div
                        className="mt-2"
                        style={{
                          fontSize: fillPx(16, "body"),
                          color: "color-mix(in oklab, currentColor 65%, transparent)",
                          lineHeight: 1.4,
                        }}
                      >
                        {it.body}
                      </div>
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
          <div
            className="slide-fill-stretch mt-12 grid gap-10"
            style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            {items.map((it, i) => {
              const done = Number(it.done) || 0;
              const total = Math.max(1, Number(it.total) || 100);
              const pct = Math.min(100, Math.round((done / total) * 100));
              return (
                <div
                  key={i}
                  className="flex flex-col pt-8"
                  style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
                >
                  <div
                    className="uppercase"
                    style={{
                      fontSize: fillPx(16, "body"),
                      letterSpacing: "0.28em",
                      color: "color-mix(in oklab, currentColor 60%, transparent)",
                      fontWeight: 600,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div className="mt-6 flex items-baseline gap-3">
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: fillPx(88, "display"),
                        fontWeight: 600,
                        color: ink.strong,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {pct}%
                    </div>
                    <div style={{ fontSize: fillPx(20, "body"), color: ink.faint }}>of 100%</div>
                  </div>
                  <div className="mt-4 tabular-nums" style={{ fontSize: fillPx(16, "body"), color: ink.faint }}>
                    {done.toLocaleString()} / {total.toLocaleString()}
                  </div>
                  <div className="mt-6">
                    <ProgressBar brand={brand} percent={pct} />
                  </div>
                  <div
                    className="mt-6"
                    style={{ fontSize: fillPx(18, "body"), color: ink.muted, lineHeight: 1.45 }}
                  >
                    {s(it.body)}
                  </div>
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
            <div
              className="mt-4"
              style={{
                fontSize: fillPx(44, "figure"),
                fontWeight: 600,
                color: ink.strong,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                maxWidth: 1500,
              }}
            >
              {s(c.headline, s(c.title))}
            </div>
          </div>
          <div className="mt-12">
            <DecadeAreaChart
              brand={brand}
              series={series}
              height={520}
              calloutLabel={s(callout.year)}
              calloutNote={s(callout.note)}
            />
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-PERCENT-COMPARE": {
      const items = arr(c.items).slice(0, 5);
      // Five rows at the loose rhythm overshot the footer; tighten as rows grow.
      const dense = items.length >= 4;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className={dense ? "mt-10" : "mt-14"}>
            {items.map((it, i) => {
              const cur = Math.max(0, Math.min(100, Number(it.current) || 0));
              const bench = Math.max(0, Math.min(100, Number(it.benchmark) || 0));
              return (
                <div key={i} className={dense ? "py-3" : "py-7"}>

                  <div className="flex items-baseline justify-between gap-8 mb-4">
                    <div
                      style={{
                        fontSize: fillPx(24, "body"),
                        fontWeight: 600,
                        color: ink.strong,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <div className="flex items-baseline gap-10">
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: fillPx(44, "figure"),
                          fontWeight: 600,
                          color: "var(--slide-accent-text)",
                          letterSpacing: "-0.025em",
                        }}
                      >
                        {cur}%
                      </div>
                      <div
                        className="tabular-nums"
                        style={{ fontSize: fillPx(26, "body"), fontWeight: 500, color: ink.faint }}
                      >
                        {bench}%
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <div style={{ position: "relative", height: 6 }}>
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: `color-mix(in oklab, ${brand.tokens.accent} 10%, transparent)`,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          height: "100%",
                          width: `${cur}%`,
                          background: `linear-gradient(90deg, color-mix(in oklab, ${brand.tokens.accent} 55%, transparent), ${brand.tokens.accent})`,
                        }}
                      />
                    </div>
                    <div style={{ position: "relative", height: 3 }}>
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          height: "100%",
                          width: `${bench}%`,
                          background: `color-mix(in oklab, ${brand.tokens.primary} 35%, transparent)`,
                        }}
                      />
                    </div>
                  </div>
                  {s(it.range) && (
                    <div
                      className="mt-3 uppercase"
                      style={{
                        fontSize: fillPx(14, "kicker"),
                        letterSpacing: "0.24em",
                        color: ink.faint,
                        fontWeight: 600,
                      }}
                    >
                      {s(it.range)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-LINE-MULTI": {
      const series = arr(c.series)
        .slice(0, 3)
        .map((p) => ({
          label: s(p.label),
          points: arr(p.points).map((v: unknown) => Number(v) || 0),
        }));
      const xLabels = arr(obj(c.axis).x).map((v: unknown) => String(v));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="mb-6 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
            <Kicker brand={brand}>{s(c.kicker, "Trend")}</Kicker>
            <div
              className="mt-4"
              style={{
                fontSize: fillPx(42, "figure"),
                fontWeight: 600,
                color: ink.strong,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                maxWidth: 1500,
              }}
            >
              {s(c.headline, s(c.title))}
            </div>
          </div>
          <div className="mt-12">
            <LineMultiChart
              brand={brand}
              series={series}
              xLabels={xLabels}
              unit={s(c.unit, "%")}
              height={500}
            />
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-STACKED-BAR": {
      const segments = arr(c.segments).map((sg) => ({ label: s(sg.label) }));
      const columns = arr(c.columns).map((col) => ({
        label: s(col.label),
        values: arr(col.values).map((v: unknown) => Number(v) || 0),
      }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-14">
            <StackedBarChart
              brand={brand}
              segments={segments}
              columns={columns}
              unit={s(c.unit)}
              height={520}
            />
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-AREA-STACK": {
      const series = arr(c.series)
        .slice(0, 4)
        .map((p) => ({
          label: s(p.label),
          points: arr(p.points).map((v: unknown) => Number(v) || 0),
        }));
      const xLabels = arr(obj(c.axis).x).map((v: unknown) => String(v));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="mb-6 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
            <Kicker brand={brand}>{s(c.kicker, "Composition")}</Kicker>
            <div
              className="mt-4"
              style={{
                fontSize: fillPx(42, "figure"),
                fontWeight: 600,
                color: ink.strong,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                maxWidth: 1500,
              }}
            >
              {s(c.headline, s(c.title))}
            </div>
          </div>
          <div className="mt-12">
            <StackedAreaChart
              brand={brand}
              series={series}
              xLabels={xLabels}
              unit={s(c.unit)}
              height={500}
            />
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-WATERFALL": {
      const steps = arr(c.steps).map((st) => ({
        label: s(st.label),
        value: Number(st.value) || 0,
        kind: s(st.kind, "up") as "start" | "up" | "down" | "end",
      }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-14">
            <WaterfallChart brand={brand} steps={steps} unit={s(c.unit)} height={540} />
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-BUBBLE": {
      const axis = obj(c.axis);
      const items = arr(c.items).map((it) => ({
        label: s(it.label),
        x: Number(it.x) || 0,
        y: Number(it.y) || 0,
        size: Number(it.size) || 20,
      }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-14">
            <BubbleChart
              brand={brand}
              items={items}
              axisX={s(axis.x, "X")}
              axisY={s(axis.y, "Y")}
              height={560}
            />
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-HEATMAP": {
      const rows = arr(c.rows).map((v: unknown) => String(v));
      const cols = arr(c.columns).map((v: unknown) => String(v));
      const cells = arr(c.cells).map((row: unknown) =>
        arr(row).map((v: unknown) => Number(v) || 0),
      );
      const scale = obj(c.scale);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          {/* Grid + legend is tall: keep the mandated title clearance, then
              reclaim the height from flatter cells (see HeatmapChart) so the
              legend still lands above the footer band. */}
          <div className="mt-10">

            <HeatmapChart
              brand={brand}
              rows={rows}
              cols={cols}
              cells={cells}
              min={Number(scale.min) || 0}
              max={Number(scale.max) || 100}
            />
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-TREEMAP": {
      const items = arr(c.items).map((it) => ({
        label: s(it.label),
        value: Number(it.value) || 0,
        meta: s(it.meta),
      }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10">
            <Treemap brand={brand} items={items} height={560} />
          </div>
        </SlideFrame>
      );
    }

    case "MV-GRAPH-COMBO": {
      const bars = obj(c.bars);
      const line = obj(c.line);
      const points = arr(c.points).map((p) => ({
        label: s(p.label),
        bar: Number(p.bar) || 0,
        line: Number(p.line) || 0,
      }));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-14">
            <ComboChart
              brand={brand}
              points={points}
              barLabel={s(bars.label, "Volume")}
              barUnit={s(bars.unit)}
              lineLabel={s(line.label, "Rate")}
              lineUnit={s(line.unit, "%")}
              height={540}
            />
          </div>
        </SlideFrame>
      );
    }

    // ── Editorial hero tier ───────────────────────────────────────────────
    case "MV-ED-HERO-BLEED": {
      const _len = s(c.title).length;
      const _size = _len > 70 ? "title" : _len > 40 ? "section" : "cover";
      return (
        // The type stack owns the lower-left of the frame, so the lockup signs
        // off in the clear upper-right corner instead of sitting under the
        // title (LF-05 would otherwise pin it bottom-left).
        <SlideFrame
          brand={brand}
          pageNumber={pageNumber}
          variant="cover"
          logoPosition="top-right"
        >
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.title, "editorial-bleed"))}
            overrideUrl={s(c.mediaUrl)}
            fit={s(c.mediaFit) || undefined}
            focus={s(c.mediaFocus) || undefined}
            zoom={Number(c.mediaZoom) || undefined}
            mediaPath={s(c.mediaPath)}
            className="absolute inset-0 h-full w-full rounded-none"
          />
          <HeroScrim brand={brand} anchor="bottom" />
          {/* Kicker keeps clear of the upper-right lockup. */}
          <div className="absolute inset-x-24 top-24 flex items-start pr-[380px]">
            {s(c.kicker) && (
              <Kicker brand={brand} tracking="0.36em">
                {s(c.kicker)}
              </Kicker>
            )}
          </div>
          {/* Copy stack sits above the locked footer band (bottom 40 + ~28px
              of type) so the title never collides with the meta line or the
              page number. Ink follows the slide mode — the bottom scrim is a
              white wash in light mode, so forcing white text made the title
              vanish. */}
          <div
            data-on-media
            className="absolute inset-x-24 flex flex-col"
            style={{ bottom: 148, color: ink.strong }}
          >
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={120}
              thicknessPx={2}
              className="mb-8"
            />
            <DisplayTitle size={_size} color={ink.strong} maxWidthPx={1500}>
              {s(c.title, "One line. Say it well.")}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText size="lg" opacity={0.85} maxWidthPx={1240} className="mt-6">
                {s(c.subtitle)}
              </SupportingText>
            )}
          </div>
        </SlideFrame>
      );
    }


    case "MV-ED-HERO-ORB": {
      // Two soft aurora orbs behind minimal type. Tokens are palette-locked.
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ background: isDark ? brand.tokens.primary : "#F4F7FD" }}
          >
            <div
              aria-hidden
              className="absolute"
              style={{
                width: 1100,
                height: 1100,
                left: -220,
                top: -260,
                borderRadius: "50%",
                background: `radial-gradient(circle at 30% 30%, ${hexA(brand.tokens.accent, isDark ? 0.8 : 0.34)} 0%, ${hexA(brand.tokens.accent, 0.0)} 60%)`,
                filter: "blur(60px)",
                opacity: isDark ? 0.85 : 0.7,
              }}
            />
            <div
              aria-hidden
              className="absolute"
              style={{
                width: 900,
                height: 900,
                right: -180,
                bottom: -220,
                borderRadius: "50%",
                background: `radial-gradient(circle at 60% 40%, ${hexA(brand.tokens.accent, isDark ? 0.502 : 0.24)} 0%, ${hexA(brand.tokens.accent, 0.0)} 60%)`,
                filter: "blur(80px)",
                opacity: isDark ? 0.75 : 0.6,
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: isDark
                  ? `linear-gradient(180deg, ${brand.tokens.primary}00 0%, ${brand.tokens.primary}66 100%)`
                  : "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.86) 100%)",
              }}
            />
          </div>
          <div className="relative flex h-full flex-col justify-center">
            {s(c.kicker) && (
              <Kicker brand={brand} tracking="0.36em">
                {s(c.kicker)}
              </Kicker>
            )}
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={120}
              thicknessPx={2}
              className="mt-8"
            />
            <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1620} className="mt-10">
              {s(c.title, "Signal through the noise.")}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText size="xl" opacity={0.82} maxWidthPx={1180} className="mt-10">
                {s(c.subtitle)}
              </SupportingText>
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-ED-DIVIDER-XL": {
      const numeral = s(c.numeral, `0${Math.max(1, pageNumber)}`.slice(-2));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="divider">
          <div className="grid h-full grid-cols-[auto_1fr] items-center gap-16">
            <div
              style={{
                fontSize: fillPx(360, "display"),
                lineHeight: 0.85,
                fontWeight: 700,
                letterSpacing: "-0.05em",
                color: "var(--slide-accent-text)",
                opacity: 0.9,
              }}
            >
              {numeral}
            </div>
            <div className="flex flex-col">
              {s(c.kicker) && (
                <Kicker brand={brand} tracking="0.36em">
                  {s(c.kicker, "Chapter")}
                </Kicker>
              )}
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={120}
                thicknessPx={2}
                className="mt-8"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={1080} className="mt-8">
                {s(c.title, "New chapter")}
              </DisplayTitle>
              {s(c.subtitle) && (
                <SupportingText size="lg" opacity={0.78} maxWidthPx={960} className="mt-8">
                  {s(c.subtitle)}
                </SupportingText>
              )}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-ED-KICKER-POSTER": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-between py-4">
            <div
              className="uppercase"
              style={{
                fontSize: fillPx(44, "figure"),
                letterSpacing: "0.42em",
                color: "var(--slide-accent-text)",
                fontWeight: 600,
              }}
            >
              {s(c.kicker, "A briefing")}
            </div>
            <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1720} className="uppercase">
              {s(c.title, "The Signal")}
            </DisplayTitle>
            <div className="flex items-center justify-between">
              <Hairline color={"var(--slide-accent-text)"} widthPx={200} thicknessPx={3} />
              <MetaRow>
                <span>{s(c.meta, "Confidential")}</span>
                <span>№ {String(pageNumber).padStart(2, "0")}</span>
              </MetaRow>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-ED-STAT-PHOTO": {
      return (
        <SlideFrame
          brand={brand}
          pageNumber={pageNumber}
          variant="cover"
          logoPosition="top-right"
        >
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.label, "stat-photo"))}
            overrideUrl={s(c.mediaUrl)}
            fit={s(c.mediaFit) || undefined}
            focus={s(c.mediaFocus) || undefined}
            zoom={Number(c.mediaZoom) || undefined}
            mediaPath={s(c.mediaPath)}
            className="absolute inset-0 h-full w-full rounded-none"
          />
          <HeroScrim brand={brand} anchor="bottom" />
          <div data-on-media className="absolute inset-x-24 bottom-48 flex items-end justify-between gap-16 text-white">
            <div className="flex-shrink-0">
              <div
                style={{
                  fontSize: fillPx(260, "display"),
                  lineHeight: 0.88,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: "var(--slide-accent-text)",
                }}
              >
                {s(c.stat, "97")}
                <span style={{ fontSize: fillPx(130, "display"), marginLeft: 8 }}>{s(c.unit, "%")}</span>
              </div>
              {s(c.label) && (
                <div
                  className="mt-4 uppercase"
                  style={{ fontSize: fillPx(24, "body"), letterSpacing: "0.28em", opacity: 0.85 }}
                >
                  {s(c.label)}
                </div>
              )}
            </div>
            {s(c.narrative) && (
              <SupportingText size="lg" opacity={0.9} maxWidthPx={720} className="pb-4">
                {s(c.narrative)}
              </SupportingText>
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-ED-QUOTE-BLEED": {
      const quote = s(c.quote, "The best interfaces get out of the way.").replace(
        /^["'“”]|["'“”]$/g,
        "",
      );
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.attribution, "quote-bleed"))}
            overrideUrl={s(c.mediaUrl)}
            fit={s(c.mediaFit) || undefined}
            focus={s(c.mediaFocus) || undefined}
            zoom={Number(c.mediaZoom) || undefined}
            mediaPath={s(c.mediaPath)}
            className="absolute inset-0 h-full w-full rounded-none"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${brand.tokens.primary}CC 0%, ${brand.tokens.primary}99 50%, ${brand.tokens.primary}E6 100%)`,
            }}
          />
          <div data-on-media className="relative flex h-full flex-col justify-center text-white">
            <QuoteMark color={"var(--slide-accent-text)"} />
            <div
              className="mt-6"
              style={{
                fontSize: quote.length > 160 ? 64 : quote.length > 100 ? 80 : 104,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                fontWeight: 500,
                maxWidth: 1620,
              }}
            >
              {quote}
            </div>
            <div className="mt-12">
              <Attribution
                brand={brand}
                name={s(c.attribution, "Attributed source")}
                role={s(c.role) || undefined}
              />
            </div>
          </div>
        </SlideFrame>
      );
    }

    // ── Locations (MV-LOC-*) ──────────────────────────────────────────────
    case "MV-LOC-WORLD-PINS":
    case "MV-LOC-WORLD-STATS":
    case "MV-LOC-REGION-FOCUS":
    case "MV-LOC-HUB-SPOKE": {
      return renderLocationsVariant(variant.id, brand, mode, ink, c, pageNumber);
    }

    // Blank canvas base (custom modules): frame + brand chrome only. Canvas
    // blocks supply every element, so nothing is painted here — an optional
    // title is honoured when the author typed one.
    case "MV-CANVAS-BLANK":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          {c.title ? <SlideTitle brand={brand} title={s(c.title, "")} /> : null}
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
// Locations family — MV-LOC-* renderer
// ────────────────────────────────────────────────────────────────────────────
import {
  WorldMap as LocWorldMap,
  getDivisionLocationSet as locGetDivisionSet,
  regionCounts as locRegionCounts,
  REGION_LABELS as LOC_REGION_LABELS,
  formatMetricValue as locFormatMetric,
  type LocationPin as LocPin,
  type LocationMetric as LocMetric,
  type RegionKey as LocRegionKey,
} from "@/lib/location-maps";

function coercePin(raw: Record<string, unknown>, i: number): LocPin | null {
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const region = (raw.region as string)?.toUpperCase();
  const validRegion = ["AMER", "EMEA", "APAC", "LATAM", "MEA"].includes(region)
    ? (region as LocPin["region"])
    : lon < -30
      ? lat > 15
        ? "AMER"
        : "LATAM"
      : lon < 60
        ? lat < 12
          ? "MEA"
          : "EMEA"
        : "APAC";
  const role = raw.role as string as LocPin["role"] | undefined;
  let values: Record<string, number> | undefined;
  if (raw.values && typeof raw.values === "object") {
    values = {};
    for (const [k, v] of Object.entries(raw.values as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n)) values[k] = n;
    }
    if (Object.keys(values).length === 0) values = undefined;
  }
  return {
    id: String(raw.id ?? `pin-${i}`),
    city: String(raw.city ?? "Location"),
    country: (raw.country as string) || undefined,
    region: validRegion,
    lat,
    lon,
    role: role || "office",
    label: (raw.label as string) || undefined,
    values,
  };
}

function coerceMetrics(raw: unknown): LocMetric[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m: Record<string, unknown>): LocMetric | null => {
      if (!m || typeof m !== "object") return null;
      const id = String(m.id ?? "").trim();
      const label = String(m.label ?? "").trim();
      if (!id || !label) return null;
      return {
        id,
        label,
        unit: m.unit ? String(m.unit) : undefined,
        format: (m.format as LocMetric["format"]) || "number",
        precision: Number.isFinite(Number(m.precision)) ? Number(m.precision) : 0,
      };
    })
    .filter((x): x is LocMetric => !!x);
}

// Region-metric row — same shape the KPI/graph modules read from `c.items`
// (MV-DASH-REGION-STATS et al.): { label, value, unit, percent, delta }.
// For location slides we allow an optional `region` code so a row can bind
// to a specific pin region, and we source them from `c.regionMetrics` so we
// don't collide with `c.items` (which is the pin array on MV-LOC-*).
type RegionMetricRow = {
  region?: LocPin["region"];
  label: string;
  value?: string;
  unit?: string;
  percent?: number;
  delta?: string;
};

function readRegionMetrics(c: Record<string, unknown>): RegionMetricRow[] {
  const raw = Array.isArray(c.regionMetrics) ? (c.regionMetrics as unknown[]) : [];
  const REGION_KEYS: LocPin["region"][] = ["AMER", "EMEA", "APAC", "LATAM", "MEA"];
  const out: RegionMetricRow[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    const label = typeof rec.label === "string" ? rec.label.trim() : "";
    if (!label) continue;
    const regionRaw = typeof rec.region === "string" ? rec.region.toUpperCase() : "";
    const region = (REGION_KEYS as string[]).includes(regionRaw)
      ? (regionRaw as LocPin["region"])
      : undefined;
    const percentNum = Number(rec.percent);
    out.push({
      region,
      label,
      value: rec.value != null && rec.value !== "" ? String(rec.value) : undefined,
      unit: typeof rec.unit === "string" && rec.unit ? rec.unit : undefined,
      percent: Number.isFinite(percentNum) ? Math.max(0, Math.min(100, percentNum)) : undefined,
      delta: typeof rec.delta === "string" && rec.delta ? rec.delta : undefined,
    });
  }
  return out;
}

function readHeroStat(
  c: Record<string, unknown>,
): { value: string; unit?: string; label?: string } | null {
  const stat = c.stat;
  if (!stat || typeof stat !== "object") return null;
  const rec = stat as Record<string, unknown>;
  const value = rec.value != null && rec.value !== "" ? String(rec.value) : "";
  if (!value) return null;
  return {
    value,
    unit: typeof rec.unit === "string" && rec.unit ? rec.unit : undefined,
    label: typeof rec.label === "string" && rec.label ? rec.label : undefined,
  };
}

function renderLocationsVariant(
  variantId: string,
  brand: { id: string; tokens: { accent: string; primary: string } } & Record<string, unknown>,
  mode: SlideMode,
  ink: any,
  c: Record<string, unknown>,
  pageNumber?: number,
): React.ReactElement {
  const seeded = locGetDivisionSet(brand.id);
  const rawItems = Array.isArray(c.items) ? (c.items as Record<string, unknown>[]) : [];
  const pins: LocPin[] =
    rawItems.length > 0 ? rawItems.map(coercePin).filter((x): x is LocPin => !!x) : seeded.pins;

  const title = (c.title as string) || seeded.headline;
  const subtitle = (c.subtitle as string) || seeded.subhead || "";
  const narrative = (c.narrative as string) || "";
  const region = ((c.region as string) || "world") as LocRegionKey;
  const accent = brand.tokens.accent;
  const primary = brand.tokens.primary;
  const isDark = mode === "dark";
  const counts = locRegionCounts(pins);
  const totalCities = pins.length;
  const totalRegions = (Object.keys(counts) as LocPin["region"][]).filter(
    (k) => counts[k] > 0,
  ).length;

  // KPI/graph-style region metric fields — same shape MV-DASH-REGION-STATS
  // reads from `c.items` and `c.stat`. We keep MV-LOC-* `c.items` as the pin
  // array and expose the metrics via `c.regionMetrics` + `c.stat`.
  const regionMetrics = readRegionMetrics(c);
  const heroStat = readHeroStat(c);
  const hasRegionMetrics = regionMetrics.length > 0;

  // Compact metric list — mirrors the MV-DASH-REGION-STATS visual grammar
  // (label · delta on top, progress bar below). Renders inside any panel.
  const RegionMetricList = ({
    rows,
    maxRows = 6,
  }: {
    rows: RegionMetricRow[];
    maxRows?: number;
  }) => {
    const shown = rows.slice(0, maxRows);
    return (
      <div>
        {shown.map((it, i) => {
          const pct = typeof it.percent === "number" ? it.percent : 0;
          const delta = it.delta ?? "";
          const negative = delta.trim().startsWith("-");
          return (
            <div
              key={`${it.label}-${i}`}
              className="py-4"
              style={{
                borderTop: `1px solid ${ink.hairline}`,
                borderBottom: i === shown.length - 1 ? `1px solid ${ink.hairline}` : "none",
              }}
            >
              <div className="flex items-baseline justify-between gap-4">
                <div
                  style={{
                    fontSize: fillPx(18, "body"),
                    fontWeight: 600,
                    color: ink.strong,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {it.label}
                </div>
                <div className="flex items-baseline gap-3">
                  {it.value && (
                    <div
                      className="tabular-nums"
                      style={{ fontSize: fillPx(18, "body"), fontWeight: 600, color: ink.strong }}
                    >
                      {it.value}
                      {it.unit && (
                        <span style={{ fontSize: fillPx(12, "kicker"), color: ink.muted, marginLeft: 3 }}>
                          {it.unit}
                        </span>
                      )}
                    </div>
                  )}
                  {delta && (
                    <div
                      className="uppercase tabular-nums"
                      style={{
                        fontSize: fillPx(12, "kicker"),
                        letterSpacing: "0.24em",
                        fontWeight: 700,
                        color: negative ? "#B42318" : "var(--slide-accent-text)",
                      }}
                    >
                      {delta}
                    </div>
                  )}
                </div>
              </div>
              {typeof it.percent === "number" && (
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full"
                  style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(3,0,44,0.08)" }}
                >
                  <div
                    style={{ width: `${pct}%`, height: "100%", background: accent, opacity: 0.8 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Free-form region rail — hairline row of region ticks with a share meter
  // under each so the footprint reads as an infographic, not a count list.
  const RegionRail = () => {
    const keys = Object.keys(LOC_REGION_LABELS) as LocPin["region"][];
    const activeKeys = keys.filter((k) => (counts[k] ?? 0) > 0);
    const railTotal = keys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
    const railMax = Math.max(1, ...keys.map((k) => counts[k] ?? 0));
    return (
      <div className="mt-8 flex items-stretch" style={{ borderTop: `1px solid ${ink.hairline}` }}>
        {keys.map((k, i) => {
          const n = counts[k] ?? 0;
          const active = n > 0;
          const share = railTotal > 0 ? Math.round((n / railTotal) * 100) : 0;
          return (
            <div
              key={k}
              className="flex-1 pt-5 pr-6"
              style={{
                opacity: active ? 1 : 0.32,
                borderLeft: i === 0 ? undefined : `1px solid ${ink.hairline}`,
                paddingLeft: i === 0 ? 0 : 24,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: active ? accent : ink.muted,
                    boxShadow: active ? `0 0 0 3px ${accent}22` : undefined,
                    display: "inline-block",
                  }}
                />
                <div
                  style={{
                    color: active ? "var(--slide-accent-text)" : ink.muted,
                    fontSize: fillPx(11, "kicker"),
                    letterSpacing: "0.28em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {k}
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <div
                  className="tabular-nums"
                  style={{
                    color: ink.strong,
                    fontSize: fillPx(44, "figure"),
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    lineHeight: 0.95,
                  }}
                >
                  {n}
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    color: ink.muted,
                    fontSize: fillPx(12, "kicker"),
                    letterSpacing: "0.16em",
                    fontWeight: 600,
                  }}
                >
                  {share}%
                </div>
              </div>
              <div style={{ color: ink.muted, fontSize: 12.5, marginTop: 2 }}>
                {LOC_REGION_LABELS[k]}
              </div>
              <div
                className="mt-3 h-[3px] overflow-hidden rounded-full"
                style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(3,0,44,0.08)" }}
              >
                <div
                  style={{
                    width: `${Math.round(((counts[k] ?? 0) / railMax) * 100)}%`,
                    height: "100%",
                    background: accent,
                    opacity: active ? 0.9 : 0,
                  }}
                />
              </div>
            </div>
          );
        })}
        {activeKeys.length === 0 && (
          <div className="pt-5" style={{ color: ink.muted, fontSize: fillPx(13, "kicker") }}>
            No regional coverage yet.
          </div>
        )}
      </div>
    );
  };

  // Role legend — tiny key for the pin tiers drawn on the map.
  const RoleLegend = () => {
    const tiers: { key: NonNullable<LocPin["role"]>; label: string; r: number }[] = [
      { key: "HQ", label: "Headquarters", r: 6 },
      { key: "hub", label: "Regional hub", r: 5 },
      { key: "office", label: "Office", r: 3.5 },
      { key: "delivery", label: "Delivery centre", r: 3.5 },
      { key: "partner", label: "Partner", r: 3.5 },
    ];
    const present = tiers.filter((t) => pins.some((p) => (p.role ?? "office") === t.key));
    if (present.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
        {present.map((t) => (
          <div key={t.key} className="flex items-center gap-2">
            <span
              aria-hidden
              style={{
                width: t.r * 2,
                height: t.r * 2,
                borderRadius: 999,
                background: accent,
                border: `1.5px solid ${isDark ? "rgba(255,255,255,0.85)" : "rgba(3,0,44,0.85)"}`,
                display: "inline-block",
              }}
            />
            <span
              style={{
                color: ink.muted,
                fontSize: fillPx(11, "kicker"),
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {t.label}
            </span>
          </div>
        ))}
      </div>
    );
  };


  // Shared header — free-form Aurora v2. Left rail: kicker + 60px title +
  // muted headline. Right rail: hero stat (total cities) + delta-style meta.
  const Header = ({ compact = false }: { compact?: boolean } = {}) => (
    <div className="flex items-start justify-between gap-16">
      <div style={{ maxWidth: 900 }}>
        <Kicker brand={brand as never}>
          {s(c.kicker) || `${totalRegions} regions · global footprint`}
        </Kicker>
        <div
          className="mt-4"
          style={{
            fontSize: compact ? 52 : 60,
            fontWeight: 600,
            color: ink.strong,
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
            maxWidth: 900,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="mt-5"
            style={{
              fontSize: fillPx(22, "body"),
              color: ink.muted,
              letterSpacing: "-0.005em",
              lineHeight: 1.45,
              maxWidth: 780,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end text-right" style={{ minWidth: 220 }}>
        <div className="flex items-baseline gap-2">
          <span
            className="tabular-nums font-semibold"
            style={{ fontSize: fillPx(104, "display"), lineHeight: 0.9, letterSpacing: "-0.04em", color: ink.strong }}
          >
            {heroStat?.value ?? totalCities}
          </span>
          {heroStat?.unit && (
            <span
              className="tabular-nums"
              style={{ fontSize: fillPx(28, "body"), color: ink.muted, fontWeight: 600 }}
            >
              {heroStat.unit}
            </span>
          )}
        </div>
        <div
          className="mt-3 uppercase"
          style={{ fontSize: fillPx(13, "kicker"), letterSpacing: "0.3em", color: ink.muted, fontWeight: 600 }}
        >
          {heroStat?.label ?? "Cities live"}
        </div>
        <div
          className="mt-2 uppercase tabular-nums"
          style={{
            fontSize: fillPx(14, "kicker"),
            letterSpacing: "0.24em",
            color: "var(--slide-accent-text)",
            fontWeight: 700,
          }}
        >
          ● {totalRegions} regions
        </div>
      </div>
    </div>
  );

  if (variantId === "MV-LOC-WORLD-PINS") {
    // Free-form Aurora v2 — halftone map bleeds onto the aurora, framed by
    // corner registration ticks and a role legend. RegionRail sits below.
    const tick = ink.hairline;
    const Corner = ({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) => {
      const v: React.CSSProperties = { position: "absolute", width: 18, height: 18 };
      if (pos === "tl") Object.assign(v, { top: 0, left: 0, borderTop: `1px solid ${tick}`, borderLeft: `1px solid ${tick}` });
      if (pos === "tr") Object.assign(v, { top: 0, right: 0, borderTop: `1px solid ${tick}`, borderRight: `1px solid ${tick}` });
      if (pos === "bl") Object.assign(v, { bottom: 0, left: 0, borderBottom: `1px solid ${tick}`, borderLeft: `1px solid ${tick}` });
      if (pos === "br") Object.assign(v, { bottom: 0, right: 0, borderBottom: `1px solid ${tick}`, borderRight: `1px solid ${tick}` });
      return <span aria-hidden style={v} />;
    };
    return (
      <SlideFrame brand={brand as never} pageNumber={pageNumber}>
        <div className="relative flex h-full flex-col">
          <Header />
          <div className="relative mt-8 flex-1 overflow-hidden">
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
            <div className="absolute inset-0 px-1 py-1">
              <LocWorldMap
                pins={pins}
                region="world"
                mode={mode}
                accent={accent}
                primary={primary}
                showLabels
                ariaLabel={`${title} — world map`}
              />
            </div>
          </div>
          <div className="mt-5">
            <RoleLegend />
          </div>
          <RegionRail />
        </div>
      </SlideFrame>
    );
  }


  if (variantId === "MV-LOC-WORLD-STATS") {
    const metrics = coerceMetrics(c.metrics);
    const activeMetricId = (c.activeMetricId as string) || metrics[0]?.id;
    const activeMetric = metrics.find((m) => m.id === activeMetricId);
    const usingMetric = !!activeMetric;

    // Optional region filter — array of region keys. Empty/missing = all.
    const REGION_KEY_SET: LocPin["region"][] = ["AMER", "EMEA", "APAC", "LATAM", "MEA"];
    const rawFilter = Array.isArray(c.regionFilter) ? (c.regionFilter as unknown[]) : [];
    const filterSet = new Set(
      rawFilter.filter(
        (r): r is LocPin["region"] =>
          typeof r === "string" && REGION_KEY_SET.includes(r as LocPin["region"]),
      ),
    );
    // Optional role exclusions — hide pins whose role is in this list.
    const ROLE_KEY_SET: NonNullable<LocPin["role"]>[] = [
      "HQ",
      "hub",
      "office",
      "delivery",
      "partner",
    ];
    const rawExcludeRoles = Array.isArray(c.excludeRoles) ? (c.excludeRoles as unknown[]) : [];
    const excludeRoleSet = new Set(
      rawExcludeRoles.filter(
        (r): r is NonNullable<LocPin["role"]> =>
          typeof r === "string" && ROLE_KEY_SET.includes(r as NonNullable<LocPin["role"]>),
      ),
    );
    const roleFilterActive = excludeRoleSet.size > 0;
    const regionFilteredPins =
      filterSet.size > 0 && filterSet.size < REGION_KEY_SET.length
        ? pins.filter((p) => filterSet.has(p.region))
        : pins;
    const filteredPins = roleFilterActive
      ? regionFilteredPins.filter(
          (p) => !excludeRoleSet.has((p.role ?? "office") as NonNullable<LocPin["role"]>),
        )
      : regionFilteredPins;
    const filteredCities = filteredPins.length;
    const filteredRegions = (Object.keys(LOC_REGION_LABELS) as LocPin["region"][]).filter((k) =>
      filteredPins.some((p) => p.region === k),
    ).length;
    const filterActive = filteredPins.length !== pins.length;

    // Aggregate active metric per region + global (over filtered pins).
    const metricByRegion: Partial<Record<LocPin["region"], number>> = {};
    let metricTotal = 0;
    let metricCoverage = 0; // pins with a value
    if (usingMetric) {
      for (const p of filteredPins) {
        const v = p.values?.[activeMetric!.id];
        if (Number.isFinite(v)) {
          metricByRegion[p.region] = (metricByRegion[p.region] ?? 0) + (v as number);
          metricTotal += v as number;
          metricCoverage += 1;
        }
      }
    }

    const TOP_N_OPTIONS = [5, 10, 25] as const;
    const rawTopN = Number(c.topN);
    const topN = (TOP_N_OPTIONS as readonly number[]).includes(rawTopN) ? rawTopN : 5;
    const SCALE_MODES = ["absolute", "region-percent", "global-percent"] as const;
    const rawScaleMode = typeof c.scaleMode === "string" ? c.scaleMode : "absolute";
    const scaleMode: (typeof SCALE_MODES)[number] = (SCALE_MODES as readonly string[]).includes(
      rawScaleMode,
    )
      ? (rawScaleMode as (typeof SCALE_MODES)[number])
      : "absolute";
    const topPins = usingMetric
      ? [...filteredPins]
          .filter((p) => Number.isFinite(p.values?.[activeMetric!.id]))
          .sort(
            (a, b) =>
              (b.values![activeMetric!.id] as number) - (a.values![activeMetric!.id] as number),
          )
          .slice(0, topN)
      : [];

    return (
      <SlideFrame brand={brand as never} pageNumber={pageNumber}>
        <div className="relative flex h-full gap-12">
          <div className="flex flex-1 flex-col">
            <Header compact />
            {filterActive && (
              <div
                className="mt-4 flex flex-wrap items-center gap-2"
                style={{
                  color: ink.muted,
                  fontSize: fillPx(11, "kicker"),
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--slide-accent-text)" }}>
                  Region filter
                </span>
                {(Object.keys(LOC_REGION_LABELS) as LocPin["region"][])
                  .filter((k) => filterSet.has(k))
                  .map((k) => <span key={k}>{LOC_REGION_LABELS[k]}</span>)
                  .reduce<React.ReactNode[]>((acc, node, i, arr) => {
                    acc.push(node);
                    if (i < arr.length - 1)
                      acc.push(
                        <span key={`sep-${i}`} style={{ opacity: 0.4 }}>
                          ·
                        </span>,
                      );
                    return acc;
                  }, [])}
              </div>
            )}
            <div
              data-map-export-root="world-stats"
              className="relative mt-8 flex-1 overflow-hidden"
            >
              <LocWorldMap
                pins={filteredPins}
                region="world"
                mode={mode}
                accent={accent}
                primary={primary}
                showLabels={false}
                metric={activeMetric}
                metricId={activeMetric?.id}
                scaleMode={scaleMode}
                ariaLabel={`${title} — world map${activeMetric ? ` visualizing ${activeMetric.label}${scaleMode === "region-percent" ? " (% of region)" : scaleMode === "global-percent" ? " (% of global)" : ""}` : ""}${filterActive ? ` filtered to ${filteredRegions} regions` : ""}`}
              />
              <button
                type="button"
                onClick={(e) => {
                  const root = e.currentTarget.closest(
                    '[data-map-export-root="world-stats"]',
                  ) as HTMLElement | null;
                  if (root)
                    void exportMapNodeAsPng(
                      root,
                      `${(title || "world-stats").toString().toLowerCase().replace(/\s+/g, "-")}.png`,
                      isDark ? "#03002C" : "#ffffff",
                    );
                }}
                aria-label="Export map as PNG"
                className="absolute right-0 top-0 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition hover:scale-[1.03]"
                style={{ color: ink.muted, letterSpacing: "0.24em" }}
              >
                Export PNG ↗
              </button>
            </div>
          </div>
          <div className="flex w-[520px] flex-col justify-end">
            <div className="pl-8" style={{ borderLeft: `1px solid ${ink.hairline}` }}>
              <div className="flex items-baseline justify-between">
                <div
                  style={{
                    color: "var(--slide-accent-text)",
                    fontSize: fillPx(12, "kicker"),
                    letterSpacing: "0.3em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {usingMetric ? activeMetric!.label : "Global footprint"}
                </div>
                {usingMetric && metricCoverage < filteredPins.length && (
                  <div
                    style={{
                      color: ink.muted,
                      fontSize: fillPx(10, "kicker"),
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    {metricCoverage}/{filteredPins.length} pins
                  </div>
                )}
              </div>

              {usingMetric ? (
                <>
                  <div className="mt-4">
                    <div
                      style={{
                        color: ink.strong,
                        fontSize: fillPx(68, "display"),
                        fontWeight: 600,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {locFormatMetric(metricTotal, activeMetric)}
                    </div>
                    <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker"), marginTop: 6 }}>
                      {activeMetric!.label} · {filteredCities} cities across {filteredRegions}{" "}
                      regions{filterActive ? ` (of ${totalCities}/${totalRegions})` : ""}
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    {(Object.keys(LOC_REGION_LABELS) as LocPin["region"][])
                      .filter((k) => filteredPins.some((p) => p.region === k))
                      .map((k) => {
                        const val = metricByRegion[k] ?? 0;
                        const pct = metricTotal > 0 ? Math.round((val / metricTotal) * 100) : 0;
                        return (
                          <div key={k}>
                            <div className="flex items-baseline justify-between">
                              <div
                                style={{
                                  color: ink.strong,
                                  fontSize: fillPx(13, "kicker"),
                                  fontWeight: 600,
                                  letterSpacing: "0.14em",
                                  textTransform: "uppercase",
                                }}
                              >
                                {LOC_REGION_LABELS[k]}
                              </div>
                              <div style={{ color: ink.muted, fontSize: fillPx(12, "kicker") }}>
                                {locFormatMetric(val, activeMetric)} · {pct}%
                              </div>
                            </div>
                            <div
                              className="mt-1 h-1.5 overflow-hidden rounded-full"
                              style={{
                                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(3,0,44,0.08)",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  background: accent,
                                  opacity: 0.8,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {topPins.length > 0 && (
                    <div className="mt-6 border-t pt-4" style={{ borderColor: ink.hairline }}>
                      <div
                        style={{
                          color: ink.muted,
                          fontSize: fillPx(10, "kicker"),
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        Top {topN} locations
                        {roleFilterActive
                          ? ` · excl. ${Array.from(excludeRoleSet).join(", ")}`
                          : ""}
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {topPins.map((p) => {
                          const raw = p.values![activeMetric!.id];
                          let pctForPin: number | null = null;
                          if (scaleMode === "global-percent" && metricTotal > 0) {
                            pctForPin = (raw / metricTotal) * 100;
                          } else if (scaleMode === "region-percent") {
                            const regionSum = metricByRegion[p.region] ?? 0;
                            if (regionSum > 0) pctForPin = (raw / regionSum) * 100;
                          }
                          return (
                            <div key={p.id} className="flex items-baseline justify-between">
                              <div style={{ color: ink.strong, fontSize: fillPx(14, "kicker") }}>
                                {p.label || p.city}
                              </div>
                              <div
                                style={{
                                  color: ink.accentText,
                                  fontSize: fillPx(14, "kicker"),
                                  fontWeight: 600,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {pctForPin != null
                                  ? `${pctForPin.toFixed(1)}%`
                                  : locFormatMetric(raw, activeMetric)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : hasRegionMetrics ? (
                <div className="mt-4">
                  <RegionMetricList rows={regionMetrics} maxRows={6} />
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-y-6">
                  <div>
                    <div
                      style={{
                        color: ink.strong,
                        fontSize: fillPx(56, "display"),
                        fontWeight: 600,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {totalCities}
                    </div>
                    <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker"), marginTop: 6 }}>Cities</div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: ink.strong,
                        fontSize: fillPx(56, "display"),
                        fontWeight: 600,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {totalRegions}
                    </div>
                    <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker"), marginTop: 6 }}>Regions</div>
                  </div>
                  {(Object.keys(LOC_REGION_LABELS) as LocPin["region"][])
                    .filter((k) => counts[k] > 0)
                    .map((k) => (
                      <div key={k}>
                        <div
                          style={{
                            color: ink.strong,
                            fontSize: fillPx(32, "figure"),
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            lineHeight: 1,
                          }}
                        >
                          {counts[k]}
                        </div>
                        <div
                          style={{
                            color: ink.muted,
                            fontSize: fillPx(12, "kicker"),
                            marginTop: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.18em",
                          }}
                        >
                          {LOC_REGION_LABELS[k]}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {narrative && (
                <div
                  className="mt-6 border-t pt-4"
                  style={{
                    borderColor: ink.hairline,
                    color: ink.muted,
                    fontSize: fillPx(15, "kicker"),
                    lineHeight: 1.45,
                  }}
                >
                  {narrative}
                </div>
              )}
            </div>
          </div>
        </div>
      </SlideFrame>
    );
  }

  if (variantId === "MV-LOC-REGION-FOCUS") {
    const regionCount = pins.filter(
      (p) => region === "world" || p.region === region || (region === "MEA" && p.region === "MEA"),
    ).length;
    return (
      <SlideFrame brand={brand as never} pageNumber={pageNumber}>
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-12">
            <Header compact />
            <div className="flex flex-col items-end text-right" style={{ minWidth: 180 }}>
              <span
                className="tabular-nums font-semibold"
                style={{
                  fontSize: fillPx(88, "display"),
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  color: ink.strong,
                }}
              >
                {regionCount}
              </span>
              <div
                className="mt-3 uppercase"
                style={{
                  fontSize: fillPx(12, "kicker"),
                  letterSpacing: "0.3em",
                  color: "var(--slide-accent-text)",
                  fontWeight: 700,
                }}
              >
                {region === "world" ? "Worldwide" : LOC_REGION_LABELS[region as LocPin["region"]]}
              </div>
            </div>
          </div>
          {hasRegionMetrics ? (
            <div className="mt-10 grid flex-1 gap-12" style={{ gridTemplateColumns: "1.55fr 1fr" }}>
              <div className="relative overflow-hidden">
                <LocWorldMap
                  pins={pins}
                  region={region}
                  mode={mode}
                  accent={accent}
                  primary={primary}
                  showLabels
                  ariaLabel={`${title} — ${region === "world" ? "world" : LOC_REGION_LABELS[region as LocPin["region"]]} map`}
                />
              </div>
              <div className="pl-8" style={{ borderLeft: `1px solid ${ink.hairline}` }}>
                <div
                  style={{
                    color: "var(--slide-accent-text)",
                    fontSize: fillPx(12, "kicker"),
                    letterSpacing: "0.3em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Region metrics
                </div>
                <div className="mt-4">
                  <RegionMetricList rows={regionMetrics} maxRows={6} />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative mt-10 flex-1 overflow-hidden">
              <LocWorldMap
                pins={pins}
                region={region}
                mode={mode}
                accent={accent}
                primary={primary}
                showLabels
                ariaLabel={`${title} — ${region === "world" ? "world" : LOC_REGION_LABELS[region as LocPin["region"]]} map`}
              />
            </div>
          )}
          {narrative && (
            <div
              className="mt-8 pt-6"
              style={{
                borderTop: `1px solid ${ink.hairline}`,
                color: ink.muted,
                fontSize: fillPx(18, "body"),
                lineHeight: 1.45,
                maxWidth: 1400,
              }}
            >
              {narrative}
            </div>
          )}
        </div>
      </SlideFrame>
    );
  }

  // MV-LOC-HUB-SPOKE — free-form Aurora v2. Map bleeds onto the aurora, the
  // legend sits on a shared hairline as tiny inline swatch pills.
  return (
    <SlideFrame brand={brand as never} pageNumber={pageNumber}>
      <div className="relative flex h-full flex-col">
        <Header />
        <div className="relative mt-10 flex-1 overflow-hidden">
          <LocWorldMap
            pins={pins}
            region="world"
            mode={mode}
            accent={accent}
            primary={primary}
            showLabels
            showSpokes
            ariaLabel={`${title} — hub and spoke network map`}
          />
        </div>
        {hasRegionMetrics && (
          <div
            className="mt-8 grid gap-8 pt-5"
            style={{
              borderTop: `1px solid ${ink.hairline}`,
              gridTemplateColumns: `repeat(${Math.min(regionMetrics.length, 5)}, minmax(0, 1fr))`,
            }}
          >
            {regionMetrics.slice(0, 5).map((it, i) => {
              const delta = it.delta ?? "";
              const negative = delta.trim().startsWith("-");
              return (
                <div key={`${it.label}-${i}`}>
                  <div
                    className="uppercase"
                    style={{
                      fontSize: fillPx(11, "kicker"),
                      letterSpacing: "0.28em",
                      fontWeight: 700,
                      color: "var(--slide-accent-text)",
                    }}
                  >
                    {it.region ?? it.label}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <div
                      className="tabular-nums"
                      style={{
                        color: ink.strong,
                        fontSize: fillPx(36, "figure"),
                        fontWeight: 600,
                        letterSpacing: "-0.03em",
                        lineHeight: 0.95,
                      }}
                    >
                      {it.value ?? (typeof it.percent === "number" ? `${it.percent}%` : "")}
                    </div>
                    {it.unit && <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker") }}>{it.unit}</div>}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker") }}>{it.label}</div>
                    {delta && (
                      <div
                        className="uppercase tabular-nums"
                        style={{
                          fontSize: fillPx(11, "kicker"),
                          letterSpacing: "0.22em",
                          fontWeight: 700,
                          color: negative ? "#B42318" : "var(--slide-accent-text)",
                        }}
                      >
                        {delta}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div
          className="mt-8 flex items-center gap-10 pt-5"
          style={{
            borderTop: `1px solid ${ink.hairline}`,
            color: ink.muted,
            fontSize: fillPx(14, "kicker"),
            letterSpacing: "0.02em",
          }}
        >
          <span className="inline-flex items-center gap-3">
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                borderRadius: 999,
                background: accent,
                boxShadow: `0 0 18px ${accent}`,
              }}
            />
            <span
              style={{
                color: ink.strong,
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontSize: fillPx(12, "kicker"),
              }}
            >
              HQ / Hub
            </span>
          </span>
          <span className="inline-flex items-center gap-3">
            <span
              style={{
                display: "inline-block",
                width: 9,
                height: 9,
                borderRadius: 999,
                background: accent,
                opacity: 0.75,
              }}
            />
            <span
              style={{
                color: ink.strong,
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontSize: fillPx(12, "kicker"),
              }}
            >
              Delivery office
            </span>
          </span>
          <span className="inline-flex items-center gap-3">
            <span
              style={{
                display: "inline-block",
                width: 28,
                height: 2,
                background: accent,
                opacity: 0.55,
                borderRadius: 2,
              }}
            />
            <span
              style={{
                color: ink.strong,
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontSize: fillPx(12, "kicker"),
              }}
            >
              Follow-the-sun route
            </span>
          </span>
        </div>
      </div>
    </SlideFrame>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// HeroScrim — the single overlay stack that sits on top of a full-bleed
// MediaTile for hero-scale variants (covers, full-bleed, quote-bg). MediaTile
// already applies photo exposure, brand duotone, and grain, so this layer's
// only job is text-anchor legibility:
//   • anchor="bottom" → title sits lower-left; bottom-heavy primary scrim
//     fades to transparent by ~78% up, so the top ~40% of the photo remains
//     visible and the top-center wordmark reads on a small near-black shield
//     rather than a muddy primary wash.
//   • anchor="center" → text sits centered (quote-bg); soft radial vignette
//     from primary at center to transparent at edges + the same top shield.
// A tiny accent glow in the bottom-left signals division re-toning without
// re-doubling MediaTile's duotone.
function HeroScrim({
  brand,
  anchor = "bottom",
}: {
  brand: BrandMode;
  anchor?: "bottom" | "center";
}) {
  const mode = useContext(SlideModeContext);
  const primary = brand.tokens.primary;
  const accent = brand.tokens.accent;
  const isLight = mode === "light";

  // Text-anchor scrim. Light mode uses a near-white wash; dark mode uses the
  // brand primary so titles still land on brand-colored ground.
  const anchorScrim = (() => {
    if (anchor === "center") {
      return isLight
        ? `radial-gradient(130% 100% at 50% 55%, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.58) 42%, rgba(255,255,255,0.18) 90%)`
        : `radial-gradient(130% 100% at 50% 55%, ${primary}D6 0%, ${primary}96 42%, ${primary}30 90%)`;
    }
    // bottom-heavy
    return isLight
      ? `linear-gradient(to top, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.78) 18%, rgba(255,255,255,0.32) 42%, rgba(255,255,255,0.06) 68%, rgba(255,255,255,0) 84%)`
      : `linear-gradient(to top, ${primary}EE 0%, ${primary}D6 14%, ${primary}8C 34%, ${primary}30 58%, rgba(0,0,0,0) 82%)`;
  })();

  // Small wordmark shield — a low, near-black band at the very top so the
  // top-center brand lockup reads crisply without dumping brand color onto
  // the photo. Light mode uses white.
  const wordmarkShield = isLight
    ? `linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.28) 40%, rgba(255,255,255,0) 100%)`
    : `linear-gradient(180deg, rgba(3,0,44,0.62) 0%, rgba(3,0,44,0.22) 45%, rgba(3,0,44,0) 100%)`;

  // Accent glow — a soft brand-accent radial in the corner where the title
  // will sit (bottom-left for anchor=bottom, bottom for center). Signals a
  // brand re-tone on division switch without stacking a second duotone.
  const accentGlow =
    anchor === "center"
      ? `radial-gradient(50% 30% at 50% 100%, ${accent}${isLight ? "22" : "33"} 0%, transparent 70%)`
      : `radial-gradient(55% 42% at 6% 96%, ${accent}${isLight ? "24" : "3A"} 0%, transparent 72%)`;

  return (
    <>
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: anchorScrim }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[18%]"
        style={{ backgroundImage: wordmarkShield }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: accentGlow, mixBlendMode: isLight ? "multiply" : "screen" }}
      />
    </>
  );
}

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

// Fine film-grain overlay — imported from the shared module so non-photo
// backdrops (SlideChrome default grounds) share the same tactile finish
// as MediaTile / HeroScrim without duplicating the SVG data URI.
import { GRAIN_SVG } from "@/components/slide/grain";

// Small helper for client-listing variants — resolves a per-item logo
// through SlideMediaRefreshProvider so the 1-hour client-logos TTL can't
// silently break a shipped deck.
function ClientLogoImg({
  path,
  url,
  alt,
  style,
  className,
}: {
  path?: string;
  url?: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const resolved = useResolvedLogoUrl(path, url);
  if (!resolved) return null;
  // `size-full` first so caller `max-h-*` / `max-w-*` still cap the box.
  // Many client marks are viewBox-only SVGs with no width/height attributes:
  // Chrome gives those no intrinsic size in a shrink-to-fit flex/grid slot, so
  // the image collapses to 0×0 and the wall cell renders empty. An explicit
  // 100% box + object-contain keeps every mark visible and undistorted.
  return (
    <img
      src={resolved}
      alt={alt}
      style={style}
      // `data-logo-tile` lets the Slide Studio map a click on this mark back to
      // the logo cell that produced it (same trick as `data-media-tile`).
      data-logo-tile=""
      className={`size-full object-contain ${className ?? ""}`}
    />
  );


}

/**
 * PlayOverlay — visible tap target rendered on top of a video/poster when
 * autoplay is blocked (mobile Safari, low-power mode, saved-data, or user
 * gesture policy) OR when the tile isn't in an autoplay context. Uses a
 * div with role="button" instead of a real <button> because library cards
 * wrap the whole tile in a parent <button> for the zoom action — a nested
 * <button> triggers a React hydration warning and is invalid HTML.
 */
function PlayOverlay({
  onActivate,
  label = "Play video",
  hint,
}: {
  onActivate: () => void;
  label?: string;
  hint?: string;
}) {
  const activate = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onActivate();
  };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") activate(e);
      }}
      className="group absolute inset-0 z-20 flex cursor-pointer items-center justify-center focus:outline-none"
      data-media-play-overlay="true"
    >
      {/* Radial scrim so the button reads on any imagery */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(closest-side at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0) 75%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-2">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-[#03002C] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.6)] ring-1 ring-white/60 transition-transform duration-150 group-hover:scale-105 group-focus-visible:scale-105">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden fill="currentColor">
            <path d="M5 3.2v15.6c0 .9 1 1.4 1.7.9l12-7.8c.7-.4.7-1.4 0-1.8l-12-7.8C6 1.8 5 2.3 5 3.2z" />
          </svg>
        </span>
        <span data-on-fill className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-md backdrop-blur-sm">
          {hint ?? label}
        </span>
      </div>
    </div>
  );
}

/**
 * VideoHoverControls — floating control bar that appears on hover/focus over
 * a mounted <video>. Play/pause, rewind 10s, forward 10s, mute/unmute.
 * Rendered as role="group" with <div role="button"> children (never a nested
 * <button>) so it stays valid HTML inside library cards' outer <button>.
 */
function VideoHoverControls({
  videoRef,
  initialMuted,
  onUserPause,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  initialMuted: boolean;
  onUserPause?: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  const [status, setStatus] = useState<string>("");
  const [hovered, setHovered] = useState(false);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((msg: string) => {
    setStatus(msg);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(""), 1200);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => {
      setPlaying(!v.paused && !v.ended);
      setMuted(v.muted);
    };
    sync();
    const events = ["play", "pause", "ended", "volumechange", "loadedmetadata"] as const;
    events.forEach((e) => v.addEventListener(e, sync));
    return () => events.forEach((e) => v.removeEventListener(e, sync));
  }, [videoRef]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => undefined);
      announce("Playing");
    } else {
      v.pause();
      onUserPause?.();
      announce("Paused");
    }
  }, [videoRef, onUserPause, announce]);

  const seek = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      const dur = Number.isFinite(v.duration) ? v.duration : 0;
      const next = Math.max(
        0,
        dur > 0 ? Math.min(dur, v.currentTime + delta) : v.currentTime + delta,
      );
      try {
        v.currentTime = next;
      } catch {
        /* seek before ready */
      }
      announce(delta < 0 ? `Rewound ${Math.abs(delta)} seconds` : `Forwarded ${delta} seconds`);
    },
    [videoRef, announce],
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 1;
    announce(v.muted ? "Muted" : "Unmuted");
  }, [videoRef, announce]);

  // Hover tracking on the parent .group so keyboard shortcuts work while
  // hovering (without requiring focus in the controls).
  useEffect(() => {
    const v = videoRef.current;
    const parent = v?.parentElement;
    if (!parent) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    parent.addEventListener("mouseenter", enter);
    parent.addEventListener("mouseleave", leave);
    return () => {
      parent.removeEventListener("mouseenter", enter);
      parent.removeEventListener("mouseleave", leave);
    };
  }, [videoRef]);

  const rootRef = useRef<HTMLDivElement | null>(null);

  // Global keyboard shortcuts. Active only when the user is either hovering
  // the video or has focus inside the controls — never steals keys from
  // inputs/textareas or other videos on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const focusInside = root.contains(document.activeElement);
      if (!hovered && !focusInside) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case " ":
        case "Spacebar":
        case "k":
        case "K":
          e.preventDefault();
          e.stopPropagation();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          e.stopPropagation();
          seek(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          e.stopPropagation();
          seek(5);
          break;
        case "j":
        case "J":
          e.preventDefault();
          e.stopPropagation();
          seek(-10);
          break;
        case "l":
        case "L":
          e.preventDefault();
          e.stopPropagation();
          seek(10);
          break;
        case "m":
        case "M":
          e.preventDefault();
          e.stopPropagation();
          toggleMute();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [hovered, togglePlay, seek, toggleMute]);

  const act = (fn: () => void) => (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    fn();
  };

  const Btn = ({
    label,
    onClick,
    children,
    wide,
    pressed,
    shortcut,
  }: {
    label: string;
    onClick: () => void;
    children: React.ReactNode;
    wide?: boolean;
    pressed?: boolean;
    shortcut?: string;
  }) => (
    <div
      role="button"
      tabIndex={0}
      aria-label={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      title={shortcut ? `${label} — ${shortcut}` : label}
      onClick={act(onClick)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          act(onClick)(e);
        }
      }}
      className={`flex ${wide ? "h-10 w-11" : "h-10 w-10"} cursor-pointer items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
      data-media-hover-control={label}
    >
      {children}
    </div>
  );

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Video controls. Shortcuts: Space to play or pause, arrow keys to seek, M to mute."
      onClick={(e) => e.stopPropagation()}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-2 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-3 pb-3 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
      data-media-controls="hover"
    >
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
      <Btn label="Rewind 10 seconds" shortcut="J" onClick={() => seek(-10)}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M11 17l-5-5 5-5" />
          <path d="M18 17l-5-5 5-5" />
        </svg>
      </Btn>
      <Btn
        label={playing ? "Pause" : "Play"}
        shortcut="Space"
        onClick={togglePlay}
        wide
        pressed={playing}
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M6 4.2v15.6c0 .9 1 1.4 1.7.9l12-7.8c.7-.4.7-1.4 0-1.8l-12-7.8C7 2.8 6 3.3 6 4.2z" />
          </svg>
        )}
      </Btn>
      <Btn label="Forward 10 seconds" shortcut="L" onClick={() => seek(10)}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M13 17l5-5-5-5" />
          <path d="M6 17l5-5-5-5" />
        </svg>
      </Btn>
      <Btn label={muted ? "Unmute" : "Mute"} shortcut="M" onClick={toggleMute} pressed={muted}>
        {muted ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M11 5L6 9H3v6h3l5 4V5z" />
            <path d="M22 9l-6 6" />
            <path d="M16 9l6 6" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M11 5L6 9H3v6h3l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 010 7" />
            <path d="M18.5 5.5a9 9 0 010 13" />
          </svg>
        )}
      </Btn>
    </div>
  );
}

/**
 * Per-preview video playback registry.
 *
 * Isolates state per module preview (keyed by brand + seed + source URL) so
 * switching variants doesn't cross-contaminate, and reopening the lightbox
 * for the same module restores where the user left off. Also enforces a
 * "one video plays at a time" policy: when a video starts, every other
 * registered video is paused — that's what stops the previous variant from
 * continuing to play in the background.
 */
type VideoPlaybackState = { currentTime: number; userStarted: boolean; paused: boolean };
const videoPlaybackStore = new Map<string, VideoPlaybackState>();
const registeredVideos = new Map<HTMLVideoElement, string>();

function pauseAllVideosExcept(active: HTMLVideoElement | null) {
  registeredVideos.forEach((key, v) => {
    if (v === active || v.paused) return;
    try {
      v.pause();
      const s = videoPlaybackStore.get(key) ?? { currentTime: 0, userStarted: false, paused: true };
      videoPlaybackStore.set(key, { ...s, currentTime: v.currentTime, paused: true });
    } catch {
      /* noop */
    }
  });
}

function MediaTile({
  brand,
  seed,
  className,
  portrait,
  pool,
  muted,
  overrideUrl,
  zoom,
  fit,
  focus,


  mediaPath,
  videoUrl,
  videoPosterUrl,
  videoPath,
  videoPosterPath,
  videoAutoplay,
  videoLoop,
  videoMuted,
  videoControls,
}: {
  brand: BrandMode;
  seed: string;
  className?: string;
  portrait?: boolean;
  /** Force a specific imagery pool. `"portrait"` draws from the shared
   *  headshot set so people-centric tiles show real faces, not scenery. */
  pool?: "portrait";
  muted?: boolean;
  overrideUrl?: string;
  /** Scale factor applied to the photo/video inside the tile (1 = cover fit).
   *  Lets curators enlarge (crop in on) an image without changing the cell. */
  zoom?: number;
  /** Basic crop control: `"cover"` (default, fills + crops) or `"contain"`
   *  (letterboxes the whole frame, nothing cropped away). */
  fit?: string;
  /** Focal point as a CSS object-position value ("50% 50%"). Decides which
   *  part of the photo survives the crop, and anchors the zoom. */
  focus?: string;



  /** Storage path in the private `slide-media` bucket for the override
   *  image. Re-signed on load via SlideMediaRefreshProvider. */
  mediaPath?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  /** Storage paths (private bucket). When present the URL is re-signed on
   *  load via SlideMediaRefreshProvider so it survives the 30-day TTL. */
  videoPath?: string;
  videoPosterPath?: string;
  videoAutoplay?: boolean;
  videoLoop?: boolean;
  videoMuted?: boolean;
  videoControls?: boolean;
}) {
  const mode = useContext(SlideModeContext);
  const isThumbnail = useContext(SlideThumbnailContext);
  const forceAutoplay = useContext(SlideForceVideoAutoplayContext);
  const openVideoPreview = useContext(SlideVideoPreviewContext);
  const resolvedVideoUrl = useResolvedVideoUrl(videoPath, videoUrl);
  const resolvedPosterUrl = useResolvedPosterUrl(videoPosterPath, videoPosterUrl);
  const resolvedOverrideUrl = useResolvedImageUrl(mediaPath, overrideUrl);
  const h = hash(seed || brand.id);
  const grayscale = muted ? "grayscale(55%) brightness(0.95)" : undefined;
  // Curated crop: fit decides cover vs contain, focus decides which part of
  // the frame survives (and anchors the zoom), zoom enlarges the photo inside
  // its frame (clipped by the tile's overflow-hidden root) without relayout.
  const focusPos = focus && focus.trim().length > 0 ? focus.trim() : null;
  const containFit = fit === "contain";
  const zoomStyle: React.CSSProperties | null =
    (zoom && zoom !== 1) || focusPos || containFit
      ? {
          ...(containFit ? { objectFit: "contain" as const } : null),
          ...(focusPos ? { objectPosition: focusPos } : null),
          ...(zoom && zoom !== 1
            ? {
                transform: `scale(${Math.max(0.5, Math.min(3, zoom))})`,
                transformOrigin: focusPos ?? "center",
              }
            : null),
        }
      : null;



  // Detect present/share playback context (client-only) so we autoplay
  // video there but not in the editor's slide grid — a wall of autoplaying
  // videos is a perf and attention disaster. Thumbnails always suppress,
  // UNLESS SlideForceVideoAutoplayContext explicitly opts in (library
  // "video demo" cards where playback IS the point).
  const [autoplay, setAutoplay] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const check = () => {
      const cls = document.body.classList;
      setAutoplay(
        forceAutoplay ||
          (!isThumbnail && (cls.contains("present-mode") || cls.contains("share-mode"))),
      );
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [isThumbnail, forceAutoplay]);

  // Per-slide playback settings (defaults preserve current behavior).
  const wantAutoplay = videoAutoplay !== false;
  const wantLoop = videoLoop !== false;
  const wantMuted = videoMuted !== false;
  const wantControls = videoControls === true;
  // Stable per-preview identity: variants, brand modes, and source URLs
  // each get their own bucket so switching variants or reopening the
  // lightbox restores THAT preview's state instead of leaking playhead
  // and userStarted from an unrelated tile.
  const previewKey = `${brand.id}::${seed || "_"}::${resolvedVideoUrl || ""}`;
  const restored = videoPlaybackStore.get(previewKey);
  const [userStarted, setUserStarted] = useState<boolean>(Boolean(restored?.userStarted));
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const shouldPlay = (autoplay && wantAutoplay && !autoplayBlocked) || userStarted;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Register this video in the module-scoped map and, on unmount, snapshot
  // its current position + paused state and hard-pause it so it doesn't
  // keep playing after the tile leaves the DOM (variant switch, lightbox
  // close). Re-mounting the same previewKey restores the snapshot.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !resolvedVideoUrl) return;
    registeredVideos.set(v, previewKey);
    const snap = videoPlaybackStore.get(previewKey);
    if (snap && snap.currentTime > 0) {
      try {
        v.currentTime = snap.currentTime;
      } catch {
        /* seek before ready */
      }
    }
    // In the library grid multiple tiles legitimately autoplay in parallel
    // (forceAutoplay=true). Suppress mutual-exclusion there — otherwise
    // each newly mounted tile pauses its siblings and cascade-aborts them.
    const onPlay = () => {
      if (!forceAutoplay) pauseAllVideosExcept(v);
    };
    const onPause = () => {
      const s = videoPlaybackStore.get(previewKey) ?? {
        currentTime: 0,
        userStarted: false,
        paused: true,
      };
      videoPlaybackStore.set(previewKey, { ...s, currentTime: v.currentTime, paused: true });
    };
    const onTime = () => {
      const s = videoPlaybackStore.get(previewKey) ?? {
        currentTime: 0,
        userStarted: false,
        paused: !shouldPlay,
      };
      // Coalesce writes: only persist ~4× per second worth of drift.
      if (Math.abs(v.currentTime - s.currentTime) > 0.25) {
        videoPlaybackStore.set(previewKey, { ...s, currentTime: v.currentTime });
      }
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    return () => {
      try {
        videoPlaybackStore.set(previewKey, {
          currentTime: v.currentTime,
          userStarted,
          paused: true,
        });
        v.pause();
      } catch {
        /* noop */
      }
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      registeredVideos.delete(v);
    };
  }, [previewKey, resolvedVideoUrl, userStarted, shouldPlay]);

  // Persist userStarted so reopening the same preview key resumes.
  useEffect(() => {
    if (!resolvedVideoUrl) return;
    const s = videoPlaybackStore.get(previewKey) ?? {
      currentTime: 0,
      userStarted: false,
      paused: true,
    };
    videoPlaybackStore.set(previewKey, { ...s, userStarted });
  }, [previewKey, userStarted, resolvedVideoUrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !shouldPlay) return;
    if (!forceAutoplay) pauseAllVideosExcept(v);
    const p = v.play();
    if (p && typeof (p as Promise<void>).catch === "function") {
      (p as Promise<void>).catch(() => {
        if (!wantMuted) {
          v.muted = true;
          v.play().catch(() => setAutoplayBlocked(true));
        } else {
          setAutoplayBlocked(true);
        }
      });
    }
  }, [shouldPlay, wantMuted, resolvedVideoUrl]);

  const divSet = getDivisionImagery(brand.id);
  // A tile positioned absolutely is a *backing* layer: sibling copy is drawn on
  // top of the photo. Mark the parent so the light-mode ink rules (styles.css)
  // and the contrast auto-fix (lib/wcag.ts) keep that copy white instead of
  // swapping it to navy, where it disappears into the image.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isBacking = /\b(absolute|fixed)\b/.test(className ?? "");
  useEffect(() => {
    if (!isBacking) return;
    const parent = rootRef.current?.parentElement as HTMLElement | null;
    if (!parent) return;
    const had = parent.dataset.mediaBacking === "true";
    parent.dataset.mediaBacking = "true";
    return () => {
      if (!had) delete parent.dataset.mediaBacking;
    };
  }, [isBacking]);
  // Both modes draw from the SAME photographic pool so a module shows the
  // identical frame whether it is viewed light or dark — only the scrim and
  // ink treatment change. (Previously dark mode fell back to the dusk /
  // abstract set, which made the two versions of a slide look unrelated.)
  const tileBackdrops =
    pool === "portrait"
      ? HEADSHOTS
      : divSet.light && divSet.light.length > 0
        ? [...divSet.light, ...divSet.photos]
        : [...divSet.photos, ...divSet.abstracts];
  const url =
    resolvedPosterUrl && resolvedPosterUrl.length > 0
      ? resolvedPosterUrl
      : resolvedOverrideUrl && resolvedOverrideUrl.length > 0
        ? resolvedOverrideUrl
        : tileBackdrops[h % tileBackdrops.length];
  const hasVideo = Boolean(resolvedVideoUrl && resolvedVideoUrl.length > 0);
  const accent = brand.tokens.accent;
  const primary = brand.tokens.primary;
  // Rotate scrim direction deterministically so a wall of image tiles never
  // reads as one repeated composition.
  const scrimAngle = [180, 200, 165, 190][h % 4]; // ~bottom-heavy variance

  // ── Light mode ────────────────────────────────────────────────────────
  // Bright, airy photographic backdrop. Directional scrim keeps overlaid
  // text legible; brand-accent duotone tints imagery so a division swap
  // visibly re-tones the tile, not just the chrome.
  if (mode === "light") {
    return (
      <div
        ref={rootRef}
        data-media-tile="true"
        // Default corner radius matches the bento cell radius (MEDIA_RADIUS_PX),
        // so a photo plate and a content tile read as the same surface family.
        // Callers can still override with rounded-none for full-bleed media.
        className={`group ${/\b(absolute|fixed)\b/.test(className ?? "") ? "" : "relative"} overflow-hidden rounded-[22px] ${className ?? ""}`}
        style={{ background: "#EEF2F8", filter: grayscale }}
      >
        {hasVideo && shouldPlay ? (
          <video
            ref={videoRef}
            key={resolvedVideoUrl}
            src={resolvedVideoUrl}
            poster={resolvedPosterUrl || undefined}
            autoPlay
            muted={wantMuted}
            loop={wantLoop}
            controls={wantControls}
            playsInline
            preload="auto"
            aria-hidden={!wantControls}
            data-media-ready="true"
            data-media-kind="video"
            className="absolute inset-0 block h-full w-full object-cover"
            style={{ filter: "brightness(1.02) saturate(0.95) contrast(1.02)", ...zoomStyle }}
          />
        ) : (
          <img
            src={url}
            alt=""
            aria-hidden
            data-media-ready={url ? "true" : "false"}
            data-media-kind={hasVideo ? "video-poster" : "image"}
            className="absolute inset-0 block h-full w-full object-cover"
            style={{ filter: "brightness(1.06) saturate(0.92) contrast(1.02)", ...zoomStyle }}
          />
        )}
        {hasVideo &&
          !shouldPlay &&
          (autoplay ? (
            <PlayOverlay
              onActivate={() => {
                setAutoplayBlocked(false);
                setUserStarted(true);
              }}
              label="Play video"
              hint={autoplayBlocked ? "Autoplay blocked — tap to play" : "Play demo"}
            />
          ) : openVideoPreview && resolvedVideoUrl ? (
            <PlayOverlay
              onActivate={() => openVideoPreview(resolvedVideoUrl)}
              label="Preview video"
              hint="Preview demo"
            />
          ) : (
            <PlayOverlay
              onActivate={() => {
                setAutoplayBlocked(false);
                setUserStarted(true);
              }}
              label="Play video"
              hint="Play demo"
            />
          ))}
        {hasVideo && shouldPlay && (
          <VideoHoverControls
            videoRef={videoRef}
            initialMuted={wantMuted}
            onUserPause={() => setUserStarted(false)}
          />
        )}

        {/* Brand accent duotone — subtle multiply so division tokens actually
             tint the photo instead of only floating over it. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${accent}1F 0%, transparent 45%, ${primary}14 100%)`,
            mixBlendMode: "multiply",
          }}
        />
        {/* Directional legibility scrim — bottom-heavy so title/caption
             overlays always land on a darker-than-image band. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: isBacking
              ? // Backing tile: overlay copy sits on top, so light mode gets a
                // navy directional scrim (not a white wash) and white ink.
                `linear-gradient(${scrimAngle}deg, rgba(3,0,44,0.10) 0%, rgba(3,0,44,0.34) 46%, rgba(3,0,44,0.66) 100%)`
              : `linear-gradient(${scrimAngle}deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.28) 42%, rgba(255,255,255,0.06) 100%)`,
          }}
        />
        {/* Top vignette to soften busy skies / ceilings */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[28%]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)",
          }}
        />
        {/* Fine grain */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
          style={{ backgroundImage: GRAIN_SVG, backgroundSize: "160px 160px" }}
        />
        {portrait && (
          <div
            aria-hidden
            className="absolute left-1/2 bottom-[-10%] h-[70%] w-[55%] -translate-x-1/2 rounded-full"
            style={{
              background: `radial-gradient(closest-side, ${primary}22 0%, transparent 75%)`,
              filter: "blur(10px)",
            }}
          />
        )}
      </div>
    );
  }

  // ── Dark mode ─────────────────────────────────────────────────────────
  // Photographic backdrop with a cinematic bottom scrim + brand duotone.
  // Slightly less crush than before (0.85 → 0.92) so imagery keeps depth.
  return (
    <div
      ref={rootRef}
      data-media-tile="true"
      className={`group ${/\b(absolute|fixed)\b/.test(className ?? "") ? "" : "relative"} overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{ background: "#03002C", filter: grayscale }}
    >
      {hasVideo && shouldPlay ? (
        <video
          ref={videoRef}
          key={resolvedVideoUrl}
          src={resolvedVideoUrl}
          poster={resolvedPosterUrl || undefined}
          autoPlay
          muted={wantMuted}
          loop={wantLoop}
          controls={wantControls}
          playsInline
          preload="auto"
          aria-hidden={!wantControls}
          data-media-ready="true"
          data-media-kind="video"
          className="absolute inset-0 block h-full w-full object-cover"
          style={{ filter: "brightness(0.92) saturate(1.05) contrast(1.05)", ...zoomStyle }}
        />
      ) : (
        <img
          src={url}
          alt=""
          aria-hidden
          data-media-ready={url ? "true" : "false"}
          data-media-kind={hasVideo ? "video-poster" : "image"}
          className="absolute inset-0 block h-full w-full object-cover"
          style={{ filter: "brightness(0.92) saturate(1.05) contrast(1.05)", ...zoomStyle }}
        />
      )}
      {hasVideo &&
        !shouldPlay &&
        (autoplay ? (
          <PlayOverlay
            onActivate={() => {
              setAutoplayBlocked(false);
              setUserStarted(true);
            }}
            label="Play video"
            hint={autoplayBlocked ? "Autoplay blocked — tap to play" : "Play demo"}
          />
        ) : openVideoPreview && resolvedVideoUrl ? (
          <PlayOverlay
            onActivate={() => openVideoPreview(resolvedVideoUrl)}
            label="Preview video"
            hint="Preview demo"
          />
        ) : (
          <PlayOverlay
            onActivate={() => {
              setAutoplayBlocked(false);
              setUserStarted(true);
            }}
            label="Play video"
            hint="Play demo"
          />
        ))}
      {hasVideo && shouldPlay && (
        <VideoHoverControls
          videoRef={videoRef}
          initialMuted={wantMuted}
          onUserPause={() => setUserStarted(false)}
        />
      )}
      {/* Brand accent duotone — tints imagery with the active division's
           accent/primary so a brand switch visibly re-tones tiles. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${accent}22 0%, transparent 55%, ${primary}3D 100%)`,
          mixBlendMode: "soft-light",
        }}
      />
      {/* Directional legibility scrim — bottom-heavy dark ramp so title,
           attribution, and confidentiality footers keep AA contrast. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${scrimAngle}deg, rgba(3,0,44,0.78) 0%, rgba(3,0,44,0.38) 45%, rgba(3,0,44,0.12) 100%)`,
        }}
      />
      {/* Top vignette to anchor the frame */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[32%]"
        style={{
          background: "linear-gradient(180deg, rgba(3,0,44,0.55) 0%, rgba(3,0,44,0) 100%)",
        }}
      />
      {/* Fine grain — screen blend so it lifts shadows without milking mids. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.09] mix-blend-screen"
        style={{ backgroundImage: GRAIN_SVG, backgroundSize: "160px 160px" }}
      />
      {portrait && (
        <div
          aria-hidden
          className="absolute left-1/2 bottom-[-10%] h-[70%] w-[55%] -translate-x-1/2 rounded-full"
          style={{
            background: `radial-gradient(closest-side, ${accent}2E 0%, transparent 75%)`,
            filter: "blur(12px)",
            mixBlendMode: "screen",
          }}
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
      <div
        className={`slide-fill-stretch slide-fill-rows mt-14 grid gap-10 ${gridClass}`}
        style={{
          gridTemplateRows: `repeat(${rows ?? Math.max(1, Math.ceil(items.length / cols))}, minmax(0, 1fr))`,
        }}
      >
        {items.map((it, i) => (
          <Card
            key={i}
            brand={brand}
            title={s(it.title)}
            body={s(it.body)}
            index={i + 1}
            icon={s(it.icon)}
          />
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

function StatTile({
  brand,
  item,
  index,
  dense,
  cols,
  isLastRow,
}: {
  brand: BrandMode;
  item: Item;
  index: number;
  dense: boolean;
  cols: number;
  isLastRow: boolean;
}) {
  const mode = useContext(SlideModeContext);
  const isDark = mode === "dark";
  const isFirstInRow = index % cols === 0;
  const size = dense ? "md" : "lg";
  const rule = isDark ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.08)";
  const softRule = isDark ? "rgba(255,255,255,0.06)" : "rgba(10,15,28,0.05)";
  return (
    <div
      className="relative flex flex-col px-10 py-8"
      style={{
        borderLeft: isFirstInRow ? "none" : `1px solid ${rule}`,
        borderBottom: isLastRow ? "none" : `1px solid ${softRule}`,
      }}
    >
      {/* Accent gradient rail — reads as a top-lit column, keynote-grade. */}
      <div
        aria-hidden
        className="absolute left-10 right-10 top-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${accentInk(brand.tokens.accent, mode, 3)} 0%, ${hexA(accentInk(brand.tokens.accent, mode, 3), 0.0)} 70%)`,
        }}
      />
      {s(item.title) && (
        <div className="mb-6">
          <Kicker brand={brand} size={16}>
            {s(item.title)}
          </Kicker>
        </div>
      )}
      <StatFigure
        brand={brand}
        value={s(item.value)}
        unit={s(item.unit)}
        label={s(item.label)}
        source={s(item.source)}
        size={size}
      icon={s(item.icon)} iconSize={s(item.iconSize)} />
    </div>
  );
}

// ── AuroraStatGrid ─────────────────────────────────────────────────────────
// Free-form stat grid drawn directly onto the page-level aurora atmosphere
// (see AuroraLayer). No cards, no fills, no top rails — just a soft
// translucent icon circle, a big hero number, a quiet label, and hairline
// vertical dividers between siblings in the same row. Matches the reference
// 2×2 and 5-across stat layouts exactly.
function AuroraStatGrid({
  brand,
  pageNumber,
  title,
  items,
  cols,
  rows,
  align = "left",
}: {
  brand: BrandMode;
  pageNumber: number;
  title: string;
  items: Item[];
  cols: number;
  rows?: number;
  align?: "left" | "center";
}) {
  const rowCount = rows ?? Math.ceil(items.length / cols);
  const centered = align === "center";
  return (
    <SlideFrame brand={brand} pageNumber={pageNumber}>
      {title ? (
        <div className={centered ? "text-center" : undefined}>
          <SlideTitle brand={brand} title={title} />
        </div>
      ) : null}
      <div
        className="slide-fill-stretch slide-fill-rows mt-20 grid gap-y-16"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          // Rows share the height under the title: a single row of three stats
          // used to sit in the top third with the rest of the sheet empty.
          gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
        }}
      >
        {items.map((it, i) => {
          const isFirstInRow = i % cols === 0;
          return (
            <AuroraStatCell
              key={i}
              brand={brand}
              item={it}
              index={i}
              showLeftRule={!isFirstInRow}
              centered={centered}
            />
          );
        })}
      </div>
    </SlideFrame>
  );
}

function AuroraStatCell({
  brand,
  item,
  index,
  showLeftRule,
  centered = false,
}: {
  brand: BrandMode;
  item: Item;
  index: number;
  showLeftRule: boolean;
  centered?: boolean;
}) {
  const ink = useSlideInk();
  const value = s(item.value);
  const unit = s(item.unit);
  const label = s(item.label);
  return (
    <div
      className={
        centered
          ? "relative flex flex-col items-center justify-center gap-5 px-10 text-center"
          : "relative flex items-center gap-6 pl-10 pr-8"
      }
      style={{
        borderLeft: showLeftRule ? `1px solid ${ink.hairline}` : "none",
      }}
    >
      {/* Soft translucent icon circle — 1px hairline stroke, subtle fill,
          line icon in accent-text ink. Free on the aurora, no shadow. */}
      <div
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: 76,
          height: 76,
          background: "color-mix(in oklab, var(--slide-accent-text) 12%, transparent)",
          border: `1px solid color-mix(in oklab, var(--slide-accent-text) 32%, transparent)`,
          color: "var(--slide-accent-text)",
          marginTop: centered ? 0 : 8,
        }}
      >
        {(() => {
          const Icon = pickIcon(label || s(item.title) || "stat", index, s(item.icon));
          return <Icon size={34} aria-hidden />;
        })()}
      </div>
      <div className={centered ? "flex min-w-0 flex-col items-center" : "min-w-0 flex-1"}>
        <div
          className={`flex items-baseline gap-2 tabular-nums${centered ? " justify-center" : ""}`}
          style={{
            fontSize: fillPx(84, "display"),
            fontWeight: 600,
            lineHeight: 0.95,
            letterSpacing: "-0.035em",
            color: ink.strong,
          }}
        >
          <span>{value || "—"}</span>
          {unit ? (
            <span
              style={{ fontSize: fillPx(48, "figure"), fontWeight: 500, letterSpacing: "-0.02em", color: ink.strong }}
            >
              {unit}
            </span>
          ) : null}
        </div>
        {label ? (
          <div
            className="mt-4"
            style={{
              fontSize: fillPx(22, "body"),
              lineHeight: 1.35,
              fontWeight: 400,
              color: ink.muted,
              letterSpacing: "-0.005em",
              maxWidth: 320,
              marginLeft: centered ? "auto" : undefined,
              marginRight: centered ? "auto" : undefined,
            }}
          >
            {label}
          </div>
        ) : null}
      </div>
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
          return (
            <StatTile
              key={i}
              brand={brand}
              item={it}
              index={i}
              dense={dense}
              cols={cols}
              isLastRow={isLastRow}
            />
          );
        })}
      </div>
    </SlideFrame>
  );
}

function NumberedList({
  brand,
  pageNumber,
  title,
  items,
}: {
  brand: BrandMode;
  pageNumber: number;
  title: string;
  items: Item[];
}) {
  const ink = useSlideInk();
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
              style={{
                borderTop: i === 0 ? "1px solid rgba(10,15,28,0.10)" : "none",
                borderBottom: `1px solid ${ink.hairline}`,
              }}
            >
              <SlideNumeral value={i + 1} sizePx={40} className="pt-1" />
              <IconBadge brand={brand} label={label} index={i} size="md" override={s(it.icon)} sizeToken={s(it.iconSize)} />
              <div>
                <div
                  style={{
                    fontSize: fillPx(32, "figure"),
                    fontWeight: 600,
                    color: ink.strong,
                    letterSpacing: "-0.015em",
                  }}
                >
                  {label}
                </div>
                <div
                  className="mt-2"
                  style={{
                    fontSize: fillPx(22, "body"),
                    lineHeight: 1.4,
                    color: "color-mix(in oklab, currentColor 72%, transparent)",
                  }}
                >
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

function SlideTitle({
  brand,
  title,
  kicker,
}: {
  brand: BrandMode;
  title: string;
  kicker?: string;
}) {
  return <TitleBlock brand={brand} title={title} kicker={kicker} size="title" />;
}

function Card({
  brand,
  title,
  body,
  index,
  icon,
}: {
  brand: BrandMode;
  title: string;
  body: string;
  index: number;
  icon?: string;
}) {
  const mode = useContext(SlideModeContext);
  const ink = useSlideInk();
  const isDark = mode === "dark";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(10,15,28,0.02)";
  const cardRing = isDark ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.08)";
  const bodyColor = isDark ? "rgba(255,255,255,0.72)" : "rgba(10,15,28,0.68)";
  const titleColor = ink.strong;
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-3xl p-10"
      style={{
        background: cardBg,
        // Open-bottom frame: the hairline wraps the top and sides only, so the
        // card's gradient fades out into the ground instead of being boxed in.
        borderTop: `1px solid ${cardRing}`,
        borderLeft: `1px solid ${cardRing}`,
        borderRight: `1px solid ${cardRing}`,
        borderBottom: "1px solid transparent",
        backgroundImage: `radial-gradient(120% 90% at 0% 0%, ${brand.tokens.accent}${isDark ? "18" : "0C"} 0%, transparent 62%)`,
      }}
    >
      {/* Top accent bar — the signature seam of a keynote card. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${accentInk(brand.tokens.accent, mode, 3)} 0%, ${hexA(accentInk(brand.tokens.accent, mode, 3), 0.0)} 80%)`,
        }}
      />
      <div className="flex items-start justify-between">
        <SlideNumeral value={index} sizePx={44} color={accentInk(brand.tokens.accent, mode, 4.5)} />
        <IconBadge
          brand={brand}
          label={title}
          index={index - 1}
          size="md"
          override={icon}
          treatment="soft-circle"
        />
      </div>
      <div
        className="mt-7"
        style={{
          fontSize: fillPx(32, "figure"),
          fontWeight: 600,
          color: titleColor,
          letterSpacing: "-0.02em",
          lineHeight: 1.14,
        }}
      >
        {title}
      </div>
      <div className="mt-4" style={{ fontSize: fillPx(21, "body"), lineHeight: 1.4, color: bodyColor }}>
        {body}
      </div>
    </div>
  );
}

function Quadrant({
  brand,
  label,
  highlight,
}: {
  brand: BrandMode;
  label: string;
  highlight?: boolean;
}) {
  const ink = useSlideInk();
  const mode = useContext(SlideModeContext);
  return (
    <div
      className="relative overflow-hidden flex items-center justify-center p-8 text-center"
      style={{
        ...moduleCardTint(brand.tokens.accent, mode, { emphasis: highlight ? 2.4 : 1 }),
        ...(highlight ? { border: `1px solid ${brand.tokens.accent}` } : null),
        color: ink.strong,
        fontSize: fillPx(30, "figure"),
        fontWeight: 600,
        letterSpacing: "-0.015em",
        lineHeight: 1.25,
      }}
    >
      <AccentTick accent={brand.tokens.accent} />
      {label}
    </div>
  );
}

function LabelBlock({ brand, label, body }: { brand: BrandMode; label: string; body: string }) {
  const mode = useContext(SlideModeContext);
  const bodyColor = mode === "dark" ? "rgba(255,255,255,0.86)" : "rgba(10,15,28,0.85)";
  return (
    <div>
      <Hairline color={"var(--slide-accent-text)"} widthPx={56} thicknessPx={2} className="mb-5" />
      <Kicker brand={brand}>{label}</Kicker>
      <div
        className="mt-5"
        style={{ fontSize: fillPx(26, "body"), lineHeight: 1.38, letterSpacing: "-0.005em", color: bodyColor }}
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

function Sparkline({
  brand: _brand,
  values,
  w = 380,
  h = 100,
  filled = true,
  peakPin = false,
  peakLabel = "PEAK",
}: {
  brand: BrandMode;
  values: number[];
  w?: number;
  h?: number;
  filled?: boolean;
  peakPin?: boolean;
  peakLabel?: string;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const id = useId().replace(/:/g, "");
  const vals = values.length ? values : [1, 1];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pad = 4;
  const step = (w - pad * 2) / Math.max(vals.length - 1, 1);
  const pts = vals.map(
    (v, i) => [pad + i * step, h - pad - ((v - min) / range) * (h - pad * 2)] as [number, number],
  );
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const areaPath = pts.length
    ? `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`
    : "";
  const peakIdx = vals.indexOf(max);
  const peak = pts[peakIdx];
  const last = pts[pts.length - 1];
  // Peak pin needs headroom inside the box, so the plot area is inset from the
  // top when the pin is drawn. Strokes use non-scaling-stroke so the chart can
  // stretch to its container width without smearing line weights.
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
      aria-hidden
    >
      <AiryDefs id={id} />
      {filled && <path d={areaPath} fill={`url(#${id}-airy)`} vectorEffect="non-scaling-stroke" />}
      {[0.34, 0.67].map((f) => (
        <line
          key={f}
          x1={pad}
          y1={pad + (h - pad * 2) * f}
          x2={w - pad}
          y2={pad + (h - pad * 2) * f}
          stroke={ink.hairline}
          strokeWidth={1}
          strokeDasharray="3 7"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <line
        x1={pad}
        y1={h - pad}
        x2={w - pad}
        y2={h - pad}
        stroke={ink.hairlineStrong}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={linePath}
        fill="none"
        stroke="var(--slide-accent-text)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {last && (
        <circle
          cx={last[0]}
          cy={last[1]}
          r={3.5}
          fill="var(--slide-accent-text)"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {peakPin && peak && (
        <g>
          <circle
            cx={peak[0]}
            cy={peak[1]}
            r={3}
            fill="none"
            stroke="var(--slide-accent-text)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={peak[0]}
            y1={peak[1] - 5}
            x2={peak[0]}
            y2={Math.max(peak[1] - 16, 8)}
            stroke={ink.hairlineStrong}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={Math.min(Math.max(peak[0], 22), w - 22)}
            y={Math.max(peak[1] - 20, 11)}
            textAnchor="middle"
            fontSize={chartLabelSize(9, fillScale)}
            fontWeight={600}
            fill={ink.muted}
            style={{ letterSpacing: "0.2em" }}
          >
            {peakLabel}
          </text>
        </g>
      )}
    </svg>
  );
}

// Shared feathered accent gradient — drawn as a page-integrated free-form
// fill. No panels, no boxes. Every chart references `url(#<id>-airy)`.
function AiryDefs({ id }: { id: string }) {
  return (
    <defs>
      {/* Highlighted / accented bars: soft accent bloom, top-heavy */}
      <linearGradient id={`${id}-airy`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.55} />
        <stop offset="55%" stopColor="var(--slide-accent-text)" stopOpacity={0.22} />
        <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0.04} />
      </linearGradient>
      {/* Frosted glass fill for baseline/neutral bars — mode-aware via accent */}
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.16} />
        <stop offset="60%" stopColor="var(--slide-accent-text)" stopOpacity={0.08} />
        <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0.02} />
      </linearGradient>
      {/* Muted glass for tertiary segments */}
      <linearGradient id={`${id}-glass-mute`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.08} />
        <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0.02} />
      </linearGradient>
    </defs>
  );
}

// ── Editorial data primitives ─────────────────────────────────────────
// DotGridBackdrop retired as decorative chartjunk. Kept as no-op for callers.
function DotGridBackdrop(_props: { opacity?: number } = {}) {
  return null;
}

function LiveMetaFooter({
  brand: _brand,
  source,
  refCode,
}: {
  brand: BrandMode;
  source?: string;
  refCode?: string;
  live?: boolean;
}) {
  const ink = useSlideInk();
  return (
    <div
      className="flex items-center justify-between"
      style={{
        borderTop: `1px solid ${ink.hairline}`,
        paddingTop: 16,
        fontSize: fillPx(11, "kicker"),
        letterSpacing: "0.24em",
        color: ink.faint,
        fontWeight: 500,
        textTransform: "uppercase",
      }}
    >
      <div className="flex gap-10">
        {source && <span>Source · {source}</span>}
        {refCode && <span>Ref · {refCode}</span>}
      </div>
    </div>
  );
}

/* ── per-skin chart grammar helpers ──────────────────────────────────────
 * Every alternate look owns its own bar silhouette, plot-field ruling,
 * series curve, marker and dial geometry (src/lib/chart-styles.ts). These
 * three primitives are the only place charts read that grammar, so all
 * dashboards, graphs and gauges re-skin together.
 */

type ChartInk = ReturnType<typeof useSlideInk>;

/** Plot field: tint bands, rules, axis ticks and frame, in the pack's language. */
function ChartField({
  cs,
  ink,
  x0,
  x1,
  top,
  bottom,
  rows = 4,
}: {
  cs: ChartStyle;
  ink: ChartInk;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  rows?: number;
}) {
  const bands = gridBands(cs, top, bottom, rows);
  const lines = gridLines(cs, top, bottom, rows);
  const ticks = cs.grid === "ticks";
  return (
    <g>
      {bands.map((b, i) => (
        <rect key={`b${i}`} x={x0} y={b.y} width={x1 - x0} height={b.h} fill={ink.trackFill} opacity={0.5} />
      ))}
      {lines.map((l, i) => (
        <line
          key={`l${i}`}
          x1={x0}
          y1={l.y}
          x2={x1}
          y2={l.y}
          stroke={ink.hairline}
          strokeWidth={l.width}
          strokeDasharray={l.dash}
          opacity={l.opacity}
        />
      ))}
      {ticks &&
        [1, 2, 3, 4].map((i) => {
          const y = bottom - ((bottom - top) * i) / 5;
          return (
            <line key={`t${i}`} x1={x0} y1={y} x2={x0 + 14} y2={y} stroke={ink.hairlineStrong} strokeWidth={1.4} />
          );
        })}
      {cs.grid === "frame" && (
        <rect x={x0} y={top} width={x1 - x0} height={bottom - top} fill="none" stroke={ink.hairline} strokeWidth={1} />
      )}
      {(cs.axis === "baseline" || cs.axis === "boxed" || cs.axis === "spine") && (
        <line
          x1={x0}
          y1={bottom}
          x2={x1}
          y2={bottom}
          stroke={cs.axis === "spine" ? ink.strong : ink.hairlineStrong}
          strokeWidth={cs.axis === "spine" ? 2.5 : 1}
        />
      )}
      {(cs.axis === "spine" || cs.axis === "boxed") && (
        <line x1={x0} y1={top} x2={x0} y2={bottom} stroke={ink.hairlineStrong} strokeWidth={cs.axis === "spine" ? 2.5 : 1} />
      )}
      {cs.axis === "floating" && (
        <line x1={x0} y1={bottom + 10} x2={x1} y2={bottom + 10} stroke={ink.hairline} strokeWidth={1} strokeDasharray="3 6" />
      )}
    </g>
  );
}

/** A single column drawn in the pack's bar language, with its ornaments. */
function StyledBar({
  cs,
  ink,
  x,
  y,
  w,
  h,
  fill,
  fillOpacity,
  accent,
  emphasis = false,
}: {
  cs: ChartStyle;
  ink: ChartInk;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  /** Optional opacity for solid-colour fills (waterfall encodes state this way). */
  fillOpacity?: number;
  accent?: string;
  emphasis?: boolean;
}) {
  const orn = barOrnament(cs, x, y, w, h);
  const outline = cs.bar === "ghost";
  const stroke = accent ?? "var(--slide-accent-text)";
  const maskId = useId().replace(/:/g, "");
  return (
    <g>
      {orn.cut && (
        <defs>
          <mask id={`${maskId}-cut`} maskUnits="userSpaceOnUse">
            <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill="#fff" />
            <rect x={orn.cut.x - 2} y={orn.cut.y} width={orn.cut.w + 4} height={orn.cut.h} fill="#000" />
          </mask>
        </defs>
      )}
      {orn.drop && (
        <rect x={orn.drop.x} y={orn.drop.y} width={orn.drop.w} height={orn.drop.h} fill={ink.trackFill} opacity={0.7} />
      )}
      <path
        d={barPath(cs, x, y, w, h)}
        fill={outline ? (emphasis ? fill : "transparent") : fill}
        fillOpacity={outline ? 0.35 : (fillOpacity ?? 1)}

        stroke={outline ? stroke : undefined}
        strokeWidth={outline ? 1.6 : undefined}
        mask={orn.cut ? `url(#${maskId}-cut)` : undefined}
      />

      {orn.cap && <rect x={orn.cap.x} y={orn.cap.y} width={orn.cap.w} height={orn.cap.h} fill={stroke} />}
      {emphasis && !outline && cs.bar !== "pin" && (
        <rect x={x} y={y} width={w} height={2} fill={stroke} />
      )}
    </g>
  );
}

/** Where the value label sits for this language, relative to the column top. */
function barValueLabel(
  cs: ChartStyle,
  y: number,
  h: number,
): { y: number; hide: boolean; inside: boolean } {
  if (cs.valueLabel === "none") return { y, hide: true, inside: false };
  if (cs.valueLabel === "inside" && h > 60) return { y: y + 34, hide: false, inside: true };
  if (cs.valueLabel === "end") return { y: y - 22, hide: false, inside: false };
  return { y: y - 12, hide: false, inside: false };
}


/**
 * Area fill under a series, in the pack's language: airy gradient, flat wash,
 * diagonal hatch, halftone dot screen, or nothing at all.
 */
function SeriesArea({
  cs,
  d,
  id,
  gradient,
}: {
  cs: ChartStyle;
  d: string;
  id: string;
  /** Existing gradient url for the "gradient" language. */
  gradient: string;
}) {
  if (!d || cs.area === "none") return null;
  if (cs.area === "gradient") return <path d={d} fill={gradient} />;
  if (cs.area === "flat") return <path d={d} fill="var(--slide-accent-text)" fillOpacity={0.16} />;
  const pid = `${id}-${cs.area}`;
  return (
    <>
      <defs>
        {cs.area === "hatch" ? (
          <pattern id={pid} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
            <line x1="0" y1="0" x2="0" y2="12" stroke="var(--slide-accent-text)" strokeWidth="2.2" strokeOpacity={0.34} />
          </pattern>
        ) : (
          <pattern id={pid} width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.7" fill="var(--slide-accent-text)" fillOpacity={0.38} />
          </pattern>
        )}
      </defs>
      <path d={d} fill={`url(#${pid})`} />
    </>
  );
}

/** Series markers in the pack's marker language. */
function SeriesMarkers({
  cs,
  pts,
  color = "var(--slide-accent-text)",
  base = 5,
}: {
  cs: ChartStyle;
  pts: { x: number; y: number }[];
  color?: string;
  base?: number;
}) {
  const size = markerSize(cs, base);
  if (!size) return null;
  const hollow = cs.marker === "hollow";
  const line = cs.marker === "tick";
  return (
    <g>
      {pts.map((p, i) => (
        <path
          key={i}
          d={markerPath(cs, p.x, p.y, size)}
          fill={hollow || line ? "none" : color}
          stroke={hollow || line ? color : undefined}
          strokeWidth={hollow || line ? 2 : undefined}
        />
      ))}
    </g>
  );
}

type SegBar = { label: string; value: number; note?: string };
function SegmentedBar({
  brand,
  segments,
  height = 68,
}: {
  brand: BrandMode;
  segments: SegBar[];
  height?: number;
}) {
  const ink = useSlideInk();
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="relative w-full" style={{ marginTop: 160, marginBottom: 140 }}>
      <div className="flex w-full" style={{ height, gap: 4 }}>
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          const emphasis = i === 0;
          const bg = emphasis ? brand.tokens.accent : i === 1 ? ink.accent(0.22) : ink.trackFill;
          const above = i % 2 === 0;
          return (
            <div
              key={i}
              className="relative"
              style={{
                width: `${pct}%`,
                background: bg,
                border: emphasis ? "none" : `1px solid ${ink.hairline}`,
              }}
            >
              <div
                className="absolute"
                style={
                  {
                    left: 0,
                    [above ? "bottom" : "top"]: "100%",
                    [above ? "marginBottom" : "marginTop"]: 20,
                    paddingLeft: 10,
                    borderLeft: `1px solid ${ink.hairlineStrong}`,
                    minWidth: 160,
                  } as React.CSSProperties
                }
              >
                <div
                  className="uppercase"
                  style={{
                    fontSize: fillPx(11, "kicker"),
                    letterSpacing: "0.24em",
                    color: ink.faint,
                    fontWeight: 600,
                  }}
                >
                  {seg.label}
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: fillPx(22, "body"),
                    fontWeight: 600,
                    color: ink.text,
                    letterSpacing: "-0.01em",
                    marginTop: 2,
                  }}
                >
                  {pct.toFixed(1)}%
                </div>
                {seg.note && (
                  <div style={{ fontSize: fillPx(12, "kicker"), color: ink.muted, marginTop: 2, maxWidth: 220 }}>
                    {seg.note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditorialNote({ title, body, accent }: { title: string; body: string; accent?: string }) {
  const ink = useSlideInk();
  const mode = useSlideMode();

  return (
    <div
      className="relative"
      style={{ ...moduleCardSurface(accent, mode, { radius: 4 }), padding: fillPx(24, "plate") }}
    >
      <AccentTick accent={accent} height={2} />
      <div
        className="uppercase"
        style={{ fontSize: fillPx(11, "kicker"), letterSpacing: "0.24em", color: ink.text, fontWeight: 700 }}
      >
        {title}
      </div>
      <div style={{ fontSize: fillPx(14, "kicker"), color: ink.muted, lineHeight: 1.55, marginTop: 8 }}>{body}</div>
    </div>
  );
}

function SummaryStatCard({
  brand,
  label,
  value,
  unit,
  series,
}: {
  brand: BrandMode;
  label: string;
  value: string;
  unit: string;
  series: number[];
}) {
  const ink = useSlideInk();
  return (
    <div>
      <div
        className="uppercase"
        style={{ fontSize: fillPx(18, "body"), letterSpacing: "0.28em", color: ink.muted, fontWeight: 600 }}
      >
        {label}
      </div>
      <div
        className="mt-4 flex items-baseline"
        style={{
          fontSize: fillPx(84, "display"),
          fontWeight: 600,
          color: ink.text,
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        <span className="tabular-nums">{value || "—"}</span>
        {unit && (
          <span style={{ fontSize: fillPx(40, "figure"), marginLeft: 8, color: "var(--slide-accent-text)" }}>
            {unit}
          </span>
        )}
      </div>
      <div className="mt-4">
        <Sparkline brand={brand} values={series} h={70} />
      </div>
    </div>
  );
}

function Donut({
  brand: _brand,
  percent,
  size = 260,
}: {
  brand: BrandMode;
  percent: number;
  size?: number;
}) {
  const ink = useSlideInk();
  const cs = useChartStyle();
  const id = useId().replace(/:/g, "");
  const p = Math.max(0, Math.min(100, percent));
  const stroke = ringBand(cs, size / 2);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  // Segmented dials: the pack's ringGap breaks the arc into ticks of band.
  const segmented = cs.ringGap > 0;
  const segLen = Math.max(6, circ / 28);
  const gapLen = (cs.ringGap / 360) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <clipPath id={`${id}-arc`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r + stroke}
            fill="none"
            stroke="#fff"
            strokeWidth={stroke * 2}
            strokeDasharray={`${dash} ${circ - dash}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </clipPath>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={ink.trackFill}
        strokeWidth={cs.grid === "none" ? Math.max(1.5, stroke * 0.35) : stroke}
        opacity={cs.grid === "none" ? 0.7 : 1}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--slide-accent-text)"
        strokeWidth={stroke}
        strokeLinecap={cs.ringCap === "round" ? "round" : "butt"}
        strokeDasharray={segmented ? `${segLen} ${gapLen}` : `${dash} ${circ - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        clipPath={segmented ? `url(#${id}-arc)` : undefined}
      />



      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.32}
        fontWeight={600}
        fill={ink.text}
        style={{ letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(p)}
      </text>
      <text
        x={size / 2}
        y={size / 2 + size * 0.19}
        textAnchor="middle"
        fontSize={size * 0.075}
        fontWeight={500}
        fill={ink.faint}
        style={{ letterSpacing: "0.22em" }}
      >
        %
      </text>
    </svg>
  );
}

// Free-form area chart for Aurora v2 rebuild. No axes, no ticks, no plate.
// Feathered accent gradient sits directly on the aurora backdrop. The line
// carries a soft accent glow; the final point blooms with a radial halo so
// the "now" reading is legible without decoration.
function FreeformAreaChart({
  brand: _brand,
  series,
  height = 560,
}: {
  brand: BrandMode;
  series: { label: string; value: number }[];
  height?: number;
}) {
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const id = useId().replace(/:/g, "");
  const w = 1720;
  const h = height;
  const padL = 16;
  const padR = 16;
  const padT = 40;
  const padB = 72;
  if (!series.length) return null;
  const vals = series.map((p) => p.value);
  const max = Math.max(1, ...vals);
  const min = Math.min(0, ...vals);
  const range = max - min || 1;
  const step = series.length > 1 ? (w - padL - padR) / (series.length - 1) : 0;
  const pts = series.map(
    (p, i) =>
      [padL + i * step, padT + (h - padT - padB) * (1 - (p.value - min) / range)] as [
        number,
        number,
      ],
  );
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const areaPath =
    pts.length > 1
      ? `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${h - padB} L${pts[0][0].toFixed(1)},${h - padB} Z`
      : "";
  // Category-label stride honours the industry's max-tick budget.
  const showEvery = labelStride(series.length);
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <defs>
        {/* Feathered accent bloom — top-loaded, dissolves before touching baseline */}
        <linearGradient id={`${id}-bloom`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.42} />
          <stop offset="35%" stopColor="var(--slide-accent-text)" stopOpacity={0.18} />
          <stop offset="70%" stopColor="var(--slide-accent-text)" stopOpacity={0.05} />
          <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0} />
        </linearGradient>
        {/* Radial halo behind the final data point */}
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.55} />
          <stop offset="60%" stopColor="var(--slide-accent-text)" stopOpacity={0.12} />
          <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0} />
        </radialGradient>
        {/* Soft glow on the line */}
        <filter id={`${id}-glow`} x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Baseline hairline only — no vertical axes, no gridlines */}
      <line
        x1={padL}
        y1={h - padB}
        x2={w - padR}
        y2={h - padB}
        stroke={ink.hairline}
        strokeWidth={1}
      />
      {areaPath && <path d={areaPath} fill={`url(#${id}-bloom)`} />}
      <path
        d={linePath}
        fill="none"
        stroke="var(--slide-accent-text)"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${id}-glow)`}
      />
      {/* Subtle inner dots on every point */}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={2.5}
          fill="var(--slide-accent-text)"
          opacity={0.55}
        />
      ))}
      {/* Final point: radial halo + solid core */}
      {last && (
        <g>
          <circle cx={last[0]} cy={last[1]} r={54} fill={`url(#${id}-halo)`} />
          <circle cx={last[0]} cy={last[1]} r={6.5} fill="var(--slide-accent-text)" />
        </g>
      )}
      {series.map((p, i) =>
        i % showEvery === 0 || i === series.length - 1 ? (
          <text
            key={i}
            x={pts[i]?.[0]}
            y={h - padB + 34}
            textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}
            fontSize={chartLabelSize(14, fillScale)}
            fill={ink.faint}
            style={{
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
            }}
          >
            {capLabel(p.label)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

// Free-form bar chart. Shares the FreeformAreaChart gradient vocabulary:
// feathered accent bloom, baseline hairline only, soft glow + radial halo
// on the highlighted bar. No axis frame, no gridlines, no per-bar border.
function FreeformBarChart({
  brand: _brand,
  bars,
  height = 520,
  highlight,
}: {
  brand: BrandMode;
  bars: { label: string; value: number }[];
  height?: number;
  highlight?: string;
}) {
  const capLabel = useChartLabelCap();
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const id = useId().replace(/:/g, "");
  const w = 1720;
  const h = height;
  const padL = 16;
  const padR = 16;
  const padT = 60;
  const padB = 72;
  if (!bars.length) return null;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / bars.length;
  const barW = Math.min(slot * 0.44, 140);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`${id}-bloom-hi`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.68} />
          <stop offset="40%" stopColor="var(--slide-accent-text)" stopOpacity={0.32} />
          <stop offset="75%" stopColor="var(--slide-accent-text)" stopOpacity={0.08} />
          <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}-bloom-mute`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.24} />
          <stop offset="55%" stopColor="var(--slide-accent-text)" stopOpacity={0.09} />
          <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.5} />
          <stop offset="55%" stopColor="var(--slide-accent-text)" stopOpacity={0.14} />
          <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0} />
        </radialGradient>
        <filter id={`${id}-glow`} x="-20%" y="-30%" width="140%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Baseline hairline only */}
      <line
        x1={padL}
        y1={h - padB}
        x2={w - padR}
        y2={h - padB}
        stroke={ink.hairline}
        strokeWidth={1}
      />
      {bars.map((b, i) => {
        const bh = (b.value / max) * chartH;
        const x = padL + i * slot + (slot - barW) / 2;
        const y = h - padB - bh;
        const isHi = highlight ? b.label === highlight : false;
        return (
          <g key={i}>
            {/* Radial halo behind highlight bar */}
            {isHi && (
              <circle
                cx={x + barW / 2}
                cy={y}
                r={Math.max(90, barW * 1.4)}
                fill={`url(#${id}-halo)`}
              />
            )}
            <rect
              x={x}
              y={y}
              width={barW}
              height={bh}
              fill={isHi ? `url(#${id}-bloom-hi)` : `url(#${id}-bloom-mute)`}
              filter={isHi ? `url(#${id}-glow)` : undefined}
            />
            {/* Thin confident accent stroke on top edge of highlight */}
            {isHi && (
              <line
                x1={x}
                y1={y}
                x2={x + barW}
                y2={y}
                stroke="var(--slide-accent-text)"
                strokeWidth={2.25}
                strokeLinecap="round"
              />
            )}
            {/* Value label above bar */}
            <text
              x={x + barW / 2}
              y={y - 18}
              textAnchor="middle"
              fontSize={chartLabelSize(isHi ? 28 : 20, fillScale)}
              fontWeight={600}
              fill={isHi ? ink.strong : ink.muted}
              style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
            >
              {b.value}
            </text>
            {/* Category label below baseline */}
            <text
              x={x + barW / 2}
              y={h - padB + 34}
              textAnchor="middle"
              fontSize={chartLabelSize(14, fillScale)}
              fill={isHi ? "var(--slide-accent-text)" : ink.faint}
              style={{
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
              }}
            >
              {capLabel(b.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Free-form Aurora v2 helpers (Batch 2) ─────────────────────────────
// Shared <defs> — accent bloom, radial halo, soft glow. Every free-form
// primitive uses the same vocabulary so charts read as one composition.
function FreeformSvgDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-bloom-h`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.48} />
        <stop offset="55%" stopColor="var(--slide-accent-text)" stopOpacity={0.22} />
        <stop offset="90%" stopColor="var(--slide-accent-text)" stopOpacity={0.06} />
        <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0} />
      </linearGradient>
      <linearGradient id={`${id}-bloom-h-mute`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.2} />
        <stop offset="70%" stopColor="var(--slide-accent-text)" stopOpacity={0.06} />
        <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0} />
      </linearGradient>
      <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="var(--slide-accent-text)" stopOpacity={0.55} />
        <stop offset="55%" stopColor="var(--slide-accent-text)" stopOpacity={0.14} />
        <stop offset="100%" stopColor="var(--slide-accent-text)" stopOpacity={0} />
      </radialGradient>
      <filter id={`${id}-glow`} x="-20%" y="-30%" width="140%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// Free-form donut. Hairline track ring + accent-glowing stroke arc, backed
// by a feathered radial halo so the ring reads as a bloom rather than a
// puck. Center numeral floats with no plate.
function FreeformDonut({
  brand: _brand,
  percent,
  size = 280,
  bloom = false,
}: {
  brand: BrandMode;
  percent: number;
  size?: number;
  bloom?: boolean;
}) {
  const ink = useSlideInk();
  const id = useId().replace(/:/g, "");
  const p = Math.max(0, Math.min(100, percent));
  const stroke = 6;
  const r = (size - stroke) / 2 - 8;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <FreeformSvgDefs id={id} />
      {/* Feathered halo behind — bigger + softer for the highlight */}
      <circle
        cx={cx}
        cy={cy}
        r={size * (bloom ? 0.62 : 0.48)}
        fill={`url(#${id}-halo)`}
        opacity={bloom ? 1 : 0.55}
      />
      {/* Hairline track ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ink.hairline} strokeWidth={1} />
      {/* Accent stroke arc with soft glow */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--slide-accent-text)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        filter={`url(#${id}-glow)`}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.34}
        fontWeight={600}
        fill={ink.strong}
        style={{ letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(p)}
      </text>
      <text
        x={cx}
        y={cy + size * 0.19}
        textAnchor="middle"
        fontSize={size * 0.07}
        fontWeight={600}
        fill={ink.faint}
        style={{ letterSpacing: "0.22em" }}
      >
        %
      </text>
    </svg>
  );
}

// Free-form semicircular gauge. Hairline track + accent stroke arc with
// glow + feathered halo behind the arc terminus. Value floats above the
// arc with no plate.
function FreeformSemiGauge({
  brand: _brand,
  percent,
  size = 240,
  bloom = false,
}: {
  brand: BrandMode;
  percent: number;
  size?: number;
  bloom?: boolean;
}) {
  const ink = useSlideInk();
  const id = useId().replace(/:/g, "");
  const p = Math.max(0, Math.min(100, percent));
  const stroke = 5;
  const r = (size - stroke) / 2 - 6;
  const cy = size / 2 + r / 2;
  const cx = size / 2;
  const arcC = Math.PI * r;
  const dash = (p / 100) * arcC;
  // Terminus: angle from left endpoint, sweeping CCW over the top.
  // At p=0 → (cx-r, cy); at p=100 → (cx+r, cy); at p=50 → (cx, cy-r).
  const theta = (Math.PI * p) / 100;
  const termX = cx - Math.cos(theta) * r;
  const termY = cy - Math.sin(theta) * r;
  // Halo radius drives viewBox padding so the soft alpha fade never gets
  // clipped against the SVG edge (would read as a hard fade-to-white line).
  const haloR = size * (bloom ? 0.34 : 0.24);
  const pad = Math.ceil(haloR + 8);
  const vbX = -pad;
  const vbY = -pad;
  const vbW = size + pad * 2;
  const vbH = cy + 24 + pad * 2;
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <svg
      width={vbW}
      height={vbH}
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      style={{
        overflow: "visible",
        marginLeft: -pad,
        marginRight: -pad,
        marginTop: -pad,
        marginBottom: -pad,
      }}
      aria-hidden
    >
      <FreeformSvgDefs id={id} />
      {/* Feathered halo behind the terminus */}
      <circle cx={termX} cy={termY} r={haloR} fill={`url(#${id}-halo)`} opacity={bloom ? 1 : 0.7} />
      {/* Hairline track */}
      <path d={arc} fill="none" stroke={ink.hairline} strokeWidth={1} />
      {/* Accent stroke arc with glow */}
      <path
        d={arc}
        fill="none"
        stroke="var(--slide-accent-text)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${arcC}`}
        filter={`url(#${id}-glow)`}
      />
      {/* Solid core at terminus */}
      <circle cx={termX} cy={termY} r={4} fill="var(--slide-accent-text)" />
      {/* Value floats inside the cup — sized to sit comfortably under the arc apex */}
      <text
        x={cx}
        y={cy - 14}
        textAnchor="middle"
        fontSize={size * 0.22}
        fontWeight={600}
        fill={ink.strong}
        style={{ letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(p)}
        <tspan fontSize={size * 0.09} fill={ink.faint} dx={4} style={{ letterSpacing: "0.18em" }}>
          %
        </tspan>
      </text>
    </svg>
  );
}

// ── Alternate-look dashboard visuals ─────────────────────────────────────
// One metric, rendered in whichever chart family the active look assigns
// (see lib/dash-look.ts). Every branch consumes the same inputs so a
// dashboard module can swap families without touching its content shape.
function DashMetricViz({
  brand,
  kind,
  percent,
  size = 240,
  bloom = false,
  series,
  value,
  unit,
}: {
  brand: BrandMode;
  kind: DashChart;
  percent: number;
  size?: number;
  bloom?: boolean;
  series?: number[];
  value?: string;
  unit?: string;
}) {
  const ink = useSlideInk();
  const p = Math.max(0, Math.min(100, percent));
  switch (kind) {
    case "ring":
      return <FreeformDonut brand={brand} percent={p} size={size} bloom={bloom} />;
    case "dial":
      return <FreeformSemiGauge brand={brand} percent={p} size={size} bloom={bloom} />;
    case "spark":
      return (
        <Sparkline
          brand={brand}
          values={series && series.length > 1 ? series : [p * 0.55, p * 0.7, p * 0.86, p]}
          w={size * 1.35}
          h={size * 0.5}
          filled
          peakPin={bloom}
        />
      );
    case "column":
      return (
        <div
          className="flex items-end justify-center"
          style={{ width: size, height: size * 0.86, gap: size * 0.06 }}
        >
          {[0.42, 0.62, 0.8, 1].map((k, i) => (
            <div
              key={i}
              style={{
                width: size * 0.13,
                height: `${Math.max(6, p * k)}%`,
                borderRadius: "var(--pack-bar-radius, 3px)",
                background:
                  i === 3
                    ? "var(--slide-accent)"
                    : `color-mix(in oklab, var(--slide-accent) ${28 + i * 14}%, transparent)`,
                boxShadow: i === 3 && bloom ? "0 0 28px var(--slide-accent)" : "none",
              }}
            />
          ))}
        </div>
      );
    case "bar":
      return (
        <div style={{ width: size * 1.25 }}>
          <div
            style={{
              height: size * 0.1,
              borderRadius: 999,
              background: `color-mix(in oklab, ${ink.strong} 10%, transparent)`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${p}%`,
                height: "100%",
                background: "var(--slide-accent)",
                boxShadow: bloom ? "0 0 22px var(--slide-accent)" : "none",
              }}
            />
          </div>
          <div
            className="mt-3 tabular-nums"
            style={{ fontSize: size * 0.16, fontWeight: 600, color: ink.strong, lineHeight: 1 }}
          >
            {value || `${Math.round(p)}`}
            <span style={{ color: "var(--slide-accent-text)", fontSize: size * 0.1 }}>
              {unit || "%"}
            </span>
          </div>
        </div>
      );
    case "plate":
    default:
      return (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: size * 0.7 }}>
          <div
            className="tabular-nums"
            style={{
              fontSize: size * 0.42,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 0.92,
              color: ink.strong,
            }}
          >
            {value || Math.round(p)}
            <span style={{ fontSize: size * 0.17, color: "var(--slide-accent-text)" }}>
              {unit || "%"}
            </span>
          </div>
          <div
            className="mt-4"
            style={{
              width: `${Math.max(12, p)}%`,
              maxWidth: size,
              height: 3,
              background: "var(--slide-accent)",
              boxShadow: bloom ? "0 0 18px var(--slide-accent)" : "none",
            }}
          />
        </div>
      );
  }
}

// A series, rendered in whichever trend/comparison family the look assigns.
function DashSeriesViz({
  brand,
  kind,
  series,
  height = 560,
  highlight,
}: {
  brand: BrandMode;
  kind: DashChart;
  series: { label: string; value: number }[];
  height?: number;
  highlight?: string;
}) {
  const ink = useSlideInk();
  if (!series.length) return null;
  switch (kind) {
    case "column":
      return <FreeformBarChart brand={brand} bars={series} height={height} highlight={highlight} />;
    case "line":
      return (
        <LineMultiChart
          brand={brand}
          series={[{ label: "", points: series.map((p) => p.value) }]}
          xLabels={series.map((p) => p.label)}
          height={height}
        />
      );
    case "bar": {
      const max = Math.max(...series.map((p) => p.value), 1);
      return (
        <div className="flex flex-col justify-center" style={{ minHeight: height, gap: 18 }}>
          {series.map((p, i) => (
            <div key={i} className="flex items-center gap-6">
              <div
                className="uppercase shrink-0"
                style={{
                  width: 220,
                  fontSize: 16,
                  letterSpacing: "0.2em",
                  fontWeight: 600,
                  color: ink.muted,
                }}
              >
                {p.label}
              </div>
              <div
                className="flex-1"
                style={{
                  height: 26,
                  background: `color-mix(in oklab, ${ink.strong} 7%, transparent)`,
                  borderRadius: "var(--pack-bar-radius, 4px)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(p.value / max) * 100}%`,
                    height: "100%",
                    background:
                      highlight && highlight === p.label
                        ? "var(--slide-accent)"
                        : `color-mix(in oklab, var(--slide-accent) ${45 + i * 8}%, transparent)`,
                  }}
                />
              </div>
              <div
                className="tabular-nums shrink-0 text-right"
                style={{ width: 120, fontSize: 28, fontWeight: 600, color: ink.strong }}
              >
                {p.value}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case "ring":
    case "dial":
    case "spark":
    case "plate":
    case "area":
    default:
      return <FreeformAreaChart brand={brand} series={series} height={height} />;
  }
}


// Free-form breakdown row. Left-to-right feathered accent gradient, no
// pill/track. When bloom=true, adds a radial halo + accent stroke tip at
// the value edge so the top row reads as the primary reading.
function FreeformBreakdownRow({
  label,
  value,
  unit,
  delta,
  negative,
  widthPct,
  bloom,
}: {
  label: string;
  value: string;
  unit: string;
  delta: string;
  negative: boolean;
  widthPct: number;
  bloom?: boolean;
}) {
  const ink = useSlideInk();
  const height = bloom ? 68 : 52;
  return (
    <div className="relative py-6" style={{ borderBottom: `1px solid ${ink.hairline}` }}>
      <div className="flex items-baseline justify-between mb-3">
        <div
          className="uppercase"
          style={{
            fontSize: bloom ? 15 : 13,
            letterSpacing: "0.26em",
            color: bloom ? "var(--slide-accent-text)" : ink.strong,
            fontWeight: 700,
          }}
        >
          {label}
        </div>
        <div className="flex items-baseline gap-3">
          <span
            className="tabular-nums"
            style={{
              fontSize: bloom ? 44 : 32,
              fontWeight: 600,
              color: ink.strong,
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}
          >
            {value}
          </span>
          {unit && (
            <span
              style={{
                fontSize: bloom ? 22 : 16,
                color: "var(--slide-accent-text)",
                fontWeight: 500,
              }}
            >
              {unit}
            </span>
          )}
          {delta && (
            <span
              className="uppercase tabular-nums ml-2"
              style={{
                fontSize: fillPx(12, "kicker"),
                letterSpacing: "0.24em",
                color: negative ? "#E53D2E" : "var(--slide-accent-text)",
                fontWeight: 700,
              }}
            >
              {delta}
            </span>
          )}
        </div>
      </div>
      <div className="relative w-full" style={{ height }}>
        {/* Feathered gradient row — the accent bloom itself */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${Math.max(4, Math.min(100, widthPct))}%`,
            background: bloom
              ? "linear-gradient(90deg, color-mix(in oklab, var(--slide-accent-text) 55%, transparent) 0%, color-mix(in oklab, var(--slide-accent-text) 30%, transparent) 55%, color-mix(in oklab, var(--slide-accent-text) 8%, transparent) 90%, transparent 100%)"
              : "linear-gradient(90deg, color-mix(in oklab, var(--slide-accent-text) 24%, transparent) 0%, color-mix(in oklab, var(--slide-accent-text) 10%, transparent) 65%, transparent 100%)",
            filter: bloom ? "blur(0.4px)" : "none",
          }}
        />
        {/* Radial halo + accent stroke tip on the highlight row */}
        {bloom && (
          <>
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: `calc(${Math.max(4, Math.min(100, widthPct))}% - 90px)`,
                top: "50%",
                width: 220,
                height: 220,
                transform: "translateY(-50%)",
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--slide-accent-text) 40%, transparent) 0%, color-mix(in oklab, var(--slide-accent-text) 12%, transparent) 45%, transparent 75%)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
            <div
              data-accent-glow
              aria-hidden
              style={{
                position: "absolute",
                left: `calc(${Math.max(4, Math.min(100, widthPct))}% - 1px)`,
                top: 0,
                width: 2,
                height: "100%",
                background: "var(--slide-accent-text)",
                boxShadow:
                  "0 0 14px 2px color-mix(in oklab, var(--slide-accent-text) 55%, transparent)",
                zIndex: 1,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Free-form report item. Reuses the MV-KPI-DASHBOARD language: kicker,
// hero numeral, delta line, no plate/border. Bloom variant adds a radial
// halo behind the numeral to establish primary reading.
function FreeformReportItem({
  brand,
  item,
  bloom,
}: {
  brand: BrandMode;
  item: Item;
  bloom?: boolean;
}) {
  const ink = useSlideInk();
  const delta = s(item.delta);
  const negative = delta.trim().startsWith("-");
  const meta = s(item.meta, negative ? "Reduction" : "Growth");
  return (
    <div className="relative">
      {bloom && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -60,
            top: -20,
            width: 360,
            height: 360,
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--slide-accent-text) 32%, transparent) 0%, color-mix(in oklab, var(--slide-accent-text) 10%, transparent) 45%, transparent 75%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      <div className="relative" style={{ zIndex: 1 }}>
        <Kicker brand={brand} color={negative ? "#E53D2E" : undefined}>
          {meta}
        </Kicker>
        <div
          className="mt-6 tabular-nums"
          style={{
            fontSize: bloom ? 132 : 108,
            fontWeight: 600,
            color: ink.strong,
            letterSpacing: "-0.04em",
            lineHeight: 0.9,
          }}
        >
          {delta || s(item.value)}
        </div>
        <div
          className="mt-6"
          style={{
            fontSize: fillPx(22, "body"),
            color: ink.muted,
            lineHeight: 1.4,
            letterSpacing: "-0.005em",
            maxWidth: 520,
          }}
        >
          {s(item.label)}
        </div>
        {toNums(item.series).length > 0 && (
          <div className="mt-8">
            <Sparkline brand={brand} values={toNums(item.series)} h={72} />
          </div>
        )}
      </div>
    </div>
  );
}

function SemiGauge({
  brand: _brand,
  percent,
  size = 260,
}: {
  brand: BrandMode;
  percent: number;
  size?: number;
}) {
  const ink = useSlideInk();
  const cs = useChartStyle();
  const id = useId().replace(/:/g, "");
  const p = Math.max(0, Math.min(100, percent));
  const stroke = ringBand(cs, size / 2) * 0.7;
  const r = (size - stroke) / 2;
  const sweep = Math.max(140, Math.min(300, cs.gaugeSweep));
  const cx = size / 2;
  const cy = size / 2 + (r / 2) * (sweep <= 200 ? 1 : 0.55);
  const start = -90 - sweep / 2;
  const pol = (deg: number) => {
    const rad = ((deg + 90) * Math.PI) / 180;
    return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)] as const;
  };
  const [sx, sy] = pol(start);
  const [ex, ey] = pol(start + sweep);
  const arcC = (sweep / 360) * 2 * Math.PI * r;
  const dash = (p / 100) * arcC;
  const arc = `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  const lowest = Math.max(pol(start)[1], pol(start + sweep)[1], cy);
  const h = Math.min(size, lowest + stroke + 10);
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} aria-hidden>
      <path
        d={arc}
        fill="none"
        stroke={ink.trackFill}
        strokeWidth={stroke}
        strokeLinecap={cs.ringCap === "round" ? "round" : "butt"}
      />
      <path
        d={arc}
        fill="none"
        stroke="var(--slide-accent-text)"
        strokeWidth={stroke}
        strokeLinecap={cs.ringCap === "round" ? "round" : "butt"}
        strokeDasharray={`${dash} ${arcC}`}
      />

      <text
        x={cx}
        y={cy - 24}
        textAnchor="middle"
        fontSize={size * 0.34}
        fontWeight={600}
        fill={ink.text}
        style={{ letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(p)}
      </text>
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize={size * 0.075}
        fontWeight={500}
        fill={ink.faint}
        style={{ letterSpacing: "0.22em" }}
      >
        %
      </text>
    </svg>
  );
}

function AreaChart({
  brand: _brand,
  series,
  height = 480,
}: {
  brand: BrandMode;
  series: { label: string; value: number }[];
  height?: number;
  bare?: boolean;
  airy?: boolean;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const id = useId().replace(/:/g, "");
  const w = 1000;
  const h = height;
  const padL = 20,
    padR = 20,
    padT = 20,
    padB = 60;
  const vals = series.map((p) => p.value);
  const max = Math.max(1, ...vals);
  const min = Math.min(0, ...vals);
  const range = max - min || 1;
  const step = series.length > 1 ? (w - padL - padR) / (series.length - 1) : 0;
  const pts = series.map((p, i) => ({
    x: padL + i * step,
    y: padT + (h - padT - padB) * (1 - (p.value - min) / range),
  }));
  const linePath = seriesPath(cs, pts);
  const lastPt = pts[pts.length - 1];
  const firstPt = pts[0];
  const areaPath =
    linePath && lastPt && firstPt
      ? `${linePath} L${lastPt.x.toFixed(1)},${h - padB} L${firstPt.x.toFixed(1)},${h - padB} Z`
      : "";
  // Category-label stride honours the industry's max-tick budget.
  const showEvery = labelStride(series.length);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <AiryDefs id={id} />
      <ChartField cs={cs} ink={ink} x0={padL} x1={w - padR} top={padT} bottom={h - padB} />
      <SeriesArea cs={cs} d={areaPath} id={id} gradient={`url(#${id}-airy)`} />
      <path
        d={linePath}
        fill="none"
        stroke="var(--slide-accent-text)"
        strokeWidth={lineWeight(cs, 2)}
        strokeDasharray={lineDash(cs)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SeriesMarkers cs={cs} pts={pts} />
      {lastPt && <circle cx={lastPt.x} cy={lastPt.y} r={4.5} fill="var(--slide-accent-text)" />}
      {series.map((p, i) =>
        i % showEvery === 0 || i === series.length - 1 ? (
          <text
            key={i}
            x={pts[i]?.x}
            y={h - padB + 28}
            textAnchor="middle"
            fontSize={chartLabelSize(16, fillScale)}
            fill={ink.faint}
            style={{ ...lt, fontVariantNumeric: "tabular-nums" }}
          >
            {capLabel(p.label)}
          </text>
        ) : null,
      )}

    </svg>
  );
}

function BarChart({
  brand: _brand,
  bars,
  height = 480,
  highlight,
}: {
  brand: BrandMode;
  bars: { label: string; value: number }[];
  height?: number;
  highlight?: string;
  bare?: boolean;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const id = useId().replace(/:/g, "");
  const w = 900;
  const h = height;
  const padL = 20,
    padR = 20,
    padT = 30,
    padB = 60;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(bars.length, 1);
  const barW = barWidth(cs, slot);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <AiryDefs id={id} />
      <ChartField cs={cs} ink={ink} x0={padL} x1={w - padR} top={padT} bottom={h - padB} />
      {bars.map((b, i) => {
        const bh = (b.value / max) * chartH;
        const x = padL + i * slot + (slot - barW) / 2;
        const y = h - padB - bh;
        const isHi = highlight ? b.label === highlight : false;
        const vl = barValueLabel(cs, y, bh);
        return (
          <g key={i}>
            <StyledBar
              cs={cs}
              ink={ink}
              x={x}
              y={y}
              w={barW}
              h={bh}
              fill={isHi ? `url(#${id}-airy)` : ink.trackFill}
              emphasis={isHi}
            />
            <text
              x={x + barW / 2}
              y={h - padB + 30}
              textAnchor="middle"
              fontSize={chartLabelSize(16, fillScale)}
              fill={ink.faint}
              style={{ ...lt, fontVariantNumeric: "tabular-nums" }}
            >
              {capLabel(b.label)}
            </text>
            {!vl.hide && (
              <text
                x={x + barW / 2}
                y={vl.y}
                textAnchor="middle"
                fontSize={chartLabelSize(isHi ? 26 : 18, fillScale)}
                fontWeight={600}
                fill={vl.inside ? ink.strong : isHi ? ink.text : ink.muted}
                style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
              >
                {b.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ReportCard({ brand, item }: { brand: BrandMode; item: Item }) {
  const ink = useSlideInk();
  const delta = s(item.delta);
  const negative = delta.trim().startsWith("-");
  return (
    <div>
      <Kicker brand={brand} color={negative ? "#E53D2E" : undefined}>
        {negative ? "Reduction" : "Growth"}
      </Kicker>
      <div
        className="mt-6"
        style={{
          fontSize: fillPx(96, "display"),
          fontWeight: 600,
          color: ink.text,
          letterSpacing: "-0.035em",
          lineHeight: 0.95,
        }}
      >
        {delta}
      </div>
      <div
        className="mt-6"
        style={{ fontSize: fillPx(26, "body"), color: ink.muted, lineHeight: 1.35, maxWidth: 520 }}
      >
        {s(item.label)}
      </div>
      <div className="mt-8">
        <Sparkline brand={brand} values={toNums(item.series)} h={80} />
      </div>
      {s(item.meta) && (
        <div
          className="mt-4 uppercase"
          style={{ fontSize: fillPx(16, "body"), letterSpacing: "0.28em", color: ink.faint, fontWeight: 600 }}
        >
          {s(item.meta)}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ brand: _brand, percent }: { brand: BrandMode; percent: number }) {
  const ink = useSlideInk();
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ position: "relative", height: 4, background: ink.trackFill, flex: 1 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: `${p}%`,
          background: "var(--slide-accent-text)",
        }}
      />
    </div>
  );
}

// ── Graph helpers (Batch 4) ────────────────────────────────────────────
function AxisBarChart({
  brand: _brand,
  bars,
  height = 480,
  highlight,
  unit,
}: {
  brand: BrandMode;
  bars: { label: string; value: number }[];
  height?: number;
  highlight?: string;
  unit?: string;
  bare?: boolean;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const id = useId().replace(/:/g, "");
  const w = 1720;
  const h = height;
  const padL = 90,
    padR = 40,
    padT = 40,
    padB = 60;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const niceMax = Math.ceil(max * 1.1);
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(bars.length, 1);
  const barW = barWidth(cs, slot);
  const ticks = 4;
  const hiValue = bars.find((b) => b.label === highlight)?.value;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <AiryDefs id={id} />
      <ChartField cs={cs} ink={ink} x0={padL} x1={w - padR} top={padT} bottom={h - padB} rows={ticks} />
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const y = padT + (chartH / ticks) * i;
        const val = niceMax * (1 - i / ticks);
        return (
          <text
            key={i}
            x={padL - 14}
            y={y + 5}
            textAnchor="end"
            fontSize={chartLabelSize(14, fillScale)}
            fill={ink.faint}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {val.toFixed(0)}
            {unit || ""}
          </text>
        );
      })}
      {bars.map((b, i) => {
        const bh = (b.value / niceMax) * chartH;
        const x = padL + i * slot + (slot - barW) / 2;
        const y = h - padB - bh;
        const isHi = highlight ? b.label === highlight : false;
        const vl = barValueLabel(cs, y, bh);
        return (
          <g key={i}>
            <StyledBar
              cs={cs}
              ink={ink}
              x={x}
              y={y}
              w={barW}
              h={bh}
              fill={isHi ? `url(#${id}-airy)` : `url(#${id}-glass)`}
              emphasis={isHi}
            />
            {isHi && hiValue !== undefined && !vl.hide && (
              <text
                x={x + barW / 2}
                y={vl.y}
                textAnchor="middle"
                fontSize={chartLabelSize(22, fillScale)}
                fontWeight={600}
                fill={vl.inside ? ink.strong : ink.text}
                style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
              >
                {b.value}
                {unit || ""}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={h - padB + 30}
              textAnchor="middle"
              fontSize={chartLabelSize(14, fillScale)}
              fill={ink.faint}
              style={{ ...lt, fontVariantNumeric: "tabular-nums" }}
            >
              {capLabel(b.label)}
            </text>
          </g>
        );
      })}

    </svg>
  );
}

function DonutBlock({ brand, item }: { brand: BrandMode; item: Item }) {
  const ink = useSlideInk();
  return (
    <div className="flex flex-col items-center text-center">
      <Kicker brand={brand}>{s(item.meta, "Snapshot")}</Kicker>
      <div className="mt-6">
        <Donut brand={brand} percent={Number(item.value) || 0} size={340} />
      </div>
      <div
        className="mt-8 uppercase"
        style={{ fontSize: fillPx(20, "body"), letterSpacing: "0.28em", color: ink.text, fontWeight: 600 }}
      >
        {s(item.label)}
      </div>
      <div
        className="mt-4"
        style={{ fontSize: fillPx(20, "body"), lineHeight: 1.45, color: ink.muted, maxWidth: 480 }}
      >
        {s(item.body)}
      </div>
    </div>
  );
}

function ConcentricRings({
  brand: _brand,
  items,
  size = 480,
}: {
  brand: BrandMode;
  items: { label: string; value: number }[];
  size?: number;
}) {
  const ink = useSlideInk();
  const cs = useChartStyle();
  const stroke = ringBand(cs, size / 2) * 0.55;
  const gap = 8 + cs.ringGap;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {items.map((it, i) => {
        const r = (size - stroke) / 2 - i * (stroke + gap);
        if (r <= 0) return null;
        const circ = 2 * Math.PI * r;
        const dash = (Math.max(0, Math.min(100, it.value)) / 100) * circ;
        const isPrimary = i === 0;
        return (
          <g key={i}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={ink.trackFill}
              strokeWidth={cs.grid === "none" ? stroke * 0.4 : stroke}
              opacity={cs.grid === "none" ? 0.6 : 1}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={isPrimary ? "var(--slide-accent-text)" : ink.strong}
              strokeOpacity={isPrimary ? 1 : Math.max(0.35, 0.85 - i * 0.15)}
              strokeWidth={stroke}
              strokeLinecap={cs.ringCap === "round" ? "round" : "butt"}
              strokeDasharray={`${dash} ${circ - dash}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </g>
        );
      })}
    </svg>
  );

}

function DecadeAreaChart({
  brand: _brand,
  series,
  height = 480,
  calloutLabel,
  calloutNote,
}: {
  brand: BrandMode;
  series: { label: string; value: number }[];
  height?: number;
  calloutLabel?: string;
  calloutNote?: string;
  bare?: boolean;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const id = useId().replace(/:/g, "");
  const w = 1720;
  const h = height;
  const padL = 30,
    padR = 30,
    padT = 40,
    padB = 60;
  const vals = series.map((p) => p.value);
  const max = Math.max(1, ...vals);
  const min = Math.min(0, ...vals);
  const range = max - min || 1;
  const step = series.length > 1 ? (w - padL - padR) / (series.length - 1) : 0;
  const pts = series.map((p, i) => ({
    x: padL + i * step,
    y: padT + (h - padT - padB) * (1 - (p.value - min) / range),
  }));
  const linePath = seriesPath(cs, pts);
  const lastPt = pts[pts.length - 1];
  const firstPt = pts[0];
  const areaPath =
    linePath && lastPt && firstPt
      ? `${linePath} L${lastPt.x.toFixed(1)},${h - padB} L${firstPt.x.toFixed(1)},${h - padB} Z`
      : "";
  const highlightIdx = series.findIndex((p) => p.label === calloutLabel);
  const hi = highlightIdx >= 0 ? pts[highlightIdx] : null;
  const showEvery = series.length > 10 ? 2 : 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <AiryDefs id={id} />
      <ChartField cs={cs} ink={ink} x0={padL} x1={w - padR} top={padT} bottom={h - padB} />
      <SeriesArea cs={cs} d={areaPath} id={id} gradient={`url(#${id}-airy)`} />
      <path
        d={linePath}
        fill="none"
        stroke="var(--slide-accent-text)"
        strokeWidth={lineWeight(cs, 2)}
        strokeDasharray={lineDash(cs)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SeriesMarkers cs={cs} pts={pts} />
      {series.map((p, i) =>
        i % showEvery === 0 || i === series.length - 1 ? (
          <text
            key={i}
            x={pts[i]?.x}
            y={h - padB + 30}
            textAnchor="middle"
            fontSize={chartLabelSize(14, fillScale)}
            fill={ink.faint}
            style={{ ...lt, fontVariantNumeric: "tabular-nums" }}
          >
            {capLabel(p.label)}
          </text>
        ) : null,
      )}
      {hi && (
        <g>
          <circle cx={hi.x} cy={hi.y} r={4.5} fill="var(--slide-accent-text)" />
          <line
            x1={hi.x}
            y1={hi.y - 12}
            x2={hi.x}
            y2={Math.max(hi.y - 96, 12)}
            stroke={ink.hairlineStrong}
            strokeWidth={1}
          />
          <text
            x={hi.x}
            y={Math.max(hi.y - 108, 20)}
            textAnchor="middle"
            fontSize={chartLabelSize(18, fillScale)}
            fontWeight={600}
            fill={ink.strong}
            style={{ letterSpacing: "-0.01em" }}
          >
            {calloutLabel}
          </text>
          <text
            x={hi.x}
            y={Math.max(hi.y - 84, 44)}
            textAnchor="middle"
            fontSize={chartLabelSize(14, fillScale)}
            fill={ink.muted}
          >
            {calloutNote}
          </text>
        </g>
      )}

    </svg>
  );
}

// ── Extended graph helpers ───────────────────────────────────────────────
function LineMultiChart({
  brand,
  series,
  xLabels,
  unit,
  height = 480,
}: {
  brand: BrandMode;
  series: { label: string; points: number[] }[];
  xLabels: string[];
  unit?: string;
  height?: number;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const w = 1720,
    h = height;
  const padL = 90,
    padR = 40,
    padT = 30,
    padB = 80;
  const cols = [brand.tokens.accent, brand.tokens.primary, ink.faint];
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
        <ChartField cs={cs} ink={ink} x0={padL} x1={w - padR} top={padT} bottom={h - padB} rows={ticks} />
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = padT + (chartH / ticks) * i;
          const val = niceMax * (1 - i / ticks);
          return (
            <text key={i} x={padL - 12} y={y + 6} textAnchor="end" fontSize={chartLabelSize(16, fillScale)} fill={ink.faint}>
              {Math.round(val)}
              {unit || ""}
            </text>
          );
        })}
        {series.map((sr, si) => {
          const pts = sr.points.map((v, i) => ({
            x: padL + i * step,
            y: padT + chartH * (1 - v / niceMax),
          }));
          const d = seriesPath(cs, pts);
          return (
            <g key={si}>
              <path
                d={d}
                fill="none"
                stroke={cols[si] || ink.strong}
                strokeWidth={lineWeight(cs, si === 0 ? 3 : 2)}
                strokeDasharray={si === 0 ? lineDash(cs) : lineDash(cs) || "8 7"}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={si === 0 ? 1 : 0.85}
              />
              <SeriesMarkers cs={cs} pts={pts} color={cols[si] || ink.strong} base={si === 0 ? 5 : 4} />
            </g>
          );
        })}
        {xLabels.map((lb, i) => (
          <text
            key={i}
            x={padL + i * step}
            y={h - padB + 34}
            textAnchor="middle"
            fontSize={chartLabelSize(16, fillScale)}
            fill={ink.faint}
            style={lt}
          >
            {lb}
          </text>
        ))}

      </svg>
      <div className="mt-2 flex flex-wrap gap-6">
        {series.map((sr, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ fontSize: fillPx(16, "body"), color: ink.muted }}
          >
            <span
              style={{
                display: "inline-block",
                width: 22,
                height: 3,
                background: cols[i] || ink.strong,
              }}
            />
            <span style={{ fontWeight: 600, color: ink.strong }}>{sr.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StackedBarChart({
  brand,
  segments,
  columns,
  unit,
  height = 480,
}: {
  brand: BrandMode;
  segments: { label: string }[];
  columns: { label: string; values: number[] }[];
  unit?: string;
  height?: number;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const id = useId().replace(/:/g, "");
  const w = 1720,
    h = height;
  const padL = 90,
    padR = 40,
    padT = 30,
    padB = 80;
  const totals = columns.map((c) => c.values.reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...totals);
  const niceMax = Math.ceil(max * 1.1);
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(columns.length, 1);
  const barW = barWidth(cs, slot);
  const cols = [brand.tokens.accent, brand.tokens.primary, ink.faint];
  const ticks = 4;
  const segFill = (si: number) =>
    si === 0 ? `url(#${id}-airy)` : si === 1 ? `url(#${id}-glass)` : `url(#${id}-glass-mute)`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
        <AiryDefs id={id} />
        <ChartField cs={cs} ink={ink} x0={padL} x1={w - padR} top={padT} bottom={h - padB} rows={ticks} />
        {columns.map((col, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          let yCursor = h - padB;
          const topIdx = col.values.reduce((acc, v, idx) => (v > 0 ? idx : acc), 0);
          return (
            <g key={i}>
              {col.values.map((v, si) => {
                const bh = (v / niceMax) * chartH;
                yCursor -= bh;
                const y = yCursor;
                if (si === topIdx)
                  return (
                    <StyledBar
                      key={si}
                      cs={cs}
                      ink={ink}
                      x={x}
                      y={y}
                      w={barW}
                      h={bh}
                      fill={segFill(si)}
                      emphasis={si === 0}
                    />
                  );
                return (
                  <rect
                    key={si}
                    x={x}
                    y={y}
                    width={barW}
                    height={bh}
                    fill={segFill(si)}
                    stroke="var(--slide-accent-text)"
                    strokeOpacity={si === 0 ? 0.5 : 0.2}
                    strokeWidth={1}
                  />
                );
              })}
              <text
                x={x + barW / 2}
                y={h - padB + 32}
                textAnchor="middle"
                fontSize={chartLabelSize(16, fillScale)}
                fill={ink.faint}
                style={lt}
              >
                {col.label}
              </text>
            </g>
          );
        })}

      </svg>
      <div className="mt-3 flex flex-wrap gap-6">
        {segments.map((sg, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ fontSize: fillPx(16, "body"), color: ink.muted }}
          >
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                background: cols[i] || ink.strong,
                opacity: i === 0 ? 0.75 : 0.45 - i * 0.1,
                border: `1px solid ${ink.hairlineStrong}`,
              }}
            />
            <span style={{ fontWeight: 600, color: ink.strong }}>{sg.label}</span>
          </div>
        ))}
        {unit && (
          <div style={{ fontSize: fillPx(14, "kicker"), color: ink.faint, marginLeft: "auto" }}>Units: {unit}</div>
        )}
      </div>
    </div>
  );
}

function StackedAreaChart({
  brand,
  series,
  xLabels,
  unit,
  height = 480,
}: {
  brand: BrandMode;
  series: { label: string; points: number[] }[];
  xLabels: string[];
  unit?: string;
  height?: number;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const w = 1720,
    h = height;
  const padL = 60,
    padR = 40,
    padT = 30,
    padB = 80;
  const n = Math.max(...series.map((s) => s.points.length), 1);
  const totals = Array.from({ length: n }, (_, i) =>
    series.reduce((a, s) => a + (s.points[i] || 0), 0),
  );
  const max = Math.max(1, ...totals);
  const niceMax = Math.ceil(max * 1.1);
  const chartH = h - padT - padB;
  const step = n > 1 ? (w - padL - padR) / (n - 1) : 0;
  const cols = [brand.tokens.accent, brand.tokens.primary, ink.faint, ink.hairlineStrong];
  let stacks = Array(n).fill(0) as number[];
  const layers = series.map((sr, si) => {
    const bottom = stacks.slice();
    const top = stacks.map((v, i) => v + (sr.points[i] || 0));
    stacks = top;
    const topPts = top.map((v, i) => ({
      x: padL + i * step,
      y: padT + chartH * (1 - v / niceMax),
    }));
    const botPts = bottom
      .map((v, i) => ({ x: padL + i * step, y: padT + chartH * (1 - v / niceMax) }))
      .reverse();
    const d = `${seriesPath(cs, topPts)} ${botPts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} Z`;
    return { d, color: cols[si] || ink.strong, si };
  });
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
        <ChartField cs={cs} ink={ink} x0={padL} x1={w - padR} top={padT} bottom={h - padB} />
        {layers.map((l) => (
          <path
            key={l.si}
            d={l.d}
            fill={l.color}
            opacity={l.si === 0 ? 0.32 : Math.max(0.08, 0.22 - l.si * 0.05)}
            stroke={l.color}
            strokeOpacity={l.si === 0 ? 0.7 : 0.35}
            strokeWidth={lineWeight(cs, 1.5)}
          />
        ))}
        {xLabels.map((lb, i) => (
          <text
            key={i}
            x={padL + i * step}
            y={h - padB + 34}
            textAnchor="middle"
            fontSize={chartLabelSize(16, fillScale)}
            fill={ink.faint}
            style={lt}
          >
            {lb}
          </text>
        ))}

      </svg>
      <div className="mt-3 flex flex-wrap gap-6">
        {series.map((sr, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ fontSize: fillPx(16, "body"), color: ink.muted }}
          >
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                background: cols[i] || ink.strong,
                opacity: i === 0 ? 0.95 : 0.7 - i * 0.15,
              }}
            />
            <span style={{ fontWeight: 600, color: ink.strong }}>{sr.label}</span>
          </div>
        ))}
        {unit && (
          <div style={{ fontSize: fillPx(14, "kicker"), color: ink.faint, marginLeft: "auto" }}>Units: {unit}</div>
        )}
      </div>
    </div>
  );
}

function WaterfallChart({
  brand: _brand,
  steps,
  unit,
  height = 500,
}: {
  brand: BrandMode;
  steps: { label: string; value: number; kind: "start" | "up" | "down" | "end" }[];
  unit?: string;
  height?: number;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const cs = useChartStyle();
  const lt = labelType(cs);
  const capLabel = useChartLabelCap();
  const labelStride = useChartLabelStride();
  const w = 1720,
    h = height;
  const padL = 90,
    padR = 40,
    padT = 40,
    padB = 90;
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(steps.length, 1);
  const barW = barWidth(cs, slot);

  let running = 0;
  const bars = steps.map((st) => {
    if (st.kind === "start" || st.kind === "end") {
      running = st.value;
      return { base: 0, top: st.value, kind: st.kind, label: st.label, value: st.value };
    }
    const base = running;
    running += st.value;
    return {
      base: Math.min(base, running),
      top: Math.max(base, running),
      kind: st.kind,
      label: st.label,
      value: st.value,
    };
  });
  const maxVal = Math.max(1, ...bars.map((b) => b.top));
  const niceMax = Math.ceil(maxVal * 1.1);
  const scale = (v: number) => padT + chartH * (1 - v / niceMax);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <ChartField cs={cs} ink={ink} x0={padL} x1={w - padR} top={padT} bottom={h - padB} rows={4} />

      {bars.map((b, i) => {
        const x = padL + i * slot + (slot - barW) / 2;
        const y = scale(b.top);
        const bh = scale(b.base) - scale(b.top);
        // Glass encoding: start/end = strong glass; up = accent bloom; down = muted glass.
        let fillOpacity = 0.22;
        let strokeOpacity = 0.55;
        let fill: string = "var(--slide-accent-text)";
        if (b.kind === "up") {
          fillOpacity = 0.42;
          strokeOpacity = 0.7;
        } else if (b.kind === "down") {
          fillOpacity = 0.12;
          strokeOpacity = 0.3;
          fill = ink.strong;
        }
        const prev = bars[i - 1];
        return (
          <g key={i}>
            {prev && (
              <line
                x1={x - (slot - barW)}
                y1={scale(
                  prev.kind === "start" || prev.kind === "end"
                    ? prev.top
                    : b.kind === "up"
                      ? b.base
                      : b.top,
                )}
                x2={x}
                y2={scale(
                  prev.kind === "start" || prev.kind === "end"
                    ? prev.top
                    : b.kind === "up"
                      ? b.base
                      : b.top,
                )}
                stroke={ink.hairline}
                strokeDasharray="3 3"
              />
            )}
            <g opacity={strokeOpacity < 0.4 ? 0.85 : 1}>
              <StyledBar
                cs={cs}
                ink={ink}
                x={x}
                y={y}
                w={barW}
                h={Math.max(2, bh)}
                fill={fill}
                fillOpacity={fillOpacity}
                emphasis={b.kind === "up" || b.kind === "end"}
              />
            </g>
            <text
              x={x + barW / 2}
              y={y - 12}
              textAnchor="middle"
              fontSize={chartLabelSize(16, fillScale)}
              fontWeight={600}
              fill={b.kind === "down" ? ink.muted : ink.text}
              style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}
            >
              {b.kind === "up" ? "+" : b.kind === "down" ? "−" : ""}
              {Math.abs(b.value).toFixed(1)}
              {unit || ""}
            </text>
            <text
              x={x + barW / 2}
              y={h - padB + 30}
              textAnchor="middle"
              fontSize={chartLabelSize(13, fillScale)}
              fill={ink.faint}
              style={lt}
            >

              {capLabel(b.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BubbleChart({
  brand,
  items,
  axisX,
  axisY,
  height = 560,
}: {
  brand: BrandMode;
  items: { label: string; x: number; y: number; size: number }[];
  axisX: string;
  axisY: string;
  height?: number;
}) {
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const w = 1720,
    h = height;
  const padL = 110,
    padR = 60,
    padT = 40,
    padB = 90;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const maxSize = Math.max(1, ...items.map((i) => i.size));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line
          key={i}
          x1={padL}
          y1={padT + chartH * t}
          x2={w - padR}
          y2={padT + chartH * t}
          stroke={ink.hairline}
          strokeWidth={1}
        />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line
          key={`v${i}`}
          x1={padL + chartW * t}
          y1={padT}
          x2={padL + chartW * t}
          y2={h - padB}
          stroke={ink.hairline}
          strokeWidth={1}
        />
      ))}
      <line
        x1={padL}
        y1={h - padB}
        x2={w - padR}
        y2={h - padB}
        stroke={ink.hairlineStrong}
        strokeWidth={1}
      />
      <line
        x1={padL}
        y1={padT}
        x2={padL}
        y2={h - padB}
        stroke={ink.hairlineStrong}
        strokeWidth={1}
      />
      {items.map((it, i) => {
        const cx = padL + (it.x / 100) * chartW;
        const cy = padT + (1 - it.y / 100) * chartH;
        const r = 20 + (it.size / maxSize) * 60;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="var(--slide-accent-text)" opacity={0.28} />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="var(--slide-accent-text)"
              strokeWidth={2}
            />
            <text
              x={cx}
              y={cy + 6}
              textAnchor="middle"
              fontSize={chartLabelSize(22, fillScale)}
              fontWeight={700}
              fill={ink.strong}
            >
              {it.label}
            </text>
          </g>
        );
      })}
      <text
        x={w / 2}
        y={h - 24}
        textAnchor="middle"
        fontSize={chartLabelSize(16, fillScale)}
        fill={ink.faint}
        style={{ letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}
      >
        {axisX} →
      </text>
      <text
        x={30}
        y={h / 2}
        textAnchor="middle"
        fontSize={chartLabelSize(16, fillScale)}
        fill={ink.faint}
        style={{ letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}
        transform={`rotate(-90 30 ${h / 2})`}
      >
        {axisY} →
      </text>
    </svg>
  );
}

function HeatmapChart({
  brand,
  rows,
  cols,
  cells,
  min,
  max,
}: {
  brand: BrandMode;
  rows: string[];
  cols: string[];
  cells: number[][];
  min: number;
  max: number;
}) {
  const ink = useSlideInk();
  const range = Math.max(1, max - min);
  return (
    <div>
      <div
        className="grid"
        style={{ gridTemplateColumns: `160px repeat(${cols.length}, minmax(0, 1fr))`, gap: 4 }}
      >
        <div />
        {cols.map((c, i) => (
          <div
            key={i}
            className="text-center uppercase"
            style={{
              fontSize: fillPx(14, "kicker"),
              letterSpacing: "0.24em",
              color: ink.faint,
              fontWeight: 600,
              paddingBottom: 8,
            }}
          >
            {c}
          </div>
        ))}
        {rows.map((r, ri) => (
          <Fragment key={ri}>
            <div
              className="pr-4 flex items-center justify-end uppercase"
              style={{ fontSize: fillPx(14, "kicker"), letterSpacing: "0.2em", color: ink.strong, fontWeight: 600 }}
            >
              {r}
            </div>
            {cols.map((_, ci) => {
              const v = cells[ri]?.[ci] ?? 0;
              const t = Math.max(0, Math.min(1, (v - min) / range));
              return (
                <div
                  key={ci}
                  style={{
                    aspectRatio: "2.35 / 1",
                    background: brand.tokens.accent,
                    opacity: 0.15 + t * 0.85,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: fillPx(22, "body"), fontWeight: 700, color: ink.strong }}>{v}</span>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span
          className="uppercase"
          style={{ fontSize: fillPx(11, "kicker"), letterSpacing: "0.24em", color: ink.faint, fontWeight: 600 }}
        >
          Low
        </span>
        <div
          style={{
            flex: 1,
            height: 6,
            background: `linear-gradient(90deg, ${hexA(brand.tokens.accent, 0.133)}, ${brand.tokens.accent})`,
          }}
        />
        <span
          className="uppercase"
          style={{ fontSize: fillPx(11, "kicker"), letterSpacing: "0.24em", color: ink.faint, fontWeight: 600 }}
        >
          High
        </span>
        <span style={{ fontSize: fillPx(12, "kicker"), color: ink.faint }}>
          {min}–{max}
        </span>
      </div>
    </div>
  );
}

function Treemap({
  brand,
  items,
  height = 560,
}: {
  brand: BrandMode;
  items: { label: string; value: number; meta?: string }[];
  height?: number;
}) {
  const capLabel = useChartLabelCap();
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  // Simple squarified layout: sort desc, slice vertically then horizontally alternately.
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const w = 1720;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const rects: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    value: number;
    meta?: string;
  }[] = [];
  let x = 0,
    y = 0,
    remW = w,
    remH = height;
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
      x += rw;
      remW -= rw;
    } else {
      const rh = remH * share;
      rects.push({ x, y, w: remW, h: rh, label: it.label, value: it.value, meta: it.meta });
      y += rh;
      remH -= rh;
    }
    remainingTotal -= it.value;
    vertical = !vertical;
  }
  const cols = [
    brand.tokens.accent,
    brand.tokens.primary,
    ink.muted,
    ink.faint,
    ink.hairlineStrong,
  ];
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden
    >
      {rects.map((r, i) => (
        <g key={i}>
          <rect
            x={r.x + 4}
            y={r.y + 4}
            width={Math.max(0, r.w - 8)}
            height={Math.max(0, r.h - 8)}
            fill={cols[i] || ink.strong}
            opacity={i === 0 ? 1 : 0.9}
          />
          <text
            x={r.x + 24}
            y={r.y + 42}
            fontSize={r.w > 380 ? 26 : 18}
            fontWeight={700}
            fill={ink.strong}
            style={{ letterSpacing: "-0.01em" }}
          >
            {capLabel(r.label)}
          </text>
          {/* The share sits a full cap-height below the label baseline so the
              two never collide in narrow tiles. */}
          <text
            x={r.x + 24}
            y={r.y + (r.w > 380 ? 98 : 78)}
            fontSize={r.w > 380 ? 40 : 24}
            fontWeight={700}
            fill={ink.strong}
            style={{ letterSpacing: "-0.02em" }}
          >
            {r.value}%
          </text>
          {r.meta && r.w > 260 && r.h > 160 && (
            <text
              x={r.x + 24}
              y={r.y + (r.w > 380 ? 136 : 112)}
              fontSize={chartLabelSize(16, fillScale)}
              fill={ink.muted}
            >
              {r.meta}
            </text>
          )}

        </g>
      ))}
    </svg>
  );
}

function ComboChart({
  brand,
  points,
  barLabel,
  barUnit,
  lineLabel,
  lineUnit,
  height = 520,
}: {
  brand: BrandMode;
  points: { label: string; bar: number; line: number }[];
  barLabel: string;
  barUnit?: string;
  lineLabel: string;
  lineUnit?: string;
  height?: number;
}) {
  const capLabel = useChartLabelCap();
  const fillScale = useOpenSpaceFill();
  const ink = useSlideInk();
  const w = 1720,
    h = height;
  const padL = 100,
    padR = 100,
    padT = 30,
    padB = 90;
  const chartH = h - padT - padB;
  const slot = (w - padL - padR) / Math.max(points.length, 1);
  const barW = slot * 0.5;
  const barMax = Math.max(1, ...points.map((p) => p.bar));
  const lineMax = Math.max(1, ...points.map((p) => p.line));
  const niceBar = Math.ceil(barMax * 1.15);
  const niceLine = Math.ceil(lineMax * 1.05);
  const pts = points.map(
    (p, i) =>
      [padL + i * slot + slot / 2, padT + chartH * (1 - p.line / niceLine)] as [number, number],
  );
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
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={ink.hairline} strokeWidth={1} />
              <text x={padL - 12} y={y + 6} textAnchor="end" fontSize={chartLabelSize(14, fillScale)} fill={ink.faint}>
                {bv.toFixed(1)}
                {barUnit || ""}
              </text>
              <text
                x={w - padR + 12}
                y={y + 6}
                textAnchor="start"
                fontSize={chartLabelSize(14, fillScale)}
                fill="var(--slide-accent-text)"
              >
                {Math.round(lv)}
                {lineUnit || ""}
              </text>
            </g>
          );
        })}
        {points.map((p, i) => {
          const bh = (p.bar / niceBar) * chartH;
          const x = padL + i * slot + (slot - barW) / 2;
          const y = h - padB - bh;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={bh}
                rx={3}
                fill="var(--slide-accent-text)"
                fillOpacity={0.18}
                stroke="var(--slide-accent-text)"
                strokeOpacity={0.45}
                strokeWidth={1}
              />
              <text
                x={x + barW / 2}
                y={h - padB + 32}
                textAnchor="middle"
                fontSize={chartLabelSize(16, fillScale)}
                fill={ink.faint}
                style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
              >
                {capLabel(p.label)}
              </text>
            </g>
          );
        })}
        <path
          d={d}
          fill="none"
          stroke="var(--slide-accent-text)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={6} fill="var(--slide-accent-text)" />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-6">
        <div className="flex items-center gap-2" style={{ fontSize: fillPx(16, "body"), color: ink.muted }}>
          <span
            style={{
              display: "inline-block",
              width: 16,
              height: 16,
              background: brand.tokens.primary,
              opacity: 0.85,
            }}
          />
          <span style={{ fontWeight: 600, color: ink.strong }}>{barLabel}</span>
        </div>
        <div className="flex items-center gap-2" style={{ fontSize: fillPx(16, "body"), color: ink.muted }}>
          <span
            style={{
              display: "inline-block",
              width: 22,
              height: 3,
              background: brand.tokens.accent,
            }}
          />
          <span style={{ fontWeight: 600, color: ink.strong }}>{lineLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ─── MV-FUNNEL interactive stage ──────────────────────────────────────────
// Each band is a button: hover/focus reveals a compact tooltip and a click
// expands a detail drawer with the stage value, audience drop-off and the
// key message. Purely presentational state — nothing persists.
export function FunnelStageBand({
  brand,
  inkStrong,
  accent,
  primary,
  index,
  total,
  label,
  note,
  value,
  unit,
  icon,
  widthPct,
  taper,
  depth,
  meterPct,
  drop,
  retained,
  style,
}: {
  brand: BrandMode;
  inkStrong: string;
  accent: string;
  primary: string;
  index: number;
  total: number;
  label: string;
  note: string;
  value: string;
  unit: string;
  icon: string;
  widthPct: number;
  taper: number;
  depth: number;
  meterPct: number;
  drop: number;
  retained: number;
  style?: ResolvedFunnelStyle;
}) {
  const fstyle = style ?? resolveFunnelStyle(undefined, brand);
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const stageNo = String(index + 1).padStart(2, "0");
  const showTip = hover && !open;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex w-full justify-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          aria-expanded={open}
          aria-label={`Stage ${stageNo}: ${label}. ${value}${unit || "%"}${
            drop > 0 ? `, ${drop}% drop-off from the previous stage` : ""
          }. Show details.`}
          className="relative block overflow-hidden text-left transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            width: `${widthPct}%`,
            height: 148,
            clipPath: `polygon(0% 0%, 100% 0%, ${100 - taper}% 100%, ${taper}% 100%)`,
            background: funnelBandBackground(fstyle, depth),
            boxShadow: `inset 0 1px 0 color-mix(in oklab, white 26%, transparent)`,
            transform: hover || open ? "translateY(-2px)" : "none",
          }}
        >
          {/* ghost stage numeral */}
          <div
            className="pointer-events-none absolute tabular-nums select-none"
            style={{
              left: `${taper + 1}%`,
              top: -34,
              fontSize: fillPx(190, "display"),
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.05em",
              color: "white",
              opacity: funnelGhostOpacity(fstyle, hover || open),
            }}
          >
            {stageNo}
          </div>
          {/* sheen */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: funnelSheenBackground(fstyle, hover || open),
            }}
          />
          <div
            className="relative flex h-full items-center justify-between"
            style={{
              paddingLeft: `calc(${taper}% + 44px)`,
              paddingRight: `calc(${taper}% + 44px)`,
              color: inkStrong,
            }}
          >
            <div className="flex items-center gap-6">
              <IconBadge
                brand={brand}
                label={label}
                index={index}
                size="md"
                override={icon}
                treatment="on-dark"
                tone="onDark"
              />
              <div>
                <div className="uppercase" style={{ fontSize: fillPx(14, "kicker"), letterSpacing: "0.3em", opacity: 0.75 }}>
                  Stage {stageNo}
                </div>
                <div className="mt-1.5" style={{ fontSize: fillPx(34, "figure"), fontWeight: 600, letterSpacing: "-0.02em" }}>
                  {label}
                </div>
                {note && (
                  <div className="mt-1" style={{ fontSize: fillPx(18, "body"), opacity: 0.82 }}>
                    {note}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div
                className="tabular-nums font-semibold"
                style={{ fontSize: fillPx(64, "display"), letterSpacing: "-0.03em", lineHeight: 0.95 }}
              >
                {value}
                <span className="ml-1" style={{ fontSize: fillPx(26, "body"), opacity: 0.85 }}>
                  {unit || "%"}
                </span>
              </div>
              <div
                className="ml-auto mt-3 overflow-hidden rounded-full"
                style={{ width: 132, height: 4, background: "color-mix(in oklab, white 22%, transparent)" }}
              >
                <div
                  style={{
                    width: `${meterPct}%`,
                    height: "100%",
                    background: "color-mix(in oklab, white 82%, transparent)",
                  }}
                />
              </div>
            </div>
          </div>
        </button>

        {/* hover / focus tooltip */}
        {showTip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-20 rounded-2xl px-5 py-4 shadow-2xl"
            style={{
              top: "50%",
              right: `calc(${(100 - widthPct) / 2}% - 18px)`,
              transform: "translate(100%, -50%)",
              maxWidth: 320,
              background: "color-mix(in oklab, var(--slide-surface, white) 94%, transparent)",
              border: `1px solid color-mix(in oklab, ${accent} 34%, transparent)`,
              color: inkStrong,
            }}
          >
            <div className="uppercase" style={{ fontSize: fillPx(11, "kicker"), letterSpacing: "0.24em", opacity: 0.6 }}>
              Stage {stageNo} of {String(total).padStart(2, "0")}
            </div>
            <div className="mt-1" style={{ fontSize: fillPx(20, "body"), fontWeight: 600 }}>
              {value}
              <span style={{ fontSize: fillPx(13, "kicker"), opacity: 0.75 }}>{unit || "%"}</span>
              <span style={{ fontSize: fillPx(14, "kicker"), fontWeight: 400, opacity: 0.7 }}> · {label}</span>
            </div>
            <div className="mt-1" style={{ fontSize: fillPx(13, "kicker"), opacity: 0.78 }}>
              {drop > 0 ? `${drop}% of the previous stage drops off` : "Top of funnel — full audience"}
            </div>
            <div className="mt-2" style={{ fontSize: fillPx(11, "kicker"), letterSpacing: "0.18em", opacity: 0.5 }}>
              CLICK FOR DETAIL
            </div>
          </div>
        )}
      </div>

      {/* click-to-expand detail drawer */}
      {open && (
        <div
          className="mt-3 w-full rounded-2xl px-7 py-5"
          style={{
            width: `${widthPct}%`,
            background: `color-mix(in oklab, ${accent} 10%, transparent)`,
            border: `1px solid color-mix(in oklab, ${accent} 28%, transparent)`,
            color: inkStrong,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <Detail label="Value" value={`${value}${unit || "%"}`} inkStrong={inkStrong} />
            <Detail
              label="Audience drop-off"
              value={drop > 0 ? `−${drop}% vs previous` : "Baseline"}
              inkStrong={inkStrong}
            />
            <Detail label="Retained of top" value={`${retained}%`} inkStrong={inkStrong} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1 uppercase"
              style={{
                fontSize: fillPx(11, "kicker"),
                letterSpacing: "0.22em",
                border: `1px solid color-mix(in oklab, ${inkStrong} 24%, transparent)`,
                color: inkStrong,
                opacity: 0.7,
              }}
            >
              Close
            </button>
          </div>
          <div className="mt-4" style={{ fontSize: fillPx(12, "kicker"), letterSpacing: "0.22em", opacity: 0.55 }}>
            KEY MESSAGE
          </div>
          <div className="mt-1" style={{ fontSize: fillPx(20, "body"), lineHeight: 1.45, opacity: 0.92 }}>
            {note || `${label} — ${value}${unit || "%"} of the audience reaches this stage.`}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  inkStrong,
}: {
  label: string;
  value: string;
  inkStrong: string;
}) {
  return (
    <div style={{ color: inkStrong }}>
      <div className="uppercase" style={{ fontSize: fillPx(11, "kicker"), letterSpacing: "0.22em", opacity: 0.55 }}>
        {label}
      </div>
      <div className="mt-1 tabular-nums" style={{ fontSize: fillPx(24, "body"), fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}
