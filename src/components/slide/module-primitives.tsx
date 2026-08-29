// Shared slide-module primitives: icon resolution, cards/grids, media tiles,
// sparklines and the freeform chart family. Extracted out of `VariantRenderer`
// so registry modules import them directly instead of going through kit slots.

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
import "./modules/team";
import "./modules/business";
import "./modules/advanced";
import "./modules/editorial";
import "./modules/locations";


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

import { iconByName, parseIconRef } from "@/lib/icon-library";
import { approvedIconForLabel } from "@/lib/brand-icon-sets";
import { IconRenderer } from "@/components/IconRenderer";
import { applySlideAccent } from "@/lib/slide-accent";
import { getDivisionImagery } from "@/assets/backdrops/divisions";
import { GRAIN_SVG } from "@/components/slide/grain";

export type IconType = typeof Sparkles;

export const ICON_KEYWORDS: Array<[RegExp, IconType]> = [
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

export const DEFAULT_ICONS: IconType[] = [Target, Layers3, Workflow, LineChart, Users, Rocket];

export const packIconCompCache = new Map<string, IconType>();

export function packIconComponent(packId: string, name: string): IconType {
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

export function IconBadge({
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

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Real photographic backdrops used inside MediaTile.
// MediaTile now pulls from division-specific image repositories keyed by brand id.

export function PlayOverlay({
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

export function VideoHoverControls({
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

export type VideoPlaybackState = { currentTime: number; userStarted: boolean; paused: boolean };

export const videoPlaybackStore = new Map<string, VideoPlaybackState>();

export const registeredVideos = new Map<HTMLVideoElement, string>();

export function pauseAllVideosExcept(active: HTMLVideoElement | null) {
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

export function MediaTile({
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

export function CardGrid({
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

export function AuroraStatGrid({
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

export function AuroraStatCell({
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

export function NumberedList({
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

export function Card({
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

export function Sparkline({
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

export function DotGridBackdrop(_props: { opacity?: number } = {}) {
  return null;
}

export function SummaryStatCard({
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

export function FreeformAreaChart({
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

export function FreeformBarChart({
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

export function FreeformSvgDefs({ id }: { id: string }) {
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

export function FreeformDonut({
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

export function FreeformSemiGauge({
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

export function DashMetricViz({
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

export function DashSeriesViz({
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
