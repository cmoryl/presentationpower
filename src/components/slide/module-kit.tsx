// ---------------------------------------------------------------------------
// Module kit — the shared surface every extracted module family renders against.
//
// The legacy `VariantRenderer` switch reached for file-local helpers
// (`SlideFrame`, `s`, `arr`, `obj`, …). A family cannot leave that file while
// those helpers stay private, so they live here instead and `VariantRenderer`
// imports them. Nothing about their behaviour changes; this is purely the seam
// that makes extraction possible (see `module-registry.ts`).
// ---------------------------------------------------------------------------

import { createContext, useContext, type ComponentProps, type ReactElement } from "react";
import type { LogoOrientation, LogoPosition } from "@/lib/logo-placement";
import { SlideFrame as BaseSlideFrame } from "./SlideChrome";
import { TitleBlock } from "./primitives";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  IconEmphasis,
  IconPlacement,
  IconSizeToken,
  IconTreatment,
} from "@/lib/iconography";
import type { DashChart } from "@/lib/dash-look";

export type Item = Record<string, unknown>;

/** Coerce authored content to a string, tolerating numbers and gaps. */
export const s = (v: unknown, fb = ""): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;

/** Loose truth test for authored flags — `true`, "true" and "yes" all count. */
export const truthy = (v: unknown): boolean =>
  v === true || v === 1 || (typeof v === "string" && /^(true|yes|1)$/i.test(v.trim()));

export const arr = (v: unknown): Item[] => (Array.isArray(v) ? (v as Item[]) : []);

export const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

export const strs = (v: unknown): string[] =>
  Array.isArray(v) ? (v as unknown[]).map((x) => s(x)) : [];

export function lastWord(t: string): string {
  const words = String(t || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words[words.length - 1] ?? "";
}

// Module-scoped context so helper components (CardGrid, StatGrid, NumberedList,
// etc.) automatically pick up the current slide's clientName + layoutId when
// they wrap themselves in <SlideFrame>. VariantRenderer sets the value once
// per render.
export const SlideFrameCtx = createContext<{
  clientName?: string;
  layoutId?: string;
  clientLogoUrl?: string | null;
  subCompany?: string;
  logoOrientation?: LogoOrientation;
  logoPosition?: LogoPosition;
}>({});

export function SlideFrame(props: ComponentProps<typeof BaseSlideFrame>) {
  const ctx = useContext(SlideFrameCtx);
  return (
    <BaseSlideFrame
      {...props}
      clientName={props.clientName ?? ctx.clientName}
      layoutId={props.layoutId ?? ctx.layoutId}
      clientLogoUrl={props.clientLogoUrl ?? ctx.clientLogoUrl ?? null}
      subCompany={props.subCompany ?? ctx.subCompany}
      logoOrientation={props.logoOrientation ?? ctx.logoOrientation}
      logoPosition={props.logoPosition ?? ctx.logoPosition}
    />
  );
}

/** Standard module title block — the title treatment every family shares. */
export function SlideTitle({
  brand,
  title,
  kicker,
}: {
  brand: BrandMode;
  title: string;
  kicker?: string;
}) {
  return <TitleBlock brand={brand} title={title} kicker={kicker} size="title" />;
}

// ---------------------------------------------------------------------------
// Shared primitive slots.
//
// `IconBadge` and `MediaTile` are defined INSIDE `VariantRenderer.tsx` (they
// depend on a large amount of that file's local media/icon plumbing). An
// extracted family cannot import them from there without creating a cycle
// (VariantRenderer → modules/* → VariantRenderer), so VariantRenderer registers
// them into the kit once at module load and families render the kit proxies.
// Behaviour is identical: the proxy renders the exact same component instance.
// ---------------------------------------------------------------------------

export type KitIconBadgeProps = {
  brand: BrandMode;
  label: string;
  index: number;
  size?: IconSizeToken;
  tone?: "onDark" | IconEmphasis;
  placement?: IconPlacement;
  treatment?: IconTreatment;
  ariaLabel?: string;
  override?: string | null;
  sizeToken?: string | null;
};

export type KitMediaTileProps = {
  brand: BrandMode;
  seed: string;
  className?: string;
  portrait?: boolean;
  pool?: "portrait";
  muted?: boolean;
  overrideUrl?: string;
  zoom?: number;
  fit?: string;
  focus?: string;
  mediaPath?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  videoPath?: string;
  videoPosterPath?: string;
  videoAutoplay?: boolean;
  videoLoop?: boolean;
  videoMuted?: boolean;
  videoControls?: boolean;
};

export type KitSparklineProps = {
  brand: BrandMode;
  values: number[];
  w?: number;
  h?: number;
  filled?: boolean;
  peakPin?: boolean;
  peakLabel?: string;
};

export type KitNumberedListProps = {
  brand: BrandMode;
  pageNumber: number;
  title: string;
  items: Item[];
};

export type KitDashMetricVizProps = {
  brand: BrandMode;
  kind: DashChart;
  percent: number;
  size?: number;
  bloom?: boolean;
  series?: number[];
  value?: string;
  unit?: string;
};

export type KitDashSeriesVizProps = {
  brand: BrandMode;
  kind: DashChart;
  series: { label: string; value: number }[];
  height?: number;
  highlight?: string;
};

export type KitSummaryStatCardProps = {
  brand: BrandMode;
  label: string;
  value: string;
  unit: string;
  series: number[];
};

type KitPrimitives = {
  IconBadge: (p: KitIconBadgeProps) => ReactElement | null;
  NumberedList: (p: KitNumberedListProps) => ReactElement | null;
  MediaTile: (p: KitMediaTileProps) => ReactElement | null;
  Sparkline: (p: KitSparklineProps) => ReactElement | null;
  DashMetricViz: (p: KitDashMetricVizProps) => ReactElement | null;
  DashSeriesViz: (p: KitDashSeriesVizProps) => ReactElement | null;
  SummaryStatCard: (p: KitSummaryStatCardProps) => ReactElement | null;
};

let primitives: KitPrimitives | null = null;

/** Called once by `VariantRenderer` so extracted families can draw badges/tiles. */
export function registerKitPrimitives(next: KitPrimitives): void {
  primitives = next;
}

export function IconBadge(props: KitIconBadgeProps) {
  const Impl = primitives?.IconBadge;
  return Impl ? <Impl {...props} /> : null;
}

export function MediaTile(props: KitMediaTileProps) {
  const Impl = primitives?.MediaTile;
  return Impl ? <Impl {...props} /> : null;
}

export function NumberedList(props: KitNumberedListProps) {
  const Impl = primitives?.NumberedList;
  return Impl ? <Impl {...props} /> : null;
}

export function Sparkline(props: KitSparklineProps) {
  const Impl = primitives?.Sparkline;
  return Impl ? <Impl {...props} /> : null;
}

export function DashMetricViz(props: KitDashMetricVizProps) {
  const Impl = primitives?.DashMetricViz;
  return Impl ? <Impl {...props} /> : null;
}

export function DashSeriesViz(props: KitDashSeriesVizProps) {
  const Impl = primitives?.DashSeriesViz;
  return Impl ? <Impl {...props} /> : null;
}

export function SummaryStatCard(props: KitSummaryStatCardProps) {
  const Impl = primitives?.SummaryStatCard;
  return Impl ? <Impl {...props} /> : null;
}

/** Coerce a content-bag series into finite numbers. */
export function toNums(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "number" ? x : Number(x))).filter((n) => Number.isFinite(n));
}


/**
 * Ink that reads on a SOLID accent fill. `ink.onSurface` tints a colour for the
 * slide surface — it is not an "on this fill" contrast pick — so filled lane
 * heads, pillars and status discs use this luminance test instead.
 */
export function fillInk(hex: string, darkInk: string): string {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return "#FFFFFF";
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  const lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return lum > 0.45 ? darkInk : "#FFFFFF";
}
