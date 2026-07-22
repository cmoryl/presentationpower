// Layer 1: per-division PPTX import.
// - uploadImportedDeck: parse .pptx (text outline + slide count + theme),
//   store the binary in the "division-pptx" bucket under {uid}/{id}.pptx,
//   and record the extracted outline in public.imported_decks.
// - listImportedDecksForDivision / getImportedDeckSlides / deleteImportedDeck.
//
// Layer 2 (re-theming, rebranding, RAG extraction) is deliberately NOT here.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parsePptxBuffer, type ParsedDeck } from "./pptx-import";

type SbClient = {
  from: (t: string) => any;
  storage: {
    from: (b: string) => {
      upload: (path: string, body: ArrayBuffer | Uint8Array | Blob, opts?: { contentType?: string; upsert?: boolean }) => Promise<{ data: unknown; error: { message?: string } | null }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
      createSignedUrl: (path: string, expires: number) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
};

const BUCKET = "division-pptx";

// ── Asset metadata builders ────────────────────────────────────────────
// The Asset Inspector panel needs a compact per-slide + per-deck manifest
// of everything the parser extracted (media, hyperlinks, comments, charts,
// tables, diagrams, fonts, custom XML). We persist metadata only — never
// base64 payloads for media/OLE — so slide rows stay small.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSlideAssets(sl: any) {
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
    sampleNodes: (d.nodes ?? []).slice(0, 6).map((n: any) => ({ text: n.text, level: n.level })),
  }));
  const charts = (sl.charts ?? []).map((c: any) => ({
    kind: c.kind,
    title: c.title,
    categoryCount: (c.categories ?? []).length,
    seriesCount: (c.series ?? []).length,
    seriesLabels: (c.series ?? []).map((s: any) => s.label).slice(0, 8),
    unit: c.unit,
    stacked: c.stacked,
  }));
  return {
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
function buildDeckExtras(parsed: any) {
  return {
    metadata: parsed.metadata ?? {},
    graphicsSummary: parsed.graphicsSummary ?? null,
    embeddedFonts: (parsed.embeddedFonts ?? []).map((f: any) => ({
      typeface: f.typeface,
      variants: (f.variants ?? []).map((v: any) => ({
        style: v.style, path: v.path, mime: v.mime, dataUrl: v.dataUrl, bytes: v.bytes,
      })),
    })),
    customXmlParts: (parsed.customXmlParts ?? []).map((p: any) => ({
      path: p.path,
      bytes: typeof p.xml === "string" ? p.xml.length : 0,
    })),
    imagePayloadBytes: parsed.imagePayloadBytes ?? 0,
    imagesTruncated: !!parsed.imagesTruncated,
  };
}

type SavedImageRef = { embedId: string; path: string };

function contentHash(dataUrl: string): string {
  let hash = 5381;
  for (let i = 0; i < dataUrl.length; i++) hash = ((hash << 5) + hash) ^ dataUrl.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

async function persistParsedSlideImages({
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
    const imgFilename = `${baseName}__slide-${slide.index + 1}-${j + 1}.${ext}`.replace(/[^\w.\-]+/g, "_").slice(-160);
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
      await client.storage.from("division-imagery").remove([imgPath]).catch(() => {});
      continue;
    }
    imageCache.set(cacheKey, imgPath);
    refs.push({ embedId, path: imgPath });
  }
  return refs;
}

function rewriteLayoutImageRefs(slide: ParsedDeck["slides"][number], imageRefs: SavedImageRef[]) {
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
          return next;
        }),
      }
    : undefined;
}


// ~100MB raw → ~140MB base64. Client validates size; server caps here.
const UploadInput = z.object({
  divisionId: z.string().min(1).max(120),
  filename: z.string().min(1).max(300),
  data: z.string().min(1).max(140_000_000),
});

export const uploadImportedDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => UploadInput.parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const buf = Buffer.from(data.data, "base64");
    if (buf.length > 105_000_000) throw new Error("File exceeds 100MB.");

    // Parse first so a broken file never lands in storage.
    let parsed: ParsedDeck;
    try {
      parsed = await parsePptxBuffer(buf, data.filename);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Could not parse .pptx");
    }

    const id = crypto.randomUUID();
    const safeName = data.filename.replace(/[^\w.\-]+/g, "_").slice(-160);
    const storagePath = `${context.userId}/${id}-${safeName}`;

    const up = await s.storage
      .from(BUCKET)
      .upload(storagePath, buf, {
        contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        upsert: false,
      });
    if (up.error) throw new Error(`Upload failed: ${up.error.message ?? "unknown"}`);

    // Persist each embedded slide image into the shared `division-imagery`
    // bucket so it surfaces in the Imagery tab and is reusable across decks.
    // Best-effort: image failures don't roll back the deck upload. We record
    // the resulting storage paths per slide so the "Send to library" flow
    // can attach them to a library submission.
    const imageryDivision = normalizeImportedDeckDivision(data.divisionId);
    const savedRefsBySlide: SavedImageRef[][] = parsed.slides.map(() => []);
    let imgSeq = 0;
    const imageCache = new Map<string, string>();
    for (const sl of parsed.slides) {
      const refs = await persistParsedSlideImages({
        slide: sl,
        filename: data.filename,
        userId: context.userId,
        divisionId: data.divisionId,
        imageryDivision,
        client: s,
        imageCache,
      });
      savedRefsBySlide[sl.index] = refs;
      imgSeq += refs.length;
    }

    // Rewrite each slide's captured layout so image shapes carry the durable
    // storage path (not the .pptx rId). This lets FaithfulSlideCanvas fetch
    // via signed URL long after the original .pptx is deleted.
    const slidesLite = parsed.slides.map((sl) => {
      const imageRefs = savedRefsBySlide[sl.index] ?? [];
      const layout = rewriteLayoutImageRefs(sl, imageRefs);

      return {
        index: sl.index,
        title: sl.title,
        bullets: sl.bullets,
        notes: sl.notes,
        imageCount: sl.images.length,
        imagePaths: imageRefs.map((r) => r.path),
        imageRefs,
        layout,
        assets: buildSlideAssets(sl),
      };
    });


    const { data: row, error } = await s
      .from("imported_decks")
      .insert({
        id,
        division_id: data.divisionId,
        uploaded_by: context.userId,
        original_filename: data.filename,
        storage_path: storagePath,
        file_size: buf.length,
        slide_count: parsed.slideCount,
        status: "parsed",
        theme: parsed.theme,
        slides: slidesLite,
        extras: buildDeckExtras(parsed),
      })
      .select()
      .single();

    if (error) {
      // Roll back the .pptx AND any imagery we created.
      await s.storage.from(BUCKET).remove([storagePath]).catch(() => {});
      const allImg = savedRefsBySlide.flat().map((r) => r.path);
      if (allImg.length) await s.storage.from("division-imagery").remove(allImg).catch(() => {});
      throw new Error(`Save failed: ${(error as { message?: string }).message ?? "unknown"}`);
    }

    return { ...(row as { id: string; slide_count: number; status: string }), imagesSaved: imgSeq };
  });


// ── REPARSE (backfill layouts, charts, tables into legacy rows) ───────
// Older imports were parsed before the faithful layout extractor landed,
// so their `slides[].layout` is null and previews render "No layout
// captured". This re-downloads the original .pptx from storage, runs the
// current parser, and rewrites `theme` + `slides` in-place — preserving
// each slide's existing `imagePaths` and re-mapping saved image
// storage paths onto the newly-parsed layout shapes by embed id.

export const reparseImportedDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;

    const { data: row } = await s
      .from("imported_decks")
      .select("id, division_id, original_filename, storage_path, slides")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Deck not found");
    const r = row as {
      id: string;
      division_id: string;
      original_filename: string;
      storage_path: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slides: Array<{ index: number; imagePaths?: string[]; imageRefs?: SavedImageRef[]; layout?: any }> | null;
    };

    const signed = await s.storage.from(BUCKET).createSignedUrl(r.storage_path, 60 * 5);
    const url = signed.data?.signedUrl;
    if (!url) throw new Error("Could not access original .pptx");

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());

    let parsed: ParsedDeck;
    try {
      parsed = await parsePptxBuffer(buf, r.original_filename);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Re-parse failed");
    }

    // Reconstruct embedId → storage path from the durable imageRefs we now
    // persist. Older rows only have positional imagePaths[], so use those as
    // a best-effort seed while the reparse uploads any missing references.
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
        ? legacyRefs.map((ref, idx) => ({ embedId: sl.imageEmbedIds[idx] ?? ref.embedId, path: ref.path })).filter((ref) => !!ref.embedId)
        : legacyRefs;
      const imageRefs = await persistParsedSlideImages({
        slide: sl,
        existingRefs: seededRefs,
        filename: r.original_filename,
        userId: context.userId,
        divisionId: r.division_id,
        imageryDivision,
        client: s,
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
        assets: buildSlideAssets(sl),
      });
    }

    const withLayout = slidesLite.filter((sl) => sl.layout).length;
    const withShapes = slidesLite.filter((sl) => (sl.layout?.shapes?.length ?? 0) > 0).length;

    const { error } = await s
      .from("imported_decks")
      .update({
        theme: parsed.theme,
        slide_count: parsed.slideCount,
        slides: slidesLite,
        status: "parsed",
        error: null,
        extras: buildDeckExtras(parsed),
      })
      .eq("id", data.id);
    if (error) throw new Error((error as { message?: string }).message ?? "Save failed");


    return {
      id: data.id,
      slideCount: parsed.slideCount,
      slidesWithLayout: withLayout,
      slidesWithShapes: withShapes,
      graphicsSummary: parsed.graphicsSummary,
    };
  });







export const listImportedDecksForDivision = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ divisionId: z.string().min(1).max(120) }).parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: rows } = await s
      .from("imported_decks")
      .select("id, division_id, original_filename, file_size, slide_count, status, error, created_at, uploaded_by, chunk_count, embedded_at")
      .eq("division_id", data.divisionId)
      .order("created_at", { ascending: false })
      .limit(200);
    return (rows ?? []) as Array<{
      id: string;
      division_id: string;
      original_filename: string;
      file_size: number;
      slide_count: number;
      status: string;
      error: string | null;
      created_at: string;
      uploaded_by: string;
      chunk_count: number;
      embedded_at: string | null;
    }>;
  });


export const getImportedDeckSlides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("imported_decks")
      .select("id, original_filename, slide_count, theme, slides, status, error, storage_path, extras")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    const r = row as {
      id: string; original_filename: string; slide_count: number;
      theme: { accent1?: string; accent2?: string; dark1?: string; headingFont?: string; bodyFont?: string } | null;
      slides: Array<{
        index: number; title: string; bullets: string[]; notes: string; imageCount: number;
        imagePaths?: string[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        layout?: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assets?: any;
      }> | null;
      status: string; error: string | null;
      storage_path: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extras: any;
    };


    // Signed URL so the owner can re-download the original .pptx.
    const signed = await s.storage.from(BUCKET).createSignedUrl(r.storage_path, 60 * 10).catch(() => ({ data: null }));

    // Collect every image storage_path used by any layout shape and per-slide
    // imagePaths[], batch-sign them, and rewrite so the client can render
    // faithfully without a follow-up round trip.
    const allPaths = new Set<string>();
    for (const sl of r.slides ?? []) {
      for (const p of sl.imagePaths ?? []) allPaths.add(p);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bg = (sl.layout as any)?.background;
      if (bg?.kind === "image" && typeof bg.path === "string") allPaths.add(bg.path);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const sh of (sl.layout?.shapes ?? []) as any[]) {
        if (sh?.kind === "image" && typeof sh.path === "string") allPaths.add(sh.path);
        if (sh?.fill?.kind === "image" && typeof sh.fill.path === "string") allPaths.add(sh.fill.path);
      }
    }
    const pathToUrl = new Map<string, string>();
    await Promise.all(
      Array.from(allPaths).map(async (p) => {
        const res = await s.storage.from("division-imagery").createSignedUrl(p, 60 * 60 * 24).catch(() => ({ data: null }));
        if (res.data?.signedUrl) pathToUrl.set(p, res.data.signedUrl);
      }),
    );
    const slidesWithUrls = (r.slides ?? []).map((sl) => {
      const imageUrls = (sl.imagePaths ?? []).map((p) => pathToUrl.get(p)).filter((u): u is string => Boolean(u));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shapes = sl.layout?.shapes?.map((sh: any) => {
        let next = sh;
        if (sh?.kind === "image" && sh.path) {
          const url = pathToUrl.get(sh.path);
          if (url) next = { ...next, url };
        }
        if (sh?.fill?.kind === "image" && sh.fill.path) {
          const url = pathToUrl.get(sh.fill.path);
          if (url) next = { ...next, fill: { ...sh.fill, url } };
        }
        return next;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let background: any = (sl.layout as any)?.background;
      if (background?.kind === "image" && background.path) {
        const url = pathToUrl.get(background.path);
        if (url) background = { ...background, url };
      }
      const layout = sl.layout ? { ...sl.layout, shapes, background } : undefined;
      return { ...sl, imageUrls, layout };
    });


    return {
      id: r.id,
      original_filename: r.original_filename,
      slide_count: r.slide_count,
      theme: r.theme ?? {},
      slides: slidesWithUrls,
      status: r.status,
      error: r.error,
      storage_path: r.storage_path,
      downloadUrl: signed.data?.signedUrl ?? null,
      extras: r.extras ?? null,
    };

  });




export const deleteImportedDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("imported_decks")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.storage_path) {
      await s.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
    }
    const { error } = await s.from("imported_decks").delete().eq("id", data.id);
    if (error) throw new Error((error as { message?: string }).message ?? "Delete failed");
    return { ok: true };
  });

// ── IMAGE RELINKING (Layer 1b) ─────────────────────────────────────────
// Some embedded PPTX images cannot be reified into `division-imagery`:
// EMF/WMF vectors, externally-linked pictures with no local blob,
// unsupported content-types, or blobs stripped by an intermediate editor.
// The parser preserves the layout shape (position, mask, embedId) but with
// no `path`, so `FaithfulSlideCanvas` renders a gray placeholder. This
// flow lets the owner replace those refs with an uploaded file or an
// existing entry from the Division Imagery library.
//
// A ref is addressed by:
//   { slideIndex, target: "shape" | "fill" | "background", shapeIndex? }
// `shapeIndex` is the position within layout.shapes[]; kept stable because
// the layout array is written once at import time and only patched
// in-place here.

type BrokenRef = {
  slideIndex: number;
  target: "shape" | "fill" | "background";
  shapeIndex?: number;
  embedId?: string;
  frame?: { x: number; y: number; w: number; h: number };
  prst?: string;
};

export const listBrokenDeckImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }): Promise<{
    deckId: string;
    filename: string;
    slideCount: number;
    broken: BrokenRef[];
  }> => {
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("imported_decks")
      .select("id, uploaded_by, original_filename, slide_count, slides")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    const r = row as {
      id: string; uploaded_by: string; original_filename: string; slide_count: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slides: Array<{ index: number; layout?: any }> | null;
    };
    if (r.uploaded_by !== context.userId) {
      const { data: isAdmin } = await (s as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> })
        .rpc("has_role", { _user_id: context.userId, _role: "admin" });
      if (!isAdmin) throw new Error("Forbidden");
    }
    const broken: BrokenRef[] = [];
    for (const sl of r.slides ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bg = (sl.layout as any)?.background;
      if (bg?.kind === "image" && !bg.path) {
        broken.push({ slideIndex: sl.index, target: "background", embedId: bg.embedId });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shapes = (sl.layout?.shapes ?? []) as any[];
      for (let i = 0; i < shapes.length; i++) {
        const sh = shapes[i];
        if (sh?.kind === "image" && !sh.path) {
          broken.push({
            slideIndex: sl.index, target: "shape", shapeIndex: i,
            embedId: sh.embedId, frame: sh.frame, prst: sh.prst,
          });
        }
        if (sh?.fill?.kind === "image" && !sh.fill.path) {
          broken.push({
            slideIndex: sl.index, target: "fill", shapeIndex: i,
            embedId: sh.fill.embedId, frame: sh.frame, prst: sh.prst,
          });
        }
      }
    }
    return {
      deckId: r.id, filename: r.original_filename, slideCount: r.slide_count, broken,
    };
  });

const RelinkInput = z.object({
  deckId: z.string().uuid(),
  slideIndex: z.number().int().min(0),
  target: z.enum(["shape", "fill", "background"]),
  shapeIndex: z.number().int().min(0).optional(),
  // Either upload a new file (base64 up to ~15MB) …
  dataBase64: z.string().min(1).max(20_000_000).optional(),
  contentType: z.string().min(3).max(120).optional(),
  filename: z.string().min(1).max(200).optional(),
  // … or reuse an existing entry from Division Imagery.
  reusePath: z.string().min(1).max(500).optional(),
}).refine((v) => (v.dataBase64 && v.contentType && v.filename) || v.reusePath, {
  message: "Provide either an uploaded file (dataBase64+contentType+filename) or reusePath.",
});

export const relinkDeckImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => RelinkInput.parse(v))
  .handler(async ({ data, context }): Promise<{ ok: true; path: string }> => {
    const s = context.supabase as unknown as SbClient;
    // Fetch the deck we intend to mutate. Only the uploader (or an admin)
    // may relink; other viewers can render, not edit.
    const { data: row } = await s
      .from("imported_decks")
      .select("id, uploaded_by, division_id, original_filename, slides")
      .eq("id", data.deckId)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    const r = row as {
      id: string; uploaded_by: string; division_id: string; original_filename: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slides: Array<{ index: number; imagePaths?: string[]; layout?: any }> | null;
    };
    if (r.uploaded_by !== context.userId) {
      const { data: isAdmin } = await (s as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> })
        .rpc("has_role", { _user_id: context.userId, _role: "admin" });
      if (!isAdmin) throw new Error("Forbidden");
    }

    // Resolve the storage path — either the reused Division Imagery entry
    // or a fresh upload into `division-imagery` (same bucket, same tags).
    let storagePath: string;
    if (data.reusePath) {
      storagePath = data.reusePath;
    } else {
      const bin = Buffer.from(data.dataBase64!, "base64");
      if (bin.length === 0) throw new Error("Empty file");
      const contentType = data.contentType!;
      const ext = contentType.split("/")[1]?.split("+")[0] ?? "bin";
      const imgId = crypto.randomUUID();
      const base = data.filename!.replace(/\.[a-z0-9]+$/i, "");
      const imgFilename = `${base}__relink-s${data.slideIndex + 1}.${ext}`
        .replace(/[^\w.\-]+/g, "_")
        .slice(-160);
      const imgPath = `${context.userId}/${imgId}-${imgFilename}`;
      const up = await s.storage.from("division-imagery").upload(imgPath, bin, { contentType, upsert: false });
      if (up.error) throw new Error(`Upload failed: ${up.error.message ?? "unknown"}`);
      const imageryDivision = normalizeImportedDeckDivision(r.division_id);
      const { error: rowErr } = await s.from("division_imagery").insert({
        id: imgId,
        division_id: imageryDivision,
        uploaded_by: context.userId,
        filename: imgFilename,
        content_type: contentType,
        size_bytes: bin.length,
        storage_path: imgPath,
        kind: "upload",
        tags: ["imported_deck_relink", `slide-${data.slideIndex + 1}`, r.division_id],
        note: `Relinked image for ${r.original_filename} · slide ${data.slideIndex + 1}`,
      });
      if (rowErr) {
        await s.storage.from("division-imagery").remove([imgPath]).catch(() => {});
        throw new Error("Could not register image in Division Imagery.");
      }
      storagePath = imgPath;
    }

    // Patch the slide's layout JSON in-place. We rewrite by (target,
    // shapeIndex) so ambiguous embedIds (multiple broken refs pointing
    // at the same missing rId) resolve deterministically.
    const slides = r.slides ?? [];
    const idx = slides.findIndex((sl) => sl.index === data.slideIndex);
    if (idx < 0) throw new Error("Slide not found in deck");
    const sl = slides[idx];
    if (!sl.layout) throw new Error("Slide has no captured layout");
    const layout = { ...sl.layout };

    if (data.target === "background") {
      const bg = layout.background;
      if (!bg || bg.kind !== "image") throw new Error("Slide background is not an image reference");
      layout.background = { ...bg, path: storagePath };
    } else {
      if (data.shapeIndex === undefined) throw new Error("shapeIndex required for shape/fill target");
      const shapes = [...(layout.shapes ?? [])];
      const shape = shapes[data.shapeIndex];
      if (!shape) throw new Error("Shape not found at shapeIndex");
      if (data.target === "shape") {
        if (shape.kind !== "image") throw new Error("Shape is not an image");
        shapes[data.shapeIndex] = { ...shape, path: storagePath };
      } else {
        if (shape.fill?.kind !== "image") throw new Error("Shape fill is not an image reference");
        shapes[data.shapeIndex] = { ...shape, fill: { ...shape.fill, path: storagePath } };
      }
      layout.shapes = shapes;
    }

    // Keep imagePaths[] (used for signed-URL prefetch and library preview
    // fallbacks) in sync so the new asset appears alongside originals.
    const imagePaths = Array.from(new Set([...(sl.imagePaths ?? []), storagePath]));
    const nextSlides = slides.slice();
    nextSlides[idx] = { ...sl, layout, imagePaths };

    const { error } = await s
      .from("imported_decks")
      .update({ slides: nextSlides })
      .eq("id", data.deckId);
    if (error) throw new Error((error as { message?: string }).message ?? "Save failed");

    return { ok: true, path: storagePath };
  });



// ── RAG EMBEDDING PIPELINE (Layer 2a) ──────────────────────────────────
// Chunk + embed imported_decks (slide title + bullets + notes) into the
// SAME brand_asset_chunks table used by pdf_extractions, so RAG queries by
// division retrieve PDF + PPTX chunks together. Mirrors embedPdfExtractions
// exactly (chunkText 1200/200, google/gemini-embedding-001, companion
// brand_assets row, chunk_count/embedded_at idempotency).

// imported_decks.division_id stores the brand-guide slug ("transperfect-life-sciences");
// brand_asset_chunks.division_id uses the canonical bm-* brand mode id
// ("bm-tp-lifesci"). Translate slug → bm-* so RAG retrieval matches by the
// same key used everywhere else in the app.
const IMPORTED_DECK_SLUG_TO_DIVISION: Record<string, string> = {
  "transperfect-master": "bm-enterprise",
  globallink: "bm-division",
  "transperfect-life-sciences": "bm-tp-lifesci",
  "transperfect-legal": "bm-tp-legal",
  "transperfect-media": "bm-tp-media",
  "transperfect-gaming": "bm-tp-games",
  "transperfect-digital": "bm-tp-digital",
  dataforce: "bm-product",
  "transperfect-cobrand": "bm-cobrand",
  "trial-interactive": "bm-trial-interactive",
};
export function normalizeImportedDeckDivision(v: string): string {
  return IMPORTED_DECK_SLUG_TO_DIVISION[v] ?? v;
}

// Inverse: given a bm-* id (or an already-slug string), return the slug used
// by the imported_decks table so we can filter that table safely from callers
// that speak the canonical bm-* scheme. Falls back to the input for legacy
// callers that already pass a slug.
export function importedDeckSlugForDivision(v: string): string {
  if (Object.prototype.hasOwnProperty.call(IMPORTED_DECK_SLUG_TO_DIVISION, v)) return v;
  for (const [slug, div] of Object.entries(IMPORTED_DECK_SLUG_TO_DIVISION)) {
    if (div === v) return slug;
  }
  return v;
}

function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (clean.length <= size) return clean.length > 40 ? [clean] : [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + size);
    let cut = end;
    if (end < clean.length) {
      const p = clean.lastIndexOf("\n\n", end);
      if (p > i + size / 2) cut = p;
    }
    chunks.push(clean.slice(i, cut).trim());
    if (cut >= clean.length) break;
    i = Math.max(cut - overlap, i + 1);
  }
  return chunks.filter((c) => c.length > 40);
}

async function embedBatch(apiKey: string, inputs: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const bs = 50;
  for (let i = 0; i < inputs.length; i += bs) {
    const batch = inputs.slice(i, i + bs);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-embedding-001", input: batch }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Embedding gateway ${res.status}: ${body.slice(0, 200)}`);
    }
    const j = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    for (const d of j.data ?? []) out.push(d.embedding);
  }
  return out;
}

type ImportedSlideLite = { index: number; title: string; bullets: string[]; notes: string; imageCount: number };

function buildDeckDocument(slides: ImportedSlideLite[]): string {
  const parts: string[] = [];
  for (const s of slides) {
    const title = (s.title ?? "").trim() || "(untitled)";
    const bullets = (s.bullets ?? []).filter((b) => b && b.trim().length > 0).map((b) => `• ${b.trim()}`).join("\n");
    const notes = (s.notes ?? "").trim();
    let block = `Slide ${s.index + 1}: ${title}`;
    if (bullets) block += `\n${bullets}`;
    if (notes) block += `\nNotes: ${notes}`;
    parts.push(block);
  }
  return parts.join("\n\n");
}

const embedInput = z.object({
  divisionId: z.string().optional(),
  id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  skipEmbedded: z.boolean().default(true),
});

export const embedImportedDecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => embedInput.parse(v))
  .handler(async ({ data, context }): Promise<{
    considered: number;
    embedded: number;
    skipped: number;
    failed: number;
    totalChunks: number;
    results: Array<{ id: string; filename: string; status: "ok" | "skipped" | "failed"; chunks: number; error?: string }>;
  }> => {
    // Admin-gate (same as pdf pipeline)
    const s = context.supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown }> };
    const { data: isAdmin } = await s.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden: admin required");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as { from: (t: string) => any };

    let q = (sa as any)
      .from("imported_decks")
      .select("id, division_id, original_filename, slides, chunk_count, status")
      .eq("status", "parsed");
    if (data.id) q = q.eq("id", data.id);
    if (data.divisionId) q = q.eq("division_id", importedDeckSlugForDivision(data.divisionId));
    if (data.skipEmbedded) q = q.eq("chunk_count", 0);
    const { data: rows } = await q.limit(data.limit);
    const list = ((rows ?? []) as Array<{
      id: string; division_id: string; original_filename: string;
      slides: ImportedSlideLite[] | null; chunk_count: number; status: string;
    }>);

    const results: Array<{ id: string; filename: string; status: "ok" | "skipped" | "failed"; chunks: number; error?: string }> = [];
    let embedded = 0, skipped = 0, failed = 0, totalChunks = 0;

    for (const row of list) {
      try {
        const doc = buildDeckDocument(row.slides ?? []);
        if (doc.trim().length < 60) {
          results.push({ id: row.id, filename: row.original_filename, status: "skipped", chunks: 0, error: "empty text" });
          skipped++;
          continue;
        }
        const divisionId = normalizeImportedDeckDivision(row.division_id);

        // Companion brand_assets row keyed by metadata.imported_deck_id.
        const { data: existingAsset } = await sa
          .from("brand_assets")
          .select("id")
          .eq("metadata->>imported_deck_id", row.id)
          .maybeSingle();
        let assetId = (existingAsset as { id: string } | null)?.id ?? null;
        if (!assetId) {
          const { data: ins, error: insErr } = await sa
            .from("brand_assets")
            .insert({
              division_id: divisionId,
              kind: "pptx",
              title: row.original_filename,
              description: `Imported deck · ${(row.slides ?? []).length} slides`,
              source_filename: row.original_filename,
              tags: ["imported_deck", divisionId],
              metadata: {
                source: "imported_deck",
                imported_deck_id: row.id,
                original_filename: row.original_filename,
                division_slug: row.division_id,
              },
              created_by: context.userId,
            })
            .select("id")
            .single();
          if (insErr || !ins) throw new Error(String((insErr as any)?.message ?? "asset insert failed"));
          assetId = (ins as { id: string }).id;
        } else {
          await sa.from("brand_asset_chunks").delete().eq("asset_id", assetId);
        }

        const chunks = chunkText(doc);
        if (chunks.length === 0) {
          results.push({ id: row.id, filename: row.original_filename, status: "skipped", chunks: 0, error: "no chunks" });
          skipped++;
          continue;
        }
        const vectors = await embedBatch(apiKey, chunks);
        const chunkRows = chunks.map((content, i) => ({
          asset_id: assetId,
          division_id: divisionId,
          chunk_index: i,
          content,
          embedding: `[${vectors[i].join(",")}]`,
          tags: ["imported_deck", divisionId],
          metadata: {
            source: "imported_deck",
            imported_deck_id: row.id,
            original_filename: row.original_filename,
          },
        }));
        for (let i = 0; i < chunkRows.length; i += 100) {
          const slice = chunkRows.slice(i, i + 100);
          const { error } = await sa.from("brand_asset_chunks").insert(slice);
          if (error) throw new Error(String((error as any).message ?? error));
        }
        await sa
          .from("imported_decks")
          .update({ chunk_count: chunkRows.length, embedded_at: new Date().toISOString() })
          .eq("id", row.id);

        embedded++;
        totalChunks += chunkRows.length;
        results.push({ id: row.id, filename: row.original_filename, status: "ok", chunks: chunkRows.length });
      } catch (e) {
        failed++;
        results.push({ id: row.id, filename: row.original_filename, status: "failed", chunks: 0, error: (e as Error).message });
      }
    }

    return { considered: list.length, embedded, skipped, failed, totalChunks, results };
  });

// ── LIBRARY SUBMISSIONS ────────────────────────────────────────────────
// A user can promote any parsed slide from an imported deck into a
// division-scoped "example" that shows up in the Approved Module
// Variants library as a real-world reference. We copy the slide's
// title/bullets/notes/imagePaths at submission time so the entry is
// stable even if the source deck is later deleted.

const SendToLibraryInput = z.object({
  importedDeckId: z.string().uuid(),
  slideIndex: z.number().int().min(0).max(999),
  brandModeId: z.string().min(1).max(120).optional(),
});

export const sendImportedSlideToLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => SendToLibraryInput.parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("imported_decks")
      .select("id, division_id, slides")
      .eq("id", data.importedDeckId)
      .maybeSingle();
    if (!row) throw new Error("Imported deck not found");
    const r = row as {
      id: string;
      division_id: string;
      slides: Array<{ index: number; title: string; bullets: string[]; notes: string; imageCount: number; imagePaths?: string[] }> | null;
    };
    const slide = (r.slides ?? []).find((sl) => sl.index === data.slideIndex);
    if (!slide) throw new Error("Slide not found in this deck");

    const divisionId = normalizeImportedDeckDivision(r.division_id);
    const { data: ins, error } = await s
      .from("library_slide_examples")
      .insert({
        division_id: divisionId,
        brand_mode_id: data.brandModeId ?? divisionId,
        imported_deck_id: r.id,
        slide_index: slide.index,
        title: slide.title ?? "",
        bullets: slide.bullets ?? [],
        notes: slide.notes ?? "",
        image_paths: slide.imagePaths ?? [],
        submitted_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error((error as { message?: string }).message ?? "Send failed");
    return { id: (ins as { id: string }).id };
  });

export type LibrarySlideExample = {
  id: string;
  division_id: string;
  brand_mode_id: string | null;
  imported_deck_id: string | null;
  slide_index: number;
  title: string;
  bullets: string[];
  notes: string;
  image_paths: string[];
  submitted_by: string;
  created_at: string;
  imageUrls: string[];
};

export const listLibrarySlideExamples = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ divisionId: z.string().min(1).max(120) }).parse(v))
  .handler(async ({ data, context }): Promise<LibrarySlideExample[]> => {
    const s = context.supabase as unknown as SbClient;
    const divisionId = normalizeImportedDeckDivision(data.divisionId);
    const { data: rows } = await s
      .from("library_slide_examples")
      .select("id, division_id, brand_mode_id, imported_deck_id, slide_index, title, bullets, notes, image_paths, submitted_by, created_at")
      .eq("division_id", divisionId)
      .order("created_at", { ascending: false })
      .limit(200);
    const list = (rows ?? []) as Array<Omit<LibrarySlideExample, "imageUrls">>;
    // Re-sign each image path from the `division-imagery` bucket (24h).
    const signed = await Promise.all(
      list.map(async (row) => {
        const urls: string[] = [];
        for (const p of row.image_paths ?? []) {
          const res = await s.storage.from("division-imagery").createSignedUrl(p, 60 * 60 * 24).catch(() => ({ data: null }));
          if (res.data?.signedUrl) urls.push(res.data.signedUrl);
        }
        return { ...row, imageUrls: urls };
      }),
    );
    return signed;
  });

export const deleteLibrarySlideExample = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { error } = await s.from("library_slide_examples").delete().eq("id", data.id);
    if (error) throw new Error((error as { message?: string }).message ?? "Delete failed");
    return { ok: true };
  });

