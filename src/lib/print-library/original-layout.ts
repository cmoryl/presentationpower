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
export type OriginalPage = { ground: string; texts: OriginalText[] };
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
