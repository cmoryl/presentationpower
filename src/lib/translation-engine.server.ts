// Translation engine implementations. Server-only — never imported by the browser.
//
// Two engines ship:
//   1. `globallink` — TransPerfect GlobalLink (preferred). Enabled only when
//      GLOBALLINK_API_BASE_URL + GLOBALLINK_API_KEY are set.
//   2. `ai` — Lovable AI Gateway fallback (Gemini). Always available so the
//      feature is usable before GlobalLink credentials land.

export type EngineId = "globallink" | "ai";

export type EngineStatus = {
  id: EngineId;
  label: string;
  configured: boolean;
  note?: string;
};

export type TranslationRequest = {
  strings: string[]; // pre-protected source strings
  targetLang: string; // BCP-47-ish code
  sourceLang?: string; // usually 'en'
  humanReview?: boolean; // GlobalLink only
  submitter?: string;
};

export type TranslationResult = {
  translated: string[];
  jobRef?: string;
};

// ---------------------------------------------------------------------------
// Engine detection
// ---------------------------------------------------------------------------

export function hasGlobalLink(): boolean {
  return !!process.env.GLOBALLINK_API_BASE_URL && !!process.env.GLOBALLINK_API_KEY;
}

export function hasLovableAi(): boolean {
  return !!process.env.LOVABLE_API_KEY;
}

export function listEngines(): EngineStatus[] {
  return [
    {
      id: "globallink",
      label: "TransPerfect GlobalLink",
      configured: hasGlobalLink(),
      note: hasGlobalLink()
        ? undefined
        : "Add GLOBALLINK_API_BASE_URL and GLOBALLINK_API_KEY in Project Settings → Secrets.",
    },
    {
      id: "ai",
      label: "AI (Gemini) — fallback",
      configured: hasLovableAi(),
      note: hasLovableAi()
        ? "General-purpose MT via Lovable AI. Use GlobalLink for regulated / brand-critical work."
        : "LOVABLE_API_KEY missing.",
    },
  ];
}

export function resolveEngine(requested?: EngineId): EngineId {
  if (requested === "globallink" && hasGlobalLink()) return "globallink";
  if (requested === "ai" && hasLovableAi()) return "ai";
  if (hasGlobalLink()) return "globallink";
  if (hasLovableAi()) return "ai";
  throw new Error("No translation engine configured. Add GLOBALLINK_API_KEY or LOVABLE_API_KEY.");
}

// ---------------------------------------------------------------------------
// GlobalLink implementation
// ---------------------------------------------------------------------------
//
// The GlobalLink REST API surface varies per tenant. We target the widely
// used GlobalLink Connect / GLNOW endpoint pattern:
//   POST {base}/api/v3/translate
//   body: { source: "en", target: "es", segments: [...], submitter, human }
//   response: { job_ref, segments: [...] }
//
// Tenants that differ can override by pointing GLOBALLINK_API_BASE_URL at
// a proxy. The response shape is normalized below.

async function translateGlobalLink(req: TranslationRequest): Promise<TranslationResult> {
  const base = process.env.GLOBALLINK_API_BASE_URL!.replace(/\/$/, "");
  const key = process.env.GLOBALLINK_API_KEY!;
  const submitter = req.submitter ?? process.env.GLOBALLINK_SUBMITTER;

  const res = await fetch(`${base}/api/v3/translate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
      "x-gl-api-key": key,
    },
    body: JSON.stringify({
      source: req.sourceLang ?? "en",
      target: req.targetLang,
      segments: req.strings,
      submitter,
      human: !!req.humanReview,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GlobalLink ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    job_ref?: string;
    jobRef?: string;
    segments?: string[];
    translations?: string[];
  };
  const translated = json.segments ?? json.translations ?? [];
  if (!Array.isArray(translated) || translated.length !== req.strings.length) {
    throw new Error("GlobalLink returned a mismatched segment count");
  }
  return { translated, jobRef: json.job_ref ?? json.jobRef };
}

// ---------------------------------------------------------------------------
// Lovable AI fallback implementation
// ---------------------------------------------------------------------------

async function translateWithAi(req: TranslationRequest): Promise<TranslationResult> {
  const key = process.env.LOVABLE_API_KEY!;
  const system = [
    "You are a professional translator. Translate each numbered segment from",
    `${req.sourceLang ?? "English"} to the target locale code "${req.targetLang}".`,
    'Preserve every <span translate="no">…</span> tag EXACTLY as-is including its inner text.',
    "Preserve all numbers, dates, product names, and inline HTML.",
    "Do NOT add commentary. Return a JSON array of strings, one per input segment, in the same order.",
    "If a segment is empty, return an empty string.",
  ].join(" ");

  const user = `Segments to translate (JSON array):\n${JSON.stringify(req.strings)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI translation ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content ?? "[]";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Model sometimes wraps in { "translations": [...] } — try that.
    parsed = null;
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? (Object.values(parsed as Record<string, unknown>).find(Array.isArray) as
          | unknown[]
          | undefined)
      : undefined;
  if (!arr || arr.length !== req.strings.length) {
    throw new Error("AI translation returned a mismatched segment count");
  }
  return { translated: arr.map((x) => String(x ?? "")) };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function runTranslation(
  engine: EngineId,
  req: TranslationRequest,
): Promise<TranslationResult> {
  if (req.strings.length === 0) return { translated: [] };
  if (engine === "globallink") return translateGlobalLink(req);
  return translateWithAi(req);
}

/** Batch to keep single provider calls under ~200 segments. */
export async function runTranslationBatched(
  engine: EngineId,
  req: TranslationRequest,
  batchSize = 100,
): Promise<TranslationResult> {
  if (req.strings.length <= batchSize) return runTranslation(engine, req);
  const out: string[] = [];
  let firstJob: string | undefined;
  for (let i = 0; i < req.strings.length; i += batchSize) {
    const slice = req.strings.slice(i, i + batchSize);
    const chunk = await runTranslation(engine, { ...req, strings: slice });
    out.push(...chunk.translated);
    if (!firstJob && chunk.jobRef) firstJob = chunk.jobRef;
  }
  return { translated: out, jobRef: firstJob };
}
