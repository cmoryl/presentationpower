// /events/production — Venue print production studio.
//
// The end-to-end path for "the location team sent over their print specs":
// paste or upload the spec sheet, review the parsed item table, pick the event
// look and copy, preview every size live, then deliver one package of press
// PDFs plus Illustrator-openable .ai twins with a manifest.

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  Download,
  FileText,
  Loader2,
  PackageCheck,
  Plus,
  Ruler,
  Trash2,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SocialRenderer } from "@/components/campaigns/SocialRenderer";
import { BRAND_MODES } from "@/lib/taxonomy";
import { EVENT_LOOKS, DEFAULT_EVENT_LOOK_ID } from "@/lib/event-looks";
import {
  blankSpec,
  parseEventSpecSheet,
  specSizeLabel,
  type EventPrintSpec,
  type SpecParseIssue,
} from "@/lib/event-spec-intake";
import { pressGeometryFor, specToFormat, specFamily } from "@/lib/event-print-pipeline";
import {
  deliverEventPrintPackage,
  deliverySummary,
  type DeliveryProgress,
} from "@/lib/event-print-deliver";
import { downloadAssetBlob } from "@/lib/asset-export";
import { runWithExportFeedback, notifyBlocked } from "@/lib/export-feedback";
import { NEXT_EVENT } from "@/lib/next-event";

export const Route = createFileRoute("/events/production")({
  head: () => ({
    meta: [
      { title: "Venue print production · TransPerfect Element" },
      {
        name: "description",
        content:
          "Turn a venue spec sheet into every event print size — press PDFs and Illustrator-ready .ai files with bleed, safe area, and a production manifest.",
      },
      { property: "og:title", content: "Venue print production · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Paste the location team's specs and deliver a complete, on-brand signage package in PDF and AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventProductionPage,
});

const SAMPLE_SHEET = `Hanging banner over main entrance — 120 x 48 in, bleed 1in, 13oz matte vinyl, qty 2
Retractable banner — welcome, qty 4
Step & repeat backdrop — 96 x 96 in, bleed 1 in, tension fabric
Meter board — 1000 x 2000 mm, bleed 5mm, 3mm foamex, x6
Registration foam board — 24 x 36 in, bleed 0.125in
Table runner — 30 x 72 in, bleed 0.5in, dye-sub fabric
Wayfinding sign — 18 x 24 in, qty 12
Floor decal — 900 x 900 mm, anti-slip laminate, qty 8
Event badge — 4.13 x 5.83 in, bleed 0.125in, 350gsm uncoated, qty 400
Lobby digital screen — 1920 x 1080 px, no bleed`;

type EventCopy = { eyebrow: string; title: string; summary: string; cta: string };

function EventProductionPage() {
  const [sheet, setSheet] = useState("");
  const [specs, setSpecs] = useState<EventPrintSpec[]>([]);
  const [issues, setIssues] = useState<SpecParseIssue[]>([]);
  const [parsed, setParsed] = useState(false);

  // Defaults come from the live event record, never a hard-coded past venue.
  const [eventName, setEventName] = useState<string>(NEXT_EVENT.name);
  const [venue, setVenue] = useState(`${NEXT_EVENT.venue}, ${NEXT_EVENT.city}`);
  const [dates, setDates] = useState<string>(NEXT_EVENT.datesLabel);
  // The printed call-to-action wording and the link/QR target are separate:
  // artwork shows the words, the QR resolves the URL.
  const [linkTarget, setLinkTarget] = useState<string>(NEXT_EVENT.registrationUrl);
  const [lookId, setLookId] = useState(DEFAULT_EVENT_LOOK_ID);
  const [brandId, setBrandId] = useState(BRAND_MODES[0]!.id);
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [includeAi, setIncludeAi] = useState(true);
  const [copy, setCopy] = useState<EventCopy>({
    eyebrow: "Welcome to",
    title: "TransPerfect NEXT",
    summary: "Two days of language, technology and the teams behind global growth.",
    cta: NEXT_EVENT.ctaLabel,
  });

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<DeliveryProgress | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const nodes = useRef(new Map<string, HTMLDivElement>());

  const look = useMemo(() => EVENT_LOOKS.find((l) => l.id === lookId) ?? EVENT_LOOKS[0]!, [lookId]);

  const rows = useMemo(
    () =>
      specs.map((spec) => ({
        spec,
        format: specToFormat(spec),
        geometry: pressGeometryFor(spec),
        family: specFamily(spec),
      })),
    [specs],
  );

  const totalPieces = specs.reduce((n, s) => n + s.quantity, 0);

  const parse = useCallback((text: string) => {
    const result = parseEventSpecSheet(text);
    setSpecs(result.specs);
    setIssues(result.issues);
    setParsed(true);
    if (result.specs.length === 0) {
      notifyBlocked(
        "No sizes found in that spec sheet — add a line like “Foam board — 24 x 36 in, bleed 0.125in”.",
      );
    }
  }, []);

  const onUpload = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const text = await file.text().catch(() => "");
      if (!text.trim()) {
        notifyBlocked(
          "That file has no readable text. Paste the spec table instead, or export it as CSV/TXT.",
        );
        return;
      }
      setSheet(text);
      parse(text);
    },
    [parse],
  );

  const updateSpec = (id: string, patch: Partial<EventPrintSpec>) =>
    setSpecs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const deliver = async () => {
    const items = rows
      .map(({ spec, format }) => {
        const node = nodes.current.get(spec.id);
        return node ? { spec, node, width: format.width, height: format.height } : null;
      })
      .filter((i): i is NonNullable<typeof i> => Boolean(i));
    if (items.length === 0) {
      notifyBlocked("Nothing to deliver yet — parse a spec sheet first.");
      return;
    }
    setBusy(true);
    setReceipt(null);
    try {
      const result = await runWithExportFeedback(
        {
          pending: `Generating ${items.length} artwork file${items.length === 1 ? "" : "s"}…`,
          success: "Print package ready",
          successDescription: "PDF, AI and manifest downloaded as one zip.",
          failure: "Print package failed",
        },
        () =>
          deliverEventPrintPackage(items, {
            eventName,
            venue,
            includeAi,
            onProgress: setProgress,
          }),
      );
      downloadAssetBlob(result.blob, result.filename);
      const sum = deliverySummary(result);
      setReceipt(
        `${sum.items} item${sum.items === 1 ? "" : "s"} · ${(sum.pdfBytes / 1_048_576).toFixed(1)} MB of PDF` +
          `${includeAi ? ` + ${(sum.aiBytes / 1_048_576).toFixed(1)} MB of AI` : ""}` +
          (sum.clamped ? ` · ${sum.clamped} item(s) capped at the max raster size` : "") +
          (result.failures.length
            ? ` · ${result.failures.length} item(s) failed: ${result.failures.map((f) => f.label).join(", ")}`
            : ""),
      );
    } catch {
      /* toast already surfaced it */
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <header>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
            <Ruler size={12} /> Venue production
          </div>
          <h1 className="mt-3 break-words text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            Spec sheet in, print package out
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/60">
            Paste what the location team sent. Element reads every size, renders each piece on the
            event look with correct bleed and safe area, and delivers press PDFs plus
            Illustrator-ready <code className="text-xs">.ai</code> files and a production manifest.
          </p>
        </header>

        {/* 1 — intake */}
        <section className="space-y-3 rounded-2xl border border-foreground/10 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList size={16} /> 1 · Venue spec sheet
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSheet(SAMPLE_SHEET);
                  parse(SAMPLE_SHEET);
                }}
                className="min-h-11 rounded-full border border-foreground/20 px-4 text-xs font-medium hover:bg-foreground/5"
              >
                Load example sheet
              </button>
              <label className="min-h-11 cursor-pointer rounded-full border border-foreground/20 px-4 text-xs font-medium leading-[2.75rem] hover:bg-foreground/5">
                Upload .txt / .csv
                <input
                  type="file"
                  accept=".txt,.csv,.tsv,text/plain,text/csv"
                  className="hidden"
                  onChange={(e) => void onUpload(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>
          <textarea
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            rows={8}
            placeholder={
              "Hanging banner — 120 x 48 in, bleed 1in, 13oz vinyl, qty 2\nMeter board — 1000 x 2000 mm, bleed 5mm\nRetractable banner, qty 4"
            }
            className="w-full rounded-xl border border-foreground/15 bg-background p-3 font-mono text-xs leading-relaxed focus:border-foreground/40 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => parse(sheet)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#003FC7] px-5 text-xs font-semibold text-white hover:bg-[#0033a3]"
            >
              <Wand2 size={14} /> Read specs
            </button>
            <button
              type="button"
              onClick={() => setSpecs((p) => [...p, blankSpec(p.length)])}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/20 px-4 text-xs font-medium hover:bg-foreground/5"
            >
              <Plus size={14} /> Add item manually
            </button>
            {parsed && (
              <span className="text-xs text-foreground/55">
                {specs.length} item{specs.length === 1 ? "" : "s"} · {totalPieces} piece
                {totalPieces === 1 ? "" : "s"} to produce
              </span>
            )}
          </div>
          {issues.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              {issues.slice(0, 6).map((iss, i) => (
                <li key={i} className="flex items-start gap-2">
                  <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 break-words">
                    <span className="font-medium">{iss.reason}:</span> {iss.line}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 2 — look + copy */}
        {specs.length > 0 && (
          <section className="space-y-4 rounded-2xl border border-foreground/10 p-4 sm:p-5">
            <h2 className="text-sm font-semibold">2 · Event look and copy</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Event name">
                <input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Venue / location">
                <input value={venue} onChange={(e) => setVenue(e.target.value)} className={INPUT} />
              </Field>
              <Field label="Event look">
                <select
                  value={lookId}
                  onChange={(e) => setLookId(e.target.value)}
                  className={INPUT}
                >
                  {EVENT_LOOKS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Brand">
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className={INPUT}
                >
                  {BRAND_MODES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Eyebrow">
                <input
                  value={copy.eyebrow}
                  onChange={(e) => setCopy({ ...copy, eyebrow: e.target.value })}
                  className={INPUT}
                />
              </Field>
              <Field label="Headline">
                <input
                  value={copy.title}
                  onChange={(e) => setCopy({ ...copy, title: e.target.value })}
                  className={INPUT}
                />
              </Field>
              <Field label="Support line">
                <input
                  value={copy.summary}
                  onChange={(e) => setCopy({ ...copy, summary: e.target.value })}
                  className={INPUT}
                />
              </Field>
              <Field label="Call to action">
                <input
                  value={copy.cta}
                  onChange={(e) => setCopy({ ...copy, cta: e.target.value })}
                  className={INPUT}
                />
              </Field>
              <Field label="Dates">
                <input value={dates} onChange={(e) => setDates(e.target.value)} className={INPUT} />
              </Field>
              <Field label="Link / QR target">
                <input
                  value={linkTarget}
                  onChange={(e) => setLinkTarget(e.target.value)}
                  className={INPUT}
                />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={mode === "dark"}
                  onChange={(e) => setMode(e.target.checked ? "dark" : "light")}
                  className="size-5"
                />
                Dark field artwork
              </label>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeAi}
                  onChange={(e) => setIncludeAi(e.target.checked)}
                  className="size-5"
                />
                Include Illustrator <code>.ai</code> files
              </label>
              <span className="text-foreground/50">Look accent {look.accent}</span>
            </div>
          </section>
        )}

        {/* 3 — item table + live previews */}
        {rows.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">3 · Sizes and previews</h2>
              <button
                type="button"
                onClick={() => void deliver()}
                disabled={busy}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#03002C] px-5 text-xs font-semibold text-white hover:bg-[#03002C]/90 disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {busy
                  ? progress
                    ? `${progress.stage === "package" ? "Packaging" : progress.label} ${progress.done}/${progress.total}`
                    : "Working…"
                  : `Deliver package (${rows.length} file${rows.length === 1 ? "" : "s"})`}
              </button>
            </div>

            {receipt && (
              <p className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
                <PackageCheck size={14} className="mt-0.5 shrink-0" />
                <span className="min-w-0 break-words">{receipt}</span>
              </p>
            )}

            <ul className="space-y-4">
              {rows.map(({ spec, format, geometry, family }) => (
                <li
                  key={spec.id}
                  className="grid gap-4 rounded-2xl border border-foreground/10 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
                >
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-full bg-foreground/5 px-2 py-0.5 font-medium uppercase tracking-wide text-foreground/60">
                        {family.replace("-", " ")}
                      </span>
                      <span className="text-foreground/50">{specSizeLabel(spec)}</span>
                      {geometry.scale < 1 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                          supplied at {Math.round(geometry.scale * 100)}% · print at{" "}
                          {geometry.printAtPct}%
                        </span>
                      )}
                      <span className="text-foreground/45">{geometry.fileDpi} DPI file</span>
                    </div>
                    <input
                      value={spec.label}
                      onChange={(e) => updateSpec(spec.id, { label: e.target.value })}
                      className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm font-medium"
                    />
                    <div className="grid gap-2 sm:grid-cols-5">
                      <NumField
                        label="W (in)"
                        value={spec.widthIn}
                        onChange={(v) => updateSpec(spec.id, { widthIn: v })}
                      />
                      <NumField
                        label="H (in)"
                        value={spec.heightIn}
                        onChange={(v) => updateSpec(spec.id, { heightIn: v })}
                      />
                      <NumField
                        label="Bleed"
                        value={spec.bleedIn}
                        step={0.0625}
                        onChange={(v) => updateSpec(spec.id, { bleedIn: v })}
                      />
                      <NumField
                        label="Safe"
                        value={spec.safeIn}
                        step={0.125}
                        onChange={(v) => updateSpec(spec.id, { safeIn: v })}
                      />
                      <NumField
                        label="Qty"
                        value={spec.quantity}
                        step={1}
                        onChange={(v) =>
                          updateSpec(spec.id, { quantity: Math.max(1, Math.round(v)) })
                        }
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-foreground/50">
                      <span className="inline-flex items-center gap-1">
                        <FileText size={12} /> {spec.substrate ?? "substrate not specified"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSpecs((p) => p.filter((s) => s.id !== spec.id))}
                        className="inline-flex min-h-11 items-center gap-1 text-foreground/55 hover:text-red-600"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start justify-center overflow-hidden rounded-xl bg-foreground/5 p-3">
                    <div
                      ref={(el) => {
                        if (el) nodes.current.set(spec.id, el);
                        else nodes.current.delete(spec.id);
                      }}
                    >
                      <SocialRenderer
                        format={format}
                        brandId={brandId}
                        mode={mode}
                        styleId={look.styleId}
                        copy={{
                          eyebrow: copy.eyebrow,
                          title: copy.title,
                          summary: copy.summary,
                          cta: copy.cta,
                        }}
                        facts={{ registrationUrl: linkTarget }}
                        displayShortEdge={previewShortEdge(format.aspect)}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}

/** Preview scale: fit the long edge inside the review column, whatever the
 *  aspect, so a 120in banner and a badge both sit inside their card. */
function previewShortEdge(aspect: number): number {
  const ratio = Math.max(aspect, 1 / aspect); // long / short
  return Math.max(70, Math.min(210, Math.round(300 / ratio)));
}

const INPUT =
  "w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-foreground/50">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumField({
  label,
  value,
  step = 0.25,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-foreground/50">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-lg border border-foreground/15 bg-background px-2 py-2 text-sm tabular-nums"
      />
    </label>
  );
}
