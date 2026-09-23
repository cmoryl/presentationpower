// Server-only: web search + page reading (Firecrawl) and AI extraction of venue
// facts into suggestions. Nothing here writes an issued fact — every finding
// comes back as a suggestion with its source link.

import { EVENT_INTAKE_ITEMS, RESEARCH_MAX_PAGES, venueResearchQueries } from "./event-intake";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

export type ResearchFinding = {
  item_key: string;
  label: string;
  value: string;
  source_url: string;
  source_title: string | null;
};

type Page = { url: string; title: string; text: string };

async function firecrawlSearch(query: string, limit: number): Promise<Page[]> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) throw new Error("Online research isn't set up yet (web search key missing).");
  const res = await fetch(`${FIRECRAWL_V2}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  const body = await res.text();
  if (res.status === 402) throw new Error("Web search is out of credits, so research can't run right now.");
  if (!res.ok) throw new Error(`Web search failed [${res.status}]: ${body.slice(0, 300)}`);
  const json = JSON.parse(body) as {
    data?: { web?: unknown[] } | unknown[];
  };
  const raw = Array.isArray(json.data) ? json.data : ((json.data as { web?: unknown[] })?.web ?? []);
  return (raw as Array<Record<string, unknown>>)
    .map((r) => ({
      url: String(r["url"] ?? ""),
      title: String(r["title"] ?? (r["metadata"] as { title?: string } | undefined)?.title ?? ""),
      text: String(r["markdown"] ?? r["description"] ?? "").slice(0, 12_000),
    }))
    .filter((p) => /^https?:\/\//.test(p.url));
}

/** Read an SSE stream from the Responses API and return the final output text. */
async function responsesText(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data) as { type?: string; delta?: string };
        if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta;
      } catch {
        /* ignore keep-alives */
      }
    }
  }
  return out;
}

const FINDING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["item_key", "label", "value", "source_url"],
        properties: {
          item_key: { type: "string", enum: EVENT_INTAKE_ITEMS.filter((i) => i.researchable).map((i) => i.key) },
          label: { type: "string" },
          value: { type: "string" },
          source_url: { type: "string" },
        },
      },
    },
  },
} as const;

async function extractFindings(venue: string, city: string, pages: Page[]): Promise<ResearchFinding[]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI isn't configured for this app.");
  const sources = pages
    .map((p, n) => `SOURCE ${n + 1}\nURL: ${p.url}\nTITLE: ${p.title}\n${p.text}`)
    .join("\n\n---\n\n");
  const instructions = [
    `You help an event designer prepare venue maps for "${venue}" in ${city}.`,
    "From the sources, list facts that help build floor maps: room names (with floor and capacity when stated), the venue's official name and full address, links to floor-plan PDFs or images, and the venue logo URL.",
    "Rules: copy facts exactly as written; never guess or combine sources into a new fact; every finding must cite the URL of the one source it came from; skip anything about a different venue; if nothing is found return an empty list.",
    "item_key: floor_plans (a link to a plan file or page), room_list (one finding per room, value like 'Room name — floor — capacity'), venue_facts (name, address, dates), venue_logo (logo URL).",
  ].join("\n");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions,
      input: [{ role: "user", content: [{ type: "input_text", text: sources }] }],
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "venue_findings", strict: true, schema: FINDING_SCHEMA } },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 402) throw new Error("AI credits have run out — top up in Settings → Plans & credits.");
    throw new Error(`AI request failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  const text = await responsesText(res);
  let parsed: { findings?: Array<Omit<ResearchFinding, "source_title">> } = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const known = new Map(pages.map((p) => [p.url, p.title]));
  return (parsed.findings ?? [])
    // A finding must cite one of the pages actually read.
    .filter((f) => known.has(f.source_url) && f.value.trim())
    .slice(0, 60)
    .map((f) => ({
      item_key: f.item_key,
      label: f.label.slice(0, 200),
      value: f.value.slice(0, 1000),
      source_url: f.source_url,
      source_title: known.get(f.source_url) || null,
    }));
}

export async function researchVenueOnline(venue: string, city: string) {
  const seen = new Set<string>();
  const pages: Page[] = [];
  const queries = venueResearchQueries(venue, city);
  for (const q of queries) {
    for (const p of await firecrawlSearch(q, RESEARCH_MAX_PAGES)) {
      if (seen.has(p.url) || pages.length >= RESEARCH_MAX_PAGES * 2) continue;
      seen.add(p.url);
      pages.push(p);
    }
  }
  if (!pages.length) return { queries, findings: [] as ResearchFinding[], pagesRead: 0 };
  const findings = await extractFindings(venue, city, pages);
  return { queries, findings, pagesRead: pages.length };
}

export async function runResearch(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  id: string,
  venue: string,
  city: string,
) {
  const result = await researchVenueOnline(venue, city);
  if (result.findings.length) {
    const { error } = await supabase.from("event_venue_research").insert(
      result.findings.map((f) => ({
        ...f,
        event_id: id,
        status: "suggested",
        query: result.queries.join(" | "),
        created_by: userId,
      })),
    );
    if (error) throw new Error(error.message);
    // Researchable items that were missing now show "found online", never "received".
    const keys = [...new Set(result.findings.map((f) => f.item_key))];
    const { data: rows } = await supabase
      .from("event_intake_items")
      .select("item_key,status")
      .eq("event_id", id);
    const current = new Map((rows ?? []).map((r) => [r.item_key, r.status]));
    const upgrades = keys
      .filter((k) => (current.get(k) ?? "missing") === "missing")
      .map((k) => ({ event_id: id, item_key: k, status: "found_online", updated_by: userId }));
    if (upgrades.length)
      await supabase.from("event_intake_items").upsert(upgrades, { onConflict: "event_id,item_key" });
  }
  return { found: result.findings.length, pagesRead: result.pagesRead };
}

