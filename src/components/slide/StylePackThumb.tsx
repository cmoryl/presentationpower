/**
 * STYLE PACK THUMBNAIL
 *
 * A 16:9 miniature of what a pack does to a slide: its procedural ground, the
 * accent top bar, a kicker + headline in the pack's display face, an accent
 * rule, and two cards carrying the pack's card treatment (fill, border, radius,
 * shadow). Purely presentational and dependency-free — no renderer, no data —
 * so a full grid of every pack mounts instantly in the picker.
 */
import type { CSSProperties } from "react";

import {
  GRAIN_PLATE,
  packField,
  packGroundMask,
  packGroundOpacity,
  packLayoutLayers,
  type PackComposition,
  type StylePack,
} from "@/lib/style-packs";

/** Seed keeps each pack's ground deterministic and comparable across thumbs. */
const THUMB_SEED = "thumb-cover";

function MiniCard({ pack, style }: { pack: StylePack; style?: CSSProperties }) {
  const c = pack.card;
  return (
    <div
      className="flex-1 p-[6px]"
      style={{
        background: c.bg,
        border: c.border,
        borderRadius: `${Math.min(c.radius, 10)}px`,
        boxShadow: c.shadow === "none" ? undefined : c.shadow,
        backdropFilter: c.blur === "none" ? undefined : c.blur,
        ...style,
      }}
    >
      <div
        className="h-[3px] w-[55%] rounded-full"
        style={{ backgroundColor: pack.tokens.accent }}
      />
      <div
        className="mt-[5px] h-[2px] w-full rounded-full"
        style={{ backgroundColor: pack.tokens.inkMuted, opacity: 0.55 }}
      />
      <div
        className="mt-[3px] h-[2px] w-[70%] rounded-full"
        style={{ backgroundColor: pack.tokens.inkFaint, opacity: 0.5 }}
      />
    </div>
  );
}

export function StylePackThumb({
  pack,
  className = "",
  label = true,
  composition = "cover",
}: {
  pack: StylePack;
  className?: string;
  /** Render the pack's own display type inside the thumb. */
  label?: boolean;
  /** Which page layout of the pack to preview. */
  composition?: PackComposition;
}) {
  const t = pack.tokens;
  return (
    <div
      aria-hidden
      className={`relative aspect-video w-full overflow-hidden ${className}`}
      style={{ backgroundColor: packField(pack) }}
    >
      {/* Same four-plane layering as the live sheet, so what the picker shows
          is what the module renders: field, damped ground, scaffold, grain. */}
      <div
        className="absolute inset-0"
        style={{
          background: pack.ground(THUMB_SEED).join(", "),
          opacity: packGroundOpacity(pack),
          maskImage: packGroundMask(composition),
          WebkitMaskImage: packGroundMask(composition),
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: packLayoutLayers(pack, composition, THUMB_SEED).join(", ") }}
      />
      {pack.grain > 0 ? (
        <div
          className="absolute inset-0"
          style={{ backgroundImage: `url("${GRAIN_PLATE}")`, opacity: pack.grain }}
        />
      ) : null}


      {pack.topBar ? (
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ backgroundColor: t.accent }}
        />
      ) : null}

      <div className="relative flex h-full flex-col justify-between p-[9px]">
        <div>
          {label ? (
            <div
              className="truncate text-[5px] uppercase"
              style={{
                fontFamily: pack.type.kicker,
                fontWeight: pack.type.kickerWeight,
                letterSpacing: pack.type.kickerTracking,
                color: t.accentText,
              }}
            >
              {pack.reference}
            </div>
          ) : null}
          {label ? (
          <div
            className="mt-[3px] truncate"
            style={{
              fontFamily: pack.type.display,
              fontWeight: pack.type.displayWeight,
              letterSpacing: pack.type.displayTracking,
              textTransform: pack.type.displayTransform,
              fontSize: `${12 * pack.type.displayScale}px`,
              lineHeight: 1.05,
              color: t.ink,
            }}
          >
            {pack.label}
          </div>
          ) : null}
          <div
            className="mt-[5px] h-[2px] w-[34%]"
            style={{ backgroundColor: t.accent }}
          />
          <div
            className="mt-[5px] h-[2px] w-[62%] rounded-full"
            style={{ backgroundColor: t.inkMuted, opacity: 0.5 }}
          />
        </div>

        <div className="flex items-stretch gap-[6px]">
          <MiniCard pack={pack} />
          <MiniCard pack={pack} />
          <div
            className="flex w-[26%] items-end justify-end"
            style={{ borderTop: `1px solid ${t.hairline}` }}
          >
            <span
              style={{
                fontFamily: pack.type.mono,
                fontSize: "9px",
                lineHeight: 1,
                color: t.accentText,
              }}
            >
              24
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Matching miniature for the approved brand system (the "no pack" option). */
export function BrandSystemThumb({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative aspect-video w-full overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(120% 90% at 12% 6%, rgba(161,251,249,0.32) 0%, rgba(0,63,199,0) 58%), radial-gradient(100% 80% at 92% 96%, rgba(194,163,255,0.28) 0%, rgba(3,0,44,0) 62%), linear-gradient(160deg, #03002C 0%, #061049 58%, #003FC7 130%)",
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: "#A1FBF9" }} />
      <div className="relative flex h-full flex-col justify-between p-[9px]">
        <div>
          <div
            className="text-[5px] uppercase tracking-[0.28em]"
            style={{ color: "#A1FBF9", fontFamily: "'Geist', system-ui, sans-serif" }}
          >
            Approved system
          </div>
          <div
            className="mt-[3px] text-[12px] font-semibold tracking-[-0.02em] text-white"
            style={{ fontFamily: "'Geist', system-ui, sans-serif", lineHeight: 1.05 }}
          >
            Brand system
          </div>
          <div className="mt-[5px] h-[2px] w-[34%]" style={{ backgroundColor: "#A1FBF9" }} />
          <div className="mt-[5px] h-[2px] w-[62%] rounded-full bg-white/45" />
        </div>
        <div className="flex items-stretch gap-[6px]">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex-1 rounded-[8px] border border-white/15 bg-white/10 p-[6px]"
              style={{ backdropFilter: "blur(6px)" }}
            >
              <div className="h-[3px] w-[55%] rounded-full" style={{ backgroundColor: "#A1FBF9" }} />
              <div className="mt-[5px] h-[2px] w-full rounded-full bg-white/40" />
              <div className="mt-[3px] h-[2px] w-[70%] rounded-full bg-white/25" />
            </div>
          ))}
          <div className="flex w-[26%] items-end justify-end border-t border-white/20">
            <span className="text-[9px] leading-none text-white/70">24</span>
          </div>
        </div>
      </div>
    </div>
  );
}
