// Wireframe thumbnail for a block preset: each part drawn to scale inside a
// 16:9 frame so the layout can be judged visually before it is dropped.

import { STAGE_H, STAGE_W } from "@/lib/canvas-studio";
import type { BlockPreset } from "@/lib/canvas-block-presets";

const FILL: Record<string, string> = {
  text: "bg-[#03002C]/70",
  stat: "bg-[#003FC7]",
  image: "bg-[#003FC7]/25",
  surface: "bg-[#03002C]/10",
};

export function PresetThumb({ preset }: { preset: BlockPreset }) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.06]">
      {preset.parts.map((part, i) => {
        const isText = part.type === "text";
        const size = Number((part.props?.["size"] as number | undefined) ?? 32);
        // Text renders as a stack of type lines so hierarchy reads at thumb size.
        const lines = isText ? Math.max(1, Math.min(4, Math.round(part.h / Math.max(size, 20)))) : 0;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${(part.x / STAGE_W) * 100}%`,
              top: `${(part.y / STAGE_H) * 100}%`,
              width: `${(part.w / STAGE_W) * 100}%`,
              height: `${(part.h / STAGE_H) * 100}%`,
            }}
          >
            {isText ? (
              <div className="flex h-full flex-col justify-center gap-[2px]">
                {Array.from({ length: lines }).map((_, li) => (
                  <div
                    key={li}
                    className={`${FILL.text} rounded-full`}
                    style={{
                      height: Math.max(1.5, Math.min(6, size / 16)),
                      width: li === lines - 1 && lines > 1 ? "62%" : "100%",
                      opacity: size >= 60 ? 0.85 : 0.5,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div
                className={`${FILL[part.type]} h-full w-full`}
                style={{
                  borderRadius: Math.min(6, Number((part.props?.["radius"] as number) ?? 10) / 6),
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
