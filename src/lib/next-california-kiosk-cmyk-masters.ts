// TransPerfect NEXT — SAN FRANCISCO KIOSK CMYK MASTERS (designer-supplied).
//
// The designer rebuilt each partner kiosk in Illustrator in CMYK and supplied a
// live `.ai` (PDF-compatible) plus a PDF per booth, all on the supplied TV kiosk
// template: 3 artboards, 3258 × 6930 pt media, 1/8 in bleed, TrimBox set,
// profile U.S. Web Coated (SWOP) v2. These files are served byte-for-byte as
// supplied — never re-rendered, never converted to RGB. The app-built RGB
// kiosk files remain the editable working copies.

type Ptr = { url: string };
const FILES = import.meta.glob<Ptr>("../assets/california-kiosks/cmyk/*.asset.json", {
  eager: true,
  import: "default",
});

function url(file: string): string | null {
  const hit = Object.entries(FILES).find(([k]) => k.endsWith(`/${file}.asset.json`));
  return hit ? hit[1].url : null;
}

export const KIOSK_CMYK_PROFILE = "U.S. Web Coated (SWOP) v2";
export const KIOSK_CMYK_RECEIVED = "2026-09-28";

export type KioskCmykMaster = {
  aiUrl: string;
  pdfUrl: string;
  proofUrl: string | null;
  profile: string;
  received: string;
  fonts: string[];
};

/** Fonts embedded in each supplied file (read from the file on intake). */
const FONTS: Record<string, string[]> = {
  coa: ["Geist Bold", "Geist ExtraBold", "Geist Medium", "Geist SemiBold"],
  "gl-live-tradebooth-a": ["Geist Bold", "Geist Medium", "Poppins Medium", "Poppins Regular"],
  "global-content-delivery-tradebooth-a": ["Geist Bold", "Geist Medium"],
  "global-digital-experience-tradebooth-a": ["Geist Bold", "Geist SemiBold", "Poppins Medium"],
  "learning-tradebooth-a": ["Geist Bold", "Geist Medium", "Geist SemiBold", "Poppins SemiBold"],
  "legal-support-2-tradebooth-b": ["Geist Bold", "Geist ExtraBold", "Geist Medium", "Geist Regular"],
  "live-customer-tradebooth-a": ["Geist Bold", "Geist Medium"],
  "medical-writing": ["DIN 2014 Regular", "Geist Bold", "Geist Regular", "Geist SemiBold", "Poppins SemiBold"],
  "media-tradebooth-a": ["Geist Medium", "Poppins Regular", "Poppins SemiBold"],
  "commercial-life-sciences": ["Geist Bold", "Geist Medium"],
  "sterling-2-tradebooth-a": [],
  "veeva-tradebooth-a": [],
  "contact-center": ["Geist Medium", "Geist SemiBold"],
};

/** The designer's CMYK master for a kiosk (London booth id), or null if none supplied. */
export function kioskCmykMaster(boothId: string | null | undefined): KioskCmykMaster | null {
  if (!boothId) return null;
  const ai = url(`${boothId}-cmyk-master.ai`);
  const pdf = url(`${boothId}-cmyk-master.pdf`);
  if (!ai || !pdf) return null;
  return {
    aiUrl: ai,
    pdfUrl: pdf,
    proofUrl: url(`${boothId}-cmyk-proof.jpg`),
    profile: KIOSK_CMYK_PROFILE,
    received: KIOSK_CMYK_RECEIVED,
    fonts: FONTS[boothId] ?? [],
  };
}

export const KIOSK_CMYK_BOOTH_IDS = Object.keys(FONTS);
