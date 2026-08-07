// One-off admin ingest of a local .pptx into public.imported_decks, running the
// exact same code path as the uploadImportedDeck server function (parse →
// persist slide imagery → rewrite layout image refs → insert row).
//
//   bun scripts/ingest-pptx-file.ts <file.pptx> --division transperfect-master
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  persistParsedSlideImages,
  rewriteLayoutImageRefs,
  buildSlideAssets,
  buildDeckExtras,
  BUCKET,
  type SavedImageRef,
} from "../src/lib/imported-deck-ingest.server";
import { parsePptxBuffer } from "../src/lib/pptx-import";
import { normalizeImportedDeckDivision } from "../src/lib/imported-deck-division";

const SUPA_URL = process.env.SUPABASE_URL!;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPA_URL || !SR) throw new Error("missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--"));
const divisionId = argv[argv.indexOf("--division") + 1];
const uploaderArg = argv.includes("--uploader") ? argv[argv.indexOf("--uploader") + 1] : null;
if (!file || !divisionId) throw new Error("usage: <file.pptx> --division <slug> [--uploader <uuid>]");

const sb = createClient(SUPA_URL, SR, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const h = new Headers(init?.headers);
      if (h.get("Authorization") === `Bearer ${SR}`) h.delete("Authorization");
      h.set("apikey", SR);
      return fetch(input, { ...init, headers: h });
    },
  },
}) as any;

const buf = readFileSync(file);
const filename = basename(file);
console.log(`Parsing ${filename} (${(buf.length / 1e6).toFixed(1)} MB) …`);
const parsed = await parsePptxBuffer(buf, filename);
console.log(`  ${parsed.slideCount} slides, ${parsed.sections?.length ?? 0} sections`);

let userId = uploaderArg;
if (!userId) {
  const { data } = await sb
    .from("imported_decks")
    .select("uploaded_by")
    .order("created_at", { ascending: false })
    .limit(1);
  userId = data?.[0]?.uploaded_by ?? null;
}
if (!userId) throw new Error("no uploader id available; pass --uploader <uuid>");

const id = crypto.randomUUID();
const safeName = filename.replace(/[^\w.\-]+/g, "_").slice(-160);
const storagePath = `${userId}/${id}-${safeName}`;
const up = await sb.storage.from(BUCKET).upload(storagePath, buf, {
  contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  upsert: false,
});
if (up.error) throw new Error(`upload: ${up.error.message}`);

const imageryDivision = normalizeImportedDeckDivision(divisionId);
const savedRefsBySlide: SavedImageRef[][] = parsed.slides.map(() => []);
const imageCache = new Map<string, string>();
let imgSeq = 0;
for (const sl of parsed.slides) {
  const refs = await persistParsedSlideImages({
    slide: sl,
    filename,
    userId,
    divisionId,
    imageryDivision,
    client: sb,
    imageCache,
  });
  savedRefsBySlide[sl.index] = refs;
  imgSeq += refs.length;
}
console.log(`  ${imgSeq} slide images persisted`);

const slidesLite = parsed.slides.map((sl) => {
  const imageRefs = savedRefsBySlide[sl.index] ?? [];
  return {
    index: sl.index,
    title: sl.title,
    bullets: sl.bullets,
    notes: sl.notes,
    imageCount: sl.images.length,
    imagePaths: imageRefs.map((r) => r.path),
    imageRefs,
    layout: rewriteLayoutImageRefs(sl, imageRefs),
    layoutFingerprint: sl.layoutFingerprint,
    assets: buildSlideAssets(sl),
  };
});

const { error } = await sb.from("imported_decks").insert({
  id,
  division_id: divisionId,
  uploaded_by: userId,
  original_filename: filename,
  storage_path: storagePath,
  file_size: buf.length,
  slide_count: parsed.slideCount,
  status: "parsed",
  theme: parsed.theme,
  slides: slidesLite,
  extras: buildDeckExtras(parsed),
  templates: parsed.templates,
  sections: parsed.sections,
});
if (error) {
  await sb.storage.from(BUCKET).remove([storagePath]);
  throw new Error(`insert: ${error.message}`);
}
console.log(
  `\nOK  id=${id}  division=${divisionId}  layout:${slidesLite.filter((s) => s.layout).length}/${slidesLite.length}`,
);
