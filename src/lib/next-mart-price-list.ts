// NEXT MART — price list signage (A4 portrait).
//
// Rebuilt natively from the issued Canva master "NEXTMART price list" (page 1,
// 794 x 1123 px = A4 portrait). Nothing is traced: the ground is the approved
// NEXT gradient, the lockups are the approved NEXT MART and TransPerfect NEXT
// marks, and every line of copy is the exact issued wording.
//
// The sheet is a template, not a one-off: each mart stop (city) carries its own
// currency and its own typed prices. Prices are never converted between
// currencies — a new city types the local price it actually charges, so the
// printed sheet can never show a guessed figure.

import { LONDON_STYLES } from "@/lib/next-london-signage";
import { pillarStops, type PillarFaceId } from "@/lib/next-pillar-masters";
import { LONDON_STOP, martStopEventLabel, type MartStop } from "@/lib/next-mart-stops";

/* ── currency ─────────────────────────────────────────────────────────────── */

export type MartCurrency = {
  id: string;
  /** Printed symbol, exactly as it appears on the sheet. */
  symbol: string;
  /** ISO code, printed in the spec sheet for the printer and the shop. */
  code: string;
  label: string;
  /** Some markets print the symbol after the figure. */
  symbolAfter?: boolean;
  /** Decimal places the shop prints for this currency. */
  decimals?: number;
};

export const MART_CURRENCIES: MartCurrency[] = [
  { id: "gbp", symbol: "£", code: "GBP", label: "Pound sterling" },
  { id: "usd", symbol: "$", code: "USD", label: "US dollar" },
  { id: "eur", symbol: "€", code: "EUR", label: "Euro" },
  { id: "chf", symbol: "CHF ", code: "CHF", label: "Swiss franc" },
  { id: "cad", symbol: "CA$", code: "CAD", label: "Canadian dollar" },
  { id: "aud", symbol: "A$", code: "AUD", label: "Australian dollar" },
  { id: "sgd", symbol: "S$", code: "SGD", label: "Singapore dollar" },
  { id: "aed", symbol: "AED ", code: "AED", label: "UAE dirham" },
  { id: "jpy", symbol: "¥", code: "JPY", label: "Japanese yen" },
  { id: "inr", symbol: "₹", code: "INR", label: "Indian rupee" },
  { id: "brl", symbol: "R$", code: "BRL", label: "Brazilian real" },
  { id: "mxn", symbol: "MX$", code: "MXN", label: "Mexican peso" },
  { id: "pln", symbol: " zł", code: "PLN", label: "Polish złoty", symbolAfter: true },
  { id: "sek", symbol: " kr", code: "SEK", label: "Swedish krona", symbolAfter: true },
];

export function martCurrency(id: string | undefined): MartCurrency {
  return MART_CURRENCIES.find((c) => c.id === id) ?? MART_CURRENCIES[0]!;
}

/** Match a stop's printed symbol back to a currency record, when it is one we know. */
export function martCurrencyForSymbol(symbol: string): MartCurrency | undefined {
  const clean = (symbol || "").trim();
  return MART_CURRENCIES.find((c) => c.symbol.trim() === clean);
}

/** The printed price, e.g. "£65" or "120 zł". A blank price prints as "—". */
export function martPriceText(price: number | null, currency: MartCurrency): string {
  if (price === null || !Number.isFinite(price)) return "—";
  const decimals = currency.decimals ?? (Number.isInteger(price) ? 0 : 2);
  const figure = price.toFixed(decimals);
  return currency.symbolAfter ? `${figure}${currency.symbol}` : `${currency.symbol}${figure}`;
}

/* ── model ────────────────────────────────────────────────────────────────── */

export type MartPriceItem = { id: string; name: string; price: number | null };

export type MartPriceCategory = {
  id: string;
  title: string;
  /** 1 = left column, 2 = right column. */
  column: 1 | 2;
  items: MartPriceItem[];
};

export type MartPriceListConfig = {
  /** Mart stop (city) the sheet belongs to. */
  stopId: string;
  eyebrow: string;
  heading: string;
  /** Approved NEXT gradient id from LONDON_STYLES. */
  styleId: string;
  face: PillarFaceId;
  /** Approved tertiary pop used for the category bars. */
  barHex: string;
  currencyId: string;
  /** Printed footer line under the lockup, e.g. the event hashtag. */
  footer: string;
  categories: MartPriceCategory[];
};

/** Approved category-bar colours (brand tertiary pops plus brand blue). */
export const MART_PRICE_BAR_COLOURS: { hex: string; label: string }[] = [
  { hex: "#EC388A", label: "Pink (issued master)" },
  { hex: "#003FC7", label: "Blue 500" },
  { hex: "#03002C", label: "Blue 800" },
  { hex: "#E53D2E", label: "Red" },
  { hex: "#FF9B70", label: "Peach" },
];

/* ── issued London master ─────────────────────────────────────────────────── */

const item = (name: string, price: number): MartPriceItem => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  name,
  price,
});

/**
 * The exact issued page: same categories, same item wording, same prices, same
 * column order as the supplied Canva master.
 */
export const LONDON_PRICE_LIST_CATEGORIES: MartPriceCategory[] = [
  {
    id: "travel-tech",
    title: "TRAVEL & TECH ACCESSORIES",
    column: 1,
    items: [
      item("PACKING CUBES", 50),
      item("PORTABLE FAN", 10),
      item("LAPTOP SLEEVE", 50),
      item("TRAVEL TECH BAG", 35),
      item("CABLES ORGANIZERS", 5),
      item("ANKER POWER BANK", 50),
    ],
  },
  { id: "local-item", title: "LOCAL ITEM", column: 1, items: [item("SKANDY BAG", 10)] },
  {
    id: "clothes",
    title: "CLOTHES",
    column: 2,
    items: [
      item("RAIN JACKETS", 65),
      item("WOMEN OGIO ¼ ZIP", 65),
      item("MEN PORTH AUTHORITY ¼ ZIP", 50),
    ],
  },
  {
    id: "accessories",
    title: "ACCESSORIES",
    column: 2,
    items: [
      item("WATER BOTTLES", 20),
      item("UMBRELLAS", 15),
      item("NIKE DRI FIT LEGACY CAP", 40),
    ],
  },
];

export const MART_PRICE_LIST_SOURCE = {
  name: "NEXTMART price list",
  issued: "September 2026",
  url: "https://www.canva.com/design/DAGImOPvCFY/edit",
  page: 1,
  note: "Rebuilt natively from page 1 of the issued Canva master. Copy and prices are the issued wording; the ground and lockups are the approved NEXT artwork.",
} as const;

/** The issued London sheet — the master every other stop is cloned from. */
export function londonPriceList(): MartPriceListConfig {
  return {
    stopId: LONDON_STOP.id,
    eyebrow: "",
    heading: "PRICE LIST",
    styleId: "07-prism-sweep",
    face: "dark",
    barHex: "#EC388A",
    currencyId: "gbp",
    footer: "",
    categories: LONDON_PRICE_LIST_CATEGORIES.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i })) })),
  };
}

/** A sheet for a stop: the issued layout with the stop's own currency. */
export function martPriceListForStop(stop: MartStop): MartPriceListConfig {
  const base = londonPriceList();
  if (stop.id === LONDON_STOP.id) return base;
  const currency = martCurrencyForSymbol(stop.currency);
  return {
    ...base,
    stopId: stop.id,
    currencyId: currency?.id ?? base.currencyId,
    // Prices are deliberately left as the London figures until somebody types
    // the local ones — they are never converted, and the editor flags them.
    categories: base.categories.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i })) })),
  };
}

export function martPriceListStyleLabel(styleId: string): string {
  return LONDON_STYLES[styleId]?.label ?? styleId;
}

export function martPriceListSlug(config: MartPriceListConfig): string {
  return `${config.stopId || "stop"}-price-list`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/* ── geometry ─────────────────────────────────────────────────────────────── */

/** A4 portrait, printed with a 3 mm bleed each edge. */
export const MART_PRICE_SHEET = {
  trimW: 210,
  trimH: 297,
  bleed: 3,
  margin: 14,
  gutter: 8,
  /** Category bar height, mm. */
  barH: 11,
  /** Item row height, mm. */
  rowH: 11.5 as number,
  /** Price cell width, mm. */
  priceW: 22,
  substrate: "350 gsm silk board, matt laminate",
  finishing: "Trimmed to A4, no fold. Also runs as an A3 blow-up at 141%.",
} as const;

export type MartPriceBlock = {
  kind: "bar" | "row";
  categoryId: string;
  itemId?: string;
  /** Printed label; item names wrap to at most two lines. */
  lines: string[];
  price?: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Rough advance width of Geist Bold caps, in mm per point of cap height. */
const CAP_ADVANCE = 0.62;

function wrap(text: string, sizeMm: number, widthMm: number): string[] {
  const perChar = sizeMm * CAP_ADVANCE;
  const max = Math.max(4, Math.floor(widthMm / perChar));
  if (text.length <= max) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  // Never drop issued words: fold everything past the last printed line back on.
  const keep = lines.slice(0, maxLines - 1);
  keep.push(lines.slice(maxLines - 1).join(" "));
  return keep;

}

export type MartPriceLayout = {
  blocks: MartPriceBlock[];
  columnW: number;
  /** Lowest printed edge of the tables, mm from the trim top. */
  bottom: number;
  /** True when the content runs past the footer band and needs trimming back. */
  overflow: boolean;
  headingY: number;
  lockupY: number;
  footerY: number;
  itemSize: number;
  /** Item name font size actually used, after any shrink to fit. */
  barSize: number;
};

const HEAD_TOP = 26; // NEXT MART lockup band
const HEADING_Y = 84; // "PRICE LIST"
const TABLE_TOP = 100;
const FOOTER_Y = 272;

/** Positions for every bar and row on the sheet, shared by every output. */
export function martPriceListLayout(config: MartPriceListConfig): MartPriceLayout {
  const S = MART_PRICE_SHEET;
  const currency = martCurrency(config.currencyId);
  const columnW = (S.trimW - S.margin * 2 - S.gutter) / 2;
  const nameW = columnW - S.priceW - 8;

  const build = (itemSize: number, rowH: number): { blocks: MartPriceBlock[]; bottom: number } => {
    const blocks: MartPriceBlock[] = [];
    let bottom = TABLE_TOP;
    for (const column of [1, 2] as const) {
      const x = S.margin + (column === 2 ? columnW + S.gutter : 0);
      let y = TABLE_TOP;
      for (const category of config.categories.filter((c) => c.column === column)) {
        if (!category.items.length && !category.title.trim()) continue;
        blocks.push({
          kind: "bar",
          categoryId: category.id,
          lines: wrap(category.title, 10, columnW - 8),
          x,
          y,
          w: columnW,
          h: S.barH,
        });
        y += S.barH;
        for (const it of category.items) {
          const lines = wrap(it.name, itemSize, nameW);
          const h = lines.length > 1 ? rowH + itemSize * 0.5 : rowH;
          blocks.push({
            kind: "row",
            categoryId: category.id,
            itemId: it.id,
            lines,
            price: martPriceText(it.price, currency),
            x,
            y,
            w: columnW,
            h,
          });
          y += h;
        }
        y += 6; // gap before the next category in this column
      }
      bottom = Math.max(bottom, y);
    }
    return { blocks, bottom };
  };

  // Shrink the item type a little rather than letting a long list run into the
  // footer. Past the floor the sheet reports an overflow instead of clipping.
  let itemSize = 10;
  let rowH = MART_PRICE_SHEET.rowH;
  let out = build(itemSize, rowH);
  while (out.bottom > FOOTER_Y - 10 && itemSize > 7) {
    itemSize -= 0.5;
    rowH = Math.max(8.5, rowH - 0.5);
    out = build(itemSize, rowH);
  }

  return {
    blocks: out.blocks,
    columnW,
    bottom: out.bottom,
    overflow: out.bottom > FOOTER_Y - 10,
    headingY: HEADING_Y,
    lockupY: HEAD_TOP,
    footerY: FOOTER_Y,
    itemSize,
    barSize: 10,
  };
}

/** Count of printed items, for the spec sheet and the page summary. */
export function martPriceListItemCount(config: MartPriceListConfig): number {
  return config.categories.reduce((n, c) => n + c.items.length, 0);
}

/** Items still carrying no typed price — these must be filled before print. */
export function martPriceListMissing(config: MartPriceListConfig): string[] {
  return config.categories.flatMap((c) =>
    c.items.filter((i) => i.price === null || !Number.isFinite(i.price)).map((i) => i.name),
  );
}

/* ── SVG ──────────────────────────────────────────────────────────────────── */

export type MartPriceSvgOptions = {
  /** Include the 3 mm bleed and trim guides (guides are marked non-printing). */
  withBleed?: boolean;
  /** Inline lockup markup (an approved SVG master) for a fully vector file. */
  martLockupSvg?: string;
  transperfectLockupSvg?: string;
  /** Fallback: link the lockups as images (browser preview). */
  martLockupUrl?: string;
  transperfectLockupUrl?: string;
};

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Strip an SVG master down to its drawable body, scaled into a box. */
function inlineLockup(svg: string, x: number, y: number, w: number, h: number, id: string): string {
  const box = /viewBox\s*=\s*"([^"]+)"/i.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number);
  const vw = box && box.length === 4 ? box[2]! : 0;
  const vh = box && box.length === 4 ? box[3]! : 0;
  if (!vw || !vh) return "";
  const body = svg
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");
  const scale = Math.min(w / vw, h / vh);
  const dx = x + (w - vw * scale) / 2 - (box![0]! * scale);
  const dy = y + (h - vh * scale) / 2 - (box![1]! * scale);
  return `<g id="${id}" transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)}) scale(${scale.toFixed(5)})">${body}</g>`;
}

/**
 * The price list sheet as one editable SVG: layered groups, live text, the
 * approved gradient as a real SVG gradient and the lockups as vector groups.
 */
export function martPriceListSvg(
  config: MartPriceListConfig,
  stop: MartStop,
  options: MartPriceSvgOptions = {},
): string {
  const S = MART_PRICE_SHEET;
  const layout = martPriceListLayout(config);
  const bleed = options.withBleed ? S.bleed : 0;
  const w = S.trimW + bleed * 2;
  const h = S.trimH + bleed * 2;
  const stops = pillarStops(config.styleId, config.face);
  const dark = config.face === "dark";
  const cardInk = "#03002C";
  const cardGround = "#FFFFFF";

  const gradient = `<linearGradient id="mart-ground" x1="0" y1="0" x2="1" y2="1">${stops
    .map(
      (hex, i) =>
        `<stop offset="${((i / Math.max(1, stops.length - 1)) * 100).toFixed(2)}%" stop-color="${hex}"/>`,
    )
    .join("")}</linearGradient>`;

  const ground = `<g id="01_GROUND"><rect x="0" y="0" width="${w}" height="${h}" fill="url(#mart-ground)"/></g>`;

  const lockupW = 120;
  const lockupH = 24;
  const lockupX = bleed + (S.trimW - lockupW) / 2;
  const martLockup = options.martLockupSvg
    ? inlineLockup(options.martLockupSvg, lockupX, bleed + layout.lockupY, lockupW, lockupH, "mart-lockup")
    : options.martLockupUrl
      ? `<image id="mart-lockup" href="${esc(options.martLockupUrl)}" x="${lockupX}" y="${bleed + layout.lockupY}" width="${lockupW}" height="${lockupH}" preserveAspectRatio="xMidYMid meet"/>`
      : "";
  const footW = 80;
  const footX = bleed + (S.trimW - footW) / 2;
  const tpLockup = options.transperfectLockupSvg
    ? inlineLockup(options.transperfectLockupSvg, footX, bleed + layout.footerY, footW, 14, "tp-lockup")
    : options.transperfectLockupUrl
      ? `<image id="tp-lockup" href="${esc(options.transperfectLockupUrl)}" x="${footX}" y="${bleed + layout.footerY}" width="${footW}" height="14" preserveAspectRatio="xMidYMid meet"/>`
      : "";

  const text = (
    body: string,
    x: number,
    y: number,
    size: number,
    fill: string,
    anchor: "start" | "middle" | "end" = "start",
    weight = 700,
  ) =>
    `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-family="Geist, 'Geist Variable', Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="0.2">${esc(body)}</text>`;

  const heading = `<g id="03_TITLE">${text(
    config.heading,
    bleed + S.trimW / 2,
    bleed + layout.headingY,
    22,
    dark ? "#FFFFFF" : cardInk,
    "middle",
  )}${
    config.eyebrow.trim()
      ? text(config.eyebrow, bleed + S.trimW / 2, bleed + layout.headingY - 13, 9, dark ? "#FFFFFF" : cardInk, "middle")
      : ""
  }</g>`;

  const tables = layout.blocks
    .map((b) => {
      const x = bleed + b.x;
      const y = bleed + b.y;
      if (b.kind === "bar") {
        return `<g class="category-bar" data-category="${esc(b.categoryId)}"><rect x="${x}" y="${y}" width="${b.w}" height="${b.h}" fill="${config.barHex}"/>${b.lines
          .map((line, i) =>
            text(
              line,
              x + b.w / 2,
              y + b.h / 2 + 3.4 + (i - (b.lines.length - 1) / 2) * 4.6,
              layout.barSize * 0.62 + 2,
              "#FFFFFF",
              "middle",
            ),
          )
          .join("")}</g>`;
      }
      const priceX = x + b.w - MART_PRICE_SHEET.priceW;
      return `<g class="price-row" data-item="${esc(b.itemId ?? "")}"><rect x="${x}" y="${y}" width="${b.w}" height="${b.h}" fill="${cardGround}"/><rect x="${priceX}" y="${y}" width="${MART_PRICE_SHEET.priceW}" height="${b.h}" fill="${cardGround}"/><line x1="${priceX}" y1="${y}" x2="${priceX}" y2="${y + b.h}" stroke="#D8DEE9" stroke-width="0.3"/><line x1="${x}" y1="${y + b.h}" x2="${x + b.w}" y2="${y + b.h}" stroke="#D8DEE9" stroke-width="0.3"/>${b.lines
        .map((line, i) =>
          text(
            line,
            x + 4,
            y + b.h / 2 + 2.6 + (i - (b.lines.length - 1) / 2) * (layout.itemSize * 0.52),
            layout.itemSize * 0.62,
            cardInk,
          ),
        )
        .join("")}${text(
        b.price ?? "",
        priceX + MART_PRICE_SHEET.priceW / 2,
        y + b.h / 2 + 2.6,
        layout.itemSize * 0.62,
        cardInk,
        "middle",
      )}</g>`;
    })
    .join("");

  const footer = config.footer.trim()
    ? text(config.footer, bleed + S.trimW / 2, bleed + layout.footerY + 20, 7, dark ? "#FFFFFF" : cardInk, "middle", 500)
    : "";

  const guides = options.withBleed
    ? `<g id="07_GUIDES" data-export-ignore="true"><rect x="${bleed}" y="${bleed}" width="${S.trimW}" height="${S.trimH}" fill="none" stroke="#EC388A" stroke-width="0.2" stroke-dasharray="2 2"/></g>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">`,
    `<title>${esc(`NEXT MART price list — ${martStopEventLabel(stop)}`)}</title>`,
    `<defs>${gradient}</defs>`,
    ground,
    `<g id="02_LOCKUP">${martLockup}</g>`,
    heading,
    `<g id="04_TABLES">${tables}</g>`,
    `<g id="05_FOOTER">${tpLockup}${footer}</g>`,
    guides,
    `</svg>`,
  ].join("");
}

/** Printer-facing spec sheet for the price list. */
export function martPriceListSpec(config: MartPriceListConfig, stop: MartStop): string {
  const S = MART_PRICE_SHEET;
  const currency = martCurrency(config.currencyId);
  const missing = martPriceListMissing(config);
  return [
    `NEXT MART — price list signage`,
    ``,
    `Event:        ${martStopEventLabel(stop)}`,
    `Venue:        ${stop.venue} · ${stop.dates}`,
    `Trim:         ${S.trimW} x ${S.trimH} mm (A4 portrait)`,
    `Bleed:        ${S.bleed} mm per edge`,
    `Ground:       ${martPriceListStyleLabel(config.styleId)} (${config.styleId}), ${config.face} face`,
    `Category bar: ${config.barHex}`,
    `Currency:     ${currency.code} (${currency.symbol.trim()})`,
    `Items:        ${martPriceListItemCount(config)} across ${config.categories.length} categories`,
    `Substrate:    ${S.substrate}`,
    `Finishing:    ${S.finishing}`,
    ``,
    `Colour:       RGB house artwork. Body text 100K when the printer separates.`,
    `Source:       ${MART_PRICE_LIST_SOURCE.note}`,
    ``,
    missing.length
      ? `PRICES MISSING — do not print: ${missing.join(", ")}`
      : `All ${martPriceListItemCount(config)} items carry a typed ${currency.code} price.`,
    ``,
  ].join("\n");
}
