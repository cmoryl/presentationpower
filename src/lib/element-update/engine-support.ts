import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server.browser";
import { icons } from "lucide-react";
import QRCode from "qrcode";
import { BRAND, SPECTRUM } from "@/lib/brand-colors";
import worldMap from "@/assets/element-v221/world-map.webp.asset.json";
import { resolveSourceImage } from "./image-resolver";

const esc = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const bounded = (value: unknown, fallback: number, lo: number, hi: number) => {
  const n = Number(value); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
};
function photoImg(value: unknown, cls: string) {
  const p = asRecord(value), src = resolveSourceImage(p);
  if (!src) return "";
  const fx = bounded(p.fx, 50, 0, 100), fy = bounded(p.fy, 50, 0, 100), zoom = bounded(p.zoom, 100, 100, 400) / 100;
  return `<img class="${esc(cls)}" src="${esc(src)}" alt="${esc(p.alt)}" style="object-position:${fx}% ${fy}%;transform:scale(${zoom});transform-origin:${fx}% ${fy}%">`;
}
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(",");
function overlayCss(kind: string, strength: unknown, direction: string) {
  if (kind === "none") return "";
  const s = bounded(strength, 55, 0, 95) / 100;
  const color = { navy: BRAND.ink, indigo: BRAND.ink, cobalt: BRAND.blue, white: BRAND.white, black: BRAND.ink, signature: SPECTRUM.stages[2].brand }[kind] ?? BRAND.ink;
  const c = rgb(color);
  if (direction === "left" || direction === "bottom") return `linear-gradient(${direction === "left" ? 90 : 0}deg,rgba(${c},${s}) 0%,rgba(${c},${s * .55}) 45%,rgba(${c},${s * .05}) 100%)`;
  return `rgba(${c},${s})`;
}
function ic(name: string) {
  const key = String(name ?? "circle").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  const Icon = icons[key as keyof typeof icons] ?? icons.Circle;
  return renderToStaticMarkup(createElement(Icon, { size: 24, "aria-hidden": true }));
}
function qrSvg(link: string, size: number, ink: string, background: string) {
  if (!/^https?:\/\//i.test(link)) return "";
  const code = QRCode.create(link, { errorCorrectionLevel: "M" });
  const n = code.modules.size;
  let cells = "";
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) if (code.modules.get(row, col)) cells += `M${col + 4} ${row + 4}h1v1h-1z`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${n + 8} ${n + 8}" role="img" aria-label="QR code">${background ? `<rect width="100%" height="100%" fill="${esc(background)}"/>` : ""}<path d="${cells}" fill="${esc(ink)}"/></svg>`;
}
// Supplied wordmark only; never revive the retired T+wordmark or invented client logos.
const LOGO = { gl: "/brand-logos/tp-classic-stacked-color.svg", glRev: "/brand-logos/tp-classic-white.svg", glWhite: "/brand-logos/tp-classic-white.svg", tp: "/brand-logos/tp-black.svg", mark: "", markRev: "", markColor: "" };
export const engineSupport = {
  esc, attrText: (value: unknown) => { const t = String(value ?? "").replace(/^[\s\-–—~]+/, "").trim(); return t ? `— ${t}` : ""; }, cleanText: (value: unknown) => String(value ?? "").replace(/[\u0000-\u0008\u000c\u000e-\u001f]/g, ""),
  clone: <T,>(value: T): T => JSON.parse(JSON.stringify(value)), uid: () => crypto.randomUUID(),
  imgSrc: (value: unknown) => resolveSourceImage(value) ?? "", hasImg: (value: unknown) => Boolean(resolveSourceImage(value)),
  cleanPhoto: (value: unknown) => resolveSourceImage(value) ? { ...asRecord(value) } : null,
  photoImg, overlayCss, ic, LOGO, LOGO_AR: { gl: 4.5, mark: 1 }, CUR_BRAND: { name: "TransPerfect", short: "TransPerfect", endorse: false },
  DECK_MAP: worldMap.url, QR: { svg: qrSvg }, PROOF: [] as unknown[], spxOn: () => true,
};