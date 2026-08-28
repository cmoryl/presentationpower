// ---------------------------------------------------------------------------
// Module kit — the shared surface every extracted module family renders against.
//
// The legacy `VariantRenderer` switch reached for file-local helpers
// (`SlideFrame`, `s`, `arr`, `obj`, …). A family cannot leave that file while
// those helpers stay private, so they live here instead and `VariantRenderer`
// imports them. Nothing about their behaviour changes; this is purely the seam
// that makes extraction possible (see `module-registry.ts`).
// ---------------------------------------------------------------------------

import { createContext, useContext, type ComponentProps } from "react";
import type { LogoOrientation, LogoPosition } from "@/lib/logo-placement";
import { SlideFrame as BaseSlideFrame } from "./SlideChrome";
import { TitleBlock } from "./primitives";
import type { BrandMode } from "@/lib/taxonomy";

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
