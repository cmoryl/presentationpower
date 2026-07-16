import type { ModuleVariant } from "@/lib/taxonomy";
import portrait1 from "@/assets/portraits/portrait-1.png";
import portrait2 from "@/assets/portraits/portrait-2.png";
import portrait3 from "@/assets/portraits/portrait-3.png";
import portrait4 from "@/assets/portraits/portrait-4.png";

const PORTRAITS = [portrait1, portrait2, portrait3, portrait4];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * MediaZoneOverlay renders semi-transparent, labelled "media zones" on top of a
 * 1920×1080 slide stage. It shows designers/reviewers where each variant can
 * accept human imagery, geometric design shapes, ambient aura backgrounds, or
 * translucent overlay layers — all authored in stage coordinates so it scales
 * with <ScaledSlide>.
 */

export type MediaZoneKind = "human" | "shape" | "aura" | "overlay";

type Zone = {
  kind: MediaZoneKind;
  // Stage-space rect (0..1920 × 0..1080). Values outside the stage are clipped.
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  // Optional shape: rectangle (default) or circle.
  shape?: "rect" | "circle";
  rotate?: number;
};

const KIND_STYLES: Record<
  MediaZoneKind,
  { label: string; ring: string; fill: string; text: string; icon: string }
> = {
  human: {
    label: "Human imagery",
    ring: "rgba(0, 63, 199, 0.55)",
    fill: "rgba(0, 63, 199, 0.10)",
    text: "#03002C",
    icon: "👤",
  },
  shape: {
    label: "Design shape",
    ring: "rgba(236, 56, 138, 0.55)",
    fill: "rgba(236, 56, 138, 0.10)",
    text: "#7A0F3F",
    icon: "◆",
  },
  aura: {
    label: "Soft overlay",
    ring: "rgba(161, 251, 249, 0.75)",
    fill: "rgba(161,251,249,0.18)",
    text: "#0B2A4A",
    icon: "🌫",
  },
  overlay: {
    label: "Overlay / scrim",
    ring: "rgba(3, 0, 44, 0.55)",
    fill: "rgba(3,0,44,0.32)",
    text: "#FFFFFF",
    icon: "▧",
  },
};

// Zone presets keyed by patterns matched against variant.id.
function zonesFor(variant: ModuleVariant): Zone[] {
  const id = variant.id;

  // Full-bleed cover / hero
  if (/^MV-OP-COVER(-MEDIA)?$/.test(id) || id === "MV-CS-HERO" || id === "MV-CTA-CLOSING-HERO") {
    return [
      { kind: "aura", x: -160, y: -120, w: 1200, h: 900, label: "Soft overlay" },
      { kind: "human", x: 1120, y: 60, w: 740, h: 960, label: "Human imagery" },
      { kind: "overlay", x: 0, y: 540, w: 1920, h: 540, label: "Bottom scrim for text legibility" },
    ];
  }

  // Minimal cover — shape + aura only
  if (id === "MV-OP-COVER-MINIMAL") {
    return [
      { kind: "aura", x: 900, y: -200, w: 1400, h: 1200 },
      { kind: "shape", x: 1500, y: 720, w: 320, h: 320, shape: "circle", label: "Accent shape" },
    ];
  }

  // Dividers — big ambient aura
  if (/^MV-OP-DIVIDER/.test(id)) {
    return [
      { kind: "aura", x: -300, y: -300, w: 1600, h: 1600 },
      { kind: "shape", x: 1420, y: 640, w: 420, h: 420, shape: "circle", label: "Chapter mark" },
    ];
  }

  // Agendas — subtle aura only
  if (/^MV-OP-AGENDA/.test(id)) {
    return [
      { kind: "aura", x: 1200, y: -160, w: 900, h: 900, label: "Soft overlay" },
    ];
  }

  // Team bios — circular human portraits
  if (/BIOS|INTRO-TEAM/.test(id)) {
    const count = /BIOS-4/.test(id) ? 4 : /BIOS-2/.test(id) ? 2 : 3;
    const gap = 40;
    const total = 1920 - 240;
    const w = (total - gap * (count - 1)) / count;
    const size = Math.min(w * 0.6, 260);
    return Array.from({ length: count }, (_, i) => ({
      kind: "human" as const,
      x: 120 + i * (w + gap) + (w - size) / 2,
      y: 380,
      w: size,
      h: size,
      shape: "circle" as const,
      label: i === 0 ? "Portrait" : undefined,
    }));
  }

  // Case study / testimonial — human imagery + overlay
  if (/^MV-CS-/.test(id) || /TESTIMONIAL|QUOTE-BIG/.test(id)) {
    return [
      { kind: "human", x: 120, y: 200, w: 720, h: 720, label: "Portrait or team shot" },
      { kind: "aura", x: 900, y: -100, w: 1200, h: 900 },
      { kind: "shape", x: 1660, y: 120, w: 180, h: 180, shape: "circle", label: "Accent" },
    ];
  }

  // Stats & proof — decorative shapes
  if (/^MV-PROOF-|STAT-GRID|OPPORTUNITY-SIZE|MV-CTX-COST/.test(id)) {
    return [
      { kind: "shape", x: 1620, y: -80, w: 380, h: 380, shape: "circle", label: "Accent ring" },
      { kind: "shape", x: -80, y: 820, w: 260, h: 260, rotate: 12, label: "Accent block" },
      { kind: "aura", x: 400, y: 300, w: 900, h: 700, label: "Soft overlay" },
    ];
  }

  // Cards / pillars — shape corners
  if (/CARDS-|PILLARS-|PRINCIPLES|VALUE-PROPS/.test(id)) {
    return [
      { kind: "shape", x: 1720, y: 20, w: 180, h: 180, shape: "circle", label: "Corner accent" },
      { kind: "aura", x: -200, y: 600, w: 900, h: 700, label: "Soft overlay" },
    ];
  }

  // Timelines / process / roadmap — shape accents along baseline
  if (/TIMELINE|ROADMAP|PROCESS|PHASES|JOURNEY|STEPS/.test(id)) {
    return [
      { kind: "shape", x: 100, y: 780, w: 120, h: 120, shape: "circle" },
      { kind: "shape", x: 900, y: 780, w: 120, h: 120, shape: "circle", label: "Milestone marks" },
      { kind: "shape", x: 1700, y: 780, w: 120, h: 120, shape: "circle" },
      { kind: "aura", x: 700, y: -100, w: 900, h: 700 },
    ];
  }

  // Closing / CTA
  if (/^MV-CTA-|CLOSING|NEXT-STEPS|THANKS/.test(id)) {
    return [
      { kind: "aura", x: 200, y: -200, w: 1500, h: 1200, label: "Soft overlay" },
      { kind: "overlay", x: 0, y: 0, w: 1920, h: 1080, label: "Full scrim" },
      { kind: "shape", x: 1580, y: 720, w: 300, h: 300, shape: "circle", label: "Accent" },
    ];
  }

  // Logos / brand strips — no imagery zones (keep clean)
  if (/LOGO-STRIP|LOGOS|LOGO-GRID/.test(id)) {
    return [
      { kind: "aura", x: 700, y: -200, w: 900, h: 800, label: "Soft overlay only" },
    ];
  }

  // Editorial / split covers — left copy, right full-height portrait
  if (id === "MV-OP-COVER-EDITORIAL" || id === "MV-OP-COVER-SPLIT") {
    return [
      { kind: "human", x: 960, y: 0, w: 960, h: 1080, label: "Editorial portrait" },
      { kind: "overlay", x: 960, y: 720, w: 960, h: 360, label: "Right scrim" },
      { kind: "shape", x: 60, y: 880, w: 160, h: 160, shape: "circle", label: "Accent" },
    ];
  }

  // Poster / gradient / stacked covers — bold aura + typographic
  if (/^MV-OP-COVER-(POSTER|GRADIENT|STACKED)$/.test(id)) {
    return [
      { kind: "aura", x: -200, y: -200, w: 2320, h: 1480, label: "Gradient wash" },
      { kind: "shape", x: 1500, y: 720, w: 320, h: 320, shape: "circle", label: "Accent" },
    ];
  }

  // Grid / dossier covers — small thumbnail matrix
  if (id === "MV-OP-COVER-GRID" || id === "MV-OP-COVER-DOSSIER") {
    const zones: Zone[] = [
      { kind: "aura", x: -200, y: -200, w: 1400, h: 900, label: "Soft overlay" },
    ];
    const cols = 3, rows = 2, cellW = 220, cellH = 220, gap = 24;
    const startX = 1200, startY = 200;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        zones.push({
          kind: "human",
          x: startX + c * (cellW + gap),
          y: startY + r * (cellH + gap),
          w: cellW,
          h: cellH,
          label: r === 0 && c === 0 ? "Thumbnail grid" : undefined,
        });
      }
    }
    return zones;
  }

  // Monogram cover — single dominant shape mark
  if (id === "MV-OP-COVER-MONOGRAM") {
    return [
      { kind: "aura", x: -300, y: -200, w: 1500, h: 1400 },
      { kind: "shape", x: 1180, y: 200, w: 680, h: 680, shape: "circle", label: "Monogram mark" },
    ];
  }

  // Full-bleed image slides
  if (id === "MV-IMG-FULL-BLEED" || id === "MV-IMG-QUOTE-BG") {
    return [
      { kind: "human", x: 0, y: 0, w: 1920, h: 1080, label: "Full-bleed image" },
      { kind: "overlay", x: 0, y: 0, w: 1920, h: 1080, label: "Legibility scrim" },
    ];
  }

  // Split image + copy
  if (id === "MV-IMG-SPLIT" || id === "MV-IMG-CAPTION" || id === "MV-IMG-STAT-CALLOUT") {
    return [
      { kind: "human", x: 0, y: 0, w: 960, h: 1080, label: "Image half" },
      { kind: "aura", x: 960, y: -100, w: 1100, h: 1200, label: "Copy side" },
      { kind: "shape", x: 1740, y: 80, w: 140, h: 140, shape: "circle", label: "Accent" },
    ];
  }

  // Image grids / matrices
  if (/^MV-IMG-GRID-(3|6)$/.test(id) || /^MV-IMG-MATRIX-(4|6)$/.test(id)) {
    const count = /6$/.test(id) ? 6 : /4$/.test(id) ? 4 : 3;
    const cols = count === 3 ? 3 : count === 4 ? 2 : 3;
    const rows = Math.ceil(count / cols);
    const gap = 32;
    const marginX = 120, marginY = 240, footer = 120;
    const cellW = (1920 - marginX * 2 - gap * (cols - 1)) / cols;
    const cellH = (1080 - marginY - footer - gap * (rows - 1)) / rows;
    return Array.from({ length: count }, (_, i) => ({
      kind: "human" as const,
      x: marginX + (i % cols) * (cellW + gap),
      y: marginY + Math.floor(i / cols) * (cellH + gap),
      w: cellW,
      h: cellH,
      label: i === 0 ? "Image cell" : undefined,
    }));
  }

  // Portrait spotlight
  if (id === "MV-IMG-PORTRAIT" || id === "MV-QUOTE-PORTRAIT") {
    return [
      { kind: "human", x: 120, y: 120, w: 720, h: 840, label: "Portrait" },
      { kind: "aura", x: 900, y: -80, w: 1200, h: 900 },
      { kind: "shape", x: 1660, y: 800, w: 220, h: 220, shape: "circle", label: "Accent" },
    ];
  }

  // Before / after comparisons
  if (id === "MV-IMG-BEFORE-AFTER" || id === "MV-PROC-BEFORE-AFTER") {
    return [
      { kind: "human", x: 100, y: 240, w: 820, h: 700, label: "Before" },
      { kind: "human", x: 1000, y: 240, w: 820, h: 700, label: "After" },
    ];
  }

  // Image strip
  if (id === "MV-IMG-STRIP") {
    const cells = 5, gap = 20, marginX = 80;
    const w = (1920 - marginX * 2 - gap * (cells - 1)) / cells;
    return Array.from({ length: cells }, (_, i) => ({
      kind: "human" as const,
      x: marginX + i * (w + gap),
      y: 340,
      w,
      h: 400,
      label: i === 0 ? "Image strip" : undefined,
    }));
  }

  // Quote variants — pull-quote emphasis
  if (/^MV-(INS-QUOTE|QUOTE-(CARD|METRIC|POSTER|MULTI))$/.test(id)) {
    return [
      { kind: "aura", x: -200, y: -200, w: 1500, h: 1400, label: "Soft overlay" },
      { kind: "shape", x: 120, y: 140, w: 140, h: 140, shape: "circle", label: "Quote mark" },
      { kind: "shape", x: 1620, y: 780, w: 220, h: 220, shape: "circle", label: "Accent" },
    ];
  }

  // Insight / big idea / callout — centered emphasis
  if (/^MV-INS-(BIG-IDEA|CALLOUT|SO-WHAT)$/.test(id)) {
    return [
      { kind: "aura", x: 260, y: -100, w: 1400, h: 1280, label: "Soft overlay" },
      { kind: "shape", x: 1720, y: 60, w: 160, h: 160, shape: "circle", label: "Accent" },
      { kind: "shape", x: 60, y: 860, w: 160, h: 160, shape: "circle", label: "Accent" },
    ];
  }

  // Context trend / challenge — analytic canvas
  if (/^MV-CTX-(TREND|CHALLENGE-STACK)$/.test(id)) {
    return [
      { kind: "aura", x: 1100, y: -100, w: 1000, h: 900, label: "Soft overlay" },
      { kind: "shape", x: 60, y: 800, w: 180, h: 180, shape: "circle", label: "Accent" },
    ];
  }

  // Solution architecture / feature list — schematic canvas
  if (/^MV-SOL-(ARCHITECTURE|FEATURE-LIST)$/.test(id)) {
    return [
      { kind: "aura", x: -200, y: 500, w: 1200, h: 900, label: "Soft overlay" },
      { kind: "shape", x: 1700, y: 80, w: 180, h: 180, shape: "circle", label: "Accent" },
    ];
  }

  // Decision aids — matrix / compare / checklist
  if (/^MV-DEC-(MATRIX|COMPARE-TABLE|CHECKLIST)$/.test(id)) {
    return [
      { kind: "aura", x: 1200, y: -160, w: 900, h: 700, label: "Soft overlay" },
      { kind: "shape", x: 60, y: 60, w: 140, h: 140, shape: "circle", label: "Accent" },
    ];
  }

  // Commercial — pricing / investment
  if (/^MV-COMM-(PRICING|INVESTMENT)$/.test(id)) {
    return [
      { kind: "aura", x: -200, y: -100, w: 1200, h: 1200, label: "Soft overlay" },
      { kind: "shape", x: 1700, y: 780, w: 220, h: 220, shape: "circle", label: "Accent ring" },
    ];
  }

  // Risk mitigation
  if (id === "MV-RISK-MITIGATION") {
    return [
      { kind: "aura", x: 1100, y: 500, w: 1000, h: 700, label: "Soft overlay" },
      { kind: "shape", x: 120, y: 120, w: 160, h: 160, shape: "circle", label: "Signal" },
    ];
  }

  // Governance / RACI
  if (id === "MV-GOV-RACI") {
    return [
      { kind: "aura", x: 1300, y: -100, w: 800, h: 700, label: "Soft overlay" },
    ];
  }

  // Case study — spread / metrics / story
  if (/^MV-CASE-(SPREAD|METRICS|STORY)$/.test(id)) {
    return [
      { kind: "human", x: 100, y: 180, w: 780, h: 780, label: "Case imagery" },
      { kind: "aura", x: 920, y: -80, w: 1200, h: 1200, label: "Soft overlay" },
      { kind: "shape", x: 1700, y: 100, w: 180, h: 180, shape: "circle", label: "Accent" },
    ];
  }

  // Client-focused matrices / comparisons
  if (/^MV-CLIENT-(MATRIX|DETAIL-3|COMPARE)$/.test(id)) {
    const count = id === "MV-CLIENT-COMPARE" ? 2 : id === "MV-CLIENT-DETAIL-3" ? 3 : 4;
    const cols = count;
    const gap = 32, marginX = 120, marginY = 260;
    const cellW = (1920 - marginX * 2 - gap * (cols - 1)) / cols;
    return Array.from({ length: count }, (_, i) => ({
      kind: "human" as const,
      x: marginX + i * (cellW + gap),
      y: marginY,
      w: cellW,
      h: 260,
      label: i === 0 ? "Client mark" : undefined,
    }));
  }

  // Infographics — donut / funnel / venn / pyramid / bars / circular flow
  if (/^MV-INFO-(DONUT|FUNNEL|BAR-COMPARE|CIRCULAR-FLOW|PYRAMID|VENN)$/.test(id)) {
    return [
      { kind: "aura", x: -200, y: -200, w: 1200, h: 1400, label: "Soft overlay" },
      { kind: "shape", x: 1100, y: 200, w: 640, h: 640, shape: "circle", label: "Data figure" },
      { kind: "shape", x: 1720, y: 780, w: 180, h: 180, shape: "circle", label: "Accent" },
    ];
  }

  // Recommendation / next-steps banner
  if (id === "MV-REC-NEXT") {
    return [
      { kind: "aura", x: 900, y: -160, w: 1200, h: 900, label: "Soft overlay" },
      { kind: "shape", x: 80, y: 800, w: 200, h: 200, shape: "circle", label: "Accent" },
    ];
  }

  // Closing variants (MV-CLOSE-*) — pattern-specific
  if (/^MV-CLOSE-(CTA|THANKS|STATEMENT|DUAL-CTA)$/.test(id)) {
    return [
      { kind: "aura", x: -200, y: -200, w: 2320, h: 1480, label: "Soft overlay" },
      { kind: "overlay", x: 0, y: 720, w: 1920, h: 360, label: "Bottom scrim" },
      { kind: "shape", x: 1620, y: 720, w: 260, h: 260, shape: "circle", label: "Accent" },
    ];
  }
  if (id === "MV-CLOSE-QNA" || id === "MV-CLOSE-CONTACT") {
    return [
      { kind: "aura", x: 900, y: -200, w: 1300, h: 1400, label: "Soft overlay" },
      { kind: "human", x: 120, y: 240, w: 640, h: 640, shape: "circle", label: "Contact portrait" },
    ];
  }
  if (id === "MV-CLOSE-SPLIT") {
    return [
      { kind: "human", x: 0, y: 0, w: 960, h: 1080, label: "Split image" },
      { kind: "aura", x: 960, y: -100, w: 1100, h: 1300, label: "Copy side" },
    ];
  }
  if (/^MV-CLOSE-(TIMELINE|CHECKLIST|DECISION|CALENDAR|METRIC-PROMISE)$/.test(id)) {
    return [
      { kind: "aura", x: 1100, y: -100, w: 1000, h: 900, label: "Soft overlay" },
      { kind: "shape", x: 60, y: 60, w: 140, h: 140, shape: "circle", label: "Accent" },
      { kind: "shape", x: 1720, y: 800, w: 200, h: 200, shape: "circle", label: "Accent" },
    ];
  }

  // Fallback — subtle aura + one accent shape
  return [
    { kind: "aura", x: 1200, y: -200, w: 1000, h: 1000, label: "Soft overlay" },
    { kind: "shape", x: 1720, y: 40, w: 160, h: 160, shape: "circle", label: "Design shape" },
  ];
}

export function MediaZoneOverlay({
  variant,
  opacity = 1,
}: {
  variant: ModuleVariant;
  opacity?: number;
}) {
  const zones = zonesFor(variant);
  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: 1920, height: 1080, opacity }}
      aria-hidden
    >
      {zones.map((z, i) => (
        <ZoneRect key={i} zone={z} seed={hashStr(variant.id) + i} />
      ))}
      <Legend zones={zones} />
    </div>
  );
}

function ZoneRect({ zone, seed }: { zone: Zone; seed: number }) {
  const style = KIND_STYLES[zone.kind];
  const isCircle = zone.shape === "circle";
  const radius = isCircle ? "9999px" : "16px";
  const border =
    zone.kind === "aura" || zone.kind === "overlay"
      ? "none"
      : `3px dashed ${style.ring}`;
  const isHuman = zone.kind === "human";
  const portrait = isHuman ? PORTRAITS[seed % PORTRAITS.length] : undefined;
  return (
    <div
      style={{
        position: "absolute",
        left: zone.x,
        top: zone.y,
        width: zone.w,
        height: zone.h,
        background: isHuman
          ? `linear-gradient(${style.fill}, ${style.fill}), url(${portrait}) center/cover no-repeat`
          : style.fill,
        border,
        borderRadius: radius,
        overflow: "hidden",
        transform: zone.rotate ? `rotate(${zone.rotate}deg)` : undefined,
        backdropFilter: zone.kind === "aura" ? "blur(18px)" : undefined,
        mixBlendMode: zone.kind === "overlay" ? "multiply" : undefined,
      }}
    >
      {zone.label && (
        <div
          style={{
            position: "absolute",
            left: 16,
            top: 12,
            padding: "6px 14px",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 0.5,
            color: style.text,
            background:
              zone.kind === "overlay"
                ? "rgba(255,255,255,0.9)"
                : "rgba(255,255,255,0.85)",
            border: `1px solid ${style.ring}`,
            borderRadius: 999,
            backdropFilter: "blur(6px)",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ marginRight: 8 }}>{style.icon}</span>
          {zone.label}
        </div>
      )}
    </div>
  );
}

function Legend({ zones }: { zones: Zone[] }) {
  const kinds = Array.from(new Set(zones.map((z) => z.kind)));
  if (!kinds.length) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        bottom: 32,
        display: "flex",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgba(3,0,44,0.15)",
        backdropFilter: "blur(8px)",
        fontSize: 20,
        fontWeight: 500,
        color: "#03002C",
      }}
    >
      {kinds.map((k) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: KIND_STYLES[k].ring,
              display: "inline-block",
            }}
          />
          {KIND_STYLES[k].icon} {KIND_STYLES[k].label}
        </span>
      ))}
    </div>
  );
}
