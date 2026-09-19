// Resolves an Oracle citation id (`asset:<chunk>`, `oracle:<row>`, `kb:<row>`,
// `event:<row>`, `glossary:<row>`, `bi:<row>`) into the real record behind it —
// including a signed URL to the original brand document file where one exists,
// so a citation opens the document instead of a bare numbered entry.
//
// Honest failures: when a file cannot be signed, or the source row is gone, the
// reason is returned and shown; nothing falls back to a different document.

const BUCKET = "brand-assets";
const SIGNED_TTL = 60 * 60;

type QueryResult = { data: unknown; error: unknown };
interface QB extends PromiseLike<QueryResult> {
  select: (cols?: string) => QB;
  eq: (col: string, val: unknown) => QB;
  maybeSingle: () => Promise<QueryResult>;
}
export type OracleSourceClient = {
  from: (t: string) => QB;
  storage: {
    from: (b: string) => {
      createSignedUrl: (
        path: string,
        expires: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
};

export type OracleSourceFile = {
  url: string;
  filename: string;
  kind: "pdf" | "image" | "other";
};

export type OracleSourceDoc = {
  ok: true;
  id: string;
  /** Where the cited text came from. */
  source: "asset" | "oracle" | "kb" | "event" | "glossary" | "brand-intel";
  title: string;
  subtitle?: string;
  meta: Array<{ label: string; value: string }>;
  /** Full text of the record / extracted document text. */
  body: string;
  /** The exact passage that was cited, when the citation was a chunk. */
  excerpt?: string;
  file?: OracleSourceFile;
  /** Plain-English reason there is no openable file. */
  fileNote?: string;
  /** In-app page for this record, when it has one. */
  href?: string;
};

export type OracleSourceResult = OracleSourceDoc | { ok: false; error: string };

// Many stored documents carry no extension (print-library paths) or a cache-
// busting query on the URL, so the record's own `kind` is the fallback — without
// it a real PDF opened as a bare "open in a new tab" link.
function fileKind(target: string, kind?: string | null): OracleSourceFile["kind"] {
  const ext = (target.split(/[?#]/)[0] ?? "").toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"].includes(ext)) return "image";
  const k = (kind ?? "").toLowerCase();
  if (["pdf", "brochure", "guide"].includes(k)) return "pdf";
  if (["image", "logo"].includes(k)) return "image";
  return "other";
}

type AssetRow = {
  id: string;
  title: string;
  description: string | null;
  kind: string | null;
  division_id: string | null;
  source_filename: string | null;
  storage_path: string | null;
  url: string | null;
  extracted_text: string | null;
  updated_at: string | null;
};

async function loadAsset(
  s: OracleSourceClient,
  assetId: string,
): Promise<{ row: AssetRow | null; file?: OracleSourceFile; fileNote?: string }> {
  const { data } = await s
    .from("brand_assets")
    .select(
      "id, title, description, kind, division_id, source_filename, storage_path, url, extracted_text, updated_at",
    )
    .eq("id", assetId)
    .maybeSingle();
  const row = (data ?? null) as AssetRow | null;
  if (!row) return { row: null, fileNote: "The document record for this citation no longer exists." };

  const filename = row.source_filename ?? `${row.title}`;
  if (row.storage_path) {
    const { data: signed, error } = await s.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_TTL);
    const url = signed?.signedUrl;
    if (url)
      return { row, file: { url, filename, kind: fileKind(row.storage_path, row.kind) } };
    return {
      row,
      fileNote: `The stored file could not be opened: ${String(
        (error as { message?: string } | null)?.message ?? "no link was returned",
      )}. The extracted text below is still the cited source.`,
    };
  }
  if (row.url) {
    return { row, file: { url: row.url, filename, kind: fileKind(row.url, row.kind) } };
  }
  return {
    row,
    fileNote: "This source was added as text only — there is no original file to open.",
  };
}

export async function resolveOracleSource(
  s: OracleSourceClient,
  id: string,
): Promise<OracleSourceResult> {
  const sep = id.indexOf(":");
  const prefix = sep === -1 ? "" : id.slice(0, sep);
  const key = sep === -1 ? "" : id.slice(sep + 1);
  if (!prefix || !key) return { ok: false, error: `Unrecognised citation reference “${id}”.` };

  // ── Brand document chunk: the citation is a passage of a real file ──
  if (prefix === "asset") {
    const { data: chunkData } = await s
      .from("brand_asset_chunks")
      .select("id, asset_id, content, chunk_index, division_id, source_type")
      .eq("id", key)
      .maybeSingle();
    const chunk = (chunkData ?? null) as {
      id: string;
      asset_id: string;
      content: string | null;
      chunk_index: number | null;
      division_id: string | null;
      source_type: string | null;
    } | null;
    if (!chunk) return { ok: false, error: "That cited passage is no longer in the knowledge base." };
    const { row, file, fileNote } = await loadAsset(s, chunk.asset_id);
    const meta: Array<{ label: string; value: string }> = [];
    if (row?.kind) meta.push({ label: "Type", value: row.kind });
    if (row?.division_id ?? chunk.division_id)
      meta.push({ label: "Division", value: String(row?.division_id ?? chunk.division_id) });
    if (row?.source_filename) meta.push({ label: "File", value: row.source_filename });
    if (typeof chunk.chunk_index === "number")
      meta.push({ label: "Passage", value: `#${chunk.chunk_index + 1}` });
    if (row?.updated_at) meta.push({ label: "Updated", value: row.updated_at.slice(0, 10) });
    return {
      ok: true,
      id,
      source: "asset",
      title: row?.title ?? "Brand document",
      subtitle: row?.description ?? undefined,
      meta,
      body: row?.extracted_text ?? chunk.content ?? "",
      excerpt: chunk.content ?? undefined,
      file,
      fileNote,
    };
  }

  // ── Oracle store row: mirrored documents link back to their file ──
  if (prefix === "oracle") {
    const { data } = await s
      .from("oracle_knowledge_base")
      .select(
        "id, title, content, category, tags, source_type, source_entity_id, source_entity_type, updated_at",
      )
      .eq("id", key)
      .maybeSingle();
    const row = (data ?? null) as {
      id: string;
      title: string;
      content: string | null;
      category: string | null;
      tags: string[] | null;
      source_type: string | null;
      source_entity_id: string | null;
      source_entity_type: string | null;
      updated_at: string | null;
    } | null;
    if (!row) return { ok: false, error: "That knowledge record has been removed." };
    let file: OracleSourceFile | undefined;
    let fileNote: string | undefined;
    let body = row.content ?? "";
    if (row.source_entity_type === "brand_asset" && row.source_entity_id) {
      const loaded = await loadAsset(s, row.source_entity_id);
      file = loaded.file;
      fileNote = loaded.fileNote;
      if ((loaded.row?.extracted_text ?? "").length > body.length)
        body = loaded.row?.extracted_text ?? body;
    } else {
      fileNote = "This is a written knowledge record, not an uploaded file.";
    }
    const meta: Array<{ label: string; value: string }> = [];
    if (row.category) meta.push({ label: "Division", value: row.category });
    if (row.source_type) meta.push({ label: "Source", value: row.source_type });
    if (row.tags?.length) meta.push({ label: "Tags", value: row.tags.slice(0, 8).join(", ") });
    if (row.updated_at) meta.push({ label: "Updated", value: row.updated_at.slice(0, 10) });
    return { ok: true, id, source: "oracle", title: row.title, meta, body, file, fileNote };
  }

  // ── Editable knowledge entry ──
  if (prefix === "kb") {
    const { data } = await s
      .from("knowledge_entries")
      .select("id, title, body, kind, owner_division_id, tags, sources, visibility, updated_at")
      .eq("id", key)
      .maybeSingle();
    const row = (data ?? null) as {
      id: string;
      title: string;
      body: string | null;
      kind: string | null;
      owner_division_id: string | null;
      tags: string[] | null;
      sources: unknown;
      visibility: string | null;
      updated_at: string | null;
    } | null;
    if (!row) return { ok: false, error: "That knowledge entry has been removed." };
    const meta: Array<{ label: string; value: string }> = [];
    if (row.kind) meta.push({ label: "Kind", value: row.kind });
    if (row.owner_division_id) meta.push({ label: "Division", value: row.owner_division_id });
    if (row.visibility) meta.push({ label: "Visibility", value: row.visibility });
    if (row.tags?.length) meta.push({ label: "Tags", value: row.tags.slice(0, 8).join(", ") });
    if (row.updated_at) meta.push({ label: "Updated", value: row.updated_at.slice(0, 10) });
    const refs = Array.isArray(row.sources)
      ? (row.sources as unknown[]).map((x) => String(x)).filter(Boolean)
      : [];
    if (refs.length) meta.push({ label: "References", value: refs.slice(0, 4).join(" · ") });
    return {
      ok: true,
      id,
      source: "kb",
      title: row.title,
      meta,
      body: row.body ?? "",
      fileNote: "This is a written knowledge entry, not an uploaded file.",
      href: `/knowledge/${row.id}`,
    };
  }

  // ── Event / venue knowledge ──
  if (prefix === "event") {
    const { data } = await s
      .from("event_venue_knowledge")
      .select(
        "id, title, body, kind, city, venue, event_id, panel_id, template_family_id, source, updated_at",
      )
      .eq("id", key)
      .maybeSingle();
    const row = (data ?? null) as {
      id: string;
      title: string;
      body: string | null;
      kind: string | null;
      city: string | null;
      venue: string | null;
      event_id: string | null;
      panel_id: string | null;
      template_family_id: string | null;
      source: string | null;
      updated_at: string | null;
    } | null;
    if (!row) return { ok: false, error: "That event knowledge record has been removed." };
    const meta: Array<{ label: string; value: string }> = [];
    if (row.kind) meta.push({ label: "Kind", value: row.kind });
    if (row.city) meta.push({ label: "City", value: row.city });
    if (row.venue) meta.push({ label: "Venue", value: row.venue });
    if (row.event_id) meta.push({ label: "Event", value: row.event_id });
    if (row.panel_id) meta.push({ label: "Panel", value: row.panel_id });
    if (row.template_family_id) meta.push({ label: "Family", value: row.template_family_id });
    if (row.source) meta.push({ label: "Recorded from", value: row.source });
    if (row.updated_at) meta.push({ label: "Updated", value: row.updated_at.slice(0, 10) });
    return {
      ok: true,
      id,
      source: "event",
      title: row.title,
      meta,
      body: row.body ?? "",
      fileNote: "Event knowledge is recorded as a note, not an uploaded file.",
    };
  }

  // ── Translation glossary term ──
  if (prefix === "glossary") {
    const { data } = await s
      .from("glossary_terms")
      .select("id, term, notes, do_not_translate, translations, scope, scope_id, updated_at")
      .eq("id", key)
      .maybeSingle();
    const row = (data ?? null) as {
      id: string;
      term: string;
      notes: string | null;
      do_not_translate: boolean | null;
      translations: unknown;
      scope: string | null;
      scope_id: string | null;
      updated_at: string | null;
    } | null;
    if (!row) return { ok: false, error: "That glossary term has been removed." };
    const meta: Array<{ label: string; value: string }> = [
      {
        label: "Rule",
        value: row.do_not_translate ? "Never translate" : "Approved terminology",
      },
    ];
    if (row.scope) meta.push({ label: "Scope", value: row.scope_id ?? row.scope });
    if (row.updated_at) meta.push({ label: "Updated", value: row.updated_at.slice(0, 10) });
    const pairs =
      row.translations && typeof row.translations === "object"
        ? Object.entries(row.translations as Record<string, unknown>)
            .map(([lang, v]) => `${lang}: ${String(v)}`)
            .slice(0, 40)
        : [];
    return {
      ok: true,
      id,
      source: "glossary",
      title: row.term,
      meta,
      body: [row.notes ?? "", pairs.length ? `\n\nApproved renderings\n${pairs.join("\n")}` : ""]
        .join("")
        .trim(),
      fileNote: "Glossary terms are managed in the translation library.",
      href: "/admin/translation",
    };
  }

  // ── Brand intelligence ──
  if (prefix === "bi") {
    const { data } = await s
      .from("brand_intelligence")
      .select(
        "id, entity_type, entity_id, brand_summary, market_position, competitive_advantages, target_audience, updated_at",
      )
      .eq("id", key)
      .maybeSingle();
    const row = (data ?? null) as {
      id: string;
      entity_type: string | null;
      entity_id: string | null;
      brand_summary: string | null;
      market_position: string | null;
      competitive_advantages: unknown;
      target_audience: unknown;
      updated_at: string | null;
    } | null;
    if (!row) return { ok: false, error: "That brand intelligence record has been removed." };
    const list = (v: unknown) =>
      Array.isArray(v) ? v.map((x) => `• ${String(x)}`).join("\n") : v ? String(v) : "";
    const meta: Array<{ label: string; value: string }> = [];
    if (row.entity_type) meta.push({ label: "Entity", value: row.entity_type });
    if (row.updated_at) meta.push({ label: "Updated", value: row.updated_at.slice(0, 10) });
    return {
      ok: true,
      id,
      source: "brand-intel",
      title: `Brand intelligence: ${row.entity_type ?? "record"}`,
      meta,
      body: [
        row.brand_summary,
        row.market_position ? `\nMarket position\n${row.market_position}` : "",
        list(row.competitive_advantages)
          ? `\nCompetitive advantages\n${list(row.competitive_advantages)}`
          : "",
        list(row.target_audience) ? `\nTarget audience\n${list(row.target_audience)}` : "",
      ]
        .filter(Boolean)
        .join("\n")
        .trim(),
      fileNote: "Brand intelligence is generated analysis, not an uploaded file.",
    };
  }

  return { ok: false, error: `Unrecognised citation reference “${id}”.` };
}
