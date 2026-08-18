// LinkedIn banner studio — approved TP corporate/enterprise banner look-and-feel,
// plus procedural generation of new on-brand variants and 1584x396 PNG export.

import { useMemo, useState } from "react";
import { Download, RefreshCw, Sparkles, Check } from "lucide-react";
import {
  APPROVED_BANNERS,
  BANNER_FAMILIES,
  bannerCss,
  exportBannerPng,
  downloadBlob,
  generateBanner,
  LI_BANNER_W,
  LI_BANNER_H,
  type BannerFamily,
  type BannerRecipe,
} from "@/lib/li-banner-gradients";

type Copy = { line1: string; line2: string; wordmark: boolean };

function BannerPreview({
  rec,
  copy,
  className = "",
}: {
  rec: BannerRecipe;
  copy: Copy;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg ${className}`}
      style={{
        aspectRatio: `${LI_BANNER_W} / ${LI_BANNER_H}`,
        background: bannerCss(rec),
        containerType: "inline-size",
      }}
      role="img"
      aria-label={`${rec.name} banner preview`}
    >
      <div className="absolute inset-0 flex flex-col items-end justify-center pr-[4.2%]">
        <div className="text-right leading-[1.06] tracking-[-0.03em]" style={{ fontSize: "3.9cqw" }}>
          {copy.line1 ? (
            <div style={{ color: rec.ink.line1, fontWeight: rec.mode === "dark" ? 500 : 700 }}>
              {copy.line1}
            </div>
          ) : null}
          {copy.line2 ? (
            <div
              style={{
                fontWeight: 700,
                backgroundImage: `linear-gradient(90deg, ${rec.ink.line2From}, ${rec.ink.line2To})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {copy.line2}
            </div>
          ) : null}
          {copy.wordmark ? (
            <div
              className="mt-[0.5em] text-[0.4em] font-semibold tracking-[0.1em]"
              style={{ color: rec.ink.wordmark }}
            >
              TRANS<span className="font-bold">PERFECT</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LinkedInBannerStudio() {
  const [copy, setCopy] = useState<Copy>({
    line1: "Transforming",
    line2: "Global Performance",
    wordmark: true,
  });
  const [generated, setGenerated] = useState<BannerRecipe[]>([]);
  const [family, setFamily] = useState<BannerFamily>("navy-glow");
  const [selectedId, setSelectedId] = useState(APPROVED_BANNERS[0]!.id);
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => [...APPROVED_BANNERS, ...generated], [generated]);
  const selected = all.find((r) => r.id === selectedId) ?? all[0]!;

  const generate = (count = 3) => {
    const next: BannerRecipe[] = [];
    for (let i = 0; i < count; i++) {
      next.push(generateBanner(family, Math.floor(Math.random() * 1_000_000) + 1));
    }
    setGenerated((prev) => [...next, ...prev].slice(0, 24));
    setSelectedId(next[0]!.id);
  };

  const download = async (rec: BannerRecipe, scale = 1) => {
    setBusy(true);
    try {
      const blob = await exportBannerPng(rec, copy, scale);
      downloadBlob(blob, `transperfect-linkedin-banner-${rec.id}${scale > 1 ? `@${scale}x` : ""}.png`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero / active banner */}
      <section className="rounded-2xl border border-black/10 bg-white/80 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
              Active banner · {LI_BANNER_W}×{LI_BANNER_H}
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-[#03002C]">{selected.name}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => download(selected, 1)}
              className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0033a3] disabled:opacity-60"
            >
              <Download size={14} /> Download PNG
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => download(selected, 2)}
              className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-[#03002C] transition hover:border-[#003FC7]/50 disabled:opacity-60"
            >
              @2x
            </button>
          </div>
        </div>

        <BannerPreview rec={selected} copy={copy} className="shadow-[0_18px_50px_-24px_rgba(3,0,44,0.45)]" />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-black/50">
              Line 1
            </span>
            <input
              value={copy.line1}
              onChange={(e) => setCopy((c) => ({ ...c, line1: e.target.value }))}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] outline-none focus:border-[#003FC7]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-black/50">
              Line 2 (accent)
            </span>
            <input
              value={copy.line2}
              onChange={(e) => setCopy((c) => ({ ...c, line2: e.target.value }))}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] outline-none focus:border-[#003FC7]"
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-black/70">
            <input
              type="checkbox"
              checked={copy.wordmark}
              onChange={(e) => setCopy((c) => ({ ...c, wordmark: e.target.checked }))}
              className="size-4 accent-[#003FC7]"
            />
            Show TRANSPERFECT wordmark
          </label>
        </div>
      </section>

      {/* Generator */}
      <section className="rounded-2xl border border-black/10 bg-[#F2F2F2]/70 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
              Expand the set
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
              Generate new banners in the same look
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-black/60">
              {BANNER_FAMILIES.find((f) => f.id === family)?.blurb}
            </p>
          </div>
          <button
            type="button"
            onClick={() => generate(3)}
            className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#003FC7]"
          >
            <Sparkles size={14} /> Generate 3
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {BANNER_FAMILIES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFamily(f.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                family === f.id
                  ? "border-[#003FC7] bg-[#003FC7] text-white"
                  : "border-black/15 bg-white/80 text-[#03002C] hover:border-[#003FC7]/50"
              }`}
            >
              {f.label}
            </button>
          ))}
          {generated.length > 0 ? (
            <button
              type="button"
              onClick={() => setGenerated([])}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white/80 px-3 py-1.5 text-xs text-black/60 hover:border-black/30"
            >
              <RefreshCw size={12} /> Clear {generated.length} generated
            </button>
          ) : null}
        </div>
      </section>

      {/* Library */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4 border-b border-black/10 pb-3">
          <h2 className="text-lg font-semibold text-[#03002C]">
            Banner library
            <span className="ml-2 text-xs font-normal text-black/50">
              {APPROVED_BANNERS.length} approved · {generated.length} generated
            </span>
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {all.map((rec) => (
            <div
              key={rec.id}
              className={`rounded-xl border bg-white/85 p-3 transition ${
                rec.id === selected.id
                  ? "border-[#003FC7] shadow-[0_10px_30px_-16px_rgba(0,63,199,0.5)]"
                  : "border-black/10 hover:border-[#003FC7]/40"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(rec.id)}
                className="block w-full text-left"
                aria-label={`Select ${rec.name}`}
              >
                <BannerPreview rec={rec} copy={copy} />
              </button>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#03002C]">{rec.name}</div>
                  <div className="text-[11px] text-black/50">
                    {rec.family} · {rec.mode}
                    {rec.id.startsWith("gen-") ? " · generated" : " · approved"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {rec.id === selected.id ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#003FC7]">
                      <Check size={12} /> Active
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => download(rec, 1)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-[11px] font-semibold text-[#03002C] transition hover:border-[#003FC7]/60 disabled:opacity-60"
                  >
                    <Download size={12} /> PNG
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
