import { Component, lazy, Suspense, forwardRef, useCallback, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Box, Scan, Flag, Map, RotateCcw, Maximize2, Download } from "lucide-react";
import { Button } from "@/design-system/element";
import { SJB_STADIUM_CONCEPT, type SjbStadiumCamera } from "@/lib/sjb-stadium-concept";
import { BRAND } from "@/lib/brand-colors";

const Scene = lazy(() => import("./SjbStadiumScene"));
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert" className="flex h-full items-center justify-center p-6 text-center text-destructive">The 3D view could not load. Check your connection and browser’s 3D support, then reload.</p> : this.props.children; }
}
const views = [
  { id: "stadium", label: "Stadium", icon: Box },
  { id: "overhead", label: "Overhead", icon: Scan },
  { id: "field", label: "Field", icon: Flag },
  { id: "precinct", label: "Precinct", icon: Map },
] as const;
export interface SjbStadiumViewerProps extends ComponentPropsWithoutRef<"div"> {}
export const SjbStadiumViewer = forwardRef<HTMLDivElement, SjbStadiumViewerProps>(function SjbStadiumViewer({ className = "", ...props }, ref) {
  const [view, setView] = useState<SjbStadiumCamera>("stadium");
  const [roof, setRoof] = useState(true);
  const [reset, setReset] = useState(0);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const onReady = useCallback(() => setReady(true), []);
  const download = () => {
    const canvas = host.current?.querySelector("canvas"); if (!canvas) return;
    try {
      const output = document.createElement("canvas"); output.width = canvas.width; output.height = canvas.height;
      const ctx = output.getContext("2d"); if (!ctx) { setMessage("This browser could not save the view."); return; }
      ctx.drawImage(canvas, 0, 0);
      const font = Math.max(12, Math.round(output.width / 85));
      ctx.fillStyle = BRAND.white; ctx.fillRect(0, output.height - font * 3, output.width, font * 3);
      ctx.fillStyle = BRAND.ink; ctx.font = `600 ${font}px sans-serif`;
      ctx.fillText("SANJUANBOWL.COM · CONCEPT / NOT TO SCALE / VENUE APPROVAL REQUIRED", font, output.height - font);
      output.toBlob(blob => {
        if (!blob) { setMessage("This browser could not save the view."); return; }
        const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `san-juan-bowl-${view}-3d-concept.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    } catch { setMessage("This browser could not save the view."); }
  };
  return <div ref={ref} className={`space-y-3 ${className}`} {...props}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Stadium camera views">{views.map(({ id, label, icon: Icon }) => <Button key={id} size="sm" variant={view === id ? "default" : "outline"} aria-pressed={view === id} onClick={() => setView(id)}><Icon className="size-4" />{label}</Button>)}</div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={roof} onChange={e => setRoof(e.target.checked)} className="size-4 accent-primary" />Canopy</label>
        <Button size="icon" variant="outline" title="Reset camera" aria-label="Reset stadium camera" onClick={() => setReset(r => r + 1)}><RotateCcw className="size-4" /></Button>
        <Button size="icon" variant="outline" title="Full screen" aria-label="Full-screen stadium" onClick={() => { void host.current?.requestFullscreen().catch(() => setMessage("Full screen is unavailable in this browser.")); }}><Maximize2 className="size-4" /></Button>
        <Button size="icon" variant="outline" title="Download concept view" aria-label="Download stadium concept view" disabled={!ready} onClick={download}><Download className="size-4" /></Button>
      </div>
    </div>
    <div ref={host} data-scene-ready={ready ? "true" : undefined} className="relative h-[560px] max-h-[72dvh] min-h-80 w-full bg-muted [&:fullscreen]:h-screen [&:fullscreen]:max-h-none [&_canvas]:touch-none [&_canvas]:focus-visible:outline [&_canvas]:focus-visible:outline-2 [&_canvas]:focus-visible:outline-primary">
      <ClientOnly fallback={<p className="p-6 text-sm text-muted-foreground">Loading stadium concept…</p>}>
        <SceneBoundary><Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading stadium concept…</p>}><Scene view={view} reset={reset} roof={roof} onReady={onReady} /></Suspense></SceneBoundary>
      </ClientOnly>
      <span className="pointer-events-none absolute bottom-3 left-3 bg-background/95 px-3 py-2 text-xs font-semibold text-foreground">CONCEPT · NOT TO SCALE</span>
    </div>
    {message && <p role="status" className="text-sm text-destructive">{message}</p>}
    <p className="text-sm text-muted-foreground">{SJB_STADIUM_CONCEPT.provenance} The supplied field artwork is unchanged; the horseshoe stands, folded canopy, inclined lights and neighbouring arena are illustrative reconstructions. Outdoor proposals remain on the source map, not approved placements.</p>
  </div>;
});