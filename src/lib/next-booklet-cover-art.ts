// -----------------------------------------------------------------------------
// NEXT booklet cover art — the starter location library and the cover geometry.
//
// A booklet cover is the one page in the pack that is allowed to lead with a
// picture. The library below is the London starter set: generated location
// scenes, sized portrait so they carry an A4 / US Letter cover without being
// stretched. They are deliberately labelled as generated scenes, not venue
// photography — the same honesty rule the signage renders follow, so nobody
// hands a printer an illustration believing it is a photograph of the QEII.
//
// Geometry lives here too, as fractions of the printed trim, so the press PDF,
// the Word cover ground and the PowerPoint cover slide all place the picture
// and the copy in exactly the same place.
// -----------------------------------------------------------------------------

export type BookletCoverTreatment = "full-bleed" | "top-half" | "framed" | "wash";

export const BOOKLET_COVER_TREATMENTS: {
  id: BookletCoverTreatment;
  name: string;
  note: string;
}[] = [
  {
    id: "full-bleed",
    name: "Full bleed",
    note: "Picture fills the cover, copy sits in a graded foot.",
  },
  {
    id: "top-half",
    name: "Split",
    note: "Picture across the top, copy on the ink panel below.",
  },
  {
    id: "framed",
    name: "Framed window",
    note: "Ink cover with the picture as an inset window under the title.",
  },
  {
    id: "wash",
    name: "Ink wash",
    note: "Picture washed into the brand ink — quietest of the four.",
  },
];

export type BookletCoverArt = {
  id: string;
  /** Shown in the studio picker. */
  name: string;
  city: string;
  /** Served from /public, so the browser and the press builder fetch the same file. */
  src: string;
  wPx: number;
  hPx: number;
  /** Printed provenance. Never claim a generated scene is venue photography. */
  credit: string;
};

const LONDON_CREDIT =
  "Generated London location scene — illustrative cover art, not photography of the venue.";

/** Starter London set. Portrait, so a cover never has to crop to fit. */
export const BOOKLET_COVER_ART: BookletCoverArt[] = [
  {
    id: "ldn-westminster-blue-hour",
    name: "Westminster · blue hour",
    city: "london",
    src: "/covers/london/westminster-blue-hour.jpg",
    wPx: 1280,
    hPx: 1792,
    credit: LONDON_CREDIT,
  },
  {
    id: "ldn-thames-dawn",
    name: "Thames · dawn",
    city: "london",
    src: "/covers/london/thames-dawn.jpg",
    wPx: 1280,
    hPx: 1792,
    credit: LONDON_CREDIT,
  },
  {
    id: "ldn-city-skyline-dusk",
    name: "City skyline · dusk",
    city: "london",
    src: "/covers/london/city-skyline-dusk.jpg",
    wPx: 1280,
    hPx: 1792,
    credit: LONDON_CREDIT,
  },
  {
    id: "ldn-rain-street-night",
    name: "West End · rain at night",
    city: "london",
    src: "/covers/london/rain-street-night.jpg",
    wPx: 1280,
    hPx: 1792,
    credit: LONDON_CREDIT,
  },
  {
    id: "ldn-conference-atrium",
    name: "Conference atrium · daylight",
    city: "london",
    src: "/covers/london/conference-atrium.jpg",
    wPx: 1280,
    hPx: 1792,
    credit: LONDON_CREDIT,
  },
  {
    id: "ldn-st-james-park",
    name: "St James's Park · morning",
    city: "london",
    src: "/covers/london/st-james-park-morning.jpg",
    wPx: 1280,
    hPx: 1792,
    credit: LONDON_CREDIT,
  },
];

export function bookletCoverArt(id?: string | null): BookletCoverArt | null {
  if (!id) return null;
  return BOOKLET_COVER_ART.find((a) => a.id === id) ?? null;
}

export function bookletCoverArtFor(city: string): BookletCoverArt[] {
  return BOOKLET_COVER_ART.filter((a) => a.city === city);
}

/** A rectangle as fractions of the trim, measured from the top-left corner. */
export type FracRect = { x: number; y: number; w: number; h: number };

export type BookletCoverLayout = {
  /** Where the picture is placed. Full-bleed rects run to the bleed edge. */
  photo: FracRect;
  /** True when the picture must fill its box (cropping the overflow). */
  fill: boolean;
  /** Ink veil over the picture so copy stays readable. */
  scrim: { from: "bottom" | "top" | "all"; span: number; strength: number };
  /** Copy block: the band the words are allowed to use, and where they sit in it. */
  copy: FracRect & { anchor: "top" | "bottom" };
};

/**
 * Cover geometry for a treatment.
 *
 * `copyAtTop` is for Word: its cover copy is ordinary flowed text starting at
 * the top of the page, so the picture and veil move rather than the words.
 */
export function bookletCoverLayout(
  treatment: BookletCoverTreatment,
  opts: { copyAtTop?: boolean } = {},
): BookletCoverLayout {
  const top = opts.copyAtTop === true;
  switch (treatment) {
    case "top-half":
      return top
        ? {
            photo: { x: 0, y: 0.54, w: 1, h: 0.46 },
            fill: true,
            scrim: { from: "top", span: 0.62, strength: 0.9 },
            copy: { x: 0, y: 0.04, w: 1, h: 0.46, anchor: "top" },
          }
        : {
            // The picture stops above the copy panel: the headline must never
            // sit on the picture in this treatment.
            photo: { x: 0, y: 0, w: 1, h: 0.5 },
            fill: true,
            scrim: { from: "bottom", span: 0.34, strength: 0.7 },
            copy: { x: 0, y: 0.54, w: 1, h: 0.4, anchor: "top" },
          };
    case "framed":
      return {
        // The window stops clear of the foot so the footnote prints on ink, not
        // on the picture.
        photo: top
          ? { x: 0.1, y: 0.5, w: 0.8, h: 0.38 }
          : { x: 0.1, y: 0.46, w: 0.8, h: 0.38 },
        fill: true,
        scrim: { from: "all", span: 1, strength: 0.16 },
        copy: { x: 0, y: 0.06, w: 1, h: 0.34, anchor: "top" },
      };
    case "wash":
      return {
        photo: { x: 0, y: 0, w: 1, h: 1 },
        fill: true,
        scrim: { from: "all", span: 1, strength: 0.82 },
        copy: top
          ? { x: 0, y: 0.06, w: 1, h: 0.5, anchor: "top" }
          : { x: 0, y: 0.4, w: 1, h: 0.54, anchor: "bottom" },
      };
    case "full-bleed":
    default:
      return {
        photo: { x: 0, y: 0, w: 1, h: 1 },
        fill: true,
        scrim: top
          ? { from: "top", span: 0.66, strength: 0.94 }
          : { from: "bottom", span: 0.68, strength: 0.94 },
        copy: top
          ? { x: 0, y: 0.05, w: 1, h: 0.5, anchor: "top" }
          : { x: 0, y: 0.38, w: 1, h: 0.56, anchor: "bottom" },
      };
  }
}

/** Cover-crop maths: fills a box without ever distorting the picture. */
export function coverCrop(
  wPx: number,
  hPx: number,
  boxW: number,
  boxH: number,
): { w: number; h: number; dx: number; dy: number } {
  const scale = Math.max(boxW / Math.max(1, wPx), boxH / Math.max(1, hPx));
  const w = wPx * scale;
  const h = hPx * scale;
  return { w, h, dx: (boxW - w) * 0.5, dy: (boxH - h) * 0.5 };
}
