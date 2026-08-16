import { useEffect, useMemo, useState } from "react";
import type { StylePack } from "@/lib/style-packs";
import { isCuratedGroundPack, packCompositionFor } from "@/lib/style-packs";
import { packGeometry } from "@/lib/pack-geometry";
import { packCompose } from "@/lib/pack-compose";
import { chartStyle } from "@/lib/chart-styles";
import { dashLook, isDashModule } from "@/lib/dash-look";
import { bootSceneDebug, isSceneDebug, subscribeSceneDebug } from "@/lib/scene-debug";

export function useSceneDebug(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    bootSceneDebug();
    setOn(isSceneDebug());
    return subscribeSceneDebug(setOn);
  }, []);
  return on;
}

type Props = {
  /** Slide frame element — scanned for decorative / media layers. */
  scope: HTMLElement | null;
  variant: string;
  layoutId?: string;
  mode: "light" | "dark";
  pack: StylePack | null;
  /** Backdrop scene resolved for this module. */
  scene: string;
  /** Whether the scene came from a per-slide template override or the seed. */
  sceneSource: "template" | "seed";
  /** Resolved AI backdrop image url (if any). */
  aiBackdrop?: string | null;
};

function Row({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, lineHeight: 1.5 }}>
      <span style={{ opacity: 0.62, minWidth: 88 }}>{k}</span>
      <span
        style={{
          fontWeight: 600,
          color: warn ? "#FFEB66" : "#A1FBF9",
          wordBreak: "break-word",
        }}
      >
        {v}
      </span>
    </div>
  );
}

/**
 * Scene debug overlay (Shift+D or ?debug=scene). Prints the exact visual
 * resolution chain for the module currently on screen — active look, backdrop
 * scene + take, composition/geometry, dashboard flow, chart grammar and the
 * decorative/media asset layers actually painted in the DOM — so mismatches
 * between the intended scene and the rendered one are visible at a glance.
 */
export function SceneDebugOverlay({
  scope,
  variant,
  layoutId,
  mode,
  pack,
  scene,
  sceneSource,
  aiBackdrop,
}: Props) {
  const on = useSceneDebug();
  const [assets, setAssets] = useState<{ layers: number; media: string[]; backdropPainted: boolean }>({
    layers: 0,
    media: [],
    backdropPainted: false,
  });

  useEffect(() => {
    if (!on || !scope) return;
    const scan = () => {
      const layers = scope.querySelectorAll("[data-decorative='true']").length;
      const media = Array.from(scope.querySelectorAll<HTMLImageElement>("img")).map((img) => {
        const kind =
          img.getAttribute("data-media-kind") ??
          (img.hasAttribute("data-pack-ai-backdrop") ? "ai-backdrop" : "img");
        const src = img.currentSrc || img.src || "";
        const fmt = /\.(webp|png|jpe?g|svg|avif)/i.exec(src)?.[1]?.toLowerCase() ?? (src.startsWith("data:") ? src.slice(5, src.indexOf(";")) : "?");
        return `${kind}:${fmt}`;
      });
      setAssets({
        layers,
        media,
        backdropPainted: !!scope.querySelector("[data-pack-ai-backdrop]"),
      });
    };
    scan();
    const t = window.setInterval(scan, 600);
    return () => window.clearInterval(t);
  }, [on, scope, variant, layoutId, pack?.id, scene]);

  const info = useMemo(() => {
    const seed = layoutId ?? variant;
    const comp = packCompositionFor(variant, layoutId);
    const geo = pack ? packGeometry(pack) : null;
    const compose = pack ? packCompose(pack) : null;
    const chart = chartStyle(pack);
    const dash = isDashModule(seed) ? dashLook(pack, seed) : null;
    return { seed, comp, geo, compose, chart, dash };
  }, [pack, variant, layoutId]);

  if (!on) return null;

  const mismatch = !!aiBackdrop && !assets.backdropPainted;

  return (
    <div
      data-scene-debug=""
      data-html2canvas-ignore="true"
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: 16,
        top: 16,
        zIndex: 9999,
        maxWidth: 460,
        padding: "12px 14px",
        borderRadius: 10,
        background: "rgba(3,0,44,0.86)",
        border: "1px solid rgba(161,251,249,0.4)",
        boxShadow: "0 10px 30px rgba(3,0,44,0.4)",
        color: "#fff",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        letterSpacing: "0.01em",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 6,
          paddingBottom: 6,
          borderBottom: "1px solid rgba(255,255,255,0.16)",
        }}
      >
        <strong style={{ letterSpacing: "0.12em", fontSize: 10, opacity: 0.8 }}>SCENE DEBUG</strong>
        <span style={{ fontSize: 10, opacity: 0.6 }}>Shift+D</span>
      </div>
      <Row k="module" v={`${variant}${layoutId && layoutId !== variant ? ` · ${layoutId}` : ""}`} />
      <Row k="look" v={pack ? `${pack.id} — ${pack.name ?? "pack"} (${pack.mode})` : "brand system (no pack)"} />
      <Row k="scene" v={`${scene} · via ${sceneSource}`} />
      <Row k="composition" v={`${info.comp} · seed ${info.seed}`} />
      {info.geo && (
        <Row
          k="geometry"
          v={`${info.geo.shape} / ${info.geo.layout} / ${info.geo.scaffold} / ${info.geo.device} · fill ${info.geo.fill.toFixed(2)}`}
        />
      )}
      {info.compose && (
        <Row
          k="compose"
          v={`${info.compose.anchor} · ${info.compose.bias} · ${info.compose.plate} · col ${info.compose.column.toFixed(2)} · ${info.compose.order}`}
        />
      )}
      {info.dash && (
        <Row
          k="dash look"
          v={`${info.dash.flow} · chart ${info.dash.chart} · metric ${info.dash.metric}×${info.dash.metricColumns}${info.dash.reverse ? " · reversed" : ""}`}
        />
      )}
      <Row k="chart" v={`bar ${info.chart.bar} · ratio ${info.chart.barRatio.toFixed(2)}`} />
      <Row k="ground" v={pack ? (isCuratedGroundPack(pack) ? "curated (full sheet)" : "damped + masked") : "brand aurora"} />
      <Row
        k="ai backdrop"
        v={aiBackdrop ? (assets.backdropPainted ? "resolved + painted" : "resolved, NOT painted") : "none"}
        warn={mismatch}
      />
      <Row k="mode" v={mode} />
      <Row
        k="assets"
        v={`${assets.layers} decorative layers · ${assets.media.length ? assets.media.join(", ") : "no images"}`}
      />
    </div>
  );
}
