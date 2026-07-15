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
  // Optional shape: rectangle (default), circle, blob (soft radial).
  shape?: "rect" | "circle" | "blob";
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
    label: "Ambient aura",
    ring: "rgba(161, 251, 249, 0.75)",
    fill:
      "radial-gradient(closest-side, rgba(161,251,249,0.55), rgba(194,163,255,0.30) 55%, rgba(255,255,255,0) 80%)",
    text: "#0B2A4A",
    icon: "🌫",
  },
  overlay: {
    label: "Overlay / scrim",
    ring: "rgba(3, 0, 44, 0.55)",
    fill:
      "linear-gradient(135deg, rgba(3,0,44,0.55) 0%, rgba(3,0,44,0.10) 60%, rgba(3,0,44,0.0) 100%)",
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
      { kind: "aura", x: -160, y: -120, w: 1200, h: 900, shape: "blob", label: "Ambient aura" },
      { kind: "human", x: 1120, y: 60, w: 740, h: 960, label: "Human imagery" },
      { kind: "overlay", x: 0, y: 540, w: 1920, h: 540, label: "Bottom scrim for text legibility" },
    ];
  }

  // Minimal cover — shape + aura only
  if (id === "MV-OP-COVER-MINIMAL") {
    return [
      { kind: "aura", x: 900, y: -200, w: 1400, h: 1200, shape: "blob" },
      { kind: "shape", x: 1500, y: 720, w: 320, h: 320, shape: "circle", label: "Accent shape" },
    ];
  }

  // Dividers — big ambient aura
  if (/^MV-OP-DIVIDER/.test(id)) {
    return [
      { kind: "aura", x: -300, y: -300, w: 1600, h: 1600, shape: "blob" },
      { kind: "shape", x: 1420, y: 640, w: 420, h: 420, shape: "circle", label: "Chapter mark" },
    ];
  }

  // Agendas — subtle aura only
  if (/^MV-OP-AGENDA/.test(id)) {
    return [
      { kind: "aura", x: 1200, y: -160, w: 900, h: 900, shape: "blob", label: "Ambient aura (subtle)" },
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
      { kind: "aura", x: 900, y: -100, w: 1200, h: 900, shape: "blob" },
      { kind: "shape", x: 1660, y: 120, w: 180, h: 180, shape: "circle", label: "Accent" },
    ];
  }

  // Stats & proof — decorative shapes
  if (/^MV-PROOF-|STAT-GRID|OPPORTUNITY-SIZE|MV-CTX-COST/.test(id)) {
    return [
      { kind: "shape", x: 1620, y: -80, w: 380, h: 380, shape: "circle", label: "Accent ring" },
      { kind: "shape", x: -80, y: 820, w: 260, h: 260, rotate: 12, label: "Accent block" },
      { kind: "aura", x: 400, y: 300, w: 900, h: 700, shape: "blob", label: "Subtle aura" },
    ];
  }

  // Cards / pillars — shape corners
  if (/CARDS-|PILLARS-|PRINCIPLES|VALUE-PROPS/.test(id)) {
    return [
      { kind: "shape", x: 1720, y: 20, w: 180, h: 180, shape: "circle", label: "Corner accent" },
      { kind: "aura", x: -200, y: 600, w: 900, h: 700, shape: "blob", label: "Subtle aura" },
    ];
  }

  // Timelines / process / roadmap — shape accents along baseline
  if (/TIMELINE|ROADMAP|PROCESS|PHASES|JOURNEY|STEPS/.test(id)) {
    return [
      { kind: "shape", x: 100, y: 780, w: 120, h: 120, shape: "circle" },
      { kind: "shape", x: 900, y: 780, w: 120, h: 120, shape: "circle", label: "Milestone marks" },
      { kind: "shape", x: 1700, y: 780, w: 120, h: 120, shape: "circle" },
      { kind: "aura", x: 700, y: -100, w: 900, h: 700, shape: "blob" },
    ];
  }

  // Closing / CTA
  if (/^MV-CTA-|CLOSING|NEXT-STEPS|THANKS/.test(id)) {
    return [
      { kind: "aura", x: 200, y: -200, w: 1500, h: 1200, shape: "blob", label: "Ambient aura" },
      { kind: "overlay", x: 0, y: 0, w: 1920, h: 1080, label: "Full scrim" },
      { kind: "shape", x: 1580, y: 720, w: 300, h: 300, shape: "circle", label: "Accent" },
    ];
  }

  // Logos / brand strips — no imagery zones (keep clean)
  if (/LOGO-STRIP|LOGOS/.test(id)) {
    return [
      { kind: "aura", x: 700, y: -200, w: 900, h: 800, shape: "blob", label: "Subtle aura only" },
    ];
  }

  // Fallback — subtle aura + one accent shape
  return [
    { kind: "aura", x: 1200, y: -200, w: 1000, h: 1000, shape: "blob", label: "Ambient aura" },
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
  const isBlob = zone.shape === "blob";
  const radius = isCircle ? "9999px" : isBlob ? "42% 58% 55% 45% / 50% 45% 55% 50%" : "16px";
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
          ? `${style.fill}, url(${portrait}) center/cover no-repeat`
          : style.fill,
        border,
        borderRadius: radius,
        overflow: "hidden",
        transform: zone.rotate ? `rotate(${zone.rotate}deg)` : undefined,
        backdropFilter: zone.kind === "aura" ? "blur(24px)" : undefined,
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
