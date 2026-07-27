import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import { BRAND_MODES } from "@/lib/taxonomy";
import { BrandLockup } from "@/components/BrandLockup";

// -----------------------------------------------------------------------
// PORT — Canva 4-page reference (DAHN3xwuKvo).
//
// Shared print chrome extracted from the Canva design so all four print
// layouts (Adaptor Brief, Client Spotlight, EBrochure, Case Study) share
// the exact same CTA band + dual-lockup contact footer.
//
// The Canva CTA band is a diagonal navy→primary→accent gradient with a
// tiny sub-brand mark chip on the left, "See {Sub-brand} in Action" as
// the label, and a "Book a Demo »" outline pill on the right.
//
// The footer is a dual-lockup — the parent TransPerfect wordmark and the
// division mark share a hairline divider, with a right-hand contact strip
// (⊕ site   ✉ email) rendered as small icon+text chips.
// -----------------------------------------------------------------------

const enterpriseBrand = BRAND_MODES.find((b) => b.id === "bm-enterprise")!;

// ---------------------------------------------------------------------------
// CLIENT LOGO — supplied by the surface (asset editor / export) and consumed
// by the footer lockup, so layouts don't have to thread the prop through.
// ---------------------------------------------------------------------------
export type PrintClientLogo = { url: string; name?: string | null };

const PrintClientLogoContext = createContext<PrintClientLogo | null>(null);

export function PrintClientLogoProvider({
  value,
  children,
}: {
  value: PrintClientLogo | null;
  children: ReactNode;
}) {
  return <PrintClientLogoContext.Provider value={value}>{children}</PrintClientLogoContext.Provider>;
}

export function usePrintClientLogo() {
  return useContext(PrintClientLogoContext);
}

export function PrintCTABand({
  brand,
  mode,
  label,
  subhead,
  buttonLabel = "Book a demo »",
  cq,
}: {
  brand: BrandMode;
  mode: "light" | "dark";
  label: string;
  subhead?: string;
  buttonLabel?: string;
  cq: (px: number) => string;
}) {
  const accent = brand.tokens.accent || brand.tokens.primary;
  const primary = brand.tokens.primary;
  const isEnterprise = brand.id === "bm-enterprise";

  const style: CSSProperties = {
    marginTop: cq(20),
    borderRadius: cq(12),
    padding: `${cq(16)} ${cq(20)}`,
    background: `linear-gradient(100deg, #03002C 0%, ${primary} 55%, color-mix(in srgb, ${primary} 45%, ${accent}) 100%)`,
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: cq(16),
  };
  void mode;

  return (
    <div style={style}>
      <div className="flex items-center" style={{ gap: cq(14), minWidth: 0 }}>
        {!isEnterprise && (
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: cq(28), height: cq(28), borderRadius: cq(6),
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.28)",
            }}
            aria-hidden
          >
            <BrandLockup brand={brand} color="#FFFFFF" size="2xs" orientation="mark-only" />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: cq(15), color: "#FFFFFF", letterSpacing: "-0.01em" }}>
            {label}
          </div>
          {subhead && (
            <div style={{ fontSize: cq(10), color: "rgba(255,255,255,0.82)", marginTop: cq(3) }}>
              {subhead}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          border: "1.5px solid #FFFFFF", borderRadius: 999,
          padding: `${cq(8)} ${cq(18)}`, fontSize: cq(11),
          fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        {buttonLabel}
      </div>
    </div>
  );
}

function IconGlyph({ d, size, color, sw = 1.6 }: { d: string; size: string; color: string; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block" }}>
      <path d={d} />
    </svg>
  );
}

const ICON_GLOBE = "M12 21a9 9 0 0 0 0-18m0 18a9 9 0 0 1 0-18M3.6 9h16.8M3.6 15h16.8";
const ICON_MAIL = "M3 7l9 6 9-6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z";

export function PrintFooterLockup({
  brand,
  mode,
  cq,
  links,
  email,
}: {
  brand: BrandMode;
  mode: "light" | "dark";
  cq: (px: number) => string;
  /** Free-form footer links (e.g. transperfect.com, division URL). First slot renders with a globe icon. */
  links?: string[];
  /** Optional email address rendered with a mail icon. */
  email?: string;
}) {
  const accent = brand.tokens.accent || brand.tokens.primary;
  const primary = brand.tokens.primary;
  const isEnterprise = brand.id === "bm-enterprise";
  // Enterprise = the plain TransPerfect wordmark in pure black on white / white
  // on dark — no navy tint, no division mark, no color logo variant.
  const ink = mode === "dark" ? "#FFFFFF" : "#03002C";
  const inkSoft = mode === "dark" ? "#FFFFFF" : "rgba(85,85,85,0.9)";
  const dividerCol = mode === "dark" ? "rgba(255,255,255,0.24)" : "rgba(3,0,44,0.14)";
  const accentInk = mode === "dark" ? "#FFFFFF" : primary;
  const enterpriseLogoInk = mode === "dark" ? "#FFFFFF" : "#000000";

  const clientLogo = usePrintClientLogo();

  const chipStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: cq(6),
    fontSize: cq(9.5),
    color: inkSoft,
  };

  return (
    <div
      className="flex items-center justify-between"
      style={{
        borderTop: `1px solid ${dividerCol}`,
        marginTop: cq(20),
        paddingTop: cq(14),
        paddingBottom: cq(4),
        gap: cq(16),
      }}
    >
      <div className="flex items-center min-w-0" style={{ gap: cq(12) }}>
        <BrandLockup brand={enterpriseBrand} color={enterpriseLogoInk} size="2xs" orientation="horizontal" monochromeOfficialLogo />
        {!isEnterprise && (
          <>
            <div style={{ width: 1, height: cq(16), background: dividerCol, flexShrink: 0 }} aria-hidden />
            <BrandLockup brand={brand} color={enterpriseLogoInk} size="2xs" orientation="horizontal" monochromeOfficialLogo />
          </>
        )}
        {clientLogo?.url && (
          <>
            <div style={{ width: 1, height: cq(16), background: dividerCol, flexShrink: 0 }} aria-hidden />
            <img
              src={clientLogo.url}
              alt={clientLogo.name ? `${clientLogo.name} logo` : "Client logo"}
              data-testid="print-footer-client-logo"
              style={{
                height: cq(16),
                width: "auto",
                maxWidth: cq(110),
                objectFit: "contain",
                flexShrink: 0,
                filter: mode === "dark" ? "brightness(0) invert(1)" : undefined,
              }}
            />
          </>
        )}
      </div>
      <div className="flex items-center" style={{ gap: cq(14), flexWrap: "wrap", justifyContent: "flex-end" }}>
        {(links ?? ["transperfect.com"]).map((l, i) => (
          <span key={`l-${i}`} style={chipStyle}>
            <IconGlyph d={ICON_GLOBE} size={cq(11)} color={accentInk} />
            {l}
          </span>
        ))}
        {email && (
          <span style={chipStyle}>
            <IconGlyph d={ICON_MAIL} size={cq(11)} color={accentInk} />
            {email}
          </span>
        )}
      </div>
    </div>
  );
}
