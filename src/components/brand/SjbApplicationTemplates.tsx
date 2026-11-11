import { forwardRef, useState, type HTMLAttributes } from "react";
import { Download, Sun, Moon, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/design-system/element";
import { SJB_APPLICATION_TEMPLATES } from "@/lib/sjb-application-templates";

export interface SjbApplicationTemplatesProps extends HTMLAttributes<HTMLDivElement> { surface: "signage" | "motion" | "documents" }
export const SjbApplicationTemplates = forwardRef<HTMLDivElement, SjbApplicationTemplatesProps>(function SjbApplicationTemplates({ surface, className = "", ...props }, ref) {
  const [mode, setMode] = useState("light");
  const [expanded, setExpanded] = useState(false);
  const all = SJB_APPLICATION_TEMPLATES.filter(t => t.surface === surface);
  const hasModes = all.some(t => t.mode === "light") && all.some(t => t.mode === "dark");
  const rows = all.filter(t => !hasModes || t.mode === mode);
  const shown = expanded ? rows : rows.slice(0, 4);
  return <div ref={ref} {...props} className={`mt-4 ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-medium text-muted-foreground">{rows.length} editable templates · Canva versions awaiting selection</span>
      {hasModes && <div className="flex gap-1" role="group" aria-label={`${surface} template colour mode`}>{["light", "dark"].map(m => <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} aria-pressed={mode === m} onClick={() => setMode(m)}>{m === "light" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}{m === "light" ? "Light" : "Dark"}</Button>)}</div>}
    </div>
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{shown.map(t => <article key={t.id} className="min-w-0 overflow-hidden rounded-md border border-border bg-card">
      <div className="flex h-44 items-center justify-center border-b border-border bg-muted p-2"><img src={t.previewUrl} alt={`${t.title} · ${t.size}`} loading="lazy" className="h-full max-w-full object-contain" /></div>
      <div className="p-3"><h4 className="text-sm font-semibold">{t.title}</h4><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.size}{t.pages > 1 ? ` · ${t.pages} pages` : ""}</p><Button asChild size="sm" variant="outline" className="mt-3 w-full"><a href={t.sourceUrl} download><Download className="size-3.5" />{t.format === "Layered SVG" ? "Illustrator-compatible ZIP" : `${t.format} source`}</a></Button></div>
    </article>)}</div>
    {rows.length > 4 && <Button variant="ghost" size="sm" className="mt-3" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}{expanded ? "Show fewer" : `All ${rows.length} templates`}</Button>}
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{surface === "signage" ? "Editable RGB artwork · supplier dimensions and print approval required. ZIP includes separate guides and handoff notes; not a native .ai file." : surface === "motion" ? "Static editable screen sources · separate safe-area guides in SVG packs. Animated Canva timelines and rendered video are not yet available." : "Editable PowerPoint and Word sources · install Geist. Bracketed fields await approved content."}</p>
  </div>;
});