// San Juan Bowl social template studio — live, on-brand social designs
// rendered in the browser and downloadable at exact native sizes. Shared by
// the app route (/events/san-juan-bowl/social) and the public share route
// (/share/san-juan-bowl/social). Copy defaults come from announced event
// facts only; scene photographs are AI visualisations, never venue photos.

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { ArrowLeft, Download, ExternalLink, ImageDown, Loader2, Package } from "lucide-react";

import { SjbLink, SjbShell } from "@/components/events/SjbShare";
import { SJB_EVENT, SJB_LOGOS } from "@/lib/san-juan-bowl";
import { SJB_FLYER_SCENES } from "@/lib/sign-scene-backgrounds";
import { exportNodeFilter, withExportChrome } from "@/lib/export-chrome-suppress";
import {
  SJB_BRAND_GROUNDS,
  SJB_CANVA_FOLDER_URL,
  SJB_CANVA_STYLE_SETS,
  SJB_SOCIAL_COLORS as C,
  SJB_SOCIAL_FORMATS,
  SJB_SOCIAL_TEMPLATES,
  sjbSocialTemplate,
  type SjbGround,
  type SjbSocialFormat,
  type SjbSocialTemplate,
} from "@/lib/sjb-social-templates";

const NAVY = C.navy;
const SKY = C.sky;
const GOLD = C.gold;
const WHITE = C.white;

type Copy = Record<string, string>;

/** Every ground: the four brand grounds plus the flyer scene photographs. */
const GROUNDS: SjbGround[] = [
  ...SJB_BRAND_GROUNDS,
  ...SJB_FLYER_SCENES.map((s) => ({
    id: `scene:${s.id}`,
    label: s.label,
    kind: "photo" as const,
    photo: s.src,
    logoVariant: "dark" as const,
  })),
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

// ---------------------------------------------------------------------------
// Card renderer — native pixels, scaled only by the preview wrapper.
// ---------------------------------------------------------------------------

function Ground({ ground, format }: { ground: SjbGround; format: SjbSocialFormat }) {
  if (ground.kind === "photo" && ground.photo) {
    return (
      <>
        <img
          src={ground.photo}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Navy veil keeps type and the badge readable on any scene. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, ${NAVY}CC 0%, ${NAVY}99 45%, ${NAVY}E6 100%)`,
          }}
        />
      </>
    );
  }
  if (ground.kind === "light") {
    return <div style={{ position: "absolute", inset: 0, background: WHITE }} />;
  }
  if (ground.kind === "waves") {
    const u = format.height / 1080;
    return (
      <div style={{ position: "absolute", inset: 0, background: NAVY }}>
        <svg
          viewBox="0 0 1000 220"
          preserveAspectRatio="none"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: 220 * u }}
        >
          <path d="M0 120 Q 125 60 250 120 T 500 120 T 750 120 T 1000 120 V 220 H 0 Z" fill={SKY} opacity={0.9} />
          <path d="M0 160 Q 125 105 250 160 T 500 160 T 750 160 T 1000 160 V 220 H 0 Z" fill={SKY} opacity={0.45} />
          <circle cx="500" cy="150" r="46" fill={GOLD} />
        </svg>
      </div>
    );
  }
  if (ground.kind === "gold-band") {
    const u = format.height / 1080;
    return (
      <div style={{ position: "absolute", inset: 0, background: NAVY }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: "38%", height: 14 * u, background: GOLD }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: `calc(38% + ${26 * u}px)`, height: 4 * u, background: SKY }} />
      </div>
    );
  }
  return <div style={{ position: "absolute", inset: 0, background: NAVY }} />;
}

interface CardProps {
  template: SjbSocialTemplate;
  format: SjbSocialFormat;
  copy: Copy;
  ground: SjbGround;
}

/** One social card at native export size. Text is live Geist. */
export function SjbSocialCard({ template, format, copy, ground }: CardProps) {
  // Scale by the smaller edge so wide rows never overflow tall-narrow formats.
  const u = Math.min(format.width, format.height) / 1080;
  const narrow = format.width < 1300;
  const dark = ground.logoVariant === "dark";
  const logo = dark ? SJB_LOGOS[1] : SJB_LOGOS[0];
  const ink = dark ? WHITE : NAVY;
  const sub = dark ? SKY : NAVY;

  const text = (k: string) => copy[k] ?? "";
  const center: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 64 * u,
    gap: 28 * u,
  };
  const headline: React.CSSProperties = {
    fontFamily: "'Geist Variable', Geist, sans-serif",
    fontWeight: 700,
    fontSize: 76 * u,
    lineHeight: 1.04,
    letterSpacing: "-0.01em",
    color: ink,
    margin: 0,
    maxWidth: "88%",
  };
  const detail: React.CSSProperties = {
    fontFamily: "'Geist Variable', Geist, sans-serif",
    fontWeight: 600,
    fontSize: 28 * u,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: sub,
    margin: 0,
  };
  const rule = <div style={{ width: 120 * u, height: 6 * u, background: GOLD, borderRadius: 3 * u }} />;
  const badge = (h: number) => (
    <img src={logo.svg} alt={SJB_EVENT.name} style={{ height: h * u, width: "auto", objectFit: "contain" }} />
  );

  let body: React.ReactNode = null;
  switch (template.id) {
    case "matchup":
      body = (
        <div style={center}>
          <p style={detail}>{SJB_EVENT.name}</p>
          <div
            style={{
              display: "flex",
              flexDirection: narrow ? "column" : "row",
              alignItems: "center",
              gap: (narrow ? 20 : 48) * u,
            }}
          >
            <span style={{ ...headline, fontSize: 92 * u, textTransform: "uppercase" }}>{text("teamA")}</span>
            {badge(narrow ? 170 : 200)}
            <span style={{ ...headline, fontSize: 92 * u, textTransform: "uppercase" }}>{text("teamB")}</span>
          </div>
          {rule}
          <p style={detail}>{text("detail")}</p>
        </div>
      );
      break;
    case "countdown":
      body = (
        <div style={center}>
          {badge(190)}
          <p style={{ ...headline, fontSize: 340 * u, color: GOLD, lineHeight: 1 }}>{text("number")}</p>
          <p style={{ ...detail, fontSize: 40 * u, color: ink }}>{text("label")}</p>
          {rule}
          <p style={detail}>{text("detail")}</p>
        </div>
      );
      break;
    case "final-score":
      body = (
        <div style={center}>
          <p style={{ ...detail, color: GOLD }}>{text("label")}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 56 * u }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 * u }}>
              <span style={{ ...detail, fontSize: 34 * u }}>{text("teamA")}</span>
              <span style={{ ...headline, fontSize: 190 * u, lineHeight: 1 }}>{text("scoreA")}</span>
            </div>
            {badge(170)}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 * u }}>
              <span style={{ ...detail, fontSize: 34 * u }}>{text("teamB")}</span>
              <span style={{ ...headline, fontSize: 190 * u, lineHeight: 1 }}>{text("scoreB")}</span>
            </div>
          </div>
          <p style={detail}>{SJB_EVENT.datesLabel}</p>
        </div>
      );
      break;
    case "quote":
      body = (
        <div style={center}>
          <span style={{ fontFamily: "Geist, sans-serif", fontWeight: 700, fontSize: 160 * u, lineHeight: 0.6, color: GOLD }}>“</span>
          <p style={{ ...headline, fontSize: 60 * u, fontWeight: 600, lineHeight: 1.2 }}>{text("quote")}</p>
          {rule}
          <p style={detail}>{text("attribution")}</p>
          {badge(150)}
        </div>
      );
      break;
    case "save-the-date":
      body = (
        <div style={center}>
          {badge(240)}
          <p style={{ ...detail, color: GOLD }}>{text("headline")}</p>
          <p style={{ ...headline, fontSize: 110 * u }}>{text("date")}</p>
          {rule}
          <p style={detail}>{text("detail")}</p>
        </div>
      );
      break;
    default: // game-day
      body = (
        <div style={center}>
          {badge(300)}
          <p style={headline}>{text("headline")}</p>
          <p style={{ ...detail, fontSize: 34 * u, color: dark ? GOLD : NAVY }}>{text("subline")}</p>
          {rule}
          <p style={detail}>{text("detail")}</p>
        </div>
      );
  }

  return (
    <div
      data-sjb-card={`${template.id}:${format.id}`}
      style={{
        position: "relative",
        width: format.width,
        height: format.height,
        overflow: "hidden",
        background: NAVY,
        flexShrink: 0,
      }}
    >
      <Ground ground={ground} format={format} />
      {body}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scaled preview wrapper — measures its box and zooms the native card to fit.
// ---------------------------------------------------------------------------

function ScaledCard(props: CardProps & { maxWidth: number }) {
  const { format, maxWidth } = props;
  const scale = maxWidth / format.width;
  return (
    <div style={{ width: maxWidth, height: format.height * scale, overflow: "hidden", borderRadius: 10 }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <SjbSocialCard {...props} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Capture + download
// ---------------------------------------------------------------------------

async function captureCard(templateId: string, format: SjbSocialFormat): Promise<Blob | null> {
  const node = document.querySelector<HTMLElement>(`[data-sjb-card="${templateId}:${format.id}"]`);
  if (!node) return null;
  const dataUrl = await withExportChrome(() =>
    toPng(node, {
      includeQueryParams: true,
      width: format.width,
      height: format.height,
      canvasWidth: format.width,
      canvasHeight: format.height,
      pixelRatio: 1,
      cacheBust: true,
      filter: exportNodeFilter,
      style: { transform: "none", width: `${format.width}px`, height: `${format.height}px` },
    }),
  );
  return await (await fetch(dataUrl)).blob();
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------------------------------------------------------------------------
// Studio page
// ---------------------------------------------------------------------------

export function SjbSocialStudio() {
  const [templateId, setTemplateId] = useState(SJB_SOCIAL_TEMPLATES[0].id);
  const [groundId, setGroundId] = useState(GROUNDS[0].id);
  const [copy, setCopy] = useState<Copy>({ ...SJB_SOCIAL_TEMPLATES[0].defaults });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  const template = sjbSocialTemplate(templateId);
  const ground = useMemo(() => GROUNDS.find((g) => g.id === groundId) ?? GROUNDS[0], [groundId]);

  const pickTemplate = (t: SjbSocialTemplate) => {
    setTemplateId(t.id);
    setCopy({ ...t.defaults });
  };

  const downloadOne = async (format: SjbSocialFormat) => {
    setBusy(format.id);
    setError(null);
    try {
      const blob = await captureCard(template.id, format);
      if (!blob) throw new Error("capture failed");
      saveBlob(blob, `sjb-${template.id}-${format.id}-${format.width}x${format.height}.png`);
    } catch {
      setError("That download did not complete — try again.");
    } finally {
      setBusy(null);
    }
  };

  const downloadSet = async () => {
    setBusy("set");
    setError(null);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`sjb-${template.id}`)!;
      for (const f of SJB_SOCIAL_FORMATS) {
        const blob = await captureCard(template.id, f);
        if (blob) folder.file(`sjb-${template.id}-${f.id}-${f.width}x${f.height}.png`, blob);
      }
      folder.file(
        "README.txt",
        `${SJB_EVENT.name} — ${template.name} social set\nExported ${new Date().toISOString()}\nPNG at native sizes for each channel. Scene photographs are AI visualisations, not venue photography.\n`,
      );
      saveBlob(await zip.generateAsync({ type: "blob" }), `sjb-${slug(template.name)}-social-set.zip`);
    } catch {
      setError("The set download did not complete — try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <SjbShell>
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8">
        <SjbLink
          page="kit"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]"
        >
          <ArrowLeft className="h-4 w-4" /> Brand kit
        </SjbLink>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#03002C]/50">
              {SJB_EVENT.name}
            </p>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-[#03002C]">Social templates</h1>
            <p className="mt-1 max-w-2xl text-[15px] text-[#03002C]/70">
              Live Bowl designs for every channel. Pick a template, edit the words, choose a ground,
              and download PNGs at exact native sizes — or open the matching Canva template for
              full design editing.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadSet}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-md bg-[#03002C] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#003FC7] disabled:opacity-60"
          >
            {busy === "set" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            Download set · all {SJB_SOCIAL_FORMATS.length} sizes
          </button>
        </header>

        {/* Canva design versions — 4 styles × 5 sizes in the shared Canva folder */}
        <section aria-labelledby="sjb-canva" className="mt-8 rounded-2xl border border-[#03002C]/12 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="sjb-canva" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#03002C]/50">
              Canva design versions
            </h2>
            <a
              href={SJB_CANVA_FOLDER_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#03002C]/15 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#03002C] hover:border-[#003FC7] hover:text-[#003FC7]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open the Canva folder
            </a>
          </div>
          <p className="mt-2 max-w-2xl text-[13px] text-[#03002C]/65">
            Four art-directed styles with custom football imagery, each generated in all five native
            sizes. Opening a design needs access to the shared Canva account; the live studio below
            stays open to everyone.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SJB_CANVA_STYLE_SETS.map((set) => (
              <div key={set.id} className="rounded-xl border border-[#03002C]/12 p-4">
                <div className="text-[14px] font-bold text-[#03002C]">{set.name}</div>
                <p className="mt-1 text-[12px] leading-snug text-[#03002C]/60">{set.blurb}</p>
                <ul className="mt-3 space-y-1.5">
                  {set.designs.map((d) => {
                    const fmt = SJB_SOCIAL_FORMATS.find((f) => f.id === d.formatId);
                    return (
                      <li key={d.formatId}>
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#003FC7] hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {fmt?.label ?? d.formatId}
                          <span className="font-normal text-[#03002C]/45">
                            {fmt ? `${fmt.width}×${fmt.height}` : ""}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Step 1 — template */}
        <section aria-labelledby="sjb-tpl" className="mt-8">
          <h2 id="sjb-tpl" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#03002C]/50">
            1 · Template
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SJB_SOCIAL_TEMPLATES.map((t) => {
              const on = t.id === templateId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t)}
                  aria-pressed={on}
                  className={`rounded-xl border p-4 text-left transition ${
                    on
                      ? "border-[#003FC7] bg-[#003FC7]/[0.06] ring-1 ring-[#003FC7]/40"
                      : "border-[#03002C]/12 bg-white hover:border-[#003FC7]/40"
                  }`}
                >
                  <div className="text-[15px] font-bold text-[#03002C]">{t.name}</div>
                  <p className="mt-1 text-[13px] text-[#03002C]/65">{t.blurb}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2 — copy */}
        <section aria-labelledby="sjb-copy" className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="sjb-copy" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#03002C]/50">
              2 · Words
            </h2>
            <a
              href={template.canvaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#03002C]/15 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#03002C] hover:border-[#003FC7] hover:text-[#003FC7]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Edit “{template.name}” in Canva
            </a>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {template.fields.map((f) => (
              <label key={f.key} className="rounded-xl border border-[#03002C]/12 bg-white p-3 text-sm">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#03002C]/50">
                  {f.label}
                </span>
                {f.multiline ? (
                  <textarea
                    value={copy[f.key] ?? ""}
                    placeholder={f.placeholder}
                    rows={3}
                    onChange={(e) => setCopy({ ...copy, [f.key]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#03002C]/15 px-2 py-1.5 text-sm"
                  />
                ) : (
                  <input
                    value={copy[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setCopy({ ...copy, [f.key]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#03002C]/15 px-2 py-1.5 text-sm"
                  />
                )}
              </label>
            ))}
          </div>
        </section>

        {/* Step 3 — ground */}
        <section aria-labelledby="sjb-ground" className="mt-8">
          <h2 id="sjb-ground" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#03002C]/50">
            3 · Background
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {SJB_BRAND_GROUNDS.map((g) => (
              <GroundChip key={g.id} ground={g} on={g.id === groundId} onClick={() => setGroundId(g.id)} />
            ))}
          </div>
          <div
            ref={sceneRef}
            className="mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto rounded-xl border border-[#03002C]/12 bg-white p-2 sm:grid-cols-5 lg:grid-cols-8"
          >
            {GROUNDS.filter((g) => g.kind === "photo").map((g) => (
              <button
                key={g.id}
                type="button"
                title={g.label}
                aria-label={g.label}
                aria-pressed={g.id === groundId}
                onClick={() => setGroundId(g.id)}
                className={`overflow-hidden rounded-lg border transition ${
                  g.id === groundId ? "border-[#003FC7] ring-2 ring-[#003FC7]/40" : "border-[#03002C]/10 hover:border-[#003FC7]/40"
                }`}
              >
                <img src={g.photo} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-[#03002C]/55">
            Scene backgrounds are AI visualisations, not venue photography.
          </p>
        </section>

        {/* Step 4 — previews + downloads */}
        <section aria-labelledby="sjb-out" className="mt-10">
          <h2 id="sjb-out" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#03002C]/50">
            4 · Your designs
          </h2>
          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-[#E53D2E]/40 bg-[#E53D2E]/10 px-3 py-2 text-[13px] font-semibold text-[#E53D2E]">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-start gap-6">
            {SJB_SOCIAL_FORMATS.map((f) => (
              <figure key={f.id} className="space-y-2">
                <div className="border border-[#03002C]/12 bg-white p-1.5 shadow-sm" style={{ borderRadius: 12 }}>
                  <ScaledCard
                    template={template}
                    format={f}
                    copy={copy}
                    ground={ground}
                    maxWidth={f.id === "story" ? 220 : f.id === "wide" || f.id === "link" ? 380 : 300}
                  />
                </div>
                <figcaption className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-[#03002C]/65">
                    <span className="block font-semibold text-[#03002C]">{f.label}</span>
                    {f.channel} · {f.width}×{f.height}
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadOne(f)}
                    disabled={busy !== null}
                    aria-label={`Download ${f.label} PNG`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#03002C]/15 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#03002C] hover:bg-[#F2F2F2] disabled:opacity-60"
                  >
                    {busy === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    PNG
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-6 flex items-center gap-2 text-[12px] text-[#03002C]/55">
            <ImageDown className="h-4 w-4" aria-hidden />
            PNGs export at exact native sizes with the approved badge, palette and Geist type — ready to post.
          </p>
        </section>
      </div>
    </SjbShell>
  );
}

function GroundChip({ ground, on, onClick }: { ground: SjbGround; on: boolean; onClick: () => void }) {
  const swatch =
    ground.kind === "light"
      ? WHITE
      : ground.kind === "waves"
        ? `linear-gradient(180deg, ${NAVY} 55%, ${SKY} 55%)`
        : ground.kind === "gold-band"
          ? `linear-gradient(180deg, ${NAVY} 45%, ${GOLD} 45%, ${GOLD} 60%, ${NAVY} 60%)`
          : NAVY;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
        on ? "border-[#003FC7] bg-[#003FC7]/[0.06] text-[#03002C]" : "border-[#03002C]/15 bg-white text-[#03002C]/70 hover:border-[#003FC7]/40"
      }`}
    >
      <span className="h-4 w-4 rounded-full border border-[#03002C]/20" style={{ background: swatch }} />
      {ground.label}
    </button>
  );
}
