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

// Cache synthesized Lucide-shaped components per pack:name ref so React sees
// stable component identity across renders.
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
    // The team family (MV-OP-INTRO-TEAM, MV-TEAM-BIOS-*) now lives in `modules/team.tsx`.

    // ── Context & Challenge ───────────────────────────────────────────
    // The narrative family (MV-CTX-*, MV-SOL-*, MV-INS-*, MV-PROOF-*) now
    // lives in `modules/narrative.tsx`.

    // The process family (MV-PROC-TIMELINE/STEP-CHAIN/PHASES/STEP-SPOTLIGHT)
    // now lives in `modules/process.tsx`.


    // MV-PROC-STAGE-ORBITS and MV-PROC-BEFORE-AFTER now live in `modules/process.tsx`.


    // The MV-INFO-* diagram family now lives in `modules/info.tsx`.

    // Remaining MV-PROC-* variants now live in `modules/process.tsx`.

    // The MV-PROOF-TESTIMONIAL spread now lives in `modules/narrative.tsx`.

    // The business family (MV-DEC-*, MV-COMM-*, MV-RISK-*, MV-CASE-*, MV-GOV-*, MV-REC-*, MV-SHOW-*, MV-CLIENT-*) now lives in `modules/business.tsx`.

    // ── Expanded CTA / close variants ─────────────────────────────────
    // The closing family (MV-CLOSE-*) now lives in `modules/close.tsx`.

    // ── Advanced variants — BATCH 1 ──────────────────────────────────────
    // MV-BENTO-5/6/7/8 now live in `modules/bento.tsx` (module registry).

    // Bento — value grid + close. A full closing argument on one slide:
    // title + accent promise line, a lead-in band, a bento grid of value cells
    // (icon, coloured label, accent rule, proof line) and a two-clause close
    // band. Bands are the shared SummaryBand so geometry never drifts.
    // The advanced diagram family (bento value close, KPI dashboard, roadmap, funnel, flywheel, maturity curve, journey map, logo wall, 2x2 matrix, iceberg) now lives in `modules/advanced.tsx`.
    // The editorial family (spreads, manifesto, triptych, comparisons, pull quotes, definition, principles, countdown, horizon, MV-ED-* posters) now lives in `modules/editorial.tsx`.
    // The locations family (MV-LOC-*) now lives in `modules/locations.tsx`.

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
