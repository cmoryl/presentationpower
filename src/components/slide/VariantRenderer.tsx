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
import {
  DeviceFrame,
  DeviceScreenPlaceholder,
  deviceKindFrom,
} from "@/components/device/DeviceFrame";
import { AccentRule, FlowArrow, ProcessRail } from "./Connectors";
import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";
import {
  SlideFrame as BaseSlideFrame,
  SlideModeContext,
  SlideBackdropContext,
  SlideSceneSeedContext,
  SlideOwnsMediaContext,
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
} from "@/lib/slide-media-refresh";
import { resolveSlideBackground } from "@/lib/background-library";
import { statGradient } from "@/lib/stat-contrast";
import { foregroundOn } from "@/lib/export-foreground";
import { backdropForVariant } from "./variantBackdrop";
import { useSlideSkin, SlideSkinProvider } from "./SlideSkinContext";
import { useStylePack } from "./StylePackContext";
import { lookGlyphColor } from "@/lib/look-brand";
import { dashLook, type DashChart, type DashLook } from "@/lib/dash-look";
import {
  OpenSpaceFillProvider,
  useChartLabelCap,
  useChartLabelStride,
  useOpenSpaceFill,
} from "./OpenSpaceFill";
import { chartLabelSize, fillPx, statPx, STAT_FIT_STYLE, clampLines } from "@/lib/open-space-fill";
import { useChartStyle } from "./ChartStyleContext";
// Shared chart primitives now live in ./chart-primitives so the extracted
// graph family and this renderer draw from one implementation.
import {
  AiryDefs,
  ChartField,
  StyledBar,
  barValueLabel,
  SeriesArea,
  SeriesMarkers,
  Donut,
  type ChartInk,
} from "./chart-primitives";
// Graph-family chart components live in ./charts.
import {
  AxisBarChart,
  BubbleChart,
  ComboChart,
  ConcentricRings,
  DecadeAreaChart,
  DonutBlock,
  HeatmapChart,
  LineMultiChart,
  ProgressBar,
  StackedAreaChart,
  StackedBarChart,
  Treemap,
  WaterfallChart,
} from "./charts";
// Graph family (MV-GRAPH-*) is owned by the module registry.
import "./modules/graph";
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
import { gamesMediaPool } from "@/lib/games-scene-art";

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
  ORBIT_MAX_SEGMENTS,
  ORBIT_R,
  ORBIT_VB_PAD,
  ORBIT_VB_W,
  layoutOrbitLabels,
  orbitLegendDensity,
  orbitSegmentAlpha,
} from "@/lib/orbit-label-layout";

import { findSlideModule } from "./module-registry";
import {
  SlideFrame,
  SlideFrameCtx,
  SlideTitle,
  arr,
  lastWord,
  obj,
  s,
  strs,
  truthy,
  registerKitPrimitives,
  type Item,
} from "./module-kit";
import "./modules/viz";
import "./modules/timeline";
import "./modules/process";
import "./modules/bento";
import "./modules/quote";
import "./modules/logos";
import "./modules/close";
import "./modules/stat";
import { HeroScrim } from "./HeroScrim";
import "./modules/opening";
import "./modules/dashboard";
import "./modules/image";
import "./modules/info";
import "./modules/narrative";


import { HouseArrow } from "./HouseArrow";
import { EchoArrow, coerceEchoArrowVariant } from "./EchoArrow";
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
import { itemTone, itemToneEnd, toneWashGradient, tonePlateGradient } from "@/lib/item-tone";

import { ClientLogoImg, pickLogoForMode } from "./client-logo";
import { useClientLogoMark, useClientLogoPool } from "@/lib/client-logo-pool";
import { overlayLogoHubFillers } from "@/lib/logohub-fillers";

import { ImportedFaithfulSlide, readImportedRef } from "./ImportedFaithfulSlide";

// CLIENT logo chip for case-study modules. Resolution order:
//   1. the deck's real clientLogoUrl (explicitly picked in the editor)
//   2. a matching / deterministic mark from the LogoHub client roster
//   3. a neutral wordmark of the client name
// A TransPerfect brand or division lockup is NEVER used here — the mark on a
// case study must always represent the client being highlighted.
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
  const hubMark = useClientLogoMark({
    clientName,
    seed: clientName || "client",
    mode: mode === "dark" ? "dark" : "light",
  });
  const src = clientLogoUrl || hubMark?.url || null;
  const displayName = clientName || hubMark?.name || "Client";
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
      {src ? (
        <img
          src={src}
          alt={`${displayName} logo`}
          style={{ height: size, width: "auto", maxWidth: size * 4, objectFit: "contain" }}
        />
      ) : (
        <span
          className="uppercase"
          style={{
            fontSize: fillPx(15, "body"),
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: mode === "dark" ? "rgba(255,255,255,0.92)" : "rgba(3,0,44,0.9)",
          }}
        >
          {displayName}
        </span>
      )}
    </div>
  );
}

// Module-scoped context so helper components (CardGrid, StatGrid, NumberedList,
// etc.) automatically pick up the current slide's clientName + layoutId when
// they wrap themselves in <SlideFrame>. VariantRenderer sets the value once
// per render.
import type { LogoPosition, LogoOrientation } from "@/lib/logo-placement";


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
    size: sizeToken && ICON_SIZES[sizeToken as IconSizeToken] ? (sizeToken as IconSizeToken) : size,
    treatment: treatment ?? (legacyOnDark ? "on-dark" : "soft-tile"),
    emphasis,
    a11yRole: ariaLabel ? "semantic" : "decorative",
  });
  const dims = ICON_SIZES[spec.size];
  const badgeMode = useContext(SlideModeContext);
  const badgePack = useStylePack();
  const colors = resolveEmphasisColors(
    brand,
    spec.treatment,
    spec.emphasis,
    badgeMode,
    lookGlyphColor(badgePack?.id),
  );
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

// `fillInk` now lives in `module-kit.tsx` so extracted families share it.

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
  // Bare-surface skins (e.g. Organic Systems S21) draw NO translucent boxes,
  // rings, or glow plates around content — copy sits directly on the ground.
  const bareSurfaces = activePack?.card.bg === "transparent";

  // CLIENT-facing logo modules (logo walls, client matrices, case logo grids)
  // must show real client marks. Any seeded/legacy content that still points at
  // a TransPerfect brand asset (/brand-logos/*) — or has no mark at all — is
  // re-filled from the LogoHub roster. Author-picked client logos are kept.
  const logoPool = useClientLogoPool();
  const rawContent = slide.content as Record<string, unknown>;
  const c = React.useMemo(() => {
    if (!logoPool.length) return rawContent;
    const json = JSON.stringify(rawContent ?? {});
    const needsClientMarks = /\/brand-logos\//.test(json) || !/logoUrl/.test(json);
    if (!needsClientMarks) return rawContent;
    return overlayLogoHubFillers(rawContent, variant.id, logoPool);
  }, [rawContent, logoPool, variant.id]);

  const contentClientName = s((slide.content as Record<string, unknown>).clientName) || undefined;
  const resolvedClient = clientName || contentClientName;
  // Optional per-slide accent override (`content.accentOverride`, a hex string).
  // Admin-authored one-off overrides still work, but brand/division selection
  // itself no longer changes the TransPerfect module palette.
  const rawBrand: BrandMode = applySlideAccent(slide, brand);
  // The Enterprise skin re-tokens the palette to the approved light/dark
  // template. An authorized per-slide accent override must survive that, so
  // re-apply it afterwards (division scope still never changes the palette).
  const baseBrand: BrandMode = enterprise
    ? applySlideAccent(slide, enterpriseWhiteBrand(rawBrand, mode))
    : rawBrand;


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
  // Fallback: the approved Enterprise brand system in dark mode auto-applies
  // the corporate 10-gradient backdrop set when the slide has no explicit
  // background configured. Division changes never swap the module backdrop.
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
        // Author picked this background in the editor — it outranks the style
        // pack's generated ground so the swap shows up live.
        authored: true,
      }
    : fallbackBackdrop;

  return (
    <SlideSkinProvider skin={skin}>
      <SlideModeContext.Provider value={mode}>
        <SlideAccentContext.Provider value={themedBrand?.tokens?.accent ?? null}>
          <SlideInkContext.Provider value={semanticInk}>
            <SlideBackdropContext.Provider value={backdrop}>
              {/* Modules that paint their own photography/video keep their own
                  scrims; every other module lets an authored background image
                  replace its built-in vector decoration. */}
              <SlideOwnsMediaContext.Provider
                value={Boolean(
                  s((c as Record<string, unknown>).mediaUrl) ||
                    s((c as Record<string, unknown>).mediaPath) ||
                    s((c as Record<string, unknown>).videoUrl) ||
                    s((c as Record<string, unknown>).videoPath),
                )}
              >
              {/* Module vocabulary for background selection. The chrome only
                knows "cover | content | divider | close", which is far too
                coarse to pick a plate — publish the real module identity so the
                active style pack grounds each module with the scene its
                composition wants (stats, chart, bento, timeline, split, quote). */}
              <SlideSceneSeedContext.Provider
                value={`mod:${variant.id} ${variant.id} ${variant.name} ${variant.familyId}`}
              >
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
                         bareSurfaces,
                       })}
                    </StatLayoutProvider>
                  </div>
                </SlideFrameCtx.Provider>
              </SlideSceneSeedContext.Provider>
              </SlideOwnsMediaContext.Provider>
            </SlideBackdropContext.Provider>
          </SlideInkContext.Provider>
        </SlideAccentContext.Provider>
      </SlideModeContext.Provider>
    </SlideSkinProvider>
  );
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
  bareSurfaces = false,
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
  /** Bare-surface skins (e.g. Organic Systems S21): no translucent content boxes. */
  bareSurfaces?: boolean;
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
    return (
      <ImportedFaithfulSlide deckId={importedRef.deckId} slideIndex={importedRef.slideIndex} />
    );
  }

  // Module registry first: families that have been extracted out of the legacy
  // switch below claim their variants here (see module-registry.ts). Anything
  // unclaimed falls through to the switch, so extraction is incremental.
  const registered = findSlideModule(variant.id);
  if (registered) {
    return registered.render({
      slide,
      variant,
      brand,
      pageNumber,
      c,
      mode,
      clientName,
      clientLogoUrl,
      dash,
      bareSurfaces,
      isDark,
      ink,
      accentTone,
    });
  }


  switch (variant.id) {
    // ── Opening ────────────────────────────────────────────────────────
    case "MV-OP-INTRO-TEAM":
    case "MV-TEAM-BIOS-3":
    case "MV-TEAM-BIOS-4": {
      const people = arr(c.items);
      const cols = people.length === 4 ? 4 : people.length === 2 ? 2 : 3;
      const portraitPx = cols === 4 ? 168 : 200;
      const roleColor = isDark ? "rgba(255,255,255,0.62)" : "rgba(10,15,28,0.58)";
      const cardBg = bareSurfaces
        ? "transparent"
        : isDark
          ? "rgba(255,255,255,0.03)"
          : "rgba(10,15,28,0.02)";
      const cardRing = bareSurfaces
        ? "transparent"
        : isDark
          ? "rgba(255,255,255,0.10)"
          : "rgba(10,15,28,0.08)";
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
                     border: bareSurfaces ? "none" : `1px solid ${cardRing}`,
                     backgroundImage: bareSurfaces
                       ? undefined
                       : `radial-gradient(120% 60% at 50% -20%, ${brand.tokens.accent}${isDark ? "1F" : "14"} 0%, transparent 60%)`,
                   }}
                 >
                   {!bareSurfaces && (
                     <div
                       aria-hidden
                       className="absolute inset-x-0 top-0 h-[3px]"
                       style={{
                         background: `linear-gradient(90deg, ${brand.tokens.accent} 0%, ${hexA(brand.tokens.accent, 0.0)} 85%)`,
                       }}
                     />
                   )}
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
    // The narrative family (MV-CTX-*, MV-SOL-*, MV-INS-*, MV-PROOF-*) now
    // lives in `modules/narrative.tsx`.

    // The process family (MV-PROC-TIMELINE/STEP-CHAIN/PHASES/STEP-SPOTLIGHT)
    // now lives in `modules/process.tsx`.


    // MV-PROC-STAGE-ORBITS and MV-PROC-BEFORE-AFTER now live in `modules/process.tsx`.


    // The MV-INFO-* diagram family now lives in `modules/info.tsx`.

    // Remaining MV-PROC-* variants now live in `modules/process.tsx`.

    // The MV-PROOF-TESTIMONIAL spread now lives in `modules/narrative.tsx`.

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
            <GlassTile
              radius={26}
              padding="px-12 py-10"
              className="slide-fill-stretch mt-12 flex flex-col"
            >
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
                        <div
                          className="flex gap-4 py-3"
                          style={{ fontSize: fillPx(22, "body"), lineHeight: 1.35 }}
                        >
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
              <StatFigure
                brand={brand}
                value={s(c.amount)}
                unit={s(c.unit)}
                size="xl"
                icon={s(c.icon)}
                iconSize={s(c.iconSize)}
              />
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
                    <span
                      style={{ fontSize: fillPx(20, "body"), color: "var(--slide-accent-text)" }}
                    >
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
              <StatFigure
                brand={brand}
                value={s(c.metric)}
                label="Outcome"
                size="md"
                icon={s(c.icon)}
                iconSize={s(c.iconSize)}
              />
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
                  icon={s(it.icon)}
                  iconSize={s(it.iconSize)}
                />
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
                style={{
                  fontSize: fillPx(42, "figure"),
                  fontWeight: 600,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                }}
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
            <div className="max-w-6xl text-5xl font-medium leading-tight">
              {s(c.recommendation)}
            </div>
            <div className="mt-8 max-w-5xl text-3xl opacity-75">{s(c.rationale)}</div>
          </div>
        </SlideFrame>
      );

    // The closing family (MV-CLOSE-*) now lives in `modules/close.tsx`.

    // ── Extended covers ────────────────────────────────────────────────
    case "MV-SHOW-LAPTOP":
    case "MV-SHOW-MONITOR": {
      const kind = deviceKindFrom(
        c.deviceKind,
        variant.id === "MV-SHOW-MONITOR" ? "monitor" : "laptop",
      );
      const tone = (["graphite", "silver", "ink"] as const).includes(s(c.deviceTone) as "graphite")
        ? (s(c.deviceTone) as "graphite" | "silver" | "ink")
        : kind === "monitor"
          ? "ink"
          : "graphite";
      const hasMedia = Boolean(s(c.mediaUrl) || s(c.mediaPath) || s(c.videoUrl) || s(c.videoPath));
      const screen = hasMedia ? (
        <MediaTile
          brand={brand}
          seed={s(c.mediaSeed, s(c.title, "device"))}
          overrideUrl={s(c.mediaUrl)}
          fit={s(c.mediaFit) || "cover"}
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
      ) : (
        <DeviceScreenPlaceholder accent="var(--slide-accent-text)" />
      );

      if (kind === "monitor") {
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="flex h-full flex-col items-center justify-center">
              {s(c.eyebrow) && <Kicker brand={brand}>{s(c.eyebrow)}</Kicker>}
              <div className="mt-4 text-center">
                <SlideTitle brand={brand} title={s(c.title)} />
              </div>
              <div className="mt-10 w-[64%]">
                <DeviceFrame kind="monitor" tone={tone} accent="var(--slide-accent-text)">
                  {screen}
                </DeviceFrame>
              </div>
              {s(c.body) && (
                <SupportingText
                  size="lg"
                  opacity={0.85}
                  className="mt-10 text-center"
                  maxWidthPx={1000}
                >
                  {s(c.body)}
                </SupportingText>
              )}
              {s(c.caption) && (
                <MetaRow className="mt-6">
                  <span>{s(c.caption)}</span>
                </MetaRow>
              )}
            </div>
          </SlideFrame>
        );
      }

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[1.15fr_1fr] items-center gap-16">
            <DeviceFrame kind="laptop" tone={tone} accent="var(--slide-accent-text)">
              {screen}
            </DeviceFrame>
            <div className="flex flex-col justify-center">
              {s(c.eyebrow) && <Kicker brand={brand}>{s(c.eyebrow)}</Kicker>}
              <div className="mt-4">
                <SlideTitle brand={brand} title={s(c.title)} />
              </div>
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
    }

    // The MV-INFO-* diagram family now lives in `modules/info.tsx`.

    // ── Client & image matrix layouts ─────────────────────────────────
    case "MV-CLIENT-MATRIX": {
      const rows = arr(c.items).slice(0, 6);
      // Two-row layouts have to fit the same 1080px stage as a single row, so
      // the card rhythm compresses instead of overflowing off the slide.
      const dense = rows.length > 3;
      const nums = rows.map((it) => Number(String(s(it.metric)).replace(/[^0-9.]/g, "")) || 0);
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
                      icon={s(it.icon)}
                      iconSize={s(it.iconSize)}
                    />
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
                        overrideUrl={s(it.mediaUrl)}
                        mediaPath={s(it.mediaPath)}
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
                      {/* The logo IS the client name — showing both duplicates the
                          brand. When a logo is present the wordmark carries the
                          identity and the text drops to an accessible label. */}
                      <div className="mt-4 flex items-center gap-4">
                        {logoUrl || logoPath ? (
                          <>
                            <ClientLogoImg
                              path={logoPath}
                              url={logoUrl}
                              alt={s(it.client) ? `${s(it.client)} logo` : "Client logo"}
                              style={{ maxHeight: 44, maxWidth: 190, objectFit: "contain" }}
                            />
                            <span className="sr-only">{s(it.client)}</span>
                          </>
                        ) : (
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
                        )}
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
                        <StatFigure
                          brand={brand}
                          value={s(it.metric)}
                          size="md"
                          icon={s(it.icon)}
                          iconSize={s(it.iconSize)}
                        />
                      </div>
                    </GlassTile>
                  );
                })}
            </div>
          </div>
        </SlideFrame>
      );

    // ── Expanded CTA / close variants ─────────────────────────────────
    // The closing family (MV-CLOSE-*) now lives in `modules/close.tsx`.

    // ── Advanced variants — BATCH 1 ──────────────────────────────────────
    // MV-BENTO-5/6/7/8 now live in `modules/bento.tsx` (module registry).

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
        const m = String(v).replace(/[^0-9.-]/g, "");
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
                              style={{
                                fontSize: fillPx(12, "kicker"),
                                letterSpacing: "0.3em",
                                color: ink.faint,
                              }}
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
                        style={{
                          width: "42%",
                          borderLeft: `1px solid ${ink.hairline}`,
                          paddingLeft: 22,
                        }}
                      >
                        <div
                          className="uppercase font-mono"
                          style={{
                            fontSize: fillPx(11, "kicker"),
                            letterSpacing: "0.28em",
                            color: ink.faint,
                          }}
                        >
                          Trailing 14 periods
                        </div>
                        <div className="mt-3">
                          <Sparkline brand={brand} values={series} w={420} h={168} peakPin />
                        </div>
                        <div
                          className="mt-2 flex justify-between font-mono"
                          style={{
                            fontSize: fillPx(11, "kicker"),
                            letterSpacing: "0.18em",
                            color: ink.faint,
                          }}
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
                              <span style={{ color: ink.faint, fontSize: fillPx(16, "body") }}>
                                {" "}
                                · {unit}
                              </span>
                            )}
                          </div>
                        </div>
                        {delta && (
                          <div className="mt-3 flex items-center gap-2.5">
                            {chip(tInk, arrow, delta, 14)}
                            <span style={{ color: ink.faint, fontSize: fillPx(14, "kicker") }}>
                              vs. baseline
                            </span>
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
                            style={{
                              fontSize: fillPx(16, "body"),
                              color: ink.muted,
                              letterSpacing: "-0.005em",
                            }}
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
                      style={{
                        fontSize: fillPx(16, "body"),
                        color: ink.muted,
                        letterSpacing: "-0.005em",
                      }}
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
        const raw =
          typeof it.value === "number"
            ? it.value
            : Number(String(it.value ?? "").replace(/[^0-9.]/g, ""));
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
                  <IconBadge
                    brand={brand}
                    label={st.label}
                    index={i}
                    size="md"
                    override={st.icon}
                  />
                )}
              />
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-FLYWHEEL": {
      const items = arr(c.items).slice(0, 6);
      const list = items.length
        ? items
        : [{ label: "Create" }, { label: "Localize" }, { label: "Publish" }, { label: "Measure" }];
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
      const pt = (t: number, r = R) => ({
        x: CX + Math.cos(ang(t)) * r,
        y: CY + Math.sin(ang(t)) * r,
      });
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col">
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div
              className="mt-8 grid flex-1 items-center gap-12"
              style={{ gridTemplateColumns: "660px 1fr" }}
            >
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
                      style={{
                        fontSize: fillPx(15, "kicker"),
                        lineHeight: 1.35,
                        color: ink.muted,
                        maxWidth: 200,
                      }}
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
                          override={s(it.icon)}
                          sizeToken={s(it.iconSize)}
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
                  <div
                    style={{
                      fontSize: fillPx(21, "body"),
                      lineHeight: 1.4,
                      color: ink.muted,
                      maxWidth: 640,
                    }}
                  >
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
                        <div
                          className="mt-1"
                          style={{ fontSize: 16.5, lineHeight: 1.4, color: ink.muted }}
                        >
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
                      override={s(it.icon)}
                      sizeToken={s(it.iconSize)}
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
                  <div
                    className="mt-2"
                    style={{ fontSize: fillPx(18, "body"), color: ink.muted, lineHeight: 1.4 }}
                  >
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
                        style={{
                          fontSize: fillPx(14, "kicker"),
                          letterSpacing: "0.28em",
                          color: ink.faint,
                        }}
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
                        background: isTarget
                          ? `${hexA(brand.tokens.accent, 0.078)}`
                          : "transparent",
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
                      override={s(it.icon)}
                      sizeToken={s(it.iconSize)}
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
                  <div
                    className="mt-2"
                    style={{ fontSize: fillPx(20, "body"), lineHeight: 1.42, color: ink.body }}
                  >
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
                      override={s(it.icon)}
                      sizeToken={s(it.iconSize)}
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
                  <div
                    className="mt-2"
                    style={{ fontSize: fillPx(18, "body"), lineHeight: 1.42, color: ink.body }}
                  >
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
                  icon={s(c.icon)}
                  iconSize={s(c.iconSize)}
                />
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
                      <span
                        style={{
                          fontSize: fillPx(52, "figure"),
                          fontWeight: 500,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {s(it.unit)}
                      </span>
                    )}
                  </div>
                  {s(it.note) && (
                    <div
                      className="mt-8"
                      style={{
                        fontSize: fillPx(20, "body"),
                        lineHeight: 1.5,
                        color: ink.muted,
                        maxWidth: 460,
                      }}
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
                      i > 0 ? `1px solid color-mix(in oklab, ${tone} 16%, transparent)` : undefined,
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
                      color: emphasis
                        ? ink.strong
                        : "color-mix(in oklab, currentColor 82%, transparent)",
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
                      icon={s(before.icon)}
                      iconSize={s(before.iconSize)}
                    />
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
                  <StatFigure
                    brand={brand}
                    value={s(after.value)}
                    unit={s(after.unit)}
                    size="xl"
                    icon={s(after.icon)}
                    iconSize={s(after.iconSize)}
                  />
                </div>
                <div
                  className="mt-6"
                  style={{ fontSize: fillPx(24, "body"), lineHeight: 1.42, color: ink.body }}
                >
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
                style={{
                  fontSize: fillPx(20, "body"),
                  letterSpacing: "0.28em",
                  color: ink.faint,
                  fontWeight: 500,
                }}
              >
                {s(c.pronunciation)}
              </span>
              <span
                style={{
                  fontSize: fillPx(24, "body"),
                  color: "var(--slide-accent-text)",
                  fontWeight: 600,
                }}
              >
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
    // Every MV-DASH-* treatment now lives in `modules/dashboard.tsx`
    // (module registry).

    // ── Typographic statistics family ───────────────────────────────────
    // Every MV-STAT-* treatment now lives in `modules/stat.tsx`
    // (module registry).


    // ── Editorial hero tier ───────────────────────────────────────────────
    case "MV-ED-HERO-BLEED": {
      const _len = s(c.title).length;
      const _size = _len > 70 ? "title" : _len > 40 ? "section" : "cover";
      return (
        // The type stack owns the lower-left of the frame, so the lockup signs
        // off in the clear upper-right corner instead of sitting under the
        // title (LF-05 would otherwise pin it bottom-left).
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover" logoPosition="top-right">
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
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover" logoPosition="top-right">
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
          <div
            data-on-media
            className="absolute inset-x-24 bottom-48 flex items-end justify-between gap-16 text-white"
          >
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
                <span style={{ fontSize: fillPx(130, "display"), marginLeft: 8 }}>
                  {s(c.unit, "%")}
                </span>
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

type LocationsInk = {
  strong: string;
  body: string;
  muted: string;
  faint: string;
  axis: string;
  divider: string;
  hairline: string;
  hairlineStrong: string;
  surface: string;
  surfaceRing: string;
  ringOnDark: string;
  onSurface: (hex: string) => string;
  accentText: string;
};

function renderLocationsVariant(
  variantId: string,
  brand: { id: string; tokens: { accent: string; primary: string } } & Record<string, unknown>,
  mode: SlideMode,
  ink: LocationsInk,
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
                        <span
                          style={{
                            fontSize: fillPx(12, "kicker"),
                            color: ink.muted,
                            marginLeft: 3,
                          }}
                        >
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
            style={{
              fontSize: fillPx(104, "display"),
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              color: ink.strong,
            }}
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
          style={{
            fontSize: fillPx(13, "kicker"),
            letterSpacing: "0.3em",
            color: ink.muted,
            fontWeight: 600,
          }}
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
      if (pos === "tl")
        Object.assign(v, {
          top: 0,
          left: 0,
          borderTop: `1px solid ${tick}`,
          borderLeft: `1px solid ${tick}`,
        });
      if (pos === "tr")
        Object.assign(v, {
          top: 0,
          right: 0,
          borderTop: `1px solid ${tick}`,
          borderRight: `1px solid ${tick}`,
        });
      if (pos === "bl")
        Object.assign(v, {
          bottom: 0,
          left: 0,
          borderBottom: `1px solid ${tick}`,
          borderLeft: `1px solid ${tick}`,
        });
      if (pos === "br")
        Object.assign(v, {
          bottom: 0,
          right: 0,
          borderBottom: `1px solid ${tick}`,
          borderRight: `1px solid ${tick}`,
        });
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
                    <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker"), marginTop: 6 }}>
                      Cities
                    </div>
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
                    <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker"), marginTop: 6 }}>
                      Regions
                    </div>
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
                    {it.unit && (
                      <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker") }}>
                        {it.unit}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <div style={{ color: ink.muted, fontSize: fillPx(13, "kicker") }}>
                      {it.label}
                    </div>
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
// HeroScrim now lives in ./HeroScrim (shared with the opening module family).

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
        <span
          data-on-fill
          className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-md backdrop-blur-sm"
        >
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
  // Games wears its authored plate kit for slide media too, so a Gaming cover
  // or split carries the same compositions as the template background instead
  // of the generic TP dark gradient set.
  const gamesPool =
    brand.id === "bm-tp-games" && pool !== "portrait"
      ? gamesMediaPool(mode === "light" ? "light" : "dark")
      : null;
  const tileBackdrops =
    pool === "portrait"
      ? HEADSHOTS
      : gamesPool && gamesPool.length > 0
        ? gamesPool
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
        icon={s(item.icon)}
        iconSize={s(item.iconSize)}
      />
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
              style={{
                fontSize: fillPx(48, "figure"),
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: ink.strong,
              }}
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
              <IconBadge
                brand={brand}
                label={label}
                index={i}
                size="md"
                override={s(it.icon)}
                sizeToken={s(it.iconSize)}
              />
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
  // Bare-surface skins (e.g. Organic Systems S21) render copy directly on the
  // ground — no translucent fill, ring, glow, or seam around the content.
  const bare = useStylePack()?.card.bg === "transparent";
  const cardBg = bare ? "transparent" : isDark ? "rgba(255,255,255,0.03)" : "rgba(10,15,28,0.02)";
  const cardRing = isDark ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.08)";
  const bodyColor = isDark ? "rgba(255,255,255,0.72)" : "rgba(10,15,28,0.68)";
  const titleColor = ink.strong;
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-3xl p-10"
      style={
        bare
          ? { background: "transparent" }
          : {
              background: cardBg,
              // Open-bottom frame: the hairline wraps the top and sides only, so the
              // card's gradient fades out into the ground instead of being boxed in.
              borderTop: `1px solid ${cardRing}`,
              borderLeft: `1px solid ${cardRing}`,
              borderRight: `1px solid ${cardRing}`,
              borderBottom: "1px solid transparent",
              backgroundImage: `radial-gradient(120% 90% at 0% 0%, ${brand.tokens.accent}${isDark ? "18" : "0C"} 0%, transparent 62%)`,
            }
      }
    >
      {/* Top accent bar — the signature seam of a keynote card. */}
      {!bare && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{
            background: `linear-gradient(90deg, ${accentInk(brand.tokens.accent, mode, 3)} 0%, ${hexA(accentInk(brand.tokens.accent, mode, 3), 0.0)} 80%)`,
          }}
        />
      )}
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
      <div
        className="mt-4"
        style={{ fontSize: fillPx(21, "body"), lineHeight: 1.4, color: bodyColor }}
      >
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
        style={{
          fontSize: fillPx(26, "body"),
          lineHeight: 1.38,
          letterSpacing: "-0.005em",
          color: bodyColor,
        }}
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
                  <div
                    style={{
                      fontSize: fillPx(12, "kicker"),
                      color: ink.muted,
                      marginTop: 2,
                      maxWidth: 220,
                    }}
                  >
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
        style={{
          fontSize: fillPx(11, "kicker"),
          letterSpacing: "0.24em",
          color: ink.text,
          fontWeight: 700,
        }}
      >
        {title}
      </div>
      <div
        style={{ fontSize: fillPx(14, "kicker"), color: ink.muted, lineHeight: 1.55, marginTop: 8 }}
      >
        {body}
      </div>
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
        style={{
          fontSize: fillPx(18, "body"),
          letterSpacing: "0.28em",
          color: ink.muted,
          fontWeight: 600,
        }}
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
          <span
            style={{
              fontSize: fillPx(40, "figure"),
              marginLeft: 8,
              color: "var(--slide-accent-text)",
            }}
          >
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
        <div
          className="flex flex-col items-center justify-center"
          style={{ minHeight: size * 0.7 }}
        >
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
          style={{
            fontSize: fillPx(16, "body"),
            letterSpacing: "0.28em",
            color: ink.faint,
            fontWeight: 600,
          }}
        >
          {s(item.meta)}
        </div>
      )}
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
                <div
                  className="uppercase"
                  style={{ fontSize: fillPx(14, "kicker"), letterSpacing: "0.3em", opacity: 0.75 }}
                >
                  Stage {stageNo}
                </div>
                <div
                  className="mt-1.5"
                  style={{
                    fontSize: fillPx(34, "figure"),
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                  }}
                >
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
                style={{
                  fontSize: fillPx(64, "display"),
                  letterSpacing: "-0.03em",
                  lineHeight: 0.95,
                }}
              >
                {value}
                <span className="ml-1" style={{ fontSize: fillPx(26, "body"), opacity: 0.85 }}>
                  {unit || "%"}
                </span>
              </div>
              <div
                className="ml-auto mt-3 overflow-hidden rounded-full"
                style={{
                  width: 132,
                  height: 4,
                  background: "color-mix(in oklab, white 22%, transparent)",
                }}
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
            <div
              className="uppercase"
              style={{ fontSize: fillPx(11, "kicker"), letterSpacing: "0.24em", opacity: 0.6 }}
            >
              Stage {stageNo} of {String(total).padStart(2, "0")}
            </div>
            <div className="mt-1" style={{ fontSize: fillPx(20, "body"), fontWeight: 600 }}>
              {value}
              <span style={{ fontSize: fillPx(13, "kicker"), opacity: 0.75 }}>{unit || "%"}</span>
              <span style={{ fontSize: fillPx(14, "kicker"), fontWeight: 400, opacity: 0.7 }}>
                {" "}
                · {label}
              </span>
            </div>
            <div className="mt-1" style={{ fontSize: fillPx(13, "kicker"), opacity: 0.78 }}>
              {drop > 0
                ? `${drop}% of the previous stage drops off`
                : "Top of funnel — full audience"}
            </div>
            <div
              className="mt-2"
              style={{ fontSize: fillPx(11, "kicker"), letterSpacing: "0.18em", opacity: 0.5 }}
            >
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
          <div
            className="mt-4"
            style={{ fontSize: fillPx(12, "kicker"), letterSpacing: "0.22em", opacity: 0.55 }}
          >
            KEY MESSAGE
          </div>
          <div
            className="mt-1"
            style={{ fontSize: fillPx(20, "body"), lineHeight: 1.45, opacity: 0.92 }}
          >
            {note || `${label} — ${value}${unit || "%"} of the audience reaches this stage.`}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, inkStrong }: { label: string; value: string; inkStrong: string }) {
  return (
    <div style={{ color: inkStrong }}>
      <div
        className="uppercase"
        style={{ fontSize: fillPx(11, "kicker"), letterSpacing: "0.22em", opacity: 0.55 }}
      >
        {label}
      </div>
      <div className="mt-1 tabular-nums" style={{ fontSize: fillPx(24, "body"), fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

// Hand the shared primitives to the module kit so extracted families
// (`modules/bento.tsx`, …) render the exact same badge and media tile the legacy
// switch draws. Function declarations hoist, so this runs safely at module eval.
registerKitPrimitives({
  pickIcon,
  Card,
  CardGrid,
  AuroraStatGrid,
  IconBadge,
  MediaTile,
  NumberedList,
  Sparkline,
  DashMetricViz,
  DashSeriesViz,
  SummaryStatCard,
});
