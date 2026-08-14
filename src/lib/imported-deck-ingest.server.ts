// Server-only ingest core for imported PPTX decks.
//
// Everything that touches the .pptx bytes, storage buckets, or the
// imported_decks row lives here so that both the TanStack server functions
// (src/lib/imported-decks.functions.ts) and the admin backfill script
// (scripts/reparse-imported-decks.ts) run the exact same code path.

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ParsedDeck } from "./pptx-import";
import { normalizeImportedDeckDivision } from "./imported-deck-division";

export const BUCKET = "division-pptx";

export type SbClient = {
  from: (t: string) => any;
  storage: {
    from: (b: string) => {
      upload: (
        path: string,
        body: ArrayBuffer | Uint8Array | Blob,
        opts?: { contentType?: string; upsert?: boolean },
      ) => Promise<{ data: unknown; error: { message?: string } | null }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
      createSignedUrl: (
        path: string,
        expires: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
};


// ── Asset metadata builders ────────────────────────────────────────────
// The Asset Inspector panel needs a compact per-slide + per-deck manifest
// of everything the parser extracted (media, hyperlinks, comments, charts,
// tables, diagrams, fonts, custom XML). We persist metadata only — never
// base64 payloads for media/OLE — so slide rows stay small.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSlideAssets(sl: any) {
  const layoutShapes = sl.layout?.shapes ?? [];
  const images = (sl.imageEmbedIds ?? []).map((embedId: string, idx: number) => {
    const matches = layoutShapes
      .map((sh: any, z: number) => {
        const frame = sh?.frame;
        if (sh?.kind === "image" && sh.embedId === embedId)
          return { source: "shape", kind: sh.kind, z, frame, srcRect: sh.srcRect, prst: sh.prst };
        if (sh?.fill?.kind === "image" && sh.fill.embedId === embedId)
          return {
            source: "fill",
            kind: sh.kind,
            z,
            frame,
            srcRect: sh.fill.srcRect,
            prst: sh.prst,
          };
        return null;
      })
      .filter(Boolean);
    const bg = sl.layout?.background;
    if (bg?.kind === "image" && bg.embedId === embedId)
      matches.unshift({
        source: "background",
        kind: "background",
        z: -1,
        frame: sl.layout?.size
          ? { x: 0, y: 0, w: sl.layout.size.w, h: sl.layout.size.h }
          : undefined,
        srcRect: bg.srcRect,
        prst: undefined,
      });
    return {
      embedId,
      index: idx,
      occurrences: matches,
    };
  });
  const layers = layoutShapes.map((sh: any, z: number) => ({
    z,
    kind: sh?.kind,
    frame: sh?.frame,
    embedId: sh?.embedId ?? sh?.fill?.embedId,
    hasImageFill: sh?.fill?.kind === "image",
    srcRect: sh?.srcRect ?? sh?.fill?.srcRect,
    prst: sh?.prst,
  }));

  // Native PowerPoint-authored vector shapes (autoshapes, freeforms,
  // connectors). The parser emits every `p:sp` as kind "text" — geometry lives
  // in prst/adj/customPath/fill/line — so the inspector could never list them
  // as their own asset class. Surface them explicitly here.
  const shapeText = (t: any): string =>
    (t?.paras ?? [])
      .map((p: any) => (p?.runs ?? []).map((r: any) => r?.text ?? "").join(""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  const fillSummary = (f: any) => {
    if (!f || f.kind === "none") return undefined;
    if (f.kind === "solid") return { kind: "solid", color: f.color, opacity: f.opacity };
    if (f.kind === "gradient")
      return {
        kind: "gradient",
        color: f.stops?.[0]?.color,
        stopCount: (f.stops ?? []).length,
        angle: f.angle,
      };
    if (f.kind === "image") return { kind: "image", embedId: f.embedId };
    if (f.kind === "pattern") return { kind: "pattern", color: f.fg, preset: f.preset };
    return { kind: f.kind };
  };
  const shapes = layoutShapes
    .map((sh: any, z: number) => {
      const isVector = sh?.kind === "text" || sh?.kind === "line";
      if (!isVector) return null;
      const text = shapeText(sh?.text);
      const geometry = sh?.customPath
        ? "custom"
        : (sh?.prst ?? (sh?.kind === "line" ? "line" : "rect"));
      const fill = fillSummary(sh?.fill);
      const line = sh?.line
        ? { color: sh.line.color, widthPt: sh.line.widthPt, dash: sh.line.dash }
        : undefined;
      // A shape with no text, no fill and no outline is an invisible
      // placeholder frame — not a real asset.
      if (!text && !fill && !line && !sh?.customPath && !sh?.effect) return null;
      return {
        z,
        role: sh?.kind === "line" ? "connector" : sh?.customPath ? "freeform" : "autoshape",
        geometry,
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
      };
    })
    .filter(Boolean);

  const media = (sl.media ?? []).map((m: any) => ({
    kind: m.kind,
    mime: m.mime,
    path: m.path,
    embedId: m.embedId,
    bytes: m.bytes,
  }));
  const hyperlinks = (sl.hyperlinks ?? []).map((h: any) => ({
    rId: h.rId,
    target: h.target,
    external: h.external,
  }));
  const comments = (sl.comments ?? []).map((c: any) => ({
    authorName: c.authorName,
    authorInitials: c.authorInitials,
    text: c.text,
    createdAt: c.createdAt,
  }));
  const tables = (sl.tables ?? []).map((t: any) => ({
    header: t.header,
    rowCount: (t.rows ?? []).length,
    colCount: (t.header ?? []).length,
  }));
  const diagrams = (sl.diagrams ?? []).map((d: any) => ({
    kind: d.kind,
    layoutHint: d.layoutHint,
    nodeCount: (d.nodes ?? []).length,
    // Full node text (capped) so SmartArt copy reaches the RAG document.
    nodes: (d.nodes ?? []).slice(0, 40).map((n: any) => ({ text: n.text, level: n.level })),
    sampleNodes: (d.nodes ?? []).slice(0, 6).map((n: any) => ({ text: n.text, level: n.level })),
  }));
  const charts = (sl.charts ?? []).map((c: any) => ({
    kind: c.kind,
    title: c.title,
    categoryCount: (c.categories ?? []).length,
    categories: (c.categories ?? []).slice(0, 24),
    seriesCount: (c.series ?? []).length,
    seriesLabels: (c.series ?? []).map((s: any) => s.label).slice(0, 8),
    unit: c.unit,
    stacked: c.stacked,
  }));
  return {
    images,
    layers,
    shapes,

    background: sl.layout?.background
      ? {
          kind: sl.layout.background.kind,
          embedId: sl.layout.background.embedId,
          path: sl.layout.background.path,
          srcRect: sl.layout.background.srcRect,
        }
      : undefined,
    media,
    hyperlinks,
    comments,
    tables,
    diagrams,
    charts,
    hidden: !!sl.hidden,
    transition: sl.transition,
    hasAnimation: !!sl.hasAnimation,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildDeckExtras(parsed: any) {
  return {
    metadata: parsed.metadata ?? {},
    graphicsSummary: parsed.graphicsSummary ?? null,
    embeddedFonts: (parsed.embeddedFonts ?? []).map((f: any) => ({
      typeface: f.typeface,
      variants: (f.variants ?? []).map((v: any) => ({
        style: v.style,
        path: v.path,
        mime: v.mime,
        dataUrl: v.dataUrl,
        bytes: v.bytes,
      })),
    })),
    customXmlParts: (parsed.customXmlParts ?? []).map((p: any) => ({
      path: p.path,
      bytes: typeof p.xml === "string" ? p.xml.length : 0,
    })),
    sectionCount: (parsed.sections ?? []).length,
    layoutCount: (parsed.templates?.layouts ?? []).length,
    masterCount: (parsed.templates?.masters ?? []).length,
    imagePayloadBytes: parsed.imagePayloadBytes ?? 0,
    imagesTruncated: !!parsed.imagesTruncated,
    screening: buildScreeningExtra(parsed.screening),
  };
}

/** Row payloads stay bounded: keep the scores/totals whole, cap the issue list. */
const MAX_STORED_ISSUES = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildScreeningExtra(screening: any) {
  if (!screening) return null;
  const issues = (screening.compat?.issues ?? []) as any[];
  return {
    sniff: {
      kind: screening.sniff?.kind ?? "unknown",
      container: screening.sniff?.container ?? "unknown",
      extensionMismatch: !!screening.sniff?.extensionMismatch,
    },
    package: {
      entryCount: screening.package?.entryCount ?? 0,
      expandedBytes: screening.package?.expandedBytes ?? 0,
      hasMacros: !!screening.package?.hasMacros,
      hasOleEmbeds: !!screening.package?.hasOleEmbeds,
      risks: (screening.package?.risks ?? []).map((r: any) => ({
        code: r.code,
        severity: r.severity,
        message: r.message,
      })),
    },
    source: {
      sourceId: screening.source?.sourceId ?? "unknown",
      label: screening.source?.label ?? "Unknown",
      confidence: screening.source?.confidence ?? 0,
      version: screening.source?.version ?? null,
      signals: (screening.source?.signals ?? []).slice(0, 6).map((sig: any) => ({
        channel: sig.channel,
        detail: sig.detail,
      })),
    },
    compat: {
      scores: screening.compat?.scores ?? null,
      totals: screening.compat?.totals ?? null,
      objects: screening.compat?.objects ?? null,
      substitutedFonts: screening.compat?.substitutedFonts ?? [],
      issueCount: issues.length,
      issuesTruncated: issues.length > MAX_STORED_ISSUES,
      issues: issues.slice(0, MAX_STORED_ISSUES),
    },
  };
}

export type SavedImageRef = { embedId: string; path: string };

function contentHash(dataUrl: string): string {
  let hash = 5381;
  for (let i = 0; i < dataUrl.length; i++) hash = ((hash << 5) + hash) ^ dataUrl.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

export async function persistParsedSlideImages({
  slide,
  existingRefs,
  filename,
  userId,
  divisionId,
  imageryDivision,
  client,
  imageCache,
  tag,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slide: any;
  existingRefs?: SavedImageRef[];
  filename: string;
  userId: string;
  divisionId: string;
  imageryDivision: string;
  client: SbClient;
  imageCache: Map<string, string>;
  tag?: string;
}): Promise<SavedImageRef[]> {
  const refs: SavedImageRef[] = [];
  const existingByEmbed = new Map((existingRefs ?? []).map((r) => [r.embedId, r.path]));
  for (let j = 0; j < (slide.images ?? []).length; j++) {
    const dataUrl = slide.images[j];
    const embedId = slide.imageEmbedIds?.[j] ?? "";
    if (embedId && existingByEmbed.has(embedId)) {
      refs.push({ embedId, path: existingByEmbed.get(embedId)! });
      continue;
    }
    const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!m || !embedId) continue;
    const cacheKey = contentHash(dataUrl);
    const cachedPath = imageCache.get(cacheKey);
    if (cachedPath) {
      refs.push({ embedId, path: cachedPath });
      continue;
    }
    const contentType = m[1];
    const bin = Buffer.from(m[2], "base64");
    if (bin.length === 0) continue;
    const ext = contentType.split("/")[1]?.split("+")[0] ?? "bin";
    const imgId = crypto.randomUUID();
    const baseName = filename.replace(/\.pptx$/i, "");
    const imgFilename = `${baseName}__slide-${slide.index + 1}-${j + 1}.${ext}`
      .replace(/[^\w.\-]+/g, "_")
      .slice(-160);
    const imgPath = `${userId}/${imgId}-${imgFilename}`;
    const upImg = await client.storage
      .from("division-imagery")
      .upload(imgPath, bin, { contentType, upsert: false });
    if (upImg.error) continue;
    const { error: rowErr } = await client.from("division_imagery").insert({
      id: imgId,
      division_id: imageryDivision,
      uploaded_by: userId,
      filename: imgFilename,
      content_type: contentType,
      size_bytes: bin.length,
      storage_path: imgPath,
      kind: "upload",
      tags: ["imported_deck", ...(tag ? [tag] : []), `slide-${slide.index + 1}`, divisionId],
      note: `${tag === "re_extracted" ? "Re-extracted" : "Extracted"} from ${filename} · slide ${slide.index + 1}`,
    });
    if (rowErr) {
      await client.storage
        .from("division-imagery")
        .remove([imgPath])
        .catch(() => {});
      continue;
    }
    imageCache.set(cacheKey, imgPath);
    refs.push({ embedId, path: imgPath });
  }
  return refs;
}

export function rewriteLayoutImageRefs(slide: ParsedDeck["slides"][number], imageRefs: SavedImageRef[]) {
  const embedToPath = new Map(imageRefs.map((r) => [r.embedId, r.path]));
  const rewriteFill = (fill: unknown): unknown => {
    if (!fill || typeof fill !== "object") return fill;
    const f = fill as { kind?: string; embedId?: string; path?: string };
    if (f.kind === "image" && f.embedId) {
      const path = embedToPath.get(f.embedId);
      if (path) return { ...f, path };
    }
    return fill;
  };
  const rewriteTableCells = (cellGrid: unknown): unknown => {
    if (!Array.isArray(cellGrid)) return cellGrid;
    return cellGrid.map((row) =>
      Array.isArray(row)
        ? row.map((cell) => {
            if (!cell || typeof cell !== "object") return cell;
            const c = cell as { fill?: unknown };
            const rewritten = rewriteFill(c.fill);
            return rewritten !== c.fill ? { ...c, fill: rewritten } : cell;
          })
        : row,
    );
  };
  return slide.layout
    ? {
        ...slide.layout,
        background: rewriteFill(slide.layout.background) as typeof slide.layout.background,
        shapes: slide.layout.shapes.map((sh) => {
          let next: typeof sh = sh;
          if (sh.kind === "image" && sh.embedId) {
            const path = embedToPath.get(sh.embedId);
            if (path) next = { ...sh, path };
          }
          if ("fill" in next && next.fill) {
            const rewritten = rewriteFill(next.fill);
            if (rewritten !== next.fill) next = { ...next, fill: rewritten as typeof next.fill };
          }
          if (next.kind === "table" && next.cellGrid) {
            const rewrittenCells = rewriteTableCells(next.cellGrid);
            if (rewrittenCells !== next.cellGrid)
              next = { ...next, cellGrid: rewrittenCells as typeof next.cellGrid };
          }
          return next;
        }),
      }
    : undefined;
}

// ── Shared reparse core ────────────────────────────────────────────────
// Re-downloads the original .pptx, runs the current parser, and rewrites
// `theme` + `slides` in place — preserving each slide's existing image
// storage paths and re-mapping them onto the newly-parsed layout shapes by
// embed id. Both `reparseImportedDeck` (server fn) and the admin backfill
// script call this, so there is exactly one reparse code path.

export type ReparseResult = {
  id: string;
  filename: string;
  slideCount: number;
  slidesWithLayout: number;
  slidesWithShapes: number;
  graphicsSummary: ParsedDeck["graphicsSummary"];
};

export async function reparseDeckRow({
  client,
  id,
  userId,
}: {
  client: SbClient;
  id: string;
  /** Falls back to the deck's original uploader (admin/script callers). */
  userId?: string;
}): Promise<ReparseResult> {
  const { data: row } = await client
    .from("imported_decks")
    .select("id, division_id, original_filename, storage_path, slides, uploaded_by")
    .eq("id", id)
    .maybeSingle();
  if (!row) throw new Error("Deck not found");
  const r = row as {
    id: string;
    division_id: string;
    original_filename: string;
    storage_path: string;
    uploaded_by: string;
    slides: Array<{
      index: number;
      imagePaths?: string[];
      imageRefs?: SavedImageRef[];
      layout?: any;
    }> | null;
  };
  const actorId = userId ?? r.uploaded_by;

  const signed = await client.storage.from(BUCKET).createSignedUrl(r.storage_path, 60 * 5);
  const url = signed.data?.signedUrl;
  if (!url) throw new Error("Could not access original .pptx");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  let parsed: ParsedDeck;
  try {
    parsed = await (await import("./pptx-import")).parsePptxBuffer(buf, r.original_filename);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Re-parse failed");
  }

  // Reconstruct embedId → storage path from the durable imageRefs we now
  // persist. Older rows only have positional imagePaths[], so use those as a
  // best-effort seed while the reparse uploads any missing references.
  const existingBySlide = new Map<number, SavedImageRef[]>();
  for (const sl of r.slides ?? []) {
    const refs = sl.imageRefs?.length
      ? sl.imageRefs
      : (sl.imagePaths ?? []).map((path, idx) => ({ embedId: `__legacy_pos_${idx}`, path }));
    existingBySlide.set(sl.index, refs);
  }

  const imageryDivision = normalizeImportedDeckDivision(r.division_id);
  const imageCache = new Map<string, string>();
  const slidesLite = [];
  for (const sl of parsed.slides) {
    const legacyRefs = existingBySlide.get(sl.index) ?? [];
    const seededRefs = legacyRefs.some((ref) => ref.embedId.startsWith("__legacy_pos_"))
      ? legacyRefs
          .map((ref, idx) => ({ embedId: sl.imageEmbedIds[idx] ?? ref.embedId, path: ref.path }))
          .filter((ref) => !!ref.embedId)
      : legacyRefs;
    const imageRefs = await persistParsedSlideImages({
      slide: sl,
      existingRefs: seededRefs,
      filename: r.original_filename,
      userId: actorId,
      divisionId: r.division_id,
      imageryDivision,
      client,
      imageCache,
      tag: "re_extracted",
    });
    const layout = rewriteLayoutImageRefs(sl, imageRefs);

    slidesLite.push({
      index: sl.index,
      title: sl.title,
      bullets: sl.bullets,
      notes: sl.notes,
      imageCount: sl.images.length,
      imagePaths: imageRefs.map((ref) => ref.path),
      imageRefs,
      layout,
      layoutFingerprint: sl.layoutFingerprint,
      assets: buildSlideAssets(sl),
    });
  }

  const withLayout = slidesLite.filter((sl) => sl.layout).length;
  const withShapes = slidesLite.filter((sl) => (sl.layout?.shapes?.length ?? 0) > 0).length;

  const { error } = await client
    .from("imported_decks")
    .update({
      theme: parsed.theme,
      slide_count: parsed.slideCount,
      slides: slidesLite,
      status: "parsed",
      error: null,
      extras: buildDeckExtras(parsed),
      templates: parsed.templates ?? { masters: [], layouts: [] },
      sections: parsed.sections ?? [],
    })
    .eq("id", id);
  if (error) throw new Error((error as { message?: string }).message ?? "Save failed");

  return {
    id,
    filename: r.original_filename,
    slideCount: parsed.slideCount,
    slidesWithLayout: withLayout,
    slidesWithShapes: withShapes,
    graphicsSummary: parsed.graphicsSummary,
  };
}
