// -----------------------------------------------------------------------------
// PPTX export integrity guard
// -----------------------------------------------------------------------------
// PPTX export is the product. A slide that opens in PowerPoint with a flat
// colour where the build showed a gradient ground, or with a missing wordmark /
// blank icon box, is a defect — not a degraded-but-acceptable result.
//
// This module is the bookkeeping layer for that promise: every export records
// what it actually embedded per slide (background plate, logo lockup, icon
// glyphs, imagery), retries the pieces that can be retried, and returns a plain
// list of anything that still could not be embedded so the UI can tell the user
// instead of shipping a silently broken deck.
//
// Pure and DOM-free so it can be unit-tested in Node.

export type IntegrityAsset = "background" | "logo" | "icon" | "image";

export type SlideIntegrity = {
  slideIndex: number;
  variantId: string;
  /** How the slide's background got there. `null` until something claims it. */
  background: "plate" | "photo" | "aurora" | "gradient" | "solid" | null;
  /** A brand lockup was embedded as a real picture. */
  logo: boolean;
  /** Icon glyphs requested vs. actually embedded. */
  iconsRequested: number;
  iconsEmbedded: number;
  /** Photographic / client-logo imagery requested vs. embedded. */
  imagesRequested: number;
  imagesEmbedded: number;
  /** Retries spent recovering assets on this slide. */
  retries: number;
};

/**
 * Background sources that reproduce the build's design planes. Anything else is
 * a fallback: readable, but not what the user designed.
 */
const DESIGN_TRUE_BACKGROUNDS = new Set(["plate", "photo", "aurora"]);

export function isDesignTrueBackground(kind: SlideIntegrity["background"]): boolean {
  return kind != null && DESIGN_TRUE_BACKGROUNDS.has(kind);
}

export class ExportIntegrity {
  private readonly slides = new Map<number, SlideIntegrity>();
  /** Non-slide problems (deck-level logo fetch, font load, …). */
  private readonly global: string[] = [];

  constructor(private readonly fidelity: string = "editable") {}

  track(slideIndex: number, variantId: string): SlideIntegrity {
    const existing = this.slides.get(slideIndex);
    if (existing) return existing;
    const fresh: SlideIntegrity = {
      slideIndex,
      variantId,
      background: null,
      logo: false,
      iconsRequested: 0,
      iconsEmbedded: 0,
      imagesRequested: 0,
      imagesEmbedded: 0,
      retries: 0,
    };
    this.slides.set(slideIndex, fresh);
    return fresh;
  }

  noteBackground(slideIndex: number, kind: NonNullable<SlideIntegrity["background"]>, variantId = "") {
    this.track(slideIndex, variantId).background = kind;
  }

  noteLogo(slideIndex: number, ok: boolean, variantId = "") {
    const s = this.track(slideIndex, variantId);
    s.logo = s.logo || ok;
  }

  noteAsset(slideIndex: number, asset: "icon" | "image", ok: boolean, variantId = "") {
    const s = this.track(slideIndex, variantId);
    if (asset === "icon") {
      s.iconsRequested += 1;
      if (ok) s.iconsEmbedded += 1;
    } else {
      s.imagesRequested += 1;
      if (ok) s.imagesEmbedded += 1;
    }
  }

  noteRetry(slideIndex: number, variantId = "") {
    this.track(slideIndex, variantId).retries += 1;
  }

  noteGlobal(message: string) {
    if (!this.global.includes(message)) this.global.push(message);
  }

  entries(): SlideIntegrity[] {
    return [...this.slides.values()].sort((a, b) => a.slideIndex - b.slideIndex);
  }

  /**
   * Human-readable defects, in the order a reviewer would care about them:
   * missing design backgrounds first, then dropped logos, then glyph/imagery
   * gaps. Empty array == the deck matches the build.
   */
  warnings(): string[] {
    const out = [...this.global];
    for (const s of this.entries()) {
      const label = `Slide ${s.slideIndex + 1} (${s.variantId || "unknown"})`;
      if (s.background == null) {
        out.push(`${label}: no background was embedded.`);
      } else if (!isDesignTrueBackground(s.background) && this.fidelity === "layered") {
        out.push(
          `${label}: fell back to a flat ${s.background} background — the designed background plate could not be rendered.`,
        );
      }
      const missingIcons = s.iconsRequested - s.iconsEmbedded;
      if (missingIcons > 0) out.push(`${label}: ${missingIcons} icon(s) could not be embedded.`);
      const missingImages = s.imagesRequested - s.imagesEmbedded;
      if (missingImages > 0) out.push(`${label}: ${missingImages} image(s) could not be embedded.`);
    }
    return out;
  }

  /** True when every slide carries a design-true background and no asset dropped. */
  isClean(): boolean {
    return this.warnings().length === 0;
  }

  summary(): {
    slides: number;
    platedBackgrounds: number;
    retries: number;
    warnings: number;
    iconsRequested: number;
    iconsMissing: number;
  } {
    const entries = this.entries();
    return {
      slides: entries.length,
      platedBackgrounds: entries.filter((s) => isDesignTrueBackground(s.background)).length,
      retries: entries.reduce((n, s) => n + s.retries, 0),
      warnings: this.warnings().length,
      iconsRequested: entries.reduce((n, s) => n + s.iconsRequested, 0),
      // A dropped glyph leaves an empty icon well in PowerPoint. Surfaced in the
      // summary (not just the warning prose) so CI can gate on it.
      iconsMissing: entries.reduce((n, s) => n + Math.max(0, s.iconsRequested - s.iconsEmbedded), 0),
    };
  }
}

/**
 * Retry an asset producer that returns null/undefined on failure. Export assets
 * fail for transient reasons far more often than permanent ones (a signed URL
 * racing its refresh, a compositor starved mid-capture), so one attempt is not
 * good enough for the product's headline feature.
 */
export async function retryAsset<T>(
  attempt: (tryIndex: number) => Promise<T | null | undefined>,
  opts: { attempts?: number; delayMs?: number; onRetry?: (tryIndex: number) => void } = {},
): Promise<T | null> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const delayMs = opts.delayMs ?? 220;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const out = await attempt(i);
      if (out != null && out !== ("" as unknown as T)) return out;
    } catch {
      /* fall through to retry */
    }
    if (i < attempts - 1) {
      opts.onRetry?.(i + 1);
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  return null;
}
