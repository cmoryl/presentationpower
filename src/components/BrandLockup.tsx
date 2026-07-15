import type { BrandMode } from "@/lib/taxonomy";
import tpLogoUrl from "@/assets/tp-logo-black.svg?url";

// The approved TransPerfect horizontal wordmark. Used whenever the brand's
// logo.wordmark resolves to "TransPerfect" — masked with currentColor so a
// single SVG serves both dark and light surfaces.
const TP_WORDMARK_ASPECT = 432 / 44.4; // width / height from the source SVG viewBox
const TP_BRANDS = new Set(["TransPerfect"]);

export function BrandLockup({
  brand,
  color,
  size = "md",
  showMark = true,
  showDivision = true,
  clientName,
}: {
  brand: BrandMode;
  color: string;
  size?: "sm" | "md" | "lg";
  showMark?: boolean;
  showDivision?: boolean;
  clientName?: string; // Substituted into division line when it contains {client}
}) {
  const dims =
    size === "sm"
      ? { markPx: 24, wordmarkPx: 14, wordPx: 14, dividerPx: 10, radiusPx: 6, gapPx: 8 }
      : size === "lg"
        ? { markPx: 44, wordmarkPx: 26, wordPx: 22, dividerPx: 14, radiusPx: 10, gapPx: 12 }
        : { markPx: 32, wordmarkPx: 18, wordPx: 17, dividerPx: 11, radiusPx: 8, gapPx: 10 };
  const logo = brand.logo ?? { mark: brand.name.slice(0, 2).toUpperCase(), wordmark: brand.name };
  const divisionLine = logo.divisionLine?.replace("{client}", clientName ?? "Client");

  const useOfficialWordmark = TP_BRANDS.has(logo.wordmark);
  const wordmarkHeight = dims.wordmarkPx;
  const wordmarkWidth = wordmarkHeight * TP_WORDMARK_ASPECT;

  return (
    <div
      className="flex items-center"
      style={{ gap: dims.gapPx, color }}
      role="img"
      aria-label={`${logo.wordmark}${divisionLine ? " — " + divisionLine : ""} lockup`}
    >
      {showMark && !useOfficialWordmark && (
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
      <div className="flex flex-col leading-none">
        {useOfficialWordmark ? (
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: wordmarkWidth,
              height: wordmarkHeight,
              backgroundColor: color,
              WebkitMaskImage: `url(${tpLogoUrl})`,
              maskImage: `url(${tpLogoUrl})`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskPosition: "left center",
              maskPosition: "left center",
            }}
          />
        ) : (
          <div className="font-semibold tracking-wide" style={{ fontSize: dims.wordPx, letterSpacing: "0.02em" }}>
            {logo.wordmark.toUpperCase()}
          </div>
        )}
        {showDivision && divisionLine && (
          <div
            className="uppercase tracking-[0.2em] opacity-70"
            style={{ fontSize: dims.dividerPx, marginTop: useOfficialWordmark ? 6 : 4 }}
          >
            {divisionLine}
          </div>
        )}
      </div>
    </div>
  );
}

