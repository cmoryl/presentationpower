// Admin backfill: re-run the current PPTX parser over imported_decks rows
// that were ingested before the layout extractor landed.
//
// Runs the EXACT same code path as the reparseImportedDeck server function
// (src/lib/imported-deck-ingest.server.ts → reparseDeckRow), just with a
// service-role client instead of a user session. Re-runnable / idempotent:
// image uploads are keyed by embed id and the row is rewritten in place.
//
//   bun scripts/reparse-imported-decks.ts --stale      # only thin rows
//   bun scripts/reparse-imported-decks.ts --all
//   bun scripts/reparse-imported-decks.ts --id <uuid> [--id <uuid>]
//   bun scripts/reparse-imported-decks.ts --stale --dry-run
//
// Prints before/after slides jsonb sizes per deck.

import { createClient } from "@supabase/supabase-js";
import { reparseDeckRow } from "../src/lib/imported-deck-ingest.server";

const SUPA_URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SR) throw new Error("missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const ALL = argv.includes("--all");
const STALE = argv.includes("--stale") || (!ALL && !argv.includes("--id"));
const IDS = argv.flatMap((a, i) => (a === "--id" ? [argv[i + 1]] : [])).filter(Boolean) as string[];
// A row is "stale" when its stored slides payload is far too small to hold
// captured layout geometry — i.e. it predates the layout extractor.
const STALE_BYTES_PER_SLIDE = 2_000;

const sb = createClient(SUPA_URL, SR, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const h = new Headers(init?.headers);
      if (
        (SR.startsWith("sb_publishable_") || SR.startsWith("sb_secret_")) &&
        h.get("Authorization") === `Bearer ${SR}`
      ) {
        h.delete("Authorization");
      }
      h.set("apikey", SR);
      return fetch(input, { ...init, headers: h });
    },
  },
});

type Row = {
  id: string;
  original_filename: string;
  division_id: string;
  slide_count: number;
  slides_bytes: number;
  slides_with_layout: number;
};

async function stats(ids?: string[]): Promise<Row[]> {
  const { data, error } = await sb
    .from("imported_decks")
    .select("id, original_filename, division_id, slide_count, slides, status")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((r: any) => !ids || ids.includes(r.id))
    .map((r: any) => {
      const slides = Array.isArray(r.slides) ? r.slides : [];
      return {
        id: r.id,
        original_filename: r.original_filename,
        division_id: r.division_id,
        slide_count: r.slide_count ?? slides.length,
        slides_bytes: JSON.stringify(slides).length,
        slides_with_layout: slides.filter((s: any) => s?.layout).length,
      } satisfies Row;
    });
}

const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1e6).toFixed(1)} MB` : `${(n / 1e3).toFixed(1)} kB`);

async function main() {
  const before = await stats(IDS.length ? IDS : undefined);
  const targets = IDS.length
    ? before
    : ALL
      ? before
      : before.filter(
          (r) =>
            r.slides_with_layout === 0 ||
            r.slides_bytes < Math.max(1, r.slide_count) * STALE_BYTES_PER_SLIDE,
        );

  console.log(`\n${targets.length} deck(s) selected (of ${before.length} total)\n`);
  for (const r of targets) {
    console.log(
      `  ${r.original_filename}  [${r.division_id}]  ${r.slide_count} slides  ` +
        `${fmt(r.slides_bytes)}  layout:${r.slides_with_layout}/${r.slide_count}`,
    );
  }
  if (DRY) {
    console.log("\n--dry-run: nothing reparsed.\n");
    return;
  }

  const beforeById = new Map(before.map((r) => [r.id, r]));
  let ok = 0;
  const failures: Array<{ file: string; error: string }> = [];

  for (const r of targets) {
    process.stdout.write(`\n▸ ${r.original_filename} … `);
    try {
      const out = await reparseDeckRow({ client: sb as any, id: r.id });
      const [after] = await stats([r.id]);
      const b = beforeById.get(r.id)!;
      console.log(
        `done\n    slides jsonb: ${fmt(b.slides_bytes)} → ${fmt(after.slides_bytes)}` +
          `  (${b.slides_bytes ? `${((after.slides_bytes / b.slides_bytes - 1) * 100).toFixed(0)}%` : "new"})` +
          `\n    layout captured: ${b.slides_with_layout}/${b.slide_count} → ${out.slidesWithLayout}/${out.slideCount}` +
          `  shapes on ${out.slidesWithShapes} slides`,
      );
      ok += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`FAILED — ${msg}`);
      failures.push({ file: r.original_filename, error: msg });
    }
  }

  console.log(`\n─── ${ok} reparsed, ${failures.length} failed ───`);
  for (const f of failures) console.log(`  ✗ ${f.file}: ${f.error}`);
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
