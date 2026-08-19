/**
 * Persisted print iconography preference.
 *
 * The module library's iconography bar (size / stroke / accent) used to be
 * throwaway view state: tune it there, insert the module into an asset, and
 * the asset — and therefore the exported PDF, which rasterizes the asset
 * canvas — fell back to the defaults. That made the export disagree with the
 * preview the user had just approved.
 *
 * This module holds ONE durable icon treatment for print work. It is the
 * source of truth for:
 *   - the module library controls (so tuning survives a reload),
 *   - the default treatment for any print asset that has not stored its own,
 *   - preview routes that export to PDF (spotlight preview).
 *
 * An asset that HAS stored `context.iconStyle` always wins — per-document
 * intent outranks the global default.
 */
import { useCallback, useEffect, useState } from "react";
import {
  resolvePrintIconStyle,
  type PrintIconStyle,
} from "@/components/print/print-doc-mode";

export type PrintIconPrefs = {
  /** Draw icon chips at all (false = typographic markers). */
  icons: boolean;
} & PrintIconStyle;

export const PRINT_ICON_PREFS_DEFAULT: PrintIconPrefs = {
  icons: true,
  scale: 1,
  stroke: 1,
};

const STORAGE_KEY = "ondeck.print.iconPrefs.v1";
const EVENT = "ondeck:print-icon-prefs";

/** Normalise anything (persisted JSON, partial patch) into full prefs. */
export function resolvePrintIconPrefs(
  raw?: Partial<PrintIconPrefs> | null,
): PrintIconPrefs {
  const style = resolvePrintIconStyle(raw ?? undefined);
  return { icons: raw?.icons !== false, ...style };
}

export function readPrintIconPrefs(): PrintIconPrefs {
  if (typeof window === "undefined") return PRINT_ICON_PREFS_DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return PRINT_ICON_PREFS_DEFAULT;
    return resolvePrintIconPrefs(JSON.parse(raw) as Partial<PrintIconPrefs>);
  } catch {
    return PRINT_ICON_PREFS_DEFAULT;
  }
}

export function writePrintIconPrefs(prefs: PrintIconPrefs): void {
  if (typeof window === "undefined") return;
  const next = resolvePrintIconPrefs(prefs);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — keep the in-memory value */
  }
  window.dispatchEvent(new CustomEvent<PrintIconPrefs>(EVENT, { detail: next }));
}

/**
 * Read + patch the shared icon treatment. SSR/hydration safe: the first render
 * always returns defaults, then the stored value lands in an effect.
 */
export function usePrintIconPrefs(): {
  prefs: PrintIconPrefs;
  patch: (p: Partial<PrintIconPrefs>) => void;
  reset: () => void;
} {
  const [prefs, setPrefs] = useState<PrintIconPrefs>(PRINT_ICON_PREFS_DEFAULT);

  useEffect(() => {
    setPrefs(readPrintIconPrefs());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<PrintIconPrefs>).detail;
      setPrefs(detail ? resolvePrintIconPrefs(detail) : readPrintIconPrefs());
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const patch = useCallback((p: Partial<PrintIconPrefs>) => {
    setPrefs((cur) => {
      const next = resolvePrintIconPrefs({ ...cur, ...p });
      // `accent: undefined` in the patch means "clear the override".
      if ("accent" in p && !p.accent) delete (next as { accent?: string }).accent;
      writePrintIconPrefs(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    writePrintIconPrefs(PRINT_ICON_PREFS_DEFAULT);
    setPrefs(PRINT_ICON_PREFS_DEFAULT);
  }, []);

  return { prefs, patch, reset };
}

/**
 * Effective treatment for a print asset: its own stored settings when present,
 * otherwise the shared preference. Used by both the on-screen canvas and the
 * PDF export path so they cannot diverge.
 */
export function effectiveAssetIconTreatment(
  ctx: { icons?: boolean; iconStyle?: { scale?: number; stroke?: number; accent?: string } } | null,
  prefs: PrintIconPrefs,
): { icons: boolean; iconStyle: PrintIconStyle } {
  const style = ctx?.iconStyle
    ? resolvePrintIconStyle(ctx.iconStyle)
    : resolvePrintIconStyle(prefs);
  return {
    icons: typeof ctx?.icons === "boolean" ? ctx.icons : prefs.icons,
    iconStyle: style,
  };
}
