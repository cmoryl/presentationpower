import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Link2, Search, ArrowUpRight, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { LibrarySubnav } from "@/components/LibrarySubnav";
import { Button, Input } from "@/design-system/element";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SPECTRUM_SPEC, SPEC_SECTIONS, type SpectrumSpecEntry } from "@/lib/spectrum-spec";

export const Route = createFileRoute("/library/spec")({
  validateSearch: (search: Record<string, unknown>): { rule?: string } => ({ rule: typeof search.rule === "string" ? search.rule : undefined }),
  head: () => ({ meta: [
    { title: "Living Spectrum spec · TransPerfect Element" },
    { name: "description", content: "The November 2026 PowerPoint guide: searchable colors, typography, geometry and module rules with source references." },
    { property: "og:title", content: "Living Spectrum spec · TransPerfect Element" },
    { property: "og:description", content: "Clickable Spectrum guide values and rules for building corporate presentations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SpectrumSpecPage,
});

function SpectrumSpecPage() {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("All");
  const { rule } = Route.useSearch();
  const navigate = useNavigate({ from: "/library/spec" });
  const selected = SPECTRUM_SPEC.find(item => item.id === rule);
  const rows = SPECTRUM_SPEC.filter(item => (section === "All" || item.section === section) && `${item.name} ${item.value} ${item.rule}`.toLowerCase().includes(query.toLowerCase()));
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success("Copied"); }
    catch { toast.error("Copy unavailable. Select and copy the value manually."); }
  };
  const reference = (item: SpectrumSpecEntry) => `${item.name}: ${item.value}\n${item.rule}\nSource: TransPerfect PowerPoint Style Guide, November 2026, page ${item.page}.`;
  return <AppShell><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <LibrarySubnav active="/library/spec" />
    <header className="mt-8 flex flex-wrap items-start justify-between gap-5 border-b border-border pb-7">
      <div><p className="mb-2 text-sm font-medium text-primary">CORPORATE PRESENTATIONS · NOVEMBER 2026</p>
        <h1 className="text-3xl font-semibold">Living Spectrum spec</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">TransPerfect PowerPoint Style Guide · MarComm Q4 2026 · 21 pages</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => copy(SPECTRUM_SPEC.map(reference).join("\n\n"))}><Copy />Copy full spec</Button>
        <Button asChild><Link to="/library/audit">Module audit<ArrowUpRight /></Link></Button>
      </div>
    </header>
    <div className="my-6 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">Issued guide values, not a certification of current modules or PowerPoint exports. Unspecified units and spacing remain explicit; the source master stays authoritative.</div>
    <div className="mb-6 flex flex-col gap-4">
      <div className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search specifications" placeholder="Search colors, sizes or rules…" value={query} onChange={event => setQuery(event.target.value)} className="pl-9" /></div>
      <nav aria-label="Specification categories" className="flex flex-wrap gap-2">{["All", ...SPEC_SECTIONS].map(name => <Button key={name} variant={section === name ? "default" : "outline"} size="sm" aria-pressed={section === name} onClick={() => setSection(name)}>{name}</Button>)}</nav>
    </div>
    <p className="mb-6 text-xs text-muted-foreground">{rows.length} of {SPECTRUM_SPEC.length} references</p>
    {SPEC_SECTIONS.filter(name => rows.some(item => item.section === name)).map(name => <section key={name} className="mb-10">
      <h2 className="mb-4 text-xl font-semibold">{name}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.filter(item => item.section === name).map(item => <Button key={item.id} variant="outline" className="h-auto min-h-36 items-stretch justify-start whitespace-normal p-0 text-left" onClick={() => navigate({ search: { rule: item.id } })} aria-label={`Open ${item.name}`}>
        <span className="flex w-full flex-col">
          {item.color && <span className="block h-12 w-full rounded-t-md border-b border-border" style={{ backgroundColor: item.color }} />}
          <span className="flex flex-1 flex-col p-4"><span className="flex justify-between gap-3 text-xs text-muted-foreground"><span>{item.name}</span><span className="shrink-0">p. {item.page}</span></span>
            <span className="mt-2 break-words text-base font-semibold">{item.value}</span><span className="mt-2 text-xs font-normal leading-relaxed text-muted-foreground">{item.rule}</span>
          </span>
        </span>
      </Button>)}</div>
    </section>)}
    {rows.length === 0 && <p className="py-12 text-muted-foreground">No matching specifications.</p>}
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) void navigate({ search: {} }); }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto">
        {selected && <><DialogHeader><DialogTitle>{selected.name}</DialogTitle><DialogDescription>{selected.section} · Issued guide, page {selected.page}</DialogDescription></DialogHeader>
          {selected.color && <div className="h-24 rounded-md border border-border" style={{ backgroundColor: selected.color }} />}
          <p className="break-words text-2xl font-semibold">{selected.value}</p>
          <p className="text-sm leading-relaxed">{selected.rule}</p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><BookOpen className="size-4 shrink-0" />TransPerfect PowerPoint Style Guide · November 2026</p>
          <div className="flex flex-wrap gap-2"><Button onClick={() => copy(selected.value)}><Copy />Copy value</Button><Button variant="outline" onClick={() => copy(reference(selected))}><Copy />Copy rule</Button><Button variant="outline" onClick={() => copy(window.location.href)}><Link2 />Copy link</Button></div>
        </>}
      </DialogContent>
    </Dialog>
  </main></AppShell>;
}