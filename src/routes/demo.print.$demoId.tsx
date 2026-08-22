// /demo/print/$demoId — finished print example.
//
// Mirrors /demo/deck/$demoId for the print surface: hyper-real hero art, the
// real page/module breakdown read from the curated seed, and one button that
// creates (or reopens) a genuine editable print asset through the same server
// functions the print library uses.

import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Printer, Sparkles, FileText } from "lucide-react";


import { AppShell } from "@/components/AppShell";
import { showcaseArt } from "@/lib/showcase-art";
import { getPrintDemo, printDemoItem } from "@/lib/showcase-print";
import { createPrintAsset, findMyPrintAssetForLibraryItem } from "@/lib/print-assets.functions";
import { toEditableContent, editableContextFor } from "@/lib/print-library/editable";
import { applyDivisionSeedToContent } from "@/lib/print-library/division-seed-apply";
import { useDivisionSeed } from "@/lib/division-seeds";
import { printTypeMeta } from "@/lib/print-library/catalog";
import { parseLook } from "@/lib/print-library/look";
import { BRAND_MODES } from "@/lib/taxonomy";
import { ShowcasePrintGallery } from "@/components/showcase/ShowcasePrintGallery";

export const Route = createFileRoute("/demo/print/$demoId")({
  loader: ({ params }) => {
    const def = getPrintDemo(params.demoId);
    if (!def) throw notFound();
    return { name: def.name, blurb: def.blurb, eyebrow: def.eyebrow };
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.eyebrow} · ${loaderData.name} print demo`
      : "Print demo · Element";
    const description =
      loaderData?.blurb ??
      "A finished, production-ready print piece you can open, edit and export.";
    return {
      meta: [
        { title: `${title} · Element` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: PrintDemoPage,
});

type Rec = Record<string, unknown>;

function moduleLabel(m: Rec, index: number): { title: string; sub: string } {
  const kind = typeof m["kind"] === "string" ? (m["kind"] as string) : "section";
  const variant = typeof m["variantId"] === "string" ? (m["variantId"] as string) : "";
  const title =
    (typeof m["title"] === "string" && m["title"]) ||
    (typeof m["eyebrow"] === "string" && m["eyebrow"]) ||
    `${kind} block ${index + 1}`;
  return { title: String(title), sub: variant ? `${kind} · ${variant}` : kind };
}

function PrintDemoPage() {
  const { demoId } = Route.useParams();
  const def = getPrintDemo(demoId);
  const item = def ? printDemoItem(def) : undefined;
  const navigate = useNavigate();
  const createFn = useServerFn(createPrintAsset);
  const findFn = useServerFn(findMyPrintAssetForLibraryItem);
  const seed = useDivisionSeed(item?.divisionId ?? null);
  const [busy, setBusy] = useState(false);

  const modules = useMemo(() => {
    if (!item) return [] as Rec[];
    const content = toEditableContent(item) as Rec | undefined;
    const raw = content?.["modules"];
    return Array.isArray(raw) ? (raw as Rec[]) : [];
  }, [item]);

  const pages = useMemo(() => {
    if (!item) return [] as string[];
    const content = item.content as Rec | undefined;
    const raw = content?.["pages"];
    if (!Array.isArray(raw)) return [];
    return raw.map((p, i) => {
      const rec = (p ?? {}) as Rec;
      const t = rec["title"] ?? rec["label"] ?? rec["kind"];
      return typeof t === "string" ? t : `Page ${i + 1}`;
    });
  }, [item]);

  // Rendered comp inputs: division-seeded content through the real layout, with
  // the master's pinned look & feel so the demo matches the editable copy.
  const previewContent = useMemo(() => {
    if (!item) return null;
    const base = toEditableContent(item);
    return base ? applyDivisionSeedToContent(base, seed) : null;
  }, [item, seed]);

  if (!def || !item) return null;
  const previewLook = parseLook(item.look) ?? {};
  const previewBrand =
    BRAND_MODES.find((b) => b.id === (item.divisionId ?? "bm-enterprise")) ?? BRAND_MODES[0];
  const accent = def.accent;
  const art = showcaseArt(demoId);
  const kindLabel = printTypeMeta(item.kind).label;

  async function open() {
    const base = toEditableContent(item!);
    if (!base) {
      toast.error("This example has no editable content yet.");
      return;
    }
    const content = applyDivisionSeedToContent(base, seed);
    setBusy(true);
    try {
      const existing = await findFn({ data: { libraryItemId: item!.id } });
      if (existing?.id) {
        toast.success("Opening your existing copy");
        void navigate({ to: "/asset/$assetId", params: { assetId: existing.id } });
        return;
      }
      const row = await createFn({
        data: {
          kind: item!.kind,
          title: item!.title,
          brandModeId: item!.divisionId ?? undefined,
          content,
          // Approved demo: the editable copy opens without QA gates.
          context: { ...editableContextFor(item!), demoApproved: true },
        },
      });
      toast.success("Editable copy created");
      void navigate({ to: "/asset/$assetId", params: { assetId: row.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open this example");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/10">
        <img
          src={art.src}
          alt={art.alt}
          width={1536}
          height={1024}
          className="tp-kenburns h-[300px] w-full object-cover sm:h-[440px]"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${accent}F2 0%, ${accent}B0 42%, transparent 88%)`,
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-end gap-3 p-6 sm:p-9">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
            Element · Print demo · {def.eyebrow}
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            {def.name}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/85">{def.blurb}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => void open()}
              disabled={busy}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#03002C] transition hover:bg-white/90 disabled:opacity-60"
            >
              <Sparkles size={15} />
              {busy ? "Opening…" : "Open an editable copy"}
              <ArrowRight size={15} />
            </button>
            <Link
              to="/library/print"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/50 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Browse the print library
            </Link>
          </div>
        </div>
      </div>

      {/* Rendered comps — the real print layout, live from the edited content,
          shown in both light and dark so both finishes are verifiable here. */}
      <section className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <PrintDemoContentEditor
          content={draft}
          onChange={setDraft}
          onReset={() => setDraft(previewContent)}
          dirty={dirty}
          accent={accent}
        />
        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
            <h2 className="min-w-0 truncate text-lg font-semibold tracking-tight">
              Rendered preview {dirty ? "· updated" : ""}
            </h2>
            <span className="shrink-0 text-[11px] uppercase tracking-widest text-black/45 dark:text-white/45">
              Click any page to enlarge
            </span>
          </div>
          <div className="mt-4 space-y-6">
            {(["light", "dark"] as const).map((mode) => (
              <div key={mode}>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                  {mode} version
                </div>
                <ShowcasePrintGallery
                  key={`${mode}-${renderKey}`}
                  kind={item.kind}
                  content={draft}
                  brand={previewBrand}
                  mode={mode}
                  pageSize={previewLook.pageSize}
                  density={previewLook.density}
                  accent={accent}
                />
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {pages.length ? "Every page, already written" : "Every block, already written"}
          </h2>
          <ol className="mt-4 space-y-2">
            {(pages.length
              ? pages.map((p, i) => ({ title: p, sub: `Page ${i + 1}` }))
              : modules.map((m, i) => moduleLabel(m, i))
            ).map((row, i) => (
              <li
                key={`${row.title}-${i}`}
                className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-3.5 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <span
                  className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-semibold text-white"
                  style={{ background: accent }}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[#03002C] dark:text-white">
                    {row.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-black/50 dark:text-white/50">
                    {row.sub}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          {!pages.length && modules.length === 0 ? (
            <p className="mt-3 text-sm text-black/55 dark:text-white/55">
              This piece opens with its authored narrative sections ready to edit.
            </p>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
              Ready to ship
            </div>
            <ul className="mt-3 space-y-2 text-sm text-black/70 dark:text-white/70">
              {def.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-[2px]"
                    style={{ background: accent }}
                  />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 font-medium text-[#03002C] dark:text-white">
              <Printer size={15} /> {def.divisionLabel}
            </div>
            <dl className="mt-3 space-y-1.5 text-[12px] text-black/60 dark:text-white/60">
              <div className="flex justify-between gap-3">
                <dt>Format</dt>
                <dd className="font-medium text-[#03002C] dark:text-white">{kindLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{pages.length ? "Pages" : "Blocks"}</dt>
                <dd className="font-medium text-[#03002C] dark:text-white">
                  {pages.length || modules.length || "—"}
                </dd>
              </div>
              {item.collection ? (
                <div className="flex justify-between gap-3">
                  <dt>Collection</dt>
                  <dd className="font-medium text-[#03002C] dark:text-white">{item.collection}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-black/55 dark:text-white/55">
              {def.pills.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/10"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 font-medium text-[#03002C] dark:text-white">
              <FileText size={15} /> Exports
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-black/60 dark:text-white/60">
              Press-ready PDF (PDF/X-4, bleed and crop marks) plus a layered,
              editable PowerPoint — both generated from this same content.
            </p>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
