// Shared "page thumbnail" frame for the print agent chat. Renders a real print
// layout (the same engine the library and the asset editor use) scaled into the
// chat column, so every agent step is visible as artwork instead of prose.
import { ApprovedPrintFrame } from "@/components/print/ApprovedPrintFrame";
import { PrintKindPreview } from "@/components/print/PrintKindPreview";
import { pageAspect } from "@/components/print/print-primitives";
import { BRAND_MODES, type BrandMode } from "@/lib/taxonomy";
import type {
  PrintAssetKind,
  PrintDensity,
  PrintMode,
  PrintPageSize,
} from "@/lib/print-assets.types";

export function brandModeFor(divisionId: string | null | undefined): BrandMode {
  return (
    BRAND_MODES.find((m) => m.id === divisionId) ??
    BRAND_MODES.find((m) => m.id === "bm-enterprise") ??
    BRAND_MODES[0]!
  );
}

export function PrintPagePreview({
  kind,
  content,
  divisionId,
  mode = "light",
  pageSize = "Letter",
  density = "standard",
  pageIndex,
  approved = false,
  className = "",
}: {
  kind: PrintAssetKind;
  content: unknown;
  divisionId: string | null | undefined;
  mode?: PrintMode;
  pageSize?: PrintPageSize;
  density?: PrintDensity;
  pageIndex?: number;
  /** Curated/library art: run the approved-demo fit contract so nothing clips. */
  approved?: boolean;
  className?: string;
}) {
  const brand = brandModeFor(divisionId);
  const shared = {
    kind,
    brand,
    mode,
    pageSize,
    density,
    ...(pageIndex !== undefined ? { pageIndex } : {}),
  } as const;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-border bg-white ${className}`}
      style={{ aspectRatio: pageAspect(pageSize) }}
    >
      <div className="pointer-events-none h-full w-full">
        {approved ? (
          <ApprovedPrintFrame
            kind={kind}
            content={content}
            signature={`${brand.id}|${mode}|${pageIndex ?? "x"}`}
            render={(shown) => <PrintKindPreview {...shared} content={shown} />}
          />
        ) : (
          <PrintKindPreview {...shared} content={content} />
        )}
      </div>
    </div>
  );
}
