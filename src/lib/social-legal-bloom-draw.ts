// ---------------------------------------------------------------------------
// LEGAL CAMPAIGN — bloom variation, one frame drawn onto a canvas
//
// The still ads are laid out in the page itself (BloomAd). A moving ad has to
// be drawn frame by frame, so the same anatomy is rebuilt here against a 2D
// canvas: ground, splash, bloom, the turned picture frame with the photograph
// travelling inside it, the line rising word by word with the accent word
// settling in, and the black lockup landing last.
//
// This one drawing routine feeds BOTH the animated preview on the board and the
// written video file, so what a person watches is what they get.
// ---------------------------------------------------------------------------

import tpLegalBlackRaw from "@/assets/legal-bloom/tp-legal-black.svg?raw";
import {
  bloomColour,
  bloomLean,
  LEGAL_BLOOM_PALETTE as P,
  type BloomAperture,
  type BloomScene,
  type BloomSide,
} from "./social-legal-bloom";
import { bloomAutoLayout, type BloomAdLayout } from "./social-legal-bloom-layout";
import { bloomCornerRadii, type BloomMotionFrame } from "./social-legal-bloom-motion";

const HEAD_FAMILY = '"Playfair Display", Georgia, serif';
const BODY_FAMILY = '"Instrument Sans", "Geist", system-ui, sans-serif';

const tpLegalBlack = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tpLegalBlackRaw)}`;

export type BloomDrawAssets = { photo: HTMLImageElement; logo: HTMLImageElement };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "sync";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`The picture could not be loaded: ${src}`));
    img.src = src;
  });
}

/** The photograph and the lockup, ready to draw. */
export async function loadBloomAssets(scene: BloomScene): Promise<BloomDrawAssets> {
  const [photo, logo] = await Promise.all([loadImage(scene.photo), loadImage(tpLegalBlack)]);
  return { photo, logo };
}

/**
 * The two faces have to be in memory before anything is drawn, or the first
 * frames come out in a fallback font.
 */
export async function ensureBloomFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const faces = [
    '700 64px "Playfair Display"',
    'italic 700 64px "Playfair Display"',
    '400 24px "Instrument Sans"',
  ];
  await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => undefined)));
  await document.fonts.ready;
}

/** 0–1 alpha as the two-digit hex suffix of an 8-digit colour. */
function alphaHex(a: number) {
  const v = Math.round(Math.min(1, Math.max(0, a)) * 255);
  return v.toString(16).padStart(2, "0").toUpperCase();
}

function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: { tl: number; tr: number; br: number; bl: number },
) {
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  if (r.tr) ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  if (r.br) ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
  ctx.lineTo(x + r.bl, y + h);
  if (r.bl) ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
  ctx.lineTo(x, y + r.tl);
  if (r.tl) ctx.arcTo(x, y, x + r.tl, y, r.tl);
  ctx.closePath();
}

type Token = { text: string; accent: boolean };

type Placed = {
  text: string;
  accent: boolean;
  x: number;
  /** baseline within the headline block */
  y: number;
  size: number;
};

function focusFractions(focus: string): { fx: number; fy: number } {
  const parts = focus.split(/\s+/);
  const num = (s: string | undefined, fallback: number) => {
    const v = Number.parseFloat(s ?? "");
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v / 100)) : fallback;
  };
  return { fx: num(parts[0], 0.5), fy: num(parts[1], 0.5) };
}

/**
 * Lay the headline out word by word: the roman words at the base size, the
 * accent word larger and italic, wrapped to the copy column.
 */
function layoutHeadline(
  ctx: CanvasRenderingContext2D,
  tokens: Token[],
  basePx: number,
  turnEm: number,
  maxWidth: number,
): { words: Placed[]; height: number } {
  const spaceOf = (size: number) => {
    ctx.font = `700 ${size}px ${HEAD_FAMILY}`;
    return ctx.measureText(" ").width;
  };
  const widthOf = (t: Token, size: number) => {
    ctx.font = `${t.accent ? "italic " : ""}700 ${size}px ${HEAD_FAMILY}`;
    return ctx.measureText(t.text).width;
  };

  const lines: { items: { t: Token; size: number; w: number }[]; max: number }[] = [];
  let line: { items: { t: Token; size: number; w: number }[]; max: number } = { items: [], max: 0 };
  for (const t of tokens) {
    const size = t.accent ? basePx * turnEm : basePx;
    const w = widthOf(t, size);
    const gap = line.items.length ? spaceOf(size) : 0;
    const run = line.items.reduce((a, i) => a + i.w, 0) + line.items.length * spaceOf(basePx);
    if (line.items.length && run + gap + w > maxWidth) {
      lines.push(line);
      line = { items: [], max: 0 };
    }
    line.items.push({ t, size, w });
    line.max = Math.max(line.max, size);
  }
  if (line.items.length) lines.push(line);

  const words: Placed[] = [];
  let y = 0;
  for (const l of lines) {
    const leading = l.max > basePx * 1.15 ? 1.06 : 1.2;
    y += l.max * (l.max > basePx * 1.15 ? 0.94 : 0.9);
    let x = 0;
    for (const item of l.items) {
      words.push({ text: item.t.text, accent: item.t.accent, x, y, size: item.size });
      x += item.w + spaceOf(item.size);
    }
    y += l.max * (leading - (l.max > basePx * 1.15 ? 0.94 : 0.9));
  }
  return { words, height: y };
}

function wrapBody(
  ctx: CanvasRenderingContext2D,
  text: string,
  px: number,
  maxWidth: number,
): string[] {
  ctx.font = `400 ${px}px ${BODY_FAMILY}`;
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      out.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) out.push(line);
  return out;
}

export type BloomDrawOptions = {
  scene: BloomScene;
  w: number;
  h: number;
  aperture?: BloomAperture;
  side?: BloomSide;
  layout?: BloomAdLayout;
  motion: BloomMotionFrame;
  assets: BloomDrawAssets;
};

/** Draw one frame of a moving ad, filling the whole canvas. */
export function drawBloomMotionFrame(ctx: CanvasRenderingContext2D, o: BloomDrawOptions) {
  const { scene, w, h, motion: m, assets } = o;
  const C = bloomColour(scene);
  const cut = o.aperture ?? scene.aperture;
  const copySide = o.side ?? scene.side;
  const L = o.layout ?? bloomAutoLayout(scene, w, h, cut, copySide);
  const short = Math.min(w, h);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = P.ground;
  ctx.fillRect(0, 0, w, h);

  const bloomEm = Math.max(0, Math.min(3, L.bloomEm ?? 1));
  const scrimEm = Math.max(0, Math.min(2, L.scrimEm ?? 1));
  const splash = L.splashShape ?? "soft";

  const boxX = L.picture.x * w;
  const boxY = L.picture.y * h;
  const boxW = L.picture.w * w;
  const boxH = L.picture.h * h;
  const radii = bloomCornerRadii(cut, boxW, boxH);
  const strokePx = Math.max(1.5, short * 0.008);

  // ---- the accent splash in the lower corner away from the picture
  const pictureCentre = L.picture.x + L.picture.w / 2;
  const splashSide: "left" | "right" = pictureCentre >= 0.5 ? "left" : "right";
  if (splash !== "none" && bloomEm > 0 && m.splash.opacity > 0.01) {
    const sw = short * (splash === "curved" ? 0.82 : splash === "circle" ? 0.58 : 0.72);
    const sh = short * (splash === "curved" ? 0.5 : splash === "circle" ? 0.58 : 0.6);
    const sx =
      (splashSide === "left" ? -short * 0.2 : w - sw + short * 0.2) + short * m.splash.driftX;
    const sy = h - sh + short * 0.2 + short * m.splash.driftY;

    ctx.save();
    ctx.globalAlpha = 0.86 * m.splash.opacity;
    ctx.filter = `blur(${short * 0.04 * Math.max(0.35, bloomEm)}px)`;
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(sw, sh) * 0.62 * m.splash.scale);
    g.addColorStop(0, `${C.glow}D9`);
    g.addColorStop(0.42, `${C.glow}8C`);
    g.addColorStop(0.7, `${C.glow}33`);
    g.addColorStop(1, `${C.glow}00`);
    ctx.fillStyle = g;
    if (splash === "triangle") {
      ctx.beginPath();
      if (splashSide === "left") {
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + sw, sy + sh);
        ctx.lineTo(sx, sy + sh);
      } else {
        ctx.moveTo(sx + sw, sy);
        ctx.lineTo(sx + sw, sy + sh);
        ctx.lineTo(sx, sy + sh);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(sx, sy, sw, sh);
    }
    ctx.restore();
  }

  // ---- the bloom leaning out through the turned diagonal
  if (bloomEm > 0 && m.bloom.opacity > 0.01) {
    const lean = bloomLean(cut);
    const pad = short * 0.11;
    const bx = boxX - pad + boxW * lean.x * 0.09;
    const by = boxY - pad + boxH * lean.y * 0.07;
    const bw = boxW + pad * 2;
    const bh = boxH + pad * 2;
    const cx = bx + bw / 2;
    const cy = by + bh * 0.48;
    const r = (Math.max(bw, bh) / 2) * m.bloom.scale;
    ctx.save();
    ctx.globalAlpha = m.bloom.opacity;
    ctx.filter = `blur(${short * 0.045 * bloomEm}px)`;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `${C.glow}FF`);
    g.addColorStop(0.24, `${C.glow}D6`);
    g.addColorStop(0.44, `${C.glow}73`);
    g.addColorStop(0.62, `${C.glow}2B`);
    g.addColorStop(1, `${C.glow}00`);
    ctx.fillStyle = g;
    ctx.fillRect(bx - short * 0.1, by - short * 0.1, bw + short * 0.2, bh + short * 0.2);
    ctx.restore();
  }

  // ---- the picture: the frame holds still, the photograph travels inside it
  ctx.save();
  ctx.globalAlpha = m.frame.opacity;
  roundedPath(ctx, boxX, boxY, boxW, boxH, radii);
  ctx.save();
  ctx.clip();
  // the uncovering: the frame's shape holds, the picture arrives inside it,
  // and the accent keyline arrives with it rather than ringing an empty box
  const rv = Math.max(0, Math.min(1, m.frame.reveal));
  const revealPath = () => {
    ctx.beginPath();
    if (m.frame.revealMode === "wipe-up") {
      ctx.rect(boxX, boxY + boxH * (1 - rv), boxW, boxH * rv);
    } else if (m.frame.revealMode === "wipe-side") {
      const fromRight = L.copy.x > L.picture.x;
      if (fromRight) ctx.rect(boxX + boxW * (1 - rv), boxY, boxW * rv, boxH);
      else ctx.rect(boxX, boxY, boxW * rv, boxH);
    } else if (m.frame.revealMode === "iris") {
      const r = Math.hypot(boxW, boxH) * 0.52 * rv;
      ctx.arc(boxX + boxW / 2, boxY + boxH / 2, Math.max(0.5, r), 0, Math.PI * 2);
    } else if (m.frame.revealMode === "corner") {
      // opens along the ad's own turned diagonal
      const d = (boxW + boxH) * rv;
      if (cut.endsWith("left")) {
        ctx.moveTo(boxX, boxY);
        ctx.lineTo(boxX + d, boxY);
        ctx.lineTo(boxX, boxY + d);
      } else {
        ctx.moveTo(boxX + boxW, boxY);
        ctx.lineTo(boxX + boxW - d, boxY);
        ctx.lineTo(boxX + boxW, boxY + d);
      }
      ctx.closePath();
    } else {
      ctx.rect(boxX, boxY, boxW, boxH);
    }
  };
  if (rv < 1) {
    revealPath();
    ctx.clip();
  }
  const pw = assets.photo.naturalWidth || assets.photo.width || boxW;
  const ph = assets.photo.naturalHeight || assets.photo.height || boxH;
  const { fx, fy } = focusFractions(scene.focus);
  const cover = Math.max(boxW / pw, boxH / ph) * m.photo.scale;
  const dw = pw * cover;
  const dh = ph * cover;
  const dx = boxX + (boxW - dw) * fx + m.photo.x * boxW;
  const dy = boxY + (boxH - dh) * fy + m.photo.y * boxH;
  ctx.drawImage(assets.photo, dx, dy, dw, dh);

  // a single pass of light across the picture, when the preset calls for it
  if (m.sweep >= 0) {
    const band = boxW * 0.55;
    const at = boxX - band + (boxW + band * 2) * m.sweep;
    const g = ctx.createLinearGradient(at, boxY, at + band, boxY + boxH);
    g.addColorStop(0, "#FFFFFF00");
    g.addColorStop(0.5, `#FFFFFF${alphaHex(0.16 * Math.sin(Math.PI * m.sweep))}`);
    g.addColorStop(1, "#FFFFFF00");
    ctx.fillStyle = g;
    ctx.fillRect(boxX, boxY, boxW, boxH);
  }
  ctx.restore();

  // the solid accent keyline sits on the frame itself. While the picture is
  // still arriving the line is held to the uncovered part, so it never reads as
  // an empty square around nothing.
  ctx.save();
  if (rv < 1) {
    revealPath();
    ctx.clip();
  }
  roundedPath(ctx, boxX, boxY, boxW, boxH, radii);
  ctx.lineWidth = strokePx;
  ctx.strokeStyle = C.type;
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // ---- the copy block
  const copyX = L.copy.x * w;
  const copyY = L.copy.y * h;
  const copyW = L.copy.w * w;
  const copyH = L.copy.h * h;
  const headPx = L.headPx * short;
  const supportPx = L.supportPx * short;
  const turnEm = Math.max(1, L.turnEm ?? 1.62);

  const tokens: Token[] = [
    ...scene.lead.split(/\s+/).map((text) => ({ text, accent: false })),
    { text: scene.turn, accent: true },
    ...(scene.tail ? scene.tail.split(/\s+/).map((text) => ({ text, accent: false })) : []),
  ];
  const head = layoutHeadline(ctx, tokens, headPx, turnEm, copyW);
  const bodyLines = wrapBody(ctx, scene.support, supportPx, Math.min(copyW, supportPx * 24));
  const gap = short * 0.026;
  const bodyH = bodyLines.length * supportPx * 1.42;
  const blockH = head.height + gap + bodyH;
  const top = copyY + Math.max(0, (copyH - blockH) / 2);

  // when the words sit over the picture they get their own soft ground
  const ovX =
    Math.max(
      0,
      Math.min(L.copy.x + L.copy.w, L.picture.x + L.picture.w) - Math.max(L.copy.x, L.picture.x),
    ) * w;
  const ovY =
    Math.max(
      0,
      Math.min(L.copy.y + L.copy.h, L.picture.y + L.picture.h) - Math.max(L.copy.y, L.picture.y),
    ) * h;
  const overlap = (ovX * ovY) / Math.max(1, copyW * copyH);
  if (overlap > 0.06 && scrimEm > 0) {
    const a = Math.min(0.95, (0.42 + overlap * 0.55) * scrimEm);
    const cx = copyX + copyW * 0.42;
    const cy = top + blockH / 2;
    const r = Math.max(copyW, blockH) * 0.78;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `${P.ground}${alphaHex(a)}`);
    g.addColorStop(0.42, `${P.ground}${alphaHex(a * 0.8)}`);
    g.addColorStop(0.66, `${P.ground}${alphaHex(a * 0.34)}`);
    g.addColorStop(1, `${P.ground}00`);
    ctx.save();
    ctx.globalAlpha = Math.max(m.words.progress, m.turn.opacity);
    ctx.fillStyle = g;
    ctx.fillRect(copyX - r, cy - r, copyW + r * 2, r * 2);
    ctx.restore();
  }

  // the line arrives in the way the chosen motion calls for
  const mode = m.words.mode;
  const romanWords = head.words.filter((wd) => !wd.accent);
  const romanCount = Math.max(1, romanWords.length);
  const totalChars = Math.max(1, head.words.reduce((a, wd) => a + wd.text.length, 0));
  const shownChars = Math.round(totalChars * m.words.progress);
  let charsBefore = 0;
  let romanIndex = 0;

  for (const word of head.words) {
    const charsThisWord = word.text.length;
    const before = charsBefore;
    charsBefore += charsThisWord;

    // how far this particular word has arrived
    let local: number;
    let shown = word.text;
    if (mode === "hold") {
      local = 1;
    } else if (mode === "fade") {
      local = m.words.progress;
    } else if (mode === "typewrite") {
      const chars = Math.max(0, Math.min(charsThisWord, shownChars - before));
      shown = word.text.slice(0, chars);
      local = chars > 0 ? 1 : 0;
    } else {
      const index = word.accent ? romanIndex : romanIndex;
      local = Math.max(0, Math.min(1, m.words.progress * (romanCount + 1) - index));
    }
    if (!word.accent) romanIndex += 1;

    const drop = mode === "drop" ? -1 : 1;
    const dy = short * m.words.rise * (1 - local) * drop;
    const dx = short * m.words.slide * (1 - local);

    if (word.accent) {
      // the italic word keeps its own settle, on top of the line's arrival
      const alpha = mode === "typewrite" || mode === "hold" ? local : m.turn.opacity;
      if (alpha <= 0.01 || !shown) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = C.type;
      ctx.font = `italic 700 ${word.size}px ${HEAD_FAMILY}`;
      const full = ctx.measureText(word.text).width;
      const centreX = copyX + word.x + full / 2 + dx;
      const baseY = top + word.y + short * m.turn.rise + dy + word.size * 0.055;
      ctx.translate(centreX, baseY);
      ctx.scale(m.turn.scale, m.turn.scale);
      ctx.fillText(shown, -full / 2, 0);
      ctx.restore();
      continue;
    }

    if (local <= 0.01 || !shown) continue;
    ctx.save();
    ctx.globalAlpha = mode === "typewrite" || mode === "hold" ? 1 : local;
    ctx.fillStyle = P.ink;
    ctx.font = `700 ${word.size}px ${HEAD_FAMILY}`;
    const scaleIn = mode === "cascade" ? 0.94 + 0.06 * local : 1;
    if (scaleIn !== 1) {
      ctx.translate(copyX + word.x + dx, top + word.y + dy);
      ctx.scale(scaleIn, scaleIn);
      ctx.fillText(shown, 0, 0);
    } else {
      ctx.fillText(shown, copyX + word.x + dx, top + word.y + dy);
    }
    ctx.restore();
  }

  // the supporting line
  if (m.support.opacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = m.support.opacity;
    ctx.fillStyle = `${P.ink}B8`;
    ctx.font = `400 ${supportPx}px ${BODY_FAMILY}`;
    let by = top + head.height + gap + supportPx + short * m.support.rise;
    for (const line of bodyLines) {
      ctx.fillText(line, copyX, by);
      by += supportPx * 1.42;
    }
    ctx.restore();
  }

  // ---- the lockup: black single line, bottom right, landing last
  if (m.logo.opacity > 0.01) {
    const lh = L.lockup.h * short;
    const lw =
      lh *
      ((assets.logo.naturalWidth || assets.logo.width || 4) /
        (assets.logo.naturalHeight || assets.logo.height || 1));
    ctx.save();
    ctx.globalAlpha = 0.95 * m.logo.opacity;
    ctx.drawImage(
      assets.logo,
      w - L.lockup.x * w - lw,
      h - L.lockup.y * h - lh + short * m.logo.rise,
      lw,
      lh,
    );
    ctx.restore();
  }

  ctx.restore();
}
