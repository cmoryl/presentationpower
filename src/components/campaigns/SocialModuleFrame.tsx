// SocialModuleFrame — renders any print section module inside a social format.
//
// Print modules are authored at page width with `cqw` typography. This frame
// gives them an inline-size container at a *virtual* page width, scales the
// whole block into the format's safe rect, and auto-escalates the relief
// ladder (social-module-fit.ts) until the module fits without overlapping the
// platform chrome or clipping at the trim. The measured fit is reported back so
// the studio can show a health banner and offer an AI refit.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { PrintSectionRenderer } from "@/components/print/sections/PrintSectionRenderer";
import { PrintDocModeProvider, PRINT_ICON_STYLE_DEFAULT } from "@/components/print/print-doc-mode";
import { PrintPageProvider } from "@/components/print/print-page-context";
import { BrandLockup } from "@/components/BrandLockup";
import { BRAND_MODES } from "@/lib/taxonomy";
import type { PrintSection } from "@/lib/print-assets.types";
import type { SocialFormat } from "@/lib/social-formats";
import {
  computeSocialFit,
  nextRelief,
  reliefAt,
  socialSafeRect,
  type SocialFitRelief,
  type SocialFitResult,
} from "@/lib/social-module-fit";
import { applyReliefToSection } from "@/lib/social-module-layouts";

export type SocialModuleFrameProps = {
  format: SocialFormat;
  section: PrintSection;
  brandId: string;
  mode: "light" | "dark";
  /** Display size of the short edge in CSS px (the frame renders at format px). */
  displayShortEdge?: number;
  /** Pin the relief rung instead of auto-fitting. */
  reliefLevel?: number;
  /** Draw the safe-area / overflow debug overlay. */
  showSafeArea?: boolean;
  /** Report the measured fit (auto-fit result included). */
  onFit?: (fit: SocialFitResult, relief: SocialFitRelief) => void;
  /** Hide the brand lockup (e.g. tiny picker thumbnails). */
  hideLockup?: boolean;
};

function accentFor(brandId: string): string {
  return BRAND_MODES.find((b) => b.id === brandId)?.tokens.accent ?? "#003FC7";
}

export function SocialModuleFrame({
  format,
  section,
  brandId,
  mode,
  displayShortEdge = 320,
  reliefLevel,
  showSafeArea = false,
  onFit,
  hideLockup = false,
}: SocialModuleFrameProps) {
  const accent = accentFor(brandId);
  const brand = BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0];
  const short = Math.min(format.width, format.height);
  const displayScale = displayShortEdge / short;
  const safe = useMemo(() => socialSafeRect(format), [format]);

  const measureRef = useRef<HTMLDivElement>(null);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [autoLevel, setAutoLevel] = useState(0);
  // Growth index climbs only while the module reads too small, and never past a
  // rung that already overflowed — that ceiling is what keeps the
  // measure/decide/render loop from oscillating.
  const [growthIndex, setGrowthIndex] = useState(0);
  const growthCeiling = useRef(SOCIAL_GROWTH_MAX);

  const pinned = typeof reliefLevel === "number";
  const relief = reliefAt(pinned ? (reliefLevel as number) : autoLevel);
  const rendered = useMemo(() => applyReliefToSection(section, relief), [section, relief]);
  const growth = SOCIAL_GROWTH_STEPS[Math.min(growthIndex, growthCeiling.current)];

  const fit = useMemo(
    () => computeSocialFit({ format, naturalHeight, relief, growth }),
    [format, naturalHeight, relief, growth],
  );

  // Reset both ladders whenever the inputs change so we always start from the
  // most generous rung — both ladders are monotonic, so this terminates.
  useEffect(() => {
    if (!pinned) setAutoLevel(0);
    setGrowthIndex(0);
    growthCeiling.current = SOCIAL_GROWTH_MAX;
  }, [pinned, section, format.id]);

  // Measure the module at the current virtual page width. rAF-coalesced and
  // threshold-damped, the same discipline the print preview frame uses.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    let raf = 0;
    let last = -1;
    const measure = () => {
      raf = 0;
      const h = el.offsetHeight;
      if (Math.abs(h - last) > 0.75) {
        last = h;
        setNaturalHeight(h);
      }
    };
    measure();
    const ro = new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [rendered, fit.pageWidth]);

  // Auto-escalate relief until the module clears the safe rect; when it clears
  // with room to spare, enlarge instead so short modules fill the frame.
  useEffect(() => {
    if (naturalHeight <= 0) return;
    if (!fit.ok) {
      // Enlarging caused (or failed to fix) the overflow: pin the ceiling below
      // the current rung before touching relief.
      if (growthIndex > 0) {
        growthCeiling.current = Math.min(growthCeiling.current, growthIndex - 1);
        setGrowthIndex(growthIndex - 1);
        return;
      }
      if (pinned) return;
      const next = nextRelief(fit, relief);
      if (next) setAutoLevel(next.level);
      return;
    }
    const grow = nextGrowthStep(fit, growthIndex);
    if (grow !== null && grow <= growthCeiling.current) setGrowthIndex(grow);
  }, [pinned, naturalHeight, fit, relief, growthIndex]);

  useEffect(() => {
    if (naturalHeight > 0) onFit?.(fit, relief);
    // onFit is a reporting sink; re-running on identity churn would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, relief, naturalHeight]);

  const ink = mode === "dark" ? "#FFFFFF" : "#03002C";
  const paper = mode === "dark" ? "#03002C" : "#FFFFFF";
  // Center the module inside the safe rect so short modules never leave a
  // lopsided band at one edge.
  const top = safe.top + Math.max(0, (safe.height - fit.renderedHeight) / 2);
  const lockupPad = safe.left * 0.55;

  return (
    <div
      style={{ width: format.width * displayScale, height: format.height * displayScale }}
      className="relative overflow-hidden"
    >
      <div
        style={{
          width: format.width,
          height: format.height,
          transform: `scale(${displayScale})`,
          transformOrigin: "top left",
          background: paper,
          color: ink,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Division aura ground — keeps social frames on-brand without fighting
            the module's own surfaces. */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              mode === "dark"
                ? `radial-gradient(120% 90% at 12% 0%, ${accent}55 0%, transparent 62%), radial-gradient(90% 70% at 100% 100%, ${accent}33 0%, transparent 60%)`
                : `radial-gradient(120% 90% at 10% 0%, ${accent}1f 0%, transparent 60%), radial-gradient(90% 70% at 100% 100%, ${accent}14 0%, transparent 58%)`,
          }}
        />

        {/* Live module, scaled into the safe rect. */}
        <div
          style={{
            position: "absolute",
            left: safe.left,
            top,
            width: safe.width,
            height: Math.min(fit.renderedHeight, safe.height),
            overflow: "hidden",
          }}
        >
          <div
            ref={measureRef}
            className="[container-type:inline-size]"
            style={{
              width: fit.pageWidth,
              transform: `scale(${fit.scale})`,
              transformOrigin: "top left",
              ["--print-page-pad" as string]: "0px",
              ["--print-page-pad-top" as string]: "0px",
            }}
          >
            <PrintPageProvider size="Letter" margin="standard">
              <PrintDocModeProvider icons={relief.icons} iconStyle={PRINT_ICON_STYLE_DEFAULT}>
                <PrintSectionRenderer section={rendered} mode={mode} accent={accent} />
              </PrintDocModeProvider>
            </PrintPageProvider>
          </div>
        </div>

        {!hideLockup && brand ? (
          <div style={{ position: "absolute", left: safe.left, bottom: lockupPad }}>
            <BrandLockup brand={brand} color={ink} size={short >= 1400 ? "sm" : "xs"} />
          </div>
        ) : null}

        {showSafeArea ? (
          <>
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: safe.left,
                top: safe.top,
                width: safe.width,
                height: safe.height,
                outline: `2px dashed ${fit.ok ? "#2563EB" : "#E53D2E"}`,
                outlineOffset: -1,
              }}
            />
            {!fit.ok ? (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: safe.left,
                  top: safe.top + safe.height,
                  width: safe.width,
                  height: Math.min(fit.overflowPx, format.height - safe.top - safe.height),
                  background: "rgba(229,61,46,0.22)",
                }}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
