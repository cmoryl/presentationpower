// ────────────────────────────────────────────────────────────────────────────
// VariantRenderer — orchestration only.
//
// Every module family (203 variants) now lives in ./modules/* and claims its
// ids through ./module-registry. This file's remaining job is to resolve the
// per-slide environment — skin, mode, brand tokens, accent override, template
// treatment, open-space fill, backdrop, client logo pool — publish it through
// context, and hand off to the registered module. Shared UI blocks live in
// ./module-primitives and ./module-kit.
// ────────────────────────────────────────────────────────────────────────────
import * as React from "react";
import type { ReactNode } from "react";
import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";
import type { SlideTextFormats } from "@/lib/slide-text-format";
import type { LogoOrientation } from "@/lib/logo-placement";
import {
  SlideModeContext,
  SlideBackdropContext,
  SlideSceneSeedContext,
  SlideOwnsMediaContext,
  SlideAccentContext,
  SlideInkContext,
  makeSlideInk,
  type SlideMode,
  type SlideBackdrop,
} from "./SlideChrome";
import { SlideTextFormatLayer } from "./SlideTextFormatLayer";
import { useResolvedImageUrl } from "@/lib/slide-media-refresh";
import { resolveSlideBackground } from "@/lib/background-library";
import { backdropForVariant } from "./variantBackdrop";
import { useSlideSkin, SlideSkinProvider } from "./SlideSkinContext";
import { useStylePack } from "./StylePackContext";
import { dashLook, type DashLook } from "@/lib/dash-look";
import { OpenSpaceFillProvider } from "./OpenSpaceFill";
import {
  SlideTemplateProvider,
  templateFillOverride,
  useTemplateIndustry,
} from "./SlideTemplateContext";
import { resolveSlideTemplate } from "@/lib/section-templates";
import { StatArrangementProvider, StatLayoutProvider } from "./StatLayoutContext";
import { resolveStatLayout } from "@/lib/stat-layouts";
import { isStatArrangement } from "@/lib/stat-arrangements";

import { enterpriseWhiteBrand, isEnterpriseWhite, type SlideSkin } from "@/lib/slide-skin";
import { accentInk } from "@/lib/accent-tokens";
import { useClientLogoPool } from "@/lib/client-logo-pool";
import { overlayLogoHubFillers } from "@/lib/logohub-fillers";
import { ImportedFaithfulSlide, readImportedRef } from "./ImportedFaithfulSlide";
import { applySlideAccent } from "@/lib/slide-accent";
import { findSlideModule } from "./module-registry";
import { SlideFrame, SlideFrameCtx, SlideTitle, s } from "./module-kit";
export { pickIcon } from "./module-primitives";

// One canonical registration entry point. Keeping a second hand-maintained
// import list here previously let the renderer and registry consumers drift.
import "./modules/register-all";

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
