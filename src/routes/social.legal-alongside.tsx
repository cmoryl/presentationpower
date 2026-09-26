// /social/legal-alongside — the "You're not on it alone." Legal campaign board.
//
// Sixteen commissioned documentary frames, each with its own headline and
// caption, rendered through nine switchable layout templates and three trims.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Images,
  Download,
  Maximize2,
  Share2,
  X,
} from "lucide-react";
import { AlongsideAd } from "@/components/social/AlongsideAd";
import {
  LEGAL_ALONGSIDE_CONCEPT,
  LEGAL_ALONGSIDE_SCENES,
  LEGAL_ALONGSIDE_SIZES,
  LEGAL_ALONGSIDE_TEMPLATES,
  LEGAL_ALONGSIDE_TEMPLATE_FAMILIES,
  LEGAL_ALONGSIDE_TYPE,
  LEGAL_ALONGSIDE_TYPESETS,
  alongsideSceneType,
  alongsideTemplateLabel,
  applyAlongsideTypeSet,
  type AlongsideTemplateId,
} from "@/lib/social-legal-alongside";

export const Route = createFileRoute("/social/legal-alongside")({
  head: () => ({
    meta: [
      { title: "You're not on it alone · Legal campaign board · TransPerfect Element" },
      {
        name: "description",
        content:
          "Sixteen commissioned documentary frames for the TransPerfect Legal campaign — one expert committed to something hard, one person already in position — with headline, caption and nine switchable layout templates.",
      },
      { property: "og:title", content: "You're not on it alone · Legal campaign board" },
      {
        property: "og:description",
        content:
          "Sixteen documentary frames, sixteen headlines, six layout templates and three trims for the TransPerfect Legal LinkedIn set.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <AlongsideView />
    </AppShell>
  ),
});

function AlongsideView() {
  const [template, setTemplate] = useState<AlongsideTemplateId>("knockout");
  const [sizeId, setSizeId] = useState<string>("linkedin");
  const [typeSet, setTypeSet] = useState<string>("house");
  const [perScene, setPerScene] = useState<Record<string, AlongsideTemplateId>>({});
  const [zoom, setZoom] = useState<string | null>(null);
  // Download settings for the large view: file type, and how many times the
  // trim's own pixel size to render at.
  const [dlFormat, setDlFormat] = useState<"png" | "jpeg">("png");
  const [dlScale, setDlScale] = useState<number>(2);
  const [dlBusy, setDlBusy] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const size = LEGAL_ALONGSIDE_SIZES.find((s) => s.id === sizeId) ?? LEGAL_ALONGSIDE_SIZES[0];

  const zoomIndex = zoom ? LEGAL_ALONGSIDE_SCENES.findIndex((s) => s.id === zoom) : -1;
  const zoomScene = zoomIndex >= 0 ? LEGAL_ALONGSIDE_SCENES[zoomIndex] : null;
  const step = (dir: -1 | 1) => {
    if (zoomIndex < 0) return;
    const next = (zoomIndex + dir + LEGAL_ALONGSIDE_SCENES.length) % LEGAL_ALONGSIDE_SCENES.length;
    setZoom(LEGAL_ALONGSIDE_SCENES[next].id);
  };

  /**
   * Writes the ad exactly as it is set on screen. The capture is taken from an
   * off-screen copy rendered at the trim's true pixel size, so the file is the
   * real 1200x1200 (or x2, x3) artwork rather than a screenshot of a preview box.
   */
  const download = async () => {
    const node = exportRef.current;
    if (!node || !zoomScene) return;
    setDlBusy(true);
    try {
      const { toPng, toJpeg } = await import("html-to-image");
      const opts = {
        pixelRatio: dlScale,
        width: size.w,
        height: size.h,
        cacheBust: true,
        backgroundColor: "#03002C",
      };
      const url =
        dlFormat === "png"
          ? await toPng(node, opts)
          : await toJpeg(node, { ...opts, quality: 0.94 });
      const a = document.createElement("a");
      a.href = url;
      a.download = `tp-legal-${zoomScene.id}-${perScene[zoomScene.id] ?? template}-${size.id}-${dlScale}x.${dlFormat}`;
      a.click();
    } finally {
      setDlBusy(false);
    }
  };

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoom, zoomIndex]);

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 text-xs text-black/50">
        <Link to="/social" className="inline-flex items-center gap-1 hover:text-[#003FC7]">
          <ArrowLeft size={12} /> All playbooks
        </Link>
        <span aria-hidden>·</span>
        <span>{LEGAL_ALONGSIDE_CONCEPT.division}</span>
      </div>

      <header className="rounded-3xl border border-black/10 bg-gradient-to-br from-[#003FC714] via-white/70 to-[#C2A3FF1A] p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
          <Share2 size={12} /> Legal · {LEGAL_ALONGSIDE_CONCEPT.channel}
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#03002C] sm:text-5xl">
          {LEGAL_ALONGSIDE_CONCEPT.line}
        </h1>
        <p className="mt-2 text-xl text-black/70">{LEGAL_ALONGSIDE_CONCEPT.support}</p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/65">
          {LEGAL_ALONGSIDE_CONCEPT.narrative}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {LEGAL_ALONGSIDE_CONCEPT.rules.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7]/25 bg-white/80 px-3 py-1 text-xs text-[#03002C]"
            >
              <Check size={12} className="text-[#003FC7]" /> {r}
            </span>
          ))}
        </div>
      </header>

      <section className="space-y-5">
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
            Design controls
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#03002C]">
            Frames, layouts and sizing formats
          </h2>
          <p className="max-w-2xl text-sm text-black/60">
            Set the look for the whole set with the three choices below. Any single card can be
            switched to a different layout underneath it without changing the rest.
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/75 p-5">
          <div className="grid gap-5 md:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
                1 · Layout
              </span>
              <select
                value={template}
                onChange={(e) => {
                  setTemplate(e.target.value as AlongsideTemplateId);
                  setPerScene({});
                }}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-medium text-[#03002C] hover:border-[#003FC7]/50"
              >
                {LEGAL_ALONGSIDE_TEMPLATE_FAMILIES.map((fam) => (
                  <optgroup key={fam.label} label={fam.label}>
                    {fam.ids.map((id) => (
                      <option key={id} value={id}>
                        {alongsideTemplateLabel(id)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="block text-xs leading-relaxed text-black/55">
                {LEGAL_ALONGSIDE_TEMPLATES.find((t) => t.id === template)?.note}
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
                2 · Size
              </span>
              <select
                value={sizeId}
                onChange={(e) => setSizeId(e.target.value)}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-medium text-[#03002C] hover:border-[#003FC7]/50"
              >
                {["Banner", "Landscape", "Square", "Portrait"].map((group) => (
                  <optgroup key={group} label={group}>
                    {LEGAL_ALONGSIDE_SIZES.filter((s) => s.group === group).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} · {s.w}×{s.h}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="block text-xs leading-relaxed text-black/55">
                Every ad is drawn at {size.w}×{size.h} — the type scales to the shape.
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
                3 · Type treatment
              </span>
              <select
                value={typeSet}
                onChange={(e) => setTypeSet(e.target.value)}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-medium text-[#03002C] hover:border-[#003FC7]/50"
              >
                {LEGAL_ALONGSIDE_TYPESETS.map((ts) => (
                  <option key={ts.id} value={ts.id}>
                    {ts.label}
                  </option>
                ))}
              </select>
              <span className="block text-xs leading-relaxed text-black/55">
                {applyAlongsideTypeSet(LEGAL_ALONGSIDE_TYPE[template], typeSet).note}
              </span>
            </label>
          </div>

          {Object.keys(perScene).length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-black/10 pt-3 text-xs text-black/60">
              <span>
                {Object.keys(perScene).length} card
                {Object.keys(perScene).length === 1 ? "" : "s"} using a different layout to the set.
              </span>
              <button
                type="button"
                onClick={() => setPerScene({})}
                className="font-medium text-[#003FC7] underline-offset-2 hover:underline"
              >
                Put them all back
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {LEGAL_ALONGSIDE_SCENES.map((scene) => {
            const active = perScene[scene.id] ?? template;
            return (
              <article
                key={scene.id}
                className="overflow-hidden rounded-3xl border border-black/10 bg-white/80"
              >
                <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
                      {scene.no} · {scene.pair}
                    </div>
                    <div className="text-base font-semibold text-[#03002C]">{scene.theme}</div>
                  </div>
                  <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] uppercase tracking-widest text-black/55">
                    {LEGAL_ALONGSIDE_TEMPLATES.find((t) => t.id === active)?.label}
                  </span>
                </div>

                <div className="bg-[#F6F7FA] p-5">
                  <button
                    type="button"
                    onClick={() => setZoom(scene.id)}
                    title="Click to view much larger"
                    className="group relative mx-auto block w-full max-w-[560px] cursor-zoom-in overflow-hidden rounded-xl shadow-[0_16px_40px_-22px_rgba(3,0,44,0.45)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
                  >
                    <AlongsideAd
                      scene={scene}
                      template={active}
                      w={size.w}
                      h={size.h}
                      typeSet={typeSet}
                    />
                    <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#03002C]/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-card">
                      <Maximize2 size={11} /> View larger
                    </span>
                  </button>
                </div>

                <div className="space-y-3 px-5 py-4 text-sm">
                  <p className="text-base font-semibold leading-snug text-[#03002C]">
                    {scene.headline}
                  </p>
                  <p className="text-black/70">{scene.caption}</p>
                  <p className="text-xs text-black/45">{scene.craft}</p>
                  <div className="rounded-lg border border-black/10 bg-[#F6F7FA] p-3 text-xs">
                    <div className="font-semibold uppercase tracking-widest text-black/40">
                      Industry read · {scene.buyer}
                    </div>
                    <p className="mt-1.5 text-black/70">
                      <span className="font-semibold text-[#03002C]">Their objection:</span>{" "}
                      {scene.objection}
                    </p>
                    <p className="mt-1.5 text-black/70">
                      <span className="font-semibold text-[#03002C]">What it has to answer:</span>{" "}
                      {scene.answer}
                    </p>
                    <p className="mt-2 border-t border-black/10 pt-2 text-black/70">
                      <span className="font-semibold text-[#03002C]">On the photograph:</span>{" "}
                      {scene.photoObjection}
                    </p>
                    <p className="mt-1.5 text-black/70">
                      <span className="font-semibold text-[#03002C]">Verdict:</span>{" "}
                      {scene.photoVerdict}
                    </p>
                  </div>
                  <p className="text-xs text-black/55">
                    <span className="font-semibold uppercase tracking-widest text-black/40">
                      Type
                    </span>{" "}
                    {typeSet === "house"
                      ? alongsideSceneType(scene.id).why
                      : applyAlongsideTypeSet(LEGAL_ALONGSIDE_TYPE[active], typeSet).note}{" "}
                    Emphasis on “{scene.action}”.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 border-t border-black/10 pt-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-black/40">
                      <Images size={12} /> Layout for this frame
                    </span>
                    <select
                      value={active}
                      onChange={(e) =>
                        setPerScene((prev) => ({
                          ...prev,
                          [scene.id]: e.target.value as AlongsideTemplateId,
                        }))
                      }
                      className="rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-xs font-medium text-[#03002C] hover:border-[#003FC7]/50"
                    >
                      {LEGAL_ALONGSIDE_TEMPLATE_FAMILIES.map((fam) => (
                        <optgroup key={fam.label} label={fam.label}>
                          {fam.ids.map((id) => (
                            <option key={id} value={id}>
                              {alongsideTemplateLabel(id)}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {perScene[scene.id] && perScene[scene.id] !== template ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPerScene((prev) => {
                            const next = { ...prev };
                            delete next[scene.id];
                            return next;
                          })
                        }
                        className="text-xs font-medium text-[#003FC7] underline-offset-2 hover:underline"
                      >
                        Match the set
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          to="/social/legal-refresh"
          className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary dark:bg-primary dark:text-primary-foreground"
        >
          Thorny work directions <ArrowRight size={14} />
        </Link>
        <Link
          to="/social"
          className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-5 py-2 text-sm font-medium text-[#03002C] hover:border-[#003FC7]/50"
        >
          Back to social <ArrowRight size={14} />
        </Link>
      </section>

      {zoomScene && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${zoomScene.no} · ${zoomScene.theme} — large view`}
              className="fixed inset-0 z-[120] flex flex-col bg-[#03002C]/95 p-4 backdrop-blur-sm sm:p-6 dark:bg-card"
              onClick={() => setZoom(null)}
            >
              <div
                className="mx-auto flex h-full w-full max-w-[1500px] flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-white">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      {zoomScene.no} · {zoomScene.pair}
                    </div>
                    <div className="text-lg font-semibold">{zoomScene.theme}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/55">
                      Layout
                      <select
                        value={perScene[zoomScene.id] ?? template}
                        onChange={(e) =>
                          setPerScene((prev) => ({
                            ...prev,
                            [zoomScene.id]: e.target.value as AlongsideTemplateId,
                          }))
                        }
                        className="rounded-lg border border-white/25 bg-transparent px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-white"
                      >
                        {LEGAL_ALONGSIDE_TEMPLATE_FAMILIES.map((fam) => (
                          <optgroup key={fam.label} label={fam.label} className="text-[#03002C]">
                            {fam.ids.map((id) => (
                              <option key={id} value={id} className="text-[#03002C]">
                                {alongsideTemplateLabel(id)}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/55">
                      Size
                      <select
                        value={sizeId}
                        onChange={(e) => setSizeId(e.target.value)}
                        className="rounded-lg border border-white/25 bg-transparent px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-white"
                      >
                        {LEGAL_ALONGSIDE_SIZES.map((s) => (
                          <option key={s.id} value={s.id} className="text-[#03002C]">
                            {s.label} · {s.w}×{s.h}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/55">
                      Type
                      <select
                        value={typeSet}
                        onChange={(e) => setTypeSet(e.target.value)}
                        className="rounded-lg border border-white/25 bg-transparent px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-white"
                      >
                        {LEGAL_ALONGSIDE_TYPESETS.map((ts) => (
                          <option key={ts.id} value={ts.id} className="text-[#03002C]">
                            {ts.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/55">
                      File
                      <select
                        value={dlFormat}
                        onChange={(e) => setDlFormat(e.target.value as "png" | "jpeg")}
                        className="rounded-lg border border-white/25 bg-transparent px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-white"
                      >
                        <option value="png" className="text-[#03002C]">
                          PNG
                        </option>
                        <option value="jpeg" className="text-[#03002C]">
                          JPG
                        </option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/55">
                      Scale
                      <select
                        value={dlScale}
                        onChange={(e) => setDlScale(Number(e.target.value))}
                        className="rounded-lg border border-white/25 bg-transparent px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-white"
                      >
                        {[1, 2, 3].map((n) => (
                          <option key={n} value={n} className="text-[#03002C]">
                            {n}x · {size.w * n}×{size.h * n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={download}
                      disabled={dlBusy}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:border-white/70 disabled:opacity-55"
                    >
                      <Download size={13} /> {dlBusy ? "Preparing…" : "Download"}
                    </button>
                    <span aria-hidden className="mx-1 text-white/25">
                      |
                    </span>
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      aria-label="Previous ad"
                      className="rounded-full border border-white/25 p-2 text-white/80 hover:border-white/60"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      aria-label="Next ad"
                      className="rounded-full border border-white/25 p-2 text-white/80 hover:border-white/60"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom(null)}
                      aria-label="Close large view"
                      className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium text-white/85 hover:border-white/60"
                    >
                      <X size={13} /> Close
                    </button>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
                  <div
                    className="mx-auto w-full shrink-0 overflow-hidden rounded-2xl shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]"
                    style={{
                      aspectRatio: `${size.w} / ${size.h}`,
                      maxWidth: `min(100%, ${Math.round((size.w / size.h) * 74)}vh)`,
                    }}
                  >
                    <AlongsideAd
                      scene={zoomScene}
                      template={perScene[zoomScene.id] ?? template}
                      w={size.w}
                      h={size.h}
                      typeSet={typeSet}
                    />
                  </div>
                </div>

                {/* Off-screen, true-pixel copy used for the download. */}
                <div
                  aria-hidden
                  style={{
                    position: "fixed",
                    left: -100000,
                    top: 0,
                    width: size.w,
                    height: size.h,
                    pointerEvents: "none",
                  }}
                >
                  <div ref={exportRef} style={{ width: size.w, height: size.h }}>
                    <AlongsideAd
                      scene={zoomScene}
                      template={perScene[zoomScene.id] ?? template}
                      w={size.w}
                      h={size.h}
                      typeSet={typeSet}
                    />
                  </div>
                </div>

                <div className="mx-auto max-w-3xl space-y-1 text-center text-white/80">
                  <p className="text-base font-semibold text-white">{zoomScene.headline}</p>
                  <p className="text-sm">{zoomScene.caption}</p>
                  <div className="mt-3 rounded-lg border border-white/15 bg-white/5 p-3 text-xs text-white/75">
                    <div className="font-semibold uppercase tracking-widest text-white/50">
                      Industry read · {zoomScene.buyer}
                    </div>
                    <p className="mt-1.5">
                      <span className="font-semibold text-white">Their objection:</span>{" "}
                      {zoomScene.objection}
                    </p>
                    <p className="mt-1.5">
                      <span className="font-semibold text-white">What it has to answer:</span>{" "}
                      {zoomScene.answer}
                    </p>
                    <p className="mt-2 border-t border-white/15 pt-2">
                      <span className="font-semibold text-white">On the photograph:</span>{" "}
                      {zoomScene.photoObjection}
                    </p>
                    <p className="mt-1.5">
                      <span className="font-semibold text-white">Verdict:</span>{" "}
                      {zoomScene.photoVerdict}
                    </p>
                  </div>
                  <p className="text-xs text-white/50">
                    {zoomScene.craft} · {size.w}×{size.h} ·{" "}
                    {
                      LEGAL_ALONGSIDE_TEMPLATES.find(
                        (t) => t.id === (perScene[zoomScene.id] ?? template),
                      )?.label
                    }{" "}
                    · Arrow keys move between ads, Esc closes.
                  </p>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
