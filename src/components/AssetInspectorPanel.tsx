// Asset Inspector — lists every extracted asset (images, media, charts,
// tables, diagrams, hyperlinks, comments) for a single imported slide,
// plus deck-level extras (fonts, custom XML parts, metadata, graphics
// summary). Metadata-only; media payloads are not persisted.

import { useState } from "react";
import {
  Image as ImageIcon,
  Film,
  Volume2,
  Link2,
  MessageSquare,
  BarChart3,
  Table as TableIcon,
  GitBranch,
  Type as TypeIcon,
  FileCode2,
  Info,
  EyeOff,
  Zap,
  Package,
} from "lucide-react";
import { BRAND_MODES } from "@/lib/taxonomy";
import { SaveAssetButton } from "@/components/library/SaveToDivisionButton";
import { imageUrlToPng, safeFilename, specCardToPng } from "@/lib/inspector-asset-save";


type SlideAssets = {
  images?: Array<{
    embedId: string;
    index: number;
    occurrences?: Array<{
      source: string;
      kind: string;
      z: number;
      frame?: { x: number; y: number; w: number; h: number };
      srcRect?: { l: number; t: number; r: number; b: number };
      prst?: string;
    }>;
  }>;
  layers?: Array<{
    z: number;
    kind: string;
    frame?: { x: number; y: number; w: number; h: number };
    embedId?: string;
    hasImageFill?: boolean;
    srcRect?: { l: number; t: number; r: number; b: number };
    prst?: string;
  }>;
  shapes?: Array<{
    z: number;
    role: string;
    geometry: string;
    prst?: string;
    adj?: Record<string, number>;
    hasCustomPath?: boolean;
    frame?: { x: number; y: number; w: number; h: number };
    rot?: number;
    flipH?: boolean;
    flipV?: boolean;
    opacity?: number;
    fill?: { kind: string; color?: string; stopCount?: number; embedId?: string; preset?: string };
    line?: { color?: string; widthPt?: number; dash?: string };
    hasEffect?: boolean;
    isPlaceholder?: boolean;
    isTitle?: boolean;
    textPreview?: string;
    charCount?: number;
  }>;
  background?: {

    kind: string;
    embedId?: string;
    path?: string;
    srcRect?: { l: number; t: number; r: number; b: number };
  };
  media?: Array<{ kind: string; mime: string; path: string; embedId?: string; bytes: number }>;
  hyperlinks?: Array<{ rId: string; target: string; external: boolean }>;
  comments?: Array<{
    authorName?: string;
    authorInitials?: string;
    text: string;
    createdAt?: string;
  }>;
  tables?: Array<{ header: string[]; rowCount: number; colCount: number }>;
  diagrams?: Array<{
    kind: string;
    layoutHint?: string;
    nodeCount: number;
    sampleNodes: Array<{ text: string; level: number }>;
  }>;
  charts?: Array<{
    kind: string;
    title?: string;
    categoryCount: number;
    seriesCount: number;
    seriesLabels: string[];
    unit?: string;
    stacked?: boolean;
  }>;
  hidden?: boolean;
  transition?: string;
  hasAnimation?: boolean;
};

type DeckExtras = {
  metadata?: Record<string, string | undefined>;
  graphicsSummary?: {
    charts: number;
    tables: number;
    diagrams: number;
    media: number;
    comments: number;
    hyperlinks: number;
    hiddenSlides: number;
  } | null;
  embeddedFonts?: Array<{
    typeface: string;
    variants: Array<{ style: string; path: string; mime: string }>;
  }>;
  customXmlParts?: Array<{ path: string; bytes: number }>;
  imagePayloadBytes?: number;
  imagesTruncated?: boolean;
};

export type SlideForInspector = {
  index: number;
  imagePaths?: string[];
  imageUrls?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layout?: any;
  assets?: SlideAssets;
};

function fmtBytes(n: number): string {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

type TabKey =
  | "images"
  | "shapes"
  | "media"
  | "charts"
  | "tables"
  | "diagrams"
  | "links"
  | "comments"
  | "deck";

type ShapeAsset = NonNullable<SlideAssets["shapes"]>[number];

// Decks imported before shapes were persisted have no `assets.shapes`, so
// derive the same view client-side from the captured layout shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveShapes(layoutShapes: any[]): ShapeAsset[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textOf = (t: any) =>
    (t?.paras ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => (p?.runs ?? []).map((r: any) => r?.text ?? "").join(""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  const out: ShapeAsset[] = [];
  layoutShapes.forEach((sh, z) => {
    if (sh?.kind !== "text" && sh?.kind !== "line") return;
    const text = textOf(sh?.text);
    const fill =
      sh?.fill && sh.fill.kind !== "none"
        ? {
            kind: sh.fill.kind as string,
            color: sh.fill.color ?? sh.fill.fg ?? sh.fill.stops?.[0]?.color,
            embedId: sh.fill.embedId,
          }
        : undefined;
    const line = sh?.line
      ? { color: sh.line.color, widthPt: sh.line.widthPt, dash: sh.line.dash }
      : undefined;
    if (!text && !fill && !line && !sh?.customPath && !sh?.effect) return;
    out.push({
      z,
      role: sh.kind === "line" ? "connector" : sh?.customPath ? "freeform" : "autoshape",
      geometry: sh?.customPath ? "custom" : (sh?.prst ?? (sh.kind === "line" ? "line" : "rect")),
      prst: sh?.prst,
      adj: sh?.adj,
      hasCustomPath: !!sh?.customPath,
      frame: sh?.frame,
      rot: sh?.frame?.rot,
      flipH: sh?.frame?.flipH || undefined,
      flipV: sh?.frame?.flipV || undefined,
      opacity: sh?.opacity,
      fill,
      line,
      hasEffect: !!sh?.effect,
      isPlaceholder: !!sh?.isPlaceholder || undefined,
      isTitle: !!sh?.isTitle || undefined,
      textPreview: text.slice(0, 120) || undefined,
      charCount: text.length,
    });
  });
  return out;
}


export function AssetInspectorPanel({
  slide,
  extras,
  deckName,
  defaultDivisionId,
}: {
  slide: SlideForInspector;
  extras: DeckExtras | null | undefined;
  deckName?: string;
  defaultDivisionId?: string;
}) {
  const a = slide.assets ?? {};
  const imageUrls = slide.imageUrls ?? [];
  const imagePaths = slide.imagePaths ?? [];
  const shapeCount = slide.layout?.shapes?.length ?? 0;
  const [divisionId, setDivisionId] = useState(defaultDivisionId ?? BRAND_MODES[0].id);
  const src = `${deckName ?? "Imported deck"} · slide ${slide.index + 1}`;
  const slug = safeFilename([deckName?.replace(/\.pptx$/i, ""), `s${slide.index + 1}`], "").replace(
    /\.$/,
    "",
  );

  const shapes: ShapeAsset[] =
    a.shapes && a.shapes.length > 0 ? a.shapes : deriveShapes(slide.layout?.shapes ?? []);

  const counts: Record<TabKey, number> = {
    images: a.images?.length || imageUrls.length || imagePaths.length,
    shapes: shapes.length,
    media: a.media?.length ?? 0,
    charts: a.charts?.length ?? 0,
    tables: a.tables?.length ?? 0,
    diagrams: a.diagrams?.length ?? 0,
    links: a.hyperlinks?.length ?? 0,
    comments: a.comments?.length ?? 0,
    deck: (extras?.embeddedFonts?.length ?? 0) + (extras?.customXmlParts?.length ?? 0),
  };

  const tabs: Array<{
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    { key: "images", label: "Images", icon: ImageIcon },
    { key: "shapes", label: "Shapes", icon: Shapes },
    { key: "media", label: "Media", icon: Film },
    { key: "charts", label: "Charts", icon: BarChart3 },
    { key: "tables", label: "Tables", icon: TableIcon },
    { key: "diagrams", label: "Diagrams", icon: GitBranch },
    { key: "links", label: "Links", icon: Link2 },
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "deck", label: "Deck", icon: Package },
  ];


  const [tab, setTab] = useState<TabKey>(() => {
    return tabs.find((t) => counts[t.key] > 0)?.key ?? "images";
  });

  return (
    <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-foreground/50" />
          <div className="text-xs uppercase tracking-widest text-black/50">Asset inspector</div>
          <div className="ml-2 text-xs text-black/40">
            Slide {slide.index + 1} · {shapeCount} shapes
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-black/50">
          {a.hidden && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
              <EyeOff size={12} /> hidden
            </span>
          )}
          {a.transition && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5">
              transition · {a.transition}
            </span>
          )}
          {a.hasAnimation && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5">
              <Zap size={12} /> animated
            </span>
          )}
          <label className="ml-1 inline-flex items-center gap-1.5">
            <span className="sr-only">Save assets to division library</span>
            <select
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] text-black/70"
              aria-label="Target division imagery library"
            >
              {BRAND_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>


      <div className="flex flex-wrap gap-1 border-b border-black/5 px-3 py-2">
        {tabs.map((t) => {
          const n = counts[t.key];
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition ${
                active
                  ? "bg-[#05041A] text-white"
                  : n > 0
                    ? "border border-black/10 bg-white text-black/70 hover:border-[#003FC7] hover:text-[#003FC7]"
                    : "text-black/30"
              }`}
            >
              <Icon size={11} />
              {t.label}
              <span
                className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/15" : "bg-black/[0.06]"}`}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="max-h-[420px] overflow-y-auto p-5">
        {tab === "images" && (
          <ImagesTab
            urls={imageUrls}
            paths={imagePaths}
            assets={a.images ?? []}
            layers={a.layers ?? []}
            background={a.background}
            divisionId={divisionId}
            src={src}
            slug={slug}
          />
        )}
        {tab === "media" && (
          <MediaTab items={a.media ?? []} divisionId={divisionId} src={src} slug={slug} />
        )}
        {tab === "charts" && (
          <ChartsTab items={a.charts ?? []} divisionId={divisionId} src={src} slug={slug} />
        )}
        {tab === "tables" && (
          <TablesTab items={a.tables ?? []} divisionId={divisionId} src={src} slug={slug} />
        )}
        {tab === "diagrams" && (
          <DiagramsTab items={a.diagrams ?? []} divisionId={divisionId} src={src} slug={slug} />
        )}
        {tab === "links" && <LinksTab items={a.hyperlinks ?? []} />}
        {tab === "comments" && <CommentsTab items={a.comments ?? []} />}
        {tab === "deck" && <DeckTab extras={extras} />}
      </div>

    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-black/10 p-6 text-center text-xs text-black/40">
      {label}
    </div>
  );
}

type SaveCtx = { divisionId: string; src: string; slug: string };

function frameLabel(frame?: { x: number; y: number; w: number; h: number }): string {
  if (!frame) return "no frame";
  return `${frame.x.toFixed(2)}, ${frame.y.toFixed(2)} · ${frame.w.toFixed(2)}×${frame.h.toFixed(2)}in`;
}

function cropLabel(srcRect?: { l: number; t: number; r: number; b: number }): string | null {
  if (!srcRect) return null;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return `crop L${pct(srcRect.l)} T${pct(srcRect.t)} R${pct(srcRect.r)} B${pct(srcRect.b)}`;
}

function ImagesTab({
  urls,
  paths,
  assets,
  layers,
  background,
  divisionId,
  src,
  slug,
}: {
  urls: string[];
  paths: string[];
  assets: NonNullable<SlideAssets["images"]>;
  layers: NonNullable<SlideAssets["layers"]>;
  background?: SlideAssets["background"];
} & SaveCtx) {

  if (urls.length === 0 && paths.length === 0)
    return <Empty label="No embedded images on this slide." />;
  const byEmbed = new Map(assets.map((img) => [img.embedId, img]));
  return (
    <div className="space-y-4">
      {background && (
        <div className="rounded-lg border border-[#003FC7]/15 bg-[#003FC7]/[0.03] p-3 text-[11px] text-black/65">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-[#03002C]">Background · {background.kind}</div>
            {urls[0] && (
              <SaveAssetButton
                divisionId={divisionId}
                label="Save background"
                build={async () => ({
                  dataUrl: await imageUrlToPng(urls[0]!),
                  filename: safeFilename([slug, "background"]),
                  note: `${src} · background (${background.kind})`,
                  kind: "abstract",
                  tags: ["imported_deck", "backdrop"],
                })}
              />
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 font-mono text-[10px] text-black/45">
            {background.embedId && <span>{background.embedId}</span>}
            {cropLabel(background.srcRect) && <span>{cropLabel(background.srcRect)}</span>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(urls.length > 0 ? urls : paths).map((u, i) => {
          const isUrl = urls.length > 0;
          const path = paths[i];
          const filename = path?.split("/").pop() ?? `image-${i + 1}`;
          const meta = assets[i] ?? Array.from(byEmbed.values())[i];
          return (
            <div key={i} className="overflow-hidden rounded-lg border border-black/10 bg-white">
              {isUrl ? (
                <img
                  src={u}
                  alt={filename}
                  className="aspect-video w-full object-contain bg-black/[0.03]"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-black/[0.03] text-[10px] text-icon-subtle">
                  <ImageIcon size={16} />
                </div>
              )}
              <div className="space-y-1 px-2 py-2 text-[10px] text-black/60">
                <div className="truncate font-medium text-[#03002C]" title={path}>
                  {filename}
                </div>
                {meta?.embedId && (
                  <div className="truncate font-mono text-black/40">{meta.embedId}</div>
                )}
                {isUrl && (
                  <SaveAssetButton
                    divisionId={divisionId}
                    build={async () => ({
                      dataUrl: await imageUrlToPng(u),
                      filename: safeFilename([slug, "img", i + 1]),
                      note: `${src} · ${filename}`,
                      kind: "photo",
                      tags: ["imported_deck", "image"],
                    })}
                  />
                )}

                {(meta?.occurrences ?? []).slice(0, 4).map((occ, j) => (
                  <div key={j} className="rounded bg-black/[0.035] px-1.5 py-1">
                    <div className="flex justify-between gap-2">
                      <span>
                        {occ.source} · z{occ.z}
                      </span>
                      <span>{occ.prst ?? occ.kind}</span>
                    </div>
                    <div className="font-mono text-black/40">{frameLabel(occ.frame)}</div>
                    {cropLabel(occ.srcRect) && (
                      <div className="font-mono text-black/40">{cropLabel(occ.srcRect)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {layers.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-widest text-black/50">
            Captured layer stack
          </div>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-black/10">
            {layers.map((layer) => (
              <div
                key={`${layer.z}-${layer.kind}-${layer.embedId ?? ""}`}
                className="grid grid-cols-[44px_90px_1fr_auto] items-center gap-2 border-b border-black/5 px-2 py-1.5 text-[10px] text-black/55 last:border-b-0"
              >
                <span className="font-mono">z{layer.z}</span>
                <span className="font-medium text-black/70">
                  {layer.kind}
                  {layer.hasImageFill ? " fill" : ""}
                </span>
                <span className="truncate font-mono" title={layer.embedId}>
                  {layer.embedId ? `${layer.embedId} · ` : ""}
                  {frameLabel(layer.frame)}
                </span>
                <SaveAssetButton
                  divisionId={divisionId}
                  label="Save shape"
                  build={() => ({
                    dataUrl: specCardToPng({
                      kind: `shape · ${layer.kind}`,
                      title: layer.embedId ? `Layer ${layer.embedId}` : `Layer z${layer.z}`,
                      meta: [
                        `z${layer.z}`,
                        layer.hasImageFill ? "image fill" : "vector",
                        frameLabel(layer.frame),
                      ],
                    }),
                    filename: safeFilename([slug, "shape", layer.z]),
                    note: `${src} · shape layer z${layer.z} (${layer.kind})`,
                    kind: "abstract",
                    tags: ["imported_deck", "shape"],
                  })}
                />
              </div>
            ))}

          </div>
        </div>
      )}
    </div>
  );
}

function MediaTab({
  items,
  divisionId,
  src,
  slug,
}: { items: NonNullable<SlideAssets["media"]> } & SaveCtx) {
  if (items.length === 0) return <Empty label="No video, audio, or embedded object assets." />;
  return (
    <ul className="divide-y divide-black/5">
      {items.map((m, i) => {
        const Icon = m.kind === "video" ? Film : m.kind === "audio" ? Volume2 : Package;
        return (
          <li key={i} className="flex items-center justify-between gap-3 py-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <Icon size={14} className="text-black/50 dark:text-white/60" />
              <span className="truncate font-mono text-black/70" title={m.path}>
                {m.path.split("/").pop()}
              </span>
              <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10px] text-black/60">
                {m.kind}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-black/50">
              <span>{m.mime}</span>
              <span>{fmtBytes(m.bytes)}</span>
              {m.embedId && <span className="font-mono">{m.embedId}</span>}
              <SaveAssetButton
                divisionId={divisionId}
                label="Save card"
                build={() => ({
                  dataUrl: specCardToPng({
                    kind: `media · ${m.kind}`,
                    title: m.path.split("/").pop() || `Media ${i + 1}`,
                    meta: [m.mime, fmtBytes(m.bytes), ...(m.embedId ? [m.embedId] : [])],
                  }),
                  filename: safeFilename([slug, "media", i + 1]),
                  note: `${src} · media ${m.path}`,
                  kind: "abstract",
                  tags: ["imported_deck", "media"],
                })}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}


function ChartsTab({
  items,
  divisionId,
  src,
  slug,
}: { items: NonNullable<SlideAssets["charts"]> } & SaveCtx) {
  if (items.length === 0) return <Empty label="No charts on this slide." />;
  return (
    <ul className="space-y-2">
      {items.map((c, i) => (
        <li key={i} className="rounded-lg border border-black/10 p-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-medium text-[#03002C]">
              {c.title || <span className="italic text-black/40">Untitled</span>}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-black/50">
              <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 uppercase tracking-widest">
                {c.kind}
              </span>
              {c.stacked && (
                <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5">stacked</span>
              )}
              {c.unit && <span>unit · {c.unit}</span>}
              <SaveAssetButton
                divisionId={divisionId}
                label="Save card"
                build={() => ({
                  dataUrl: specCardToPng({
                    kind: `chart · ${c.kind}`,
                    title: c.title || `Chart ${i + 1}`,
                    meta: [
                      `${c.categoryCount} categories`,
                      `${c.seriesCount} series`,
                      ...(c.unit ? [`unit ${c.unit}`] : []),
                    ],
                    lines: c.seriesLabels,
                  }),
                  filename: safeFilename([slug, "chart", i + 1]),
                  note: `${src} · chart ${i + 1}`,
                  kind: "abstract",
                  tags: ["imported_deck", "chart"],
                })}
              />
            </div>
          </div>

          <div className="mt-1 text-[11px] text-black/60">
            {c.categoryCount} categories · {c.seriesCount} series
          </div>
          {c.seriesLabels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {c.seriesLabels.map((l, j) => (
                <span
                  key={j}
                  className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] text-black/60"
                >
                  {l}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function TablesTab({
  items,
  divisionId,
  src,
  slug,
}: { items: NonNullable<SlideAssets["tables"]> } & SaveCtx) {
  if (items.length === 0) return <Empty label="No tables on this slide." />;
  return (
    <ul className="space-y-3">
      {items.map((t, i) => (
        <li key={i} className="overflow-hidden rounded-lg border border-black/10 text-xs">
          <div className="flex items-center justify-between border-b border-black/5 px-3 py-1.5 text-[10px] uppercase tracking-widest text-black/50">
            <span>Table {i + 1}</span>
            <div className="flex items-center gap-2">
              <span>
                {t.rowCount} rows × {t.colCount || t.header.length} cols
              </span>
              <SaveAssetButton
                divisionId={divisionId}
                label="Save card"
                build={() => ({
                  dataUrl: specCardToPng({
                    kind: "table",
                    title: `Table ${i + 1}`,
                    meta: [`${t.rowCount} rows`, `${t.colCount || t.header.length} cols`],
                    lines: t.header.filter(Boolean),
                  }),
                  filename: safeFilename([slug, "table", i + 1]),
                  note: `${src} · table ${i + 1}`,
                  kind: "abstract",
                  tags: ["imported_deck", "table"],
                })}
              />
            </div>
          </div>

          {t.header.length > 0 && (
            <div className="flex flex-wrap gap-1 p-2">
              {t.header.map((h, j) => (
                <span
                  key={j}
                  className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] text-black/70"
                >
                  {h || "—"}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function DiagramsTab({
  items,
  divisionId,
  src,
  slug,
}: { items: NonNullable<SlideAssets["diagrams"]> } & SaveCtx) {
  if (items.length === 0) return <Empty label="No SmartArt or diagram groups on this slide." />;
  return (
    <ul className="space-y-2">
      {items.map((d, i) => (
        <li key={i} className="rounded-lg border border-black/10 p-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-black/60">
                {d.kind}
              </span>
              {d.layoutHint && (
                <span className="rounded-full bg-[#003FC7]/10 px-1.5 py-0.5 text-[10px] text-[#003FC7]">
                  {d.layoutHint}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-black/50">{d.nodeCount} nodes</span>
              <SaveAssetButton
                divisionId={divisionId}
                label="Save card"
                build={() => ({
                  dataUrl: specCardToPng({
                    kind: `diagram · ${d.kind}`,
                    title: d.layoutHint || `Diagram ${i + 1}`,
                    meta: [`${d.nodeCount} nodes`],
                    lines: d.sampleNodes.map((n) => n.text),
                  }),
                  filename: safeFilename([slug, "diagram", i + 1]),
                  note: `${src} · diagram ${i + 1}`,
                  kind: "abstract",
                  tags: ["imported_deck", "diagram"],
                })}
              />
            </div>
          </div>

          {d.sampleNodes.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {d.sampleNodes.map((n, j) => (
                <li
                  key={j}
                  className="text-[11px] text-black/70"
                  style={{ paddingLeft: `${n.level * 10}px` }}
                >
                  • {n.text}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function LinksTab({ items }: { items: NonNullable<SlideAssets["hyperlinks"]> }) {
  if (items.length === 0) return <Empty label="No hyperlinks on this slide." />;
  return (
    <ul className="divide-y divide-black/5">
      {items.map((h, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <Link2 size={12} className="text-foreground/50" />
            {h.external ? (
              <a
                href={h.target}
                target="_blank"
                rel="noreferrer"
                className="truncate text-[#003FC7] hover:underline"
                title={h.target}
              >
                {h.target}
              </a>
            ) : (
              <span className="truncate text-black/70" title={h.target}>
                {h.target}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-black/40">
            <span className={h.external ? "text-emerald-700" : "text-black/50"}>
              {h.external ? "external" : "internal"}
            </span>
            <span className="font-mono">{h.rId}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CommentsTab({ items }: { items: NonNullable<SlideAssets["comments"]> }) {
  if (items.length === 0) return <Empty label="No comments on this slide." />;
  return (
    <ul className="space-y-2">
      {items.map((c, i) => (
        <li key={i} className="rounded-lg border border-black/10 p-3 text-xs">
          <div className="flex items-center justify-between text-[10px] text-black/50">
            <span className="font-medium text-[#03002C]">
              {c.authorName || c.authorInitials || "Unknown author"}
            </span>
            {c.createdAt && <span>{new Date(c.createdAt).toLocaleString()}</span>}
          </div>
          <div className="mt-1 whitespace-pre-wrap text-[11px] text-black/70">{c.text}</div>
        </li>
      ))}
    </ul>
  );
}

function DeckTab({ extras }: { extras: DeckExtras | null | undefined }) {
  if (!extras) return <Empty label="No deck-level extras captured." />;
  const meta = extras.metadata ?? {};
  const metaEntries = Object.entries(meta).filter(([, v]) => typeof v === "string" && v.length > 0);
  return (
    <div className="space-y-5">
      {extras.graphicsSummary && (
        <section>
          <div className="mb-2 text-[10px] uppercase tracking-widest text-black/50">
            Deck totals
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(extras.graphicsSummary).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] text-black/70"
              >
                <span className="font-mono text-[#003FC7]">{v}</span>
                <span>{k}</span>
              </span>
            ))}
          </div>
        </section>
      )}
      {metaEntries.length > 0 && (
        <section>
          <div className="mb-2 text-[10px] uppercase tracking-widest text-black/50">
            docProps metadata
          </div>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
            {metaEntries.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-black/5 py-1">
                <dt className="text-black/50">{k}</dt>
                <dd className="truncate text-right text-black/80" title={String(v)}>
                  {String(v)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {(extras.embeddedFonts?.length ?? 0) > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-black/50">
            <TypeIcon size={12} /> Embedded fonts
          </div>
          <ul className="space-y-1.5">
            {extras.embeddedFonts!.map((f, i) => (
              <li key={i} className="rounded-lg border border-black/10 p-2 text-[11px]">
                <div className="font-medium text-[#03002C]">{f.typeface}</div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {f.variants.map((v, j) => (
                    <span
                      key={j}
                      className="rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10px] text-black/60"
                    >
                      {v.style}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(extras.customXmlParts?.length ?? 0) > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-black/50">
            <FileCode2 size={12} /> Custom XML parts
          </div>
          <ul className="divide-y divide-black/5">
            {extras.customXmlParts!.map((p, i) => (
              <li key={i} className="flex items-center justify-between py-1 text-[11px]">
                <span className="truncate font-mono text-black/70" title={p.path}>
                  {p.path}
                </span>
                <span className="text-[10px] text-black/50">{fmtBytes(p.bytes)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {extras.imagesTruncated && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
          Image payload cap reached ({fmtBytes(extras.imagePayloadBytes ?? 0)}) — some images were
          skipped.
        </div>
      )}
    </div>
  );
}
