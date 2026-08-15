// Miniature slide preview for a design look. Renders a real 16:9 composition
// from the look's style-pack tokens (ground layers, card treatment, type
// stacks) so users judge the look, not a colour chip.
import { stylePackFromSkin } from "@/lib/design-skin-pack";
import type { DesignSkin } from "@/lib/design-skins";
import type { StylePack } from "@/lib/style-packs";

export function SkinPreviewTile({
  skin,
  seed = "cover",
  className = "",
}: {
  skin: DesignSkin;
  /** Section key or seed; drives which background preset the tile shows. */
  seed?: string;
  className?: string;
}) {
  return (
    <LookPreviewTile
      pack={stylePackFromSkin(skin)}
      kicker={`${skin.code} · ${skin.density}`}
      seed={seed}
      className={className}
    />
  );
}

/** Same composition, driven straight off a StylePack (skin or built-in pack). */
export function LookPreviewTile({
  pack,
  kicker,
  seed = "cover",
  className = "",
}: {
  pack: StylePack;
  kicker: string;
  seed?: string;
  className?: string;
}) {
  const t = pack.tokens;
  return (
    <div
      aria-hidden="true"
      className={`relative aspect-[16/9] w-full overflow-hidden ${className}`}
      style={{
        background: pack.ground(seed).join(", "),
        borderRadius: Math.max(pack.card.radius, 6),
      }}
    >
      {pack.topBar && (
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: t.accent }} />
      )}

      <div className="absolute inset-0 flex flex-col justify-between p-[7%]">
        <div>
          <div
            className="text-[6px] leading-none"
            style={{
              color: t.accentText,
              fontFamily: pack.type.kicker,
              fontWeight: pack.type.kickerWeight,
              letterSpacing: pack.type.kickerTracking,
              textTransform: "uppercase",
            }}
          >
            {skin.code} · {skin.density}
          </div>
          <div
            className="mt-[4%] text-[13px] leading-[1.05]"
            style={{
              color: t.ink,
              fontFamily: pack.type.display,
              fontWeight: pack.type.displayWeight,
              letterSpacing: pack.type.displayTracking,
              textTransform: pack.type.displayTransform,
            }}
          >
            One system.
            <br />
            Every surface.
          </div>
          <div
            className="mt-[3%] h-[2px] w-[22%]"
            style={{ background: t.accent, opacity: 0.9 }}
          />
        </div>

        <div className="flex items-end gap-[4%]">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-1 px-[5%] py-[4%]"
              style={{
                background: pack.card.bg,
                border: pack.card.border,
                borderRadius: pack.card.radius,
                boxShadow: pack.card.shadow,
                backdropFilter: pack.card.blur === "none" ? undefined : pack.card.blur,
              }}
            >
              <div
                className="text-[9px] leading-none"
                style={{ color: i === 0 ? t.accentText : t.ink, fontFamily: pack.type.display, fontWeight: 700 }}
              >
                {["42%", "3.1×", "18d"][i]}
              </div>
              <div
                className="mt-[6%] h-[2px] w-full"
                style={{ background: t.hairline }}
              />
              <div
                className="mt-[6%] text-[5px] leading-tight"
                style={{ color: t.inkMuted, fontFamily: pack.type.body }}
              >
                Narrative and data stay synchronized.
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Four-stop palette strip for compact list rows. */
export function SkinSwatch({ skin }: { skin: DesignSkin }) {
  return (
    <div className="flex overflow-hidden rounded" aria-hidden="true">
      {skin.palette.slice(0, 5).map((c) => (
        <span key={c} className="h-3 w-3" style={{ background: c }} />
      ))}
    </div>
  );
}
