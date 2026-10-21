import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPLIED_KITS, kitFileSize, type KitFile, type SuppliedKit } from "@/lib/supplied-event-kits";

export const Route = createFileRoute("/events/kits/$kitId")({
  loader: ({ params }) => {
    const kit = SUPPLIED_KITS[params.kitId as SuppliedKit["id"]];
    if (!kit) throw notFound();
    return { kitId: kit.id };
  },
  head: ({ params }) => {
    const kit = SUPPLIED_KITS[params.kitId as SuppliedKit["id"]];
    const title = kit ? `${kit.name} brand kit — TransPerfect Element` : "Event brand kit — TransPerfect Element";
    const description = kit
      ? `Supplied logos, colours, typography, brand guide and finished pieces for ${kit.name}.`
      : "Supplied event brand kit.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: KitPage,
});

function FileCard({ f }: { f: KitFile }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-md border border-border bg-card">
      <div className="flex aspect-[4/3] items-center justify-center bg-muted p-3">
        {f.preview ? (
          <img src={f.preview} alt={f.title} loading="lazy" className="max-h-full max-w-full object-contain" />
        ) : (
          <FileText className="h-10 w-10 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-sm font-semibold text-foreground">{f.title}</p>
        <p className="text-xs text-muted-foreground">
          {[f.size, `${f.format} · ${kitFileSize(f.bytes)}`].filter(Boolean).join(" · ")}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-auto self-start">
          <a href={f.file} download>
            <Download className="h-4 w-4" /> Download {f.format}
          </a>
        </Button>
      </div>
    </li>
  );
}

function KitPage() {
  const { kitId } = Route.useLoaderData();
  const kit = SUPPLIED_KITS[kitId];
  const groups = [...new Set(kit.pieces.map((p) => p.group))];
  const other = kit.id === "nexus" ? SUPPLIED_KITS.hackathon : SUPPLIED_KITS.nexus;
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/events/$eventId" params={{ eventId: "nexus-london" }} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> NeXus London ’26
      </Link>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-foreground">{kit.name} brand kit</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{kit.intro}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <a href={kit.guide.file} download>
            <Download className="h-4 w-4" /> Brand guidelines (PDF)
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link to="/events/kits/$kitId" params={{ kitId: other.id }}>{other.name} kit</Link>
        </Button>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">Logos</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{kit.logoNote}</p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {kit.logos.map((l) => {
            const ground = /LightBlueBG/i.test(l.name) ? "bg-[#139DD8]" : /DarkBlueBG|White/i.test(l.name) ? "bg-[#003B71]" : "bg-muted";
            return (
              <li key={l.url} className="overflow-hidden rounded-md border border-border bg-card">
                <div className={`flex h-28 items-center justify-center p-4 ${ground}`}>
                  <img src={l.url} alt={l.name} loading="lazy" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="truncate text-xs text-foreground" title={l.name}>{l.name.replace(/_/g, " ")}</span>
                  <a href={l.url} download className="shrink-0 text-xs font-semibold text-primary hover:underline">{l.format}</a>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold text-foreground">Colours</h2>
          <ul className="mt-4 space-y-3">
            {kit.colours.map((c) => (
              <li key={c.hex} className="flex items-center gap-4">
                <span className="h-14 w-14 shrink-0 rounded-md border border-border" style={{ background: c.hex }} aria-hidden />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">{c.name}</p>
                  <p className="text-muted-foreground">
                    {c.hex} · RGB {c.rgb} · CMYK {c.cmyk} · Pantone {c.pantone}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {kit.gradientNote && <p className="mt-3 text-sm text-muted-foreground">{kit.gradientNote}</p>}
          <p className="mt-2 text-xs text-muted-foreground">Values as printed in the supplied brand guide.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Typography</h2>
          <p className="mt-2 text-sm text-muted-foreground">{kit.typography}</p>
          <h2 className="mt-6 text-xl font-bold text-foreground">Logo don’ts</h2>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {kit.donts.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </div>
      </section>

      {kit.map && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-foreground">Event map</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
            <img src={kit.map.preview ?? ""} alt="NeXus event map and locations, Hilton London Metropole" className="w-full rounded-md border border-border" />
            <div className="text-sm text-muted-foreground">
              <p>West and East wings, ground floor to level 2, as drawn by the designers.</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a href={kit.map.file} download><Download className="h-4 w-4" /> Live map (AI)</a>
              </Button>
            </div>
          </div>
        </section>
      )}

      {groups.map((g) => (
        <section key={g} className="mt-10">
          <h2 className="text-xl font-bold text-foreground">{g}</h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kit.pieces.filter((p) => p.group === g).map((p) => <FileCard key={p.file} f={p} />)}
          </ul>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">Live files</h2>
        <p className="mt-1 text-sm text-muted-foreground">The designers’ own working files, unchanged.</p>
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kit.live.map((p) => <FileCard key={p.file} f={p} />)}
        </ul>
      </section>
    </main>
  );
}
