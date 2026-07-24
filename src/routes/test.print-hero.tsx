/**
 * Public test harness for PrintHeroMedia focal-point clamping and safe-area guards.
 *
 * NOT linked from the app. Exists so Playwright can drive PrintHeroMediaLayer
 * across viewport breakpoints without an authenticated session, and verify
 * that the computed `object-position` respects the safeArea clamp and stays
 * viewport-invariant (clamping is JS math, so the % must not drift with width).
 *
 * Query params (all optional):
 *   ?imageUrl=...&focalX=95&focalY=90&safeAreaX=10&safeAreaY=15
 *   &aspect=fill|21:9|16:9|3:2|4:3|1:1
 *   &heightPct=46
 *   &scrim=top|bottom|both|radial|none
 *
 * Test contract:
 *   - [data-testid=hero-band]              — outer band container
 *   - [data-testid=hero-img]               — the <img> with objectPosition
 *   - [data-testid=hero-fallback]          — fallback swatch when no imageUrl
 *   - window.__printHero.getObjectPosition() → "X% Y%"
 *   - window.__printHero.getBandRect()      → DOMRect
 */

import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { PrintHeroMediaLayer, type PrintHeroAspect, type PrintHeroMedia, type PrintHeroScrim } from "@/components/print/PrintHeroMedia";

const ALLOWED_ASPECTS: readonly PrintHeroAspect[] = ["fill", "21:9", "16:9", "3:2", "4:3", "1:1"];
const ALLOWED_SCRIMS: readonly PrintHeroScrim[] = ["top", "bottom", "both", "radial", "none"];

function parseNum(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseEnum<T extends string>(v: string | null, allowed: readonly T[]): T | undefined {
  if (v == null) return undefined;
  return (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

import { notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/test/print-hero")({
  beforeLoad: () => {
    // Playwright fixture only. Does not resolve in production builds.
    if (!import.meta.env.DEV) throw notFound();
  },
  component: PrintHeroHarness,
  head: () => ({ meta: [{ title: "Print hero test harness" }] }),
});

function PrintHeroHarness() {
  // Read URL query params on the client. We deliberately avoid loader-based
  // search parsing so Playwright can hot-swap params via ?query= without any
  // router revalidation ceremony.
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);

  const media: PrintHeroMedia = useMemo(() => ({
    imageUrl: params.get("imageUrl") ?? "",
    focalX: parseNum(params.get("focalX")),
    focalY: parseNum(params.get("focalY")),
    safeAreaX: parseNum(params.get("safeAreaX")),
    safeAreaY: parseNum(params.get("safeAreaY")),
    aspect: parseEnum(params.get("aspect"), ALLOWED_ASPECTS),
    scrim: parseEnum(params.get("scrim"), ALLOWED_SCRIMS),
    heightPct: parseNum(params.get("heightPct")),
    overlayOpacity: parseNum(params.get("overlayOpacity")),
    washStrength: parseNum(params.get("washStrength")),
  }), [
    params.get("imageUrl"),
    params.get("focalX"),
    params.get("focalY"),
    params.get("safeAreaX"),
    params.get("safeAreaY"),
    params.get("aspect"),
    params.get("scrim"),
    params.get("heightPct"),
    params.get("overlayOpacity"),
    params.get("washStrength"),
  ]);

  // 816px portrait canvas mirrors the print templates. cqw maps to the
  // container's inline size, keeping the band proportional at every viewport.
  const cq = (v: number) => `${(v / 816) * 100}cqw`;

  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="hero-band"]');
    const img = document.querySelector<HTMLImageElement>('[data-testid="hero-img"]');
    (window as unknown as { __printHero: unknown }).__printHero = {
      getObjectPosition: () => (img ? img.style.objectPosition || getComputedStyle(img).objectPosition : null),
      getBandRect: () => el?.getBoundingClientRect() ?? null,
    };
  });

  return (
    <div style={{ background: "#e5e7eb", minHeight: "100vh", padding: 16 }}>
      <div
        data-testid="hero-page"
        style={{
          position: "relative",
          width: "min(816px, 100%)",
          margin: "0 auto",
          aspectRatio: "8.5 / 11",
          containerType: "inline-size",
          background: "#FFFFFF",
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
        }}
      >
        {/* Wrap with a data-testid probe so Playwright can find the band
            regardless of internal layout changes. */}
        <div data-testid="hero-band-wrap">
          <PrintHeroMediaLayer media={media} accent="#003FC7" mode="light" cq={cq} />
        </div>
        {/* Tag the actual band + img so tests read stable selectors even if
            PrintHeroMediaLayer's internal DOM shape changes. We locate them
            after render via a MutationObserver-lite effect below. */}
        <HeroTestTagger />
      </div>
    </div>
  );
}

/**
 * Adds data-testid to the outer band and the img once PrintHeroMediaLayer
 * has painted. Kept separate from the layer to avoid polluting the render
 * path used by real templates.
 */
function HeroTestTagger() {
  useEffect(() => {
    const wrap = document.querySelector<HTMLElement>('[data-testid="hero-band-wrap"]');
    if (!wrap) return;
    // The outer band is the pointer-events-none absolute layer.
    const band = wrap.querySelector<HTMLElement>('.pointer-events-none.absolute');
    if (band) band.setAttribute("data-testid", "hero-band");
    const img = wrap.querySelector<HTMLImageElement>("img");
    if (img) img.setAttribute("data-testid", "hero-img");
    const fallback = wrap.querySelector<HTMLElement>('[data-testid="hero-band"] > div:first-child');
    if (!img && fallback) fallback.setAttribute("data-testid", "hero-fallback");
  });
  return null;
}
