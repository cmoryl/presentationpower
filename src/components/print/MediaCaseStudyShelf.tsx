import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Copy, FileText, X } from "lucide-react";

import { CaseStudyLayout } from "@/components/print/CaseStudyLayout";
import { createPrintAsset } from "@/lib/print-assets.functions";
import {
  MEDIA_CASE_STUDIES,
  MEDIA_DIVISION_ID,
  type MediaCaseStudySeed,
} from "@/lib/print-library/media-case-studies";
import type { BrandMode } from "@/lib/taxonomy";

export function MediaCaseStudyShelf({ brandModes }: { brandModes: BrandMode[] }) {
  const media = brandModes.find((b) => b.id === MEDIA_DIVISION_ID);
  const [open, setOpen] = useState<MediaCaseStudySeed | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const createFn = useServerFn(createPrintAsset);
  const navigate = useNavigate();

  if (!media) return null;

  const makeCopy = async (seed: MediaCaseStudySeed) => {
    setBusy(seed.slug);
    try {
      const row = await createFn({
        data: {
          kind: "case-study",
          title: seed.title,
          brandModeId: MEDIA_DIVISION_ID,
          content: seed.content as unknown as Record<string, unknown>,
          context: {
            sourceLibrary: "media-case-studies",
            sourceSlug: seed.slug,
            sourceFile: seed.sourceFile,
          } as unknown as Record<string, unknown>,
        },
      });
      toast.success("Editable copy created");
      void navigate({ to: "/asset/$assetId", params: { assetId: row.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create a copy");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-14">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-black/50">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
              style={{ background: media.tokens.accent }}
            />
            {media.name} · Case study library
          </div>
          <h2 className="mt-1 text-xl font-semibold text-[#03002C]">
            {MEDIA_CASE_STUDIES.length} recreated case studies.
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-black/55">
            Rebuilt from the legacy Media PDFs on the live Case Study template — copy, stats,
            quotes, and hero imagery carried across. Create an editable copy to customize one.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {MEDIA_CASE_STUDIES.map((seed) => (
          <article
            key={seed.slug}
            className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:border-[#EC388A]/50 hover:shadow-md"
          >
            <div className="relative h-40 overflow-hidden bg-[#03002C]">
              {seed.content.heroMedia?.imageUrl ? (
                <img
                  src={seed.content.heroMedia.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  style={{
                    objectPosition: `${seed.content.heroMedia.focalX ?? 50}% ${seed.content.heroMedia.focalY ?? 50}%`,
                  }}
                />
              ) : null}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${media.tokens.primary}00 35%, ${media.tokens.primary}D9 100%)`,
                }}
              />
              <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#03002C]">
                <FileText size={11} /> Case study
              </div>
              <h3 className="absolute inset-x-3 bottom-3 line-clamp-2 text-sm font-semibold leading-tight text-white">
                {seed.title}
              </h3>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <p className="line-clamp-3 text-xs leading-relaxed text-black/60">{seed.teaser}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {seed.content.stats.slice(0, 3).map((s, i) => (
                  <span
                    key={`${s.label}-${i}`}
                    className="inline-flex items-baseline gap-1 rounded-full border border-black/10 bg-black/[0.02] px-2 py-0.5 text-[10px] text-black/60"
                  >
                    <strong className="text-[11px] font-semibold text-[#03002C]">
                      {s.value}
                      {s.unit ?? ""}
                    </strong>
                    {s.label}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(seed)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-[#EC388A] hover:text-[#EC388A]"
                >
                  Preview
                </button>
                <button
                  type="button"
                  disabled={busy === seed.slug}
                  onClick={() => void makeCopy(seed)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]/85 disabled:opacity-60"
                >
                  <Copy size={12} /> {busy === seed.slug ? "Creating…" : "Editable copy"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${open.title} preview`}
          onClick={() => setOpen(null)}
        >
          <div
            className="relative w-full max-w-[1100px] rounded-2xl bg-[#f5f5f2] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header so the close/action row stays reachable */}
            <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-5 flex items-start justify-between gap-6 rounded-t-2xl bg-[#f5f5f2]/95 px-6 pb-4 pt-6 backdrop-blur">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-black/50">
                  {media.name} · Case study
                </div>
                <h2 className="mt-1 text-2xl font-semibold text-[#03002C]">{open.title}</h2>
                <p className="mt-1 text-xs text-black/45">Recreated from {open.sourceFile}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy === open.slug}
                  onClick={() => void makeCopy(open)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]/85 disabled:opacity-60"
                >
                  Create editable copy <ArrowRight size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label="Close preview"
                  className="rounded-full border border-black/15 bg-white p-2 text-icon-muted hover:border-black/40"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
              <CaseStudyLayout
                content={open.content}
                brand={media}
                mode="light"
                pageSize="Letter"
                density="standard"
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
