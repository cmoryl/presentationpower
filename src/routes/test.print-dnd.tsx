/**
 * Public test harness for print template drag-and-drop.
 *
 * NOT linked from the app. Exists so Playwright can drive combinations of
 * shared-module additions, drops, and reorders against the real capacity
 * model + LayoutHealthBanner + PrintSectionsStack renderer — without needing
 * an authenticated Supabase session (the real /asset/:id editor is gated).
 *
 * Query params:
 *   ?template=case-study | spotlight | ebrochure | adaptor-brief
 *
 * Test contract:
 *   - [data-testid=layout-health] with [data-level=ok|warn|block]
 *   - [data-testid=module-list] wraps rows
 *   - [data-testid=module-row-N] per row (0-indexed)
 *   - [data-testid=add-kpi], [data-testid=add-callout], [data-testid=add-bento]
 *   - [data-testid=remove-N] per row
 *   - window.__printDnd = { add, move, remove, get, setTemplate }
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzePrintAsset,
  canAddModule,
  weightForSection,
  type PrintTemplateKind,
} from "@/lib/print-capacity";
import { LayoutHealthBanner } from "@/components/print/LayoutHealthBanner";
import type {
  PrintSection,
  PrintStatsSection,
  PrintStatsVariant,
} from "@/lib/print-assets.types";
import {
  emptyAdaptorBrief,
  emptyCaseStudy,
  emptyEBrochure,
  emptySpotlight,
} from "@/lib/print-assets.types";

const TEMPLATE_KINDS: PrintTemplateKind[] = [
  "case-study",
  "spotlight",
  "ebrochure",
  "adaptor-brief",
];

function isKind(v: string | null | undefined): v is PrintTemplateKind {
  return !!v && (TEMPLATE_KINDS as string[]).includes(v);
}

function makeStats(variantId: PrintStatsVariant, n = 3): PrintStatsSection {
  return {
    id: `s-${Math.random().toString(36).slice(2, 8)}`,
    kind: "stats",
    variantId,
    title: "By the numbers",
    eyebrow: "Impact",
    items: Array.from({ length: n }, (_, i) => ({
      label: `Metric ${i + 1}`,
      value: String(10 + i),
      unit: "%",
    })),
  };
}

function emptyContent(kind: PrintTemplateKind) {
  if (kind === "case-study") return emptyCaseStudy();
  if (kind === "spotlight") return emptySpotlight();
  if (kind === "ebrochure") return emptyEBrochure();
  return emptyAdaptorBrief();
}

import { notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/test/print-dnd")({
  beforeLoad: () => {
    // Playwright fixture only. Does not resolve in production builds.
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Print DnD Harness" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PrintDnDHarness,
});

function PrintDnDHarness() {
  const initialKind = useMemo<PrintTemplateKind>(() => {
    if (typeof window === "undefined") return "case-study";
    const q = new URLSearchParams(window.location.search).get("template");
    return isKind(q) ? q : "case-study";
  }, []);

  const [kind, setKind] = useState<PrintTemplateKind>(initialKind);
  const [modules, setModules] = useState<PrintSection[]>([]);
  const dragFrom = useRef<number | null>(null);

  const content = useMemo(() => {
    const base = emptyContent(kind);
    return { ...(base as unknown as Record<string, unknown>), modules } as
      Parameters<typeof analyzePrintAsset>[1];
  }, [kind, modules]);

  const report = useMemo(() => analyzePrintAsset(kind, content), [kind, content]);
  const gate = canAddModule(kind, modules, 1.6);

  function addVariant(v: PrintStatsVariant, n = 3) {
    setModules((cur) => [...cur, makeStats(v, n)]);
  }
  function removeAt(i: number) {
    setModules((cur) => cur.filter((_, k) => k !== i));
  }
  function moveAt(from: number, to: number) {
    setModules((cur) => {
      if (from < 0 || from >= cur.length || to < 0 || to >= cur.length) return cur;
      const next = [...cur];
      const [m] = next.splice(from, 1);
      if (!m) return cur;
      next.splice(to, 0, m);
      return next;
    });
  }

  // Expose an imperative test hook. Playwright uses page.evaluate to drive
  // deterministic reorders without wrestling with HTML5 DragEvent quirks.
  useEffect(() => {
    (window as unknown as { __printDnd?: unknown }).__printDnd = {
      add: (v: PrintStatsVariant, n?: number) => addVariant(v, n ?? 3),
      remove: (i: number) => removeAt(i),
      move: (from: number, to: number) => moveAt(from, to),
      setTemplate: (k: PrintTemplateKind) => {
        if (isKind(k)) {
          setKind(k);
          setModules([]);
        }
      },
      reset: () => setModules([]),
      get: () => ({
        kind,
        modules: modules.map((m) => ({
          id: m.id,
          variantId: (m as PrintStatsSection).variantId,
          weight: weightForSection(m),
        })),
        report: analyzePrintAsset(kind, {
          ...(emptyContent(kind) as unknown as Record<string, unknown>),
          modules,
        } as Parameters<typeof analyzePrintAsset>[1]),
      }),
    };
    return () => {
      delete (window as unknown as { __printDnd?: unknown }).__printDnd;
    };
  }, [kind, modules]);

  return (
    <main className="min-h-screen bg-white p-6 text-black" data-testid="print-dnd-root" data-template={kind}>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Print DnD Harness</h1>
        <div className="flex gap-1" role="tablist">
          {TEMPLATE_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={k === kind}
              data-testid={`tpl-${k}`}
              onClick={() => {
                setKind(k);
                setModules([]);
              }}
              className={`rounded border px-2 py-1 text-xs ${
                k === kind ? "border-black bg-black text-white" : "border-black/20"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </header>

      <section className="mb-4 max-w-md">
        <LayoutHealthBanner report={report} />
      </section>

      <section className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="add-kpi"
          disabled={!canAddModule(kind, modules, 2.4).ok}
          onClick={() => addVariant("kpi-dashboard-portrait")}
          className="rounded border border-black/20 px-2 py-1 text-xs disabled:opacity-40"
        >
          + KPI Dashboard (2.4pu)
        </button>
        <button
          type="button"
          data-testid="add-callout"
          disabled={!canAddModule(kind, modules, 1.6).ok}
          onClick={() => addVariant("stat-callout-row-portrait")}
          className="rounded border border-black/20 px-2 py-1 text-xs disabled:opacity-40"
        >
          + Callout Row (1.6pu)
        </button>
        <button
          type="button"
          data-testid="add-bento"
          disabled={!canAddModule(kind, modules, 2.0).ok}
          onClick={() => addVariant("stat-bento-portrait")}
          className="rounded border border-black/20 px-2 py-1 text-xs disabled:opacity-40"
        >
          + Bento (2.0pu)
        </button>
        <button
          type="button"
          data-testid="add-callout-overflow"
          onClick={() => addVariant("stat-callout-row-portrait", 8)}
          className="rounded border border-red-400 px-2 py-1 text-xs text-red-600"
        >
          + Overflow (8 items)
        </button>
        <span data-testid="add-gate" data-ok={gate.ok ? "1" : "0"} className="text-xs">
          {gate.ok ? "can-add" : "page-full"}
        </span>
      </section>

      <section
        data-testid="module-list"
        data-count={modules.length}
        className="max-w-md space-y-2"
      >
        {modules.map((m, i) => (
          <div
            key={m.id}
            data-testid={`module-row-${i}`}
            data-variant={(m as PrintStatsSection).variantId}
            draggable
            onDragStart={(e) => {
              dragFrom.current = i;
              e.dataTransfer.effectAllowed = "move";
              try {
                e.dataTransfer.setData("text/plain", String(i));
              } catch {
                /* jsdom */
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const raw = e.dataTransfer.getData("text/plain");
              const from = raw ? Number(raw) : dragFrom.current;
              dragFrom.current = null;
              if (from === null || Number.isNaN(from) || from === i) return;
              moveAt(from, i);
            }}
            className="flex items-center justify-between rounded border border-black/15 px-2 py-1 text-xs"
          >
            <span>
              #{i} — {(m as PrintStatsSection).variantId}
            </span>
            <button
              type="button"
              data-testid={`remove-${i}`}
              onClick={() => removeAt(i)}
              className="rounded px-1 text-red-600"
            >
              remove
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}
