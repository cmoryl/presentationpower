import type { BrandMode } from "@/lib/taxonomy";
import type { CSSProperties } from "react";
import { getDivisionLogos } from "@/lib/division-logos";
import { ElementMark } from "@/components/brand/ElementLogo";

// Inline SVG of the approved TransPerfect horizontal wordmark. Paths inherit
// `currentColor` so a single component tints for both dark and light chrome.
function TransPerfectWordmark({ height }: { height: number }) {
  const width = height * (432 / 44.4);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 432 44.4"
      width={width}
      height={height}
      fill="currentColor"
      aria-hidden
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    >
      <path d="M359.9,21.9c0-12.7,9.2-21.9,22-21.9s11.2,1.9,16,6.2l-3.8,5c-3.1-2.8-6.8-4.6-12-4.6-8.7,0-14.7,6.4-14.7,15.3s5.8,15.4,14.4,15.4,9.5-2.3,12.3-6l4.6,4.7c-4.1,5.1-9.9,7.9-17.1,7.9-13,0-21.7-9.7-21.7-22" />
      <polygon points="258 37 258 43.5 230.7 43.5 230.7 1 257.4 1 257.4 7.5 238.1 7.5 238.1 18.8 255 18.8 255 25.1 238.1 25.1 238.1 37 258 37" />
      <polygon points="299.9 1 326.4 1 326.4 7.8 307.2 7.8 307.2 20 324.4 20 324.4 26.6 307.2 26.6 307.2 43.4 299.9 43.4 299.9 1" />
      <polygon points="358.4 36.9 358.4 43.4 331.1 43.4 331.1 1 357.8 1 357.8 7.5 338.5 7.5 338.5 18.7 355.4 18.7 355.4 25 338.5 25 338.5 36.9 358.4 36.9" />
      <polygon points="432 7.7 420 7.7 420 43.4 412.7 43.4 412.7 7.7 400.6 7.7 400.6 1 432 1 432 7.7" />
      <path d="M284.6,26.6c6-1.7,9.8-6.4,9.8-12.3s-6-13.2-14.4-13.2h-16.6v42.4h7.4V7.5h8.7c4.6,0,7.6,3,7.6,7s-2.9,6.9-7.7,6.9h-5v6.1c-.1,0,2.8,0,2.8,0l10,16.1h8.4v-.2l-11-16.8Z" />
      <path d="M172,44.4c-.1,0-.3,0-.4,0-2.9-.2-5.7-.9-8.4-2.1-1.7-.8-3.3-1.8-4.8-3-.1,0-.1,0-.2-.2.8-1.3,1.7-2.6,2.5-3.9.1,0,.2,0,.2.2,2.3,2.1,4.9,3.4,7.9,4,1.2.3,2.4.4,3.7.5,1.7,0,3.3,0,4.9-.7,1.4-.5,2.6-1.2,3.5-2.3,1.2-1.4,1.7-3,1.6-4.8-.1-1.7-.8-3.2-2-4.3-1-1-2.3-1.7-3.6-2.3-1.6-.8-3.3-1.3-4.9-1.9-2-.7-4-1.5-5.8-2.6-1.4-.8-2.7-1.7-3.8-2.8-1.4-1.5-2.4-3.2-2.8-5.3-.6-3.4.3-6.4,2.7-9,1.4-1.5,3.2-2.4,5.2-3.1C168.8.3,170.1,0,171.4,0c.1,0,.2,0,.3,0h2.1c.1,0,.3.1.4.1,1.1.1,2.1.2,3.1.4,3.1.6,5.8,2,8.3,3.9q.1,0,.2.2c-.3.7-2.1,3.6-2.3,3.8-.1-.1-.2-.2-.3-.2-1-.7-2.1-1.4-3.2-1.9-3.1-1.4-6.3-1.9-9.7-1.3-1.3.2-2.5.7-3.5,1.4-1,.7-1.8,1.5-2.2,2.7-.6,1.9-.4,3.7.8,5.4.6.8,1.4,1.5,2.2,2,1,.7,2.1,1.2,3.3,1.6,1.3.5,2.6,1,4,1.5,2.1.8,4.1,1.6,6.1,2.8,1.3.8,2.6,1.7,3.6,2.8,1.7,1.8,2.6,3.9,2.7,6.4,0,.1,0,.2.1.3v1.1c0,0-.1.2-.1.3v.7c-.4,2.9-1.7,5.3-3.9,7.2-2.3,1.9-5,2.9-7.9,3.2-.4,0-.9,0-1.3.2,0,0-2.2,0-2.2,0Z" />
      <path d="M0,1h30.5v4.3h-12.9c0,12.8-.1,25.4-.1,38.2h-4.6c0-12.8.1-25.5.1-38.3H0V1" />
      <path d="M122.3,43.3h-4.6V.5h1.8c.2,0,.4.1.6.3,1.6,1.9,3.2,3.7,4.8,5.6,5.8,6.9,11.7,13.7,17.5,20.6,1.9,2.3,3.9,4.5,5.9,6.8.1,0,.2.2.3.3V1h4.6v42.7h-1.9c-.3,0-.4,0-.6-.3-2.5-3-5-6-7.6-8.9-6.1-7.2-12.3-14.4-18.4-21.6-.7-.9-1.5-1.7-2.2-2.6q0-.1-.2-.2v16.6c0,5.5,0,11.1,0,16.6" />
      <path d="M56.1,25.7c4.1,5.9,8.1,11.8,12.1,17.7h-5.2c-.3,0-.4,0-.6-.3-2.8-4.1-5.6-8.3-8.4-12.4l-3-4.5c0-.2-.3-.3-.5-.3h-5.7v-4.2h.8c2.6,0,5.2,0,7.8-.1,1.7,0,3.3-.3,4.8-1.1,2.4-1.3,3.7-3.2,4.1-5.9.2-1.8,0-3.5-.9-5.1-1.1-2.2-3-3.5-5.4-4.2-.8-.2-1.7-.3-2.5-.3h-11.5v38.3h-4.6V.8h16.2c3.2,0,6.2.9,8.8,2.9,2.5,1.9,4.1,4.4,4.6,7.5.7,3.9-.2,7.4-2.9,10.4-1.4,1.6-3.2,2.6-5.2,3.3-.7.3-1.5.4-2.2.6-.3.1-.4.1-.6.2" />
      <path d="M91.4.6h1.6c0,0,.2.1.2.1,0,.1,0,.2,0,.2,6.2,13.5,12.5,27,18.7,40.5.3.6.5,1.2.8,1.7,0,0,0,.2,0,.3h-4.9c0,0,0-.2-.2-.4-1.4-2.9-2.7-5.9-4.1-8.8,0-.3-.3-.4-.6-.4h-18.9c.6-1.4,1.1-2.8,1.7-4.2h15.6c-3.1-6.9-6.4-13.7-9.3-20.6,0,0,0,.2-.2.3-.5,1.3-1,2.6-1.6,3.8-1.4,3.1-2.8,6.1-4.2,9.2-3.2,6.9-6.3,13.8-9.5,20.7,0,.2,0,.3-.2.5h-4.8c0-.3,18.9-41.5,19.7-42.9" />
      <path d="M195,22.1v21.4h7.4v-15.5h8.8c9.4,0,14.3-6.4,14.3-13.3s-5.1-13.7-14.2-13.7h-16.3v6.7h15.6c4.7,0,7.5,3.2,7.5,7.2s-1.9,7.1-7.3,7.1h-7.9l-4.4,7v-7h-3.5Z" />
    </svg>
  );
}

// The approved TransPerfect horizontal wordmark. Used whenever the brand's
// logo.wordmark resolves to "TransPerfect" — masked with currentColor so a
// single SVG serves both dark and light surfaces.
const TP_WORDMARK_ASPECT = 432 / 44.4; // width / height from the source SVG viewBox
const TP_BRANDS = new Set(["TransPerfect"]);
/** Brands that render the Element product lockup instead of the TP wordmark. */
const ELEMENT_BRANDS = new Set(["Element", "TransPerfect Element"]);

export function BrandLockup({
  brand,
  color,
  size = "md",
  showMark = true,
  showDivision = true,
  clientName,
  clientLogoUrl,
  subCompany,
  orientation: orientationRaw = "horizontal",
  monochromeOfficialLogo = false,
}: {
  brand: BrandMode;
  color: string;
  size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl";
  showMark?: boolean;
  showDivision?: boolean;
  clientName?: string;
  clientLogoUrl?: string | null;
  subCompany?: string;
  orientation?: "horizontal" | "stacked" | "vertical-left" | "vertical-right" | "mark-only";
  monochromeOfficialLogo?: boolean;
}) {
  const dims =
    size === "2xs"
      ? { markPx: 14, wordmarkPx: 8, wordPx: 8, dividerPx: 6, radiusPx: 4, gapPx: 4 }
      : size === "xs"
        ? { markPx: 18, wordmarkPx: 11, wordPx: 11, dividerPx: 8, radiusPx: 5, gapPx: 6 }
        : size === "sm"
          ? { markPx: 24, wordmarkPx: 14, wordPx: 14, dividerPx: 10, radiusPx: 6, gapPx: 8 }
          : size === "lg"
            ? { markPx: 64, wordmarkPx: 40, wordPx: 32, dividerPx: 18, radiusPx: 12, gapPx: 16 }
            : size === "xl"
              ? { markPx: 96, wordmarkPx: 64, wordPx: 48, dividerPx: 24, radiusPx: 16, gapPx: 22 }
              : { markPx: 32, wordmarkPx: 18, wordPx: 17, dividerPx: 11, radiusPx: 8, gapPx: 10 };
  const logo = brand.logo ?? { mark: brand.name.slice(0, 2).toUpperCase(), wordmark: brand.name };
  const divisionLine = (subCompany ?? logo.divisionLine)?.replace(
    "{client}",
    clientName ?? "Client",
  );

  // Vertical orientations are deprecated (never rotate the lockup). Any
  // persisted vertical-* value from legacy decks falls back to horizontal.
  const orientation: "horizontal" | "stacked" | "mark-only" =
    orientationRaw === "stacked"
      ? "stacked"
      : orientationRaw === "mark-only"
        ? "mark-only"
        : "horizontal";

  const isMarkOnly = orientation === "mark-only";
  const innerOrientation: "horizontal" | "stacked" =
    orientation === "stacked" ? "stacked" : "horizontal";

  // ELEMENT PRODUCT BRAND. Element markets itself, so its chrome must never
  // borrow the TransPerfect corporate wordmark: the five-brick E mark plus the
  // ELEMENT wordmark is the whole lockup. Sizes are px (not rem) because slide
  // chrome renders at 1920-stage scale, where rem type would collapse.
  if (ELEMENT_BRANDS.has(logo.wordmark)) {
    const markPx = Math.round(dims.markPx * (isMarkOnly ? 1.25 : 1));
    const eyebrowPx = Math.max(6, Math.round(dims.wordmarkPx * 0.42));
    const wordPx = Math.round(dims.wordmarkPx * 0.92);
    const descriptorPx = Math.max(5, Math.round(dims.wordmarkPx * 0.34));
    return (
      <div
        className={
          innerOrientation === "stacked"
            ? "inline-flex flex-col items-start"
            : "inline-flex items-center"
        }
        style={{ gap: dims.gapPx, color }}
        role="img"
        aria-label="TransPerfect Element lockup"
      >
        <ElementMark tone="mono" size={markPx} title="TransPerfect Element" />
        {!isMarkOnly && (
          <div className="min-w-0 leading-none">
            <div
              style={{
                fontSize: eyebrowPx,
                letterSpacing: "0.42em",
                fontWeight: 500,
                opacity: 0.75,
              }}
            >
              TRANSPERFECT
            </div>
            <div
              style={{
                marginTop: Math.round(wordPx * 0.24),
                fontSize: wordPx,
                letterSpacing: "0.3em",
                fontWeight: 600,
              }}
            >
              ELEMENT
            </div>
            {/* Descriptor drops out at small sizes, per the logo rules. */}
            {dims.wordmarkPx >= 17 && (
              <div
                style={{
                  marginTop: Math.round(descriptorPx * 0.6),
                  fontSize: descriptorPx,
                  letterSpacing: "0.32em",
                  opacity: 0.65,
                }}
              >
                MODULAR DESIGN SYSTEM
              </div>
            )}
          </div>
        )}
      </div>
    );
  }



  // Mark-only mode: render just the letter tile. When a brand ships an
  // official image, we still fall back to the letter tile because the shipped
  // artwork always includes the wordmark. Bump the tile size for presence.
  if (isMarkOnly) {
    const tilePx = Math.round(dims.markPx * 1.15);
    return (
      <div
        className="inline-flex"
        style={{ color }}
        role="img"
        aria-label={`${logo.wordmark} mark`}
      >
        <div
          className="flex items-center justify-center font-semibold tracking-tight"
          style={{
            width: tilePx,
            height: tilePx,
            border: `1.75px solid ${color}`,
            borderRadius: dims.radiusPx,
            fontSize: tilePx * 0.44,
            letterSpacing: "-0.02em",
          }}
          aria-hidden
        >
          {logo.mark}
        </div>
      </div>
    );
  }

  // Prefer an official PNG logo when we have one for this brand id.
  const isDarkChrome = /^#?fff(fff)?$/i.test(color) || color.toLowerCase() === "white";
  const divisionLogos = getDivisionLogos(brand.id);
  const stackedUrl = divisionLogos
    ? isDarkChrome
      ? (divisionLogos.stackedWhite ?? divisionLogos.stackedColor)
      : (divisionLogos.stackedColor ?? divisionLogos.stackedWhite)
    : undefined;
  // Light chrome takes the approved single-colour BLACK lockup (never the
  // colour mark), so every module slide that needs a black TransPerfect logo
  // renders the same artwork.
  const horizontalUrl = divisionLogos
    ? isDarkChrome
      ? (divisionLogos.white ?? divisionLogos.color)
      : (divisionLogos.black ?? divisionLogos.color ?? divisionLogos.white)
    : undefined;
  const officialLogoUrl =
    innerOrientation === "stacked" ? (stackedUrl ?? horizontalUrl) : (horizontalUrl ?? stackedUrl);
  // Reversal fallback. Division logos are raster/vector artwork with a baked
  // colour: a colour lockup dropped on a dark backdrop (or a white lockup on a
  // light one) reads as a muddy or invisible block. When the correct reversed
  // artwork isn't wired for this division, render the approved single-colour
  // treatment by flattening the mark to white (dark chrome) or black (light
  // chrome) — never a hue shift, so the logo is never recoloured.
  const reversedArtworkMissing = officialLogoUrl
    ? isDarkChrome
      ? !/-white\.|-stacked-white\./.test(officialLogoUrl)
      : /-white\.|-stacked-white\./.test(officialLogoUrl)
    : false;
  const flattenOfficialLogo = monochromeOfficialLogo || reversedArtworkMissing;
  const useOfficialImage = !!officialLogoUrl;
  const useOfficialWordmark = !useOfficialImage && TP_BRANDS.has(logo.wordmark);
  const wordmarkHeight = dims.wordmarkPx;
  const officialImageHeight = Math.round(
    dims.wordmarkPx * (innerOrientation === "stacked" ? 3.2 : 1.9),
  );

  const wrapperStyle: React.CSSProperties = {};

  return (
    <div style={wrapperStyle}>
      <div
        className={
          "flex min-w-0 max-w-full " +
          (innerOrientation === "stacked" ? "flex-col items-start" : "items-center")
        }
        style={{ gap: dims.gapPx, color }}
        role="img"
        aria-label={`${logo.wordmark}${divisionLine ? " — " + divisionLine : ""}${clientLogoUrl ? " × client" : ""} lockup`}
      >
        {showMark && !useOfficialWordmark && !useOfficialImage && (
          <div
            className="flex items-center justify-center font-semibold tracking-tight"
            style={{
              width: dims.markPx,
              height: dims.markPx,
              border: `1.5px solid ${color}`,
              borderRadius: dims.radiusPx,
              fontSize: dims.markPx * 0.42,
              letterSpacing: "-0.02em",
            }}
            aria-hidden
          >
            {logo.mark}
          </div>
        )}
        <div className="flex min-w-0 max-w-full flex-col leading-none">
          {useOfficialImage ? (
            <img
              src={officialLogoUrl}
              alt={`${logo.wordmark} logo`}
              style={{
                height: officialImageHeight,
                width: "auto",
                maxWidth: "100%",
                objectFit: "contain",
                display: "block",
                filter: flattenOfficialLogo
                  ? isDarkChrome
                    ? "brightness(0) invert(1)"
                    : "brightness(0) saturate(100%)"
                  : undefined,
              }}
            />
          ) : useOfficialWordmark ? (
            <TransPerfectWordmark height={wordmarkHeight} />
          ) : (
            <div
              className="min-w-0 max-w-full break-words font-semibold tracking-wide"
              style={{ fontSize: dims.wordPx, letterSpacing: "0.02em" }}
            >
              {logo.wordmark.toUpperCase()}
            </div>
          )}
          {showDivision && divisionLine && !useOfficialImage && (
            <div
              className="max-w-full uppercase leading-tight tracking-[0.14em] opacity-70 [overflow-wrap:anywhere]"
              style={{ fontSize: dims.dividerPx, marginTop: useOfficialWordmark ? 6 : 4 }}
            >
              {divisionLine}
            </div>
          )}
        </div>
        {clientLogoUrl && (
          <>
            <div
              aria-hidden
              style={{
                width: 1,
                height: dims.wordmarkPx * 1.6,
                backgroundColor: "currentColor",
                opacity: 0.35,
                marginLeft: dims.gapPx / 2,
                marginRight: dims.gapPx / 2,
              }}
            />
            <img
              src={clientLogoUrl}
              alt={clientName ? `${clientName} logo` : "Client logo"}
              style={{
                height: dims.wordmarkPx * 1.6,
                width: "auto",
                maxWidth: dims.wordmarkPx * 6,
                objectFit: "contain",
                display: "block",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
