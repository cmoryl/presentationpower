// Master NEXT event brand kit — shared by the signed-in page and the partner
// share view. `shared` hides editors and internal links.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ExternalLink, Loader2, PencilRuler } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/design-system/element";
import { BrandKitGuideSections, GUIDE_SECTIONS } from "@/components/events/brand-kit/BrandKitGuideSections";
import {
  BRAND_KIT_COLOUR_NOTE,
  BRAND_KIT_PRINT_NOTES,
  BRAND_KIT_VERSION,
  KIT_DIGITAL_FORMATS,
  KIT_DIGITAL_LINKS,
  NEW_CITY_CHECKLIST,
  NEXT_APPLICATION_RULES,
  NEXT_CORE_COLORS,
  NEXT_DIVISIONS,
  NEXT_LOGO_RULES,
  NEXT_MARKS,
  NEXT_TYPOGRAPHY,
  loadKitFamilies,
  type KitFamily,
} from "@/lib/next-brand-kit";

const SECTIONS = [
  ["logos", "Logos & lockups"],
  ["colour", "Colour & type"],
  ["templates", "Sign templates"],
  ["digital", "Digital & slides"],
  ...GUIDE_SECTIONS,
  ["new-city", "Starting a new city"],
] as const;

export function NextBrandKitView({ shared = false }: { shared?: boolean }) {
  const [families, setFamilies] = useState<KitFamily[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [ground, setGround] = useState<"light" | "dark">("light");

  useEffect(() => {
    loadKitFamilies().then(setFamilies).catch(() => setFamilies([]));
  }, []);

  async function download() {
    if (!families) return;
    setBusy("Starting…");
    try {
      const { buildBrandKitZip } = await import("@/lib/next-brand-kit-zip");
      const { blob, filename, missing } = await buildBrandKitZip(families, (d, t) => setBusy(`${d} of ${t}`));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      if (missing.length) toast.warning(`${missing.length} file(s) couldn't be added — see MISSING.txt in the pack.`);
      else toast.success("Brand kit downloaded.");
    } catch (e) {
      toast.error(`Download failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">TransPerfect NEXT</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight">Master event brand kit</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The NEXT look every city starts from: logos, colours, type, sign templates and digital formats. Version {BRAND_KIT_VERSION}.
          </p>
        </div>
        <Button onClick={download} disabled={!families || !!busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
          {busy ? `Building pack ${busy}` : "Download the full kit"}
        </Button>
      </header>

      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
      <nav aria-label="Brand kit sections" className="sticky top-0 z-10 -mx-6 flex gap-4 overflow-x-auto bg-background/95 px-6 py-3 text-sm lg:top-6 lg:mx-0 lg:h-fit lg:flex-col lg:gap-2 lg:px-0 lg:py-8">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="whitespace-nowrap font-medium text-muted-foreground hover:text-foreground">
            {label}
          </a>
        ))}
      </nav>
      <div className="min-w-0">

      <section id="logos" className="mt-8 scroll-mt-16">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Logos & lockups</h2>
          <div role="group" aria-label="Background" className="flex gap-1">
            {(["light", "dark"] as const).map((g) => (
              <Button key={g} size="sm" variant={ground === g ? "default" : "outline"} onClick={() => setGround(g)}>
                {g === "light" ? "Light" : "Dark"} background
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NEXT_DIVISIONS.map((d) => {
            const shown = d.lockups.filter((l) => (ground === "light" ? l.variant === "color" : l.variant !== "color"));
            return (
              <article key={d.id} className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">{d.name}</h3>
                <div className={`mt-3 grid gap-3 rounded-md p-4 ${ground === "light" ? "bg-white" : "bg-[#03002C]"}`}>
                  {shown.map((l) => (
                    <a key={l.src} href={l.src} download title={`${l.lockupLabel} · ${l.variantLabel}`} className="block">
                      <img src={l.src} alt={`${d.name} ${l.lockupLabel} ${l.variantLabel}`} className="mx-auto max-h-16 w-auto object-contain" />
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
          {NEXT_MARKS.map((m) => (
            <article key={m.id} className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold">{m.name}</h3>
              <div className="mt-3 rounded-md bg-[#03002C] p-4">
                <img src={m.src} alt={m.name} className="mx-auto max-h-16 w-auto" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{m.description}</p>
            </article>
          ))}
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {NEXT_LOGO_RULES.map((r) => (
            <li key={r.title} className="text-sm leading-relaxed">
              <span className={`font-semibold ${r.do ? "" : "text-destructive"}`}>{r.do ? "Do" : "Don't"}:</span> {r.title}.{" "}
              <span className="text-muted-foreground">{r.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="colour" className="mt-12 scroll-mt-16">
        <h2 className="text-xl font-semibold">Colour & type</h2>
        <p className="mt-1 text-sm text-muted-foreground">{BRAND_KIT_COLOUR_NOTE}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[...NEXT_CORE_COLORS.map((c) => ({ key: c.name, name: c.name, hex: c.hex, line: `RGB ${c.rgb}` })),
            ...NEXT_DIVISIONS.map((d) => ({ key: d.id, name: d.name, hex: d.accent, line: `CMYK ${d.cmyk} · ${d.pantone}` }))].map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => navigator.clipboard.writeText(c.hex).then(() => toast.success(`${c.hex} copied`))}
              className="overflow-hidden rounded-lg border border-border text-left focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="block h-14" style={{ background: c.hex }} />
              <span className="block p-3">
                <span className="block text-sm font-semibold">{c.name}</span>
                <span className="block font-mono text-xs">{c.hex}</span>
                <span className="block text-xs text-muted-foreground">{c.line}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Type — {NEXT_TYPOGRAPHY.headlineFont}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{NEXT_TYPOGRAPHY.headlineNote}</p>
            <ul className="mt-3 space-y-3">
              {NEXT_TYPOGRAPHY.scale.map((s) => (
                <li key={s.label}>
                  <span className="text-xs text-muted-foreground">{s.label} · {s.sizePx}px · {s.weight}</span>
                  <p style={{ fontSize: Math.min(s.sizePx, 44), fontWeight: s.weight, letterSpacing: s.tracking }} className="leading-tight">
                    {s.sample}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Print</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
              {BRAND_KIT_PRINT_NOTES.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section id="templates" className="mt-12 scroll-mt-16">
        <h2 className="text-xl font-semibold">Sign templates</h2>
        {!families ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading templates…</p>
        ) : (
          families.map((f) => (
            <div key={f.id} className="mt-6">
              <h3 className="text-sm font-semibold">{f.label} <span className="text-muted-foreground">({f.templates.length})</span></h3>
              <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {f.templates.map((t) => (
                  <li key={`${t.divisionId}-${t.code}-${t.format}`} className="rounded-lg border border-border">
                    {t.exampleUrl ? (
                      <img src={t.exampleUrl} alt={t.format} loading="lazy" className="h-40 w-full rounded-t-lg bg-muted object-contain" />
                    ) : null}
                    <div className="p-3">
                      <p className="text-sm font-semibold leading-snug">{t.code} · {t.format}</p>
                      <p className="text-xs text-muted-foreground">{t.divisionName} · {t.size}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {t.downloadUrl ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={t.downloadUrl} download><Download className="size-3.5" aria-hidden /> Master</a>
                          </Button>
                        ) : null}
                        {!shared && t.liveSignId ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to="/events/next/sign-editor/$signId" params={{ signId: t.liveSignId }}>
                              <PencilRuler className="size-3.5" aria-hidden /> Edit
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section id="digital" className="mt-12 scroll-mt-16">
        <h2 className="text-xl font-semibold">Digital & slides</h2>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {KIT_DIGITAL_FORMATS.map((f) => (
            <li key={f.id} className="rounded-md border border-border px-3 py-2">
              <span className="font-medium">{f.label}</span>
              <span className="block text-xs text-muted-foreground">{f.width} × {f.height}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {NEXT_APPLICATION_RULES.map((s) => (
            <div key={s.surface}>
              <h3 className="text-sm font-semibold">{s.surface}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                {s.rules.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          ))}
        </div>
        {!shared ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {KIT_DIGITAL_LINKS.map((l) => (
              <Button key={l.to} asChild variant="outline" size="sm">
                <Link to={l.to}>{l.label} <ExternalLink className="size-3.5" aria-hidden /></Link>
              </Button>
            ))}
            <Button asChild variant="outline" size="sm">
              <a href="/masters/general-slides/looks">Slide masters <ExternalLink className="size-3.5" aria-hidden /></a>
            </Button>
          </div>
        ) : null}
      </section>

      <BrandKitGuideSections shared={shared} />

      <section id="new-city" className="mt-12 scroll-mt-16">
        <h2 className="text-xl font-semibold">Starting a new city</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NEW_CITY_CHECKLIST.map((c, i) => (
            <li key={c.step}>
              <p className="text-xs font-semibold text-muted-foreground">Step {i + 1}</p>
              <p className="text-sm font-semibold">{c.step}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </li>
          ))}
        </ol>
      </section>
      </div>
      </div>
    </div>
  );
}
