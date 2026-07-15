import type { BrandMode } from "@/lib/taxonomy";

// Text-based brand lockup — used until real logo assets are uploaded.
// Renders `mark` in a rounded tile followed by wordmark + optional division
// line. Purely visual; consumers pass their own color context.
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
      ? { markPx: 24, wordPx: 14, dividerPx: 10, radiusPx: 6, gapPx: 8 }
      : size === "lg"
        ? { markPx: 44, wordPx: 22, dividerPx: 14, radiusPx: 10, gapPx: 12 }
        : { markPx: 32, wordPx: 17, dividerPx: 11, radiusPx: 8, gapPx: 10 };
  const logo = brand.logo ?? { mark: brand.name.slice(0, 2).toUpperCase(), wordmark: brand.name };
  const divisionLine = logo.divisionLine?.replace("{client}", clientName ?? "Client");

  return (
    <div
      className="flex items-center"
      style={{ gap: dims.gapPx, color }}
      role="img"
      aria-label={`${logo.wordmark}${divisionLine ? " — " + divisionLine : ""} lockup`}
    >
      {showMark && (
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
        <div className="font-semibold tracking-wide" style={{ fontSize: dims.wordPx, letterSpacing: "0.02em" }}>
          {logo.wordmark.toUpperCase()}
        </div>
        {showDivision && divisionLine && (
          <div className="mt-1 uppercase tracking-[0.2em] opacity-70" style={{ fontSize: dims.dividerPx }}>
            {divisionLine}
          </div>
        )}
      </div>
    </div>
  );
}
