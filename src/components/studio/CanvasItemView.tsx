// Renders a single Open Canvas Studio item inside the 1920×1080 stage.
// Module items mount the canonical ExactSlideStage — the same tree the deck
// cards, library and PPTX export use — so a dropped module keeps its surface,
// ground decor and backdrop exactly; no separate preview approximation.

import { useMemo } from "react";
import { canvasFillCss } from "@/lib/canvas-fill";
import { MODULE_VARIANTS, SECTION_FRAMEWORKS, byId, type BrandMode } from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { ExactSlideStage } from "@/components/slide/ExactSlideStage";
import { STAGE_H, STAGE_W, type CanvasItem, type ModuleItem } from "@/lib/canvas-studio";

export function ModuleItemView({
  item,
  brand,
  mode,
}: {
  item: ModuleItem;
  brand: BrandMode;
  mode: "light" | "dark";
}) {
  const variant = useMemo(
    () => MODULE_VARIANTS.find((v) => v.id === item.variantId),
    [item.variantId],
  );
  const brief = useMemo(() => resolveDivisionBrief(brand), [brand]);
  const effMode = item.mode ?? mode;

  const slide = useMemo(() => {
    if (!variant) return null;
    const sectionId =
      SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(variant.familyId))?.id ??
      "SF-01";
    return {
      id: `studio:${item.id}`,
      position: 0,
      sectionId,
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0],
      content: seedDivisionContent(
        variant.id,
        brief,
        byId(SECTION_FRAMEWORKS, sectionId)?.name ?? "Section",
        brand,
      ),
      changes: [],
    };
  }, [variant, brief, brand, item.id]);

  if (!variant || !slide) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border-2 border-dashed border-black/20 text-center text-2xl text-black/40">
        Module not found
      </div>
    );
  }

  const scale =
    item.fit === "cover"
      ? Math.max(item.w / STAGE_W, item.h / STAGE_H)
      : Math.min(item.w / STAGE_W, item.h / STAGE_H);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2 origin-center"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale}) translate(${item.offsetX ?? 0}px, ${item.offsetY ?? 0}px)`,
        }}
      >
        <ExactSlideStage
          slide={slide}
          variant={variant}
          brand={brand}
          mode={effMode}
          pageNumber={1}
        />
      </div>
    </div>
  );
}

export function CanvasItemView({
  item,
  brand,
  mode,
}: {
  item: CanvasItem;
  brand: BrandMode;
  mode: "light" | "dark";
}) {
  const ink = mode === "dark" ? "#FFFFFF" : (brand.tokens.ink ?? "#03002C");
  const accent = brand.tokens.accent ?? "#003FC7";

  if (item.type === "module") return <ModuleItemView item={item} brand={brand} mode={mode} />;

  if (item.type === "text")
    return (
      <div
        className="h-full w-full whitespace-pre-wrap"
        style={{
          color: item.color ?? ink,
          fontSize: item.size,
          fontWeight: item.weight,
          textAlign: item.align,
          lineHeight: item.size > 70 ? 1.02 : 1.24,
          letterSpacing: `${item.tracking ?? (item.size > 70 ? -0.03 : -0.005)}em`,
          textTransform: item.uppercase ? "uppercase" : "none",
        }}
      >
        {item.text}
      </div>
    );

  if (item.type === "image")
    return item.url ? (
      <img
        src={item.url}
        alt={item.alt ?? ""}
        className="h-full w-full"
        style={{ objectFit: item.fit, borderRadius: item.radius }}
      />
    ) : (
      <div
        className="flex h-full w-full items-center justify-center border-2 border-dashed border-black/20 text-center text-2xl text-black/40"
        style={{ borderRadius: item.radius }}
      >
        Drop an image or paste a URL
      </div>
    );

  if (item.type === "stat")
    return (
      <div
        className="flex h-full w-full flex-col justify-center gap-3 px-10"
        style={{
          borderRadius: 32,
          background:
            item.surface === "plate"
              ? mode === "dark"
                ? "rgba(255,255,255,0.08)"
                : "#FFFFFF"
              : "transparent",
          boxShadow:
            item.surface === "plate" && mode === "light" ? "0 1px 0 rgba(3,0,44,0.08)" : "none",
          border:
            item.surface === "plate"
              ? `1px solid ${mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.08)"}`
              : "none",
        }}
      >
        <div
          style={{
            color: item.accent ?? accent,
            fontSize: 104,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {item.value}
        </div>
        <div style={{ color: ink, fontSize: 30, fontWeight: 500, lineHeight: 1.24 }}>
          {item.label}
        </div>
      </div>
    );

  return (
    <div
      className="h-full w-full"
      style={{
        background: canvasFillCss(item, item.fill),
        borderRadius: item.radius,
        opacity: item.opacity,
        border: item.stroke ? `1px solid ${item.stroke}` : undefined,
      }}
    />
  );
}
