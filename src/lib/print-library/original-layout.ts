// Data model for curated pieces rebuilt page-for-page from the designer's PDF
// (see scripts/lifesci-original-extract.py). Geometry is in inches, type in pt.
import layouts from "@/lib/print-library/lifesci-original-layouts.json";

export const CSS_DPI = 96;

export type OriginalText = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  weight: number;
  color: string;
  lead: number;
  align: "left" | "center" | "right";
  text: string;
  family: "geist" | "poppins";
  /** Mixed colour/weight copy: styled runs (joined, they equal `text`). */
  runs?: { text: string; color: string; weight: number }[];
  hidden?: boolean;
};
/** One separate piece of the designer's artwork (icon, card, logo, photo…). */
export type OriginalPiece = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
  label: string;
  /** Drawn from a bitmap (photo / flattened effect): tint is not offered. */
  raster?: boolean;
  hidden?: boolean;
  /** Flat recolour of a vector piece. */
  tint?: string;
  opacity?: number;
  /** Paint-order nudge (higher draws above). */
  z?: number;
};
export type OriginalPage = {
  ground: string;
  texts: OriginalText[];
  /** Artwork split into pieces (scripts/lifesci-original-pieces.py), paint order. */
  pieces?: OriginalPiece[];
  /** Ground used before the artwork was split — lets saved copies pick up pieces. */
  legacyGround?: string;
};
export type OriginalLayout = { widthIn: number; heightIn: number; pages: OriginalPage[] };

const ALL = layouts as unknown as Record<string, OriginalLayout>;

/** The extracted original layout for a curated seed slug, if one exists. */
export function originalLayoutFor(slug: string): OriginalLayout | undefined {
  return ALL[slug];
}

/** Content opted into the original layout (the default for supplied pieces). */
export function isOriginalLayout(content: unknown): content is { layoutMode: "original"; original: OriginalLayout } {
  const c = content as { layoutMode?: string; original?: OriginalLayout } | null;
  return !!c && c.layoutMode === "original" && !!c.original?.pages?.length;
}

/** Adds the original layout to a seed's content (Library layout stays in the same content). */
export function withOriginalLayout<T extends object>(slug: string, content: T): T {
  const original = originalLayoutFor(slug);
  return original ? ({ ...content, layoutMode: "original", original } as T) : content;
}

/** Original geometry of a piece/text as supplied (for "Reset"). */
export function suppliedPiece(ground: string, id: string): OriginalPiece | undefined {
  for (const l of Object.values(ALL))
    for (const p of l.pages)
      if (p.ground === ground) return p.pieces?.find((k) => k.id === id);
  return undefined;
}

/**
 * Saved copies made before the artwork was split carry the old flat ground and
 * no pieces: swap in the split ground + pieces for that same page.
 */
export function withPieces(layout: OriginalLayout): OriginalLayout {
  if (layout.pages.every((p) => p.pieces)) return layout;
  return {
    ...layout,
    pages: layout.pages.map((p) => {
      if (p.pieces) return p;
      for (const l of Object.values(ALL))
        for (const bp of l.pages)
          if (bp.legacyGround === p.ground || bp.ground === p.ground)
            return { ...p, ground: bp.ground, pieces: bp.pieces ?? [], legacyGround: p.ground };
      return p;
    }),
  };
}
