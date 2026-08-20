// HERO SECTION MODULES
// ---------------------------------------------------------------------------
// Page-opening lockups, portrait-native and cq-scaled like every other print
// section. Six treatments lifted from the curated collateral: full-bleed photo
// band, split photo, typographic stack, accent band, stat lockup, and the
// case-study client lockup.

import type { PrintHeroSection } from "@/lib/print-assets.types";
import { cq, sectionInk, pageBleed, pageGutter } from "../shared";
import { clampLines } from "@/components/print/print-primitives";

type Props = {
  section: PrintHeroSection;
  mode: "light" | "dark";
  accent: string;
};

const EYEBROW = (accent: string, size = 9.5) =>
  ({
    fontSize: cq(size),
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: accent,
  }) as const;

function MetaRail({
  section,
  mode,
  accent,
  onDark,
}: Props & { onDark?: boolean }) {
  const rows = section.meta ?? [];
  if (!rows.length) return null;
  const ink = sectionInk(mode);
  const label = onDark ? "rgba(255,255,255,0.68)" : ink.faint;
  const value = onDark ? "#FFFFFF" : ink.strong;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: `${cq(6)} ${cq(18)}`,
        marginTop: cq(14),
      }}
    >
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gap: cq(2) }}>
          <span
            style={{
              fontSize: cq(8),
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: onDark ? "rgba(255,255,255,0.62)" : accent,
            }}
          >
            {r.label}
          </span>
          {r.value ? (
            <span style={{ fontSize: cq(10.5), fontWeight: 600, color: value }}>{r.value}</span>
          ) : (
            <span style={{ fontSize: cq(10.5), color: label }}>—</span>
          )}
        </div>
      ))}
    </div>
  );
}

function bg(section: PrintHeroSection) {
  return {
    backgroundImage: section.imageUrl ? `url(${section.imageUrl})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: `${section.focalX ?? 50}% ${section.focalY ?? 50}%`,
    backgroundColor: "#03002C",
  } as const;
}

